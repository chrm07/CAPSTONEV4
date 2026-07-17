"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { AdminLayout } from "@/components/admin-layout"
import { Loader2, UserCircle, Mail, Phone, Briefcase, Building, FileText, CheckCircle } from "lucide-react"

// 🔥 IMPORT FIRESTORE REAL-TIME UTILS
import { doc, onSnapshot, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

const profileFormSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  bio: z.string().max(500, { message: "Bio must not be longer than 500 characters." }),
  contactNumber: z.string().min(10, { message: "Contact number must be at least 10 digits." }),
  position: z.string().min(2, { message: "Position must be at least 2 characters." }),
  department: z.string().min(2, { message: "Department must be at least 2 characters." }),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export default function AdminProfilePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      bio: "",
      contactNumber: "",
      position: "",
      department: "",
    },
  })

  // 🔥 REAL-TIME LISTENER FOR ADMIN PROFILE
  useEffect(() => {
    if (!user) return;

    setIsFetching(true);
    const userRef = doc(db, "users", user.id);
    
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const profileData = data.profileData || {};
        
        form.reset({
          fullName: profileData.fullName || data.name || "",
          email: profileData.email || data.email || "",
          bio: profileData.bio || "",
          contactNumber: profileData.contactNumber || "",
          position: profileData.position || "",
          department: profileData.department || "",
        });
      }
      setIsFetching(false);
    }, (error) => {
      console.error("Error fetching live profile:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load live profile data." });
      setIsFetching(false);
    });

    return () => unsubscribe();
  }, [user, form, toast]);

  async function onSubmit(data: ProfileFormValues) {
    if (!user) return;
    setIsLoading(true)

    try {
      const userRef = doc(db, "users", user.id);
      
      // Update Firestore directly; the onSnapshot listener will catch the update instantly
      await updateDoc(userRef, {
        name: data.fullName, // Keep root name in sync
        profileData: data 
      });

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
        className: "bg-emerald-600 text-white border-none"
      })
    } catch (error: any) {
      console.error("Profile update error:", error)
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || "An error occurred while updating your profile.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!user || isFetching) {
    return (
      <AdminLayout>
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-blue-600">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p className="text-sm font-bold tracking-widest uppercase text-slate-400">Loading Profile...</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
        
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400 rounded-full filter blur-[80px] opacity-10 -mr-20 -mt-20 pointer-events-none"></div>
          <div className="relative flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shrink-0">
              <UserCircle className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Admin Profile</h1>
              <p className="text-slate-500 font-medium mt-1">Manage your administrator profile and contact information.</p>
            </div>
          </div>
        </div>

        <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="h-2 bg-blue-500 w-full" />
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
            <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-800">Personal Information</CardTitle>
            <CardDescription className="font-medium text-slate-500">Update your personal details below. Your email is linked to your authentication and cannot be changed.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2"><UserCircle className="w-4 h-4"/> Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} className="rounded-xl bg-slate-50 border-slate-200 h-12 font-medium focus-visible:ring-blue-500" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2"><Mail className="w-4 h-4"/> Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Your email" {...field} readOnly className="rounded-xl bg-slate-100 border-slate-200 h-12 font-medium text-slate-500 cursor-not-allowed" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="contactNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2"><Phone className="w-4 h-4"/> Contact Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 09123456789" {...field} className="rounded-xl bg-slate-50 border-slate-200 h-12 font-medium focus-visible:ring-blue-500" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="department" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2"><Building className="w-4 h-4"/> Department</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Scholarship Office" {...field} className="rounded-xl bg-slate-50 border-slate-200 h-12 font-medium focus-visible:ring-blue-500" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="position" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2"><Briefcase className="w-4 h-4"/> Position / Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Head Administrator" {...field} className="rounded-xl bg-slate-50 border-slate-200 h-12 font-medium focus-visible:ring-blue-500" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                </div>

                <FormField control={form.control} name="bio" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2"><FileText className="w-4 h-4"/> Short Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description about your role in the municipality..."
                        className="resize-none rounded-xl bg-slate-50 border-slate-200 min-h-[120px] font-medium focus-visible:ring-blue-500 p-4"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 px-8 font-black tracking-wide shadow-md">
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                    {isLoading ? "Saving Changes..." : "Save Profile"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}