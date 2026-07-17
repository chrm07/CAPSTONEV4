"use client"

import { useState, useEffect } from "react"
import { StudentLayout } from "@/components/student-layout"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { History, Clock, FileText, CheckCircle, XCircle, CalendarDays, GraduationCap } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Firebase imports to ensure accurate data fetching
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function HistoryPage() {
  const { user } = useAuth()
  const [history, setHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    
    setIsLoading(true)

    // Direct real-time listener to the "history" collection mapping the exact student ID
    const q = query(collection(db, "history"), where("studentId", "==", user.id))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }))
      
      // Sort newest to oldest based on archived date
      historyData.sort((a, b) => {
        const dateA = a.archivedAt ? new Date(a.archivedAt).getTime() : 0
        const dateB = b.archivedAt ? new Date(b.archivedAt).getTime() : 0
        return dateB - dateA
      })
      
      setHistory(historyData)
      setIsLoading(false)
    }, (error) => {
      console.error("Error fetching history:", error)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    } catch {
      return "N/A"
    }
  }

  const getCycleYear = (dateString: string) => {
    if (!dateString) return "Past"
    try {
      return new Date(dateString).getFullYear()
    } catch {
      return "Past"
    }
  }

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-fade-in pb-12">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-200 rounded-full filter blur-[80px] opacity-30 -mr-20 -mt-20 pointer-events-none"></div>
          <div className="relative">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-slate-100 rounded-xl">
                <History className="h-6 w-6 sm:h-8 sm:w-8 text-slate-600" />
              </div>
              Application Archives
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-2 max-w-xl">
              Review your past scholarship applications, documents, and final outcomes from previous cycles.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <Clock className="h-10 w-10 animate-spin text-emerald-600" />
            <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Loading Archives...</p>
          </div>
        ) : history.length === 0 ? (
          <Card className="rounded-3xl border-dashed border-2 border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center py-24 sm:py-32 text-center shadow-none px-4">
            <History className="h-12 w-12 sm:h-16 sm:w-16 text-slate-300 mb-4" />
            <p className="font-black text-slate-500 uppercase tracking-widest text-sm sm:text-base">No history found.</p>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 font-medium max-w-sm mx-auto leading-relaxed">
              You do not have any archived applications yet. Your current active application will appear here automatically when the cycle officially ends.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {history.map((app) => (
              <Card key={app.id} className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow">
                
                {/* Dynamically assign top border color based on Unclaimed logic */}
                <div className={`h-2 w-full ${app.isClaimed ? "bg-emerald-500" : app.status === "rejected" ? "bg-red-500" : app.status === "approved" ? "bg-orange-500" : "bg-amber-500"}`} />
                
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6">
                  <div>
                    <CardTitle className="text-base sm:text-lg font-black uppercase text-slate-800 tracking-tight flex items-center gap-2">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                      {getCycleYear(app.archivedAt)} Scholarship Cycle
                    </CardTitle>
                    <CardDescription className="font-bold text-slate-400 uppercase tracking-widest text-[9px] sm:text-[10px] mt-1.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Archived on {formatDate(app.archivedAt)}
                    </CardDescription>
                  </div>
                  
                  <div className="flex items-center self-start sm:self-auto">
                    {app.isClaimed ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none px-3 py-1.5 text-[10px] sm:text-xs uppercase tracking-widest font-black">
                        Claimed
                      </Badge>
                    ) : app.status === "approved" ? (
                      <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-none px-3 py-1.5 text-[10px] sm:text-xs uppercase tracking-widest font-black">
                        Unclaimed
                      </Badge>
                    ) : app.status === "rejected" ? (
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none px-3 py-1.5 text-[10px] sm:text-xs uppercase tracking-widest font-black">
                        Rejected
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none px-3 py-1.5 text-[10px] sm:text-xs uppercase tracking-widest font-black">
                        {app.status || "Pending"}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="p-5 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                    
                    <div className="space-y-5">
                      <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <GraduationCap className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Academic Details Submitted</p>
                          <p className="text-xs sm:text-sm font-bold text-slate-800 mt-1 whitespace-nowrap" title={app.school}>{app.school || "N/A"}</p>
                          <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-0.5 whitespace-nowrap" title={app.course}>{app.course || "N/A"} • Year {app.yearLevel || "N/A"}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 p-4">
                        <CalendarDays className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Timeline</p>
                          <p className="text-xs sm:text-sm font-bold text-slate-800 mt-1">Semester: <span className="text-blue-600">{app.semester || "1st Semester"}</span></p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 h-full flex flex-col justify-center">
                        <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3 text-center sm:text-left">Final Outcome</p>
                        
                        {app.isClaimed ? (
                          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 text-emerald-700">
                            <CheckCircle className="h-6 w-6 sm:h-5 sm:w-5 shrink-0" />
                            <div className="text-center sm:text-left">
                              <span className="text-sm sm:text-base font-black">Financial Aid Received</span>
                              <p className="text-[10px] sm:text-xs text-emerald-600/70 font-bold mt-1">Funds successfully disbursed.</p>
                            </div>
                          </div>
                        ) : app.status === "approved" ? (
                          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 text-orange-600">
                            <Clock className="h-6 w-6 sm:h-5 sm:w-5 shrink-0" />
                            <div className="text-center sm:text-left">
                              <span className="text-sm sm:text-base font-black">Unclaimed Assistance</span>
                              <p className="text-[10px] sm:text-xs text-orange-600/70 font-bold mt-1">Payout was not finalized or claimed in this cycle.</p>
                            </div>
                          </div>
                        ) : app.status === "rejected" ? (
                          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 text-red-600">
                            <XCircle className="h-6 w-6 sm:h-5 sm:w-5 shrink-0" />
                            <div className="text-center sm:text-left">
                              <span className="text-sm sm:text-base font-black">Application Rejected</span>
                              {app.feedback && (
                                <p className="text-[10px] sm:text-xs text-red-600/70 font-bold mt-1 max-w-[250px] italic">Reason: "{app.feedback}"</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 text-amber-600">
                            <History className="h-6 w-6 sm:h-5 sm:w-5 shrink-0" />
                            <div className="text-center sm:text-left">
                              <span className="text-sm sm:text-base font-black">Archived as Pending</span>
                              <p className="text-[10px] sm:text-xs text-amber-600/70 font-bold mt-1">Cycle ended before a decision was made.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  )
}
//okay