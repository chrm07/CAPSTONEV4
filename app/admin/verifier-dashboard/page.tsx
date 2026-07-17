"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { PermissionGuard } from "@/components/permission-guard"
import { ApplicationsTable } from "@/components/applications-table"
import { Shield, Clock, CheckCircle, FileText, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

import { collection, onSnapshot, query } from "firebase/firestore"
import { db } from "@/lib/firebase"

// ALIGNED STAT CARD COMPONENT
interface StatCardProps {
  title: string; value: number | string; description: string; icon: React.ReactNode; iconBg: string; iconColor: string;
}

function StatCard({ title, value, description, icon, iconBg, iconColor }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden transition-all duration-200 border border-slate-100 shadow-sm hover:shadow-md rounded-3xl bg-white h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500">{title}</CardTitle>
        <div className={`p-2 sm:p-3 rounded-2xl ${iconBg}`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl sm:text-4xl font-black text-slate-800">{value}</div>
        <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-2 tracking-wide uppercase">{description}</p>
      </CardContent>
    </Card>
  )
}

export default function VerifierDashboard() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [stats, setStats] = useState({ pending: 0, verifiedToday: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    // 🔥 FIX: Removed `!user` so it doesn't trigger on logout. 
    // Now it ONLY triggers if a logged-in user lacks the right role.
    if (user && user.role === 'admin' && user.adminRole !== 'verifier_staff' && user.adminRole !== 'head_admin') {
      router.replace("/admin/dashboard")
      toast({ variant: "destructive", title: "Access Denied", description: "You don't have permission to access the verifier dashboard." })
      return
    }

    const appsQ = query(collection(db, "applications"));
    const unsubscribe = onSnapshot(appsQ, (snapshot) => {
      let pendingCount = 0;
      let verifiedTodayCount = 0;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.status === "pending") {
          pendingCount++;
        }
        
        if (data.status === "approved" || data.status === "rejected") {
           if (data.updatedAt) {
             const updateDate = new Date(data.updatedAt);
             if (updateDate >= today) {
               verifiedTodayCount++;
             }
           }
        }
      });

      setStats({ pending: pendingCount, verifiedToday: verifiedTodayCount });
      setIsLoading(false);
    }, (error) => {
      console.error("Error connecting to live applications feed:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load live verifier stats." });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, router, toast])

  if (authLoading || isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-blue-600">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p className="text-sm font-bold tracking-widest uppercase text-slate-400">Loading Verifier Dashboard...</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <PermissionGuard permission="applications">
      <AdminLayout>
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-12">
          
          {/* ALIGNED HERO HEADER */}
          <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm p-6 sm:p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400 rounded-full filter blur-[80px] opacity-10 -mr-20 -mt-20 pointer-events-none"></div>
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shrink-0">
                  <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">Document Verification</h1>
                  <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Review student submissions and verify academic records.</p>
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-800 text-sm sm:text-lg px-4 py-2 border-none shadow-none font-black uppercase tracking-widest self-start sm:self-auto">
                Active Cycle
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <StatCard 
              title="Pending Review" 
              value={stats.pending} 
              description="Applications awaiting verification" 
              icon={<Clock className="h-5 w-5 sm:h-6 sm:w-6" />} 
              iconBg="bg-amber-50" 
              iconColor="text-amber-600" 
            />
            <StatCard 
              title="Verified Today" 
              value={stats.verifiedToday} 
              description="Processed during your shift" 
              icon={<CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />} 
              iconBg="bg-blue-50" 
              iconColor="text-blue-600" 
            />
          </div>

          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
            <div className="h-2 bg-slate-800 w-full" />
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
              <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-600" /> Applications Queue
              </CardTitle>
              <CardDescription className="font-medium text-slate-500">
                Select an application to view submitted documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ApplicationsTable />
            </CardContent>
          </Card>
          
        </div>
      </AdminLayout>
    </PermissionGuard>
  )
}