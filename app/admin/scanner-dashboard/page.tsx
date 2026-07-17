"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { PermissionGuard } from "@/components/permission-guard"
import { QrCode, Search, CheckCircle, XCircle, Loader2, MapPin, School, ScanLine } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { collection, query, where, getDocs, updateDoc, doc, addDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useRouter } from "next/navigation"

async function hashValue(value: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function ScannerDashboardPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [studentResult, setStudentResult] = useState<any | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [schedule, setSchedule] = useState<any>(null)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "schedule"), (docSnap) => {
      if (docSnap.exists()) {
        setSchedule(docSnap.data());
      }
    })
    return () => unsub()
  }, [])

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    const cleanQuery = searchQuery.replace("BTS:", "").trim()
    if (!cleanQuery) return

    setIsSearching(true)
    setStudentResult(null)

    try {
      const appsRef = collection(db, "applications")
      const q = query(appsRef, where("isArchived", "==", false), where("isApproved", "==", true))
      
      const snapshot = await getDocs(q)
      const isHashed = /^[a-f0-9]{64}$/i.test(cleanQuery)
      
      const matchedApp = snapshot.docs.find(async (doc) => {
        const data = doc.data()
        const searchLower = cleanQuery.toLowerCase()
        
        if ((data.studentId === cleanQuery) ||
            (data.email && data.email.toLowerCase().includes(searchLower)) ||
            (data.fullName && data.fullName.toLowerCase().includes(searchLower))) {
          return true
        }
        
        if (isHashed) {
          const hashedStudentId = await hashValue(data.studentId)
          if (hashedStudentId === cleanQuery) {
            return true
          }
        }
        
        return false
      })

      if (matchedApp) {
        const studentData = matchedApp.data()

        // STRICT BARANGAY FILTERING
        if (schedule?.distributionOpen && schedule?.targetBarangays && Array.isArray(schedule.targetBarangays)) {
          if (schedule.targetBarangays.length > 0 && !schedule.targetBarangays.includes(studentData.barangay)) {
            toast({ 
              variant: "destructive", 
              title: "Schedule Mismatch", 
              description: `Verification Denied. ${studentData.fullName} is from ${studentData.barangay}. Today's schedule is restricted to: ${schedule.targetBarangays.join(", ")}.` 
            })
            setIsSearching(false)
            return 
          }
        }

        const userDoc = await getDocs(query(collection(db, "users"), where("id", "==", studentData.studentId)))
        const photo = userDoc.empty ? null : (userDoc.docs[0].data().profileData?.studentPhoto || null)

        setStudentResult({ id: matchedApp.id, photo, ...studentData })
      } else {
        toast({ 
          variant: "destructive", 
          title: "Not Found or Not Approved", 
          description: "No approved application found for this search in the active cycle." 
        })
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Search Error", description: "Failed to search the database." })
    } finally {
      setIsSearching(false)
    }
  }

  const handleConfirmPayout = async () => {
    if (!studentResult) return
    setIsProcessing(true)

    try {
      const appRef = doc(db, "applications", studentResult.id)
      await updateDoc(appRef, {
        isClaimed: true,
        claimedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      await addDoc(collection(db, "activity_logs"), {
        studentId: studentResult.studentId,
        action: "Financial Assistance Claimed",
        details: "Student successfully verified and claimed their payout.",
        timestamp: new Date().toISOString(),
        type: "system"
      })

      await addDoc(collection(db, "notifications"), {
        to: "student",
        userId: studentResult.studentId,
        message: "Your financial assistance for this cycle has been successfully claimed.",
        read: false,
        createdAt: new Date().toISOString()
      })

      toast({ 
        title: "Payout Confirmed!", 
        description: `${studentResult.fullName} has been marked as claimed.`, 
        className: "bg-emerald-600 text-white" 
      })
      
      setStudentResult({ ...studentResult, isClaimed: true, claimedAt: new Date().toISOString() })
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to confirm payout." })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <PermissionGuard permission="verification">
      <AdminLayout>
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-fade-in pb-12">
          
          <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm p-6 sm:p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-400 rounded-full filter blur-[80px] opacity-10 -mr-20 -mt-20 pointer-events-none"></div>
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shrink-0">
                  <QrCode className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">Payout Verification</h1>
                  <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Search or scan a scholar to confirm their payout.</p>
                </div>
              </div>
              {!schedule?.distributionOpen && (
                <Badge variant="destructive" className="px-4 py-2 font-black uppercase tracking-widest self-start sm:self-auto">
                  Distribution is Closed
                </Badge>
              )}
            </div>
          </div>

          <Card className="rounded-3xl border-slate-200 shadow-xl overflow-hidden bg-white">
            <div className={`h-2 w-full ${schedule?.distributionOpen ? 'bg-indigo-600' : 'bg-red-500'}`} />
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
              <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-800">Scan or Lookup Scholar</CardTitle>
              <CardDescription>Use a barcode scanner to scan the QR code, or manually type the Student ID, Name, or Email.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input 
                    placeholder="Scan QR or type Student ID..." 
                    className="pl-12 rounded-2xl h-14 bg-slate-50 border-slate-200 text-lg font-medium focus-visible:ring-indigo-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isSearching || !searchQuery.trim()} 
                  className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-md uppercase tracking-widest w-full sm:w-auto"
                >
                  {isSearching ? <Loader2 className="animate-spin h-5 w-5" /> : "Verify"}
                </Button>
              </form>

              <div className="relative mt-8 mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase font-black tracking-widest">
                  <span className="bg-white px-4 text-slate-400">Or use device camera</span>
                </div>
              </div>

              <Button 
                type="button"
                onClick={() => router.push("/admin/verification")} 
                className="w-full h-16 bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-700 rounded-2xl font-black shadow-sm transition-all text-lg tracking-widest uppercase flex items-center justify-center gap-3"
              >
                <ScanLine className="h-6 w-6" /> Start Scanning
              </Button>

              {studentResult && (
                <div className="mt-8 animate-in slide-in-from-bottom-4">
                  <div className={`border-2 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm ${studentResult.isClaimed ? 'border-emerald-200 bg-emerald-50' : 'border-indigo-100 bg-white'}`}>
                    
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 w-full text-center sm:text-left">
                      <div className="h-20 w-20 bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-white shadow-sm shrink-0 overflow-hidden">
                        {studentResult.photo ? (
                          <img src={studentResult.photo} alt={studentResult.fullName} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-3xl font-black text-slate-400">{studentResult.fullName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <Badge className={`mb-2 shadow-none border-none uppercase tracking-widest text-[10px] font-black ${studentResult.isClaimed ? 'bg-emerald-200 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}`}>
                          {studentResult.isClaimed ? "Already Claimed" : "Ready for Payout"}
                        </Badge>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight uppercase leading-none">
                          {studentResult.fullName}
                        </h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                           <div className="flex items-center justify-center sm:justify-start gap-2 text-sm font-bold text-slate-500 uppercase tracking-widest">
                             <MapPin className="h-4 w-4 text-slate-400" /> {studentResult.barangay}
                           </div>
                           <div className="flex items-center justify-center sm:justify-start gap-2 text-sm font-bold text-slate-500 uppercase tracking-widest">
                             <School className="h-4 w-4 text-slate-400" /> {studentResult.school}
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-auto flex flex-col items-center md:items-end gap-3 shrink-0 pt-6 md:pt-0 border-t md:border-t-0 border-slate-200 md:border-none">
                      {studentResult.isClaimed ? (
                        <>
                          <div className="flex items-center text-emerald-600 font-black uppercase text-xl">
                            <CheckCircle className="h-6 w-6 mr-2" /> Payout Claimed
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {new Date(studentResult.claimedAt).toLocaleString()}
                          </p>
                        </>
                      ) : (
                        <>
                          {schedule?.distributionOpen ? (
                             <AlertDialog>
                               <AlertDialogTrigger asChild>
                                 <Button 
                                   disabled={isProcessing}
                                   className="w-full h-16 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-lg shadow-xl hover:scale-105 active:scale-95 transition-all"
                                 >
                                   {isProcessing ? <Loader2 className="animate-spin h-6 w-6 mr-2" /> : <CheckCircle className="h-6 w-6 mr-2" />}
                                   Confirm Payout
                                 </Button>
                               </AlertDialogTrigger>
                               <AlertDialogContent>
                                 <AlertDialogHeader>
                                   <AlertDialogTitle>Are you sure to mark this claimed?</AlertDialogTitle>
                                   <AlertDialogDescription>
                                     This will verify the scholar has received their assistance. This action cannot be undone.
                                   </AlertDialogDescription>
                                 </AlertDialogHeader>
                                 <AlertDialogFooter>
                                   <AlertDialogCancel>No</AlertDialogCancel>
                                   <AlertDialogAction 
                                     onClick={handleConfirmPayout} 
                                     className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                   >
                                     Yes
                                   </AlertDialogAction>
                                 </AlertDialogFooter>
                               </AlertDialogContent>
                             </AlertDialog>
                          ) : (
                             <div className="text-center bg-red-50 p-4 rounded-2xl border border-red-100">
                               <XCircle className="h-6 w-6 text-red-600 mx-auto mb-1" />
                               <p className="text-xs font-black uppercase tracking-widest text-red-600">Distribution is Closed</p>
                             </div>
                          )}
                        </>
                      )}
                    </div>
                    
                  </div>
                </div>
              )}

            </CardContent>
          </Card>

        </div>
      </AdminLayout>
    </PermissionGuard>
  )
}
