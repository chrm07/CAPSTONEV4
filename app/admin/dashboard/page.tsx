"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AdminLayout } from "@/components/admin-layout"
import { FileText, Clock, LayoutDashboard, CheckCircle, XCircle, Calendar, Loader2, ChevronRight, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar" // 🔥 ADDED AVATAR IMPORTS
import { useAuth } from "@/contexts/auth-context"

// FIRESTORE REAL-TIME UTILS
import { collection, onSnapshot, query } from "firebase/firestore"
import { db } from "@/lib/firebase"

// MATCHED REPORTS PAGE CARD DESIGN
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

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({ totalApplications: 0, pendingApplications: 0, approvedApplications: 0, rejectedApplications: 0 })
  const [recentApplications, setRecentApplications] = useState<any[]>([])
  
  const [usersMap, setUsersMap] = useState<Record<string, any>>({})

  useEffect(() => {
    let unsubscribeApps: () => void;
    let unsubscribeUsers: () => void;

    const verifyAndLoad = async () => {
      if (authLoading) return;

      if (!user) {
        router.replace("/login")
        return
      }

      if (user.role === "student") {
        router.replace("/student/dashboard")
        return
      }

      if (user.role === "admin") {
        const currentAdminRole = user.adminRole || "head_admin"

        // CORRECTED ROUTING LOGIC HERE
        if (currentAdminRole === "scanner_staff") {
          router.replace("/admin/scanner-dashboard")
          return
        }
        
        if (currentAdminRole === "verifier_staff") {
          router.replace("/admin/verifier-dashboard")
          return
        }

        // 1. Listen to Users (To grab names, barangays, and profile photos)
        const usersQ = query(collection(db, "users"));
        unsubscribeUsers = onSnapshot(usersQ, (snapshot) => {
          const map: Record<string, any> = {};
          snapshot.forEach((doc) => {
            map[doc.id] = doc.data();
          });
          setUsersMap(map);
        });

        // 2. Listen to Active Applications Only
        const appsQuery = query(collection(db, "applications"));
        unsubscribeApps = onSnapshot(appsQuery, (snapshot) => {
          let total = 0;
          let pending = 0;
          let approved = 0;
          let rejected = 0;
          const allApps: any[] = [];

          snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Ignore archived applications (they belong in history)
            if (data.isArchived) return;

            // Only count submitted applications
            if (data.isSubmitted) {
                allApps.push({ id: doc.id, ...data });
                
                total++;
                if (data.status === "pending") pending++;
                if (data.status === "approved" || data.isApproved) approved++;
                if (data.status === "rejected" || data.isRejected) rejected++;
            }
          });

          setStats({
            totalApplications: total,
            pendingApplications: pending,
            approvedApplications: approved,
            rejectedApplications: rejected
          });

          // Sort by newest first and take the top 10 for recent activity
          allApps.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setRecentApplications(allApps.slice(0, 10));
          
          setIsLoading(false);
        }, (error) => {
          console.error("Failed to load dashboard data in real-time:", error);
          setIsLoading(false);
        });
      }
    }

    verifyAndLoad()

    return () => {
      if (unsubscribeApps) unsubscribeApps();
      if (unsubscribeUsers) unsubscribeUsers();
    }
  }, [user, authLoading, router])

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    } catch (e) {
      return "Invalid Date"
    }
  }

  const currentAdminRole = user?.adminRole || "head_admin"
  if (authLoading || isLoading || !user || currentAdminRole !== "head_admin") {
    return (
      <AdminLayout>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-emerald-600">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p className="text-sm font-bold tracking-widest uppercase text-slate-400">Loading Dashboard...</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in pb-12">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400 rounded-full filter blur-[80px] opacity-10 -mr-20 -mt-20 pointer-events-none"></div>
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shrink-0">
                <LayoutDashboard className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">Admin Dashboard</h1>
                <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Manage active applications and monitor cycle statistics.</p>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 text-sm sm:text-lg px-4 py-2 border-none shadow-none font-black uppercase tracking-widest self-start sm:self-auto">
              Active Cycle
            </Badge>
          </div>
        </div>

        {/* MOBILE RESPONSIVE STAT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Link href="/admin/applications" className="block transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <StatCard 
              title="Total Active Applications" 
              value={stats.totalApplications} 
              description="Active Submissions" 
              icon={<Users className="h-5 w-5 sm:h-6 sm:w-6" />} 
              iconBg="bg-blue-50" 
              iconColor="text-blue-600" 
            />
          </Link>
          <Link href="/admin/applications" className="block transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <StatCard 
              title="Pending Review" 
              value={stats.pendingApplications} 
              description={`${stats.totalApplications > 0 ? Math.round((stats.pendingApplications / stats.totalApplications) * 100) : 0}% of Total`} 
              icon={<Clock className="h-5 w-5 sm:h-6 sm:w-6" />} 
              iconBg="bg-amber-50" 
              iconColor="text-amber-600" 
            />
          </Link>
          <Link href="/admin/scholars" className="block transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <StatCard 
              title="Approved Scholars" 
              value={stats.approvedApplications} 
              description={`${stats.totalApplications > 0 ? Math.round((stats.approvedApplications / stats.totalApplications) * 100) : 0}% Approval Rate`} 
              icon={<CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />} 
              iconBg="bg-emerald-50" 
              iconColor="text-emerald-600" 
            />
          </Link>
        </div>

        {/* Recent Applications Card */}
        <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="h-2 bg-slate-800 w-full" />
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-200">
                <Calendar className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-800">Recent Activity</CardTitle>
                <CardDescription className="font-medium text-slate-500">
                  Latest active scholarship applications submitted.
                </CardDescription>
              </div>
            </div>
            <Link href="/admin/applications">
              <Button variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold hidden sm:flex rounded-xl">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {recentApplications.length > 0 ? (
                recentApplications.map((application) => {
                  const studentUser = usersMap[application.studentId] || {};
                  const profile = studentUser.profileData || {};
                  const fullName = application.fullName || profile.fullName || studentUser.name || "Unknown Student";
                  const barangay = application.barangay || profile.barangay || "No Barangay";
                  
                  // 🔥 EXTRACT PROFILE PICTURE URL
                  const profilePicture = profile.studentPhoto || profile.profilePicture || studentUser.profilePicture || null;

                  return (
                    <div key={application.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 hover:bg-slate-50/80 transition-colors gap-4">
                      <div className="flex items-center gap-4">
                        {/* 🔥 REPLACED STATIC DIV WITH AVATAR COMPONENT */}
                        <Avatar className="h-12 w-12 border border-slate-200 shadow-sm shrink-0 bg-slate-100">
                          <AvatarImage src={profilePicture} className="object-cover" />
                          <AvatarFallback className="text-slate-500 font-bold text-lg">
                            {(fullName || "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div>
                          <h4 className="font-black text-slate-800 uppercase text-sm tracking-tight">{fullName}</h4>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-xs font-medium text-slate-500 mt-1">
                            <span>{application.course || profile.course || "No Course"}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{application.school || profile.schoolName || "No School"}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 ml-16 sm:ml-0">
                        <div className="text-left sm:text-right">
                          <div className="text-[10px] sm:text-xs font-bold text-slate-700">{formatDate(application.createdAt)}</div>
                          <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{barangay}</div>
                        </div>
                        <Badge 
                          variant="outline"
                          className={`shadow-none font-bold uppercase tracking-widest text-[9px] sm:text-[10px] border-none ${
                            application.status === "approved" || application.isApproved ? "bg-emerald-100 text-emerald-700" : 
                            application.status === "rejected" || application.isRejected ? "bg-red-100 text-red-700" : 
                            "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {application.isApproved ? "Approved" : application.isRejected ? "Rejected" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-16 text-slate-500 bg-white">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <h3 className="font-bold uppercase tracking-widest text-sm">No applications yet</h3>
                  <p className="text-xs mt-1">Submissions will appear here.</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 sm:hidden flex justify-center">
               <Link href="/admin/applications" className="w-full">
                 <Button variant="outline" className="w-full font-bold rounded-xl h-11">View All Applications</Button>
               </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
