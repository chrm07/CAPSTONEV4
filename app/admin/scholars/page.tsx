"use client"

import React, { useState, useEffect, useMemo } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { PermissionGuard } from "@/components/permission-guard"
import { 
  Search, MapPin, Loader2, Users, Mail, GraduationCap, School, CheckCircle, History, CalendarDays
} from "lucide-react"

// FIRESTORE REAL-TIME UTILS
import { collection, query, where, onSnapshot, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function ScholarsPage() {
  const { toast } = useToast()
  
  const [scholars, setScholars] = useState<any[]>([])
  const [archivedScholars, setArchivedScholars] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Tab State
  const [activeTab, setActiveTab] = useState("active")

  // Filter States
  const [searchQuery, setSearchQuery] = useState("")
  const [barangayFilter, setBarangayFilter] = useState("all")
  const [yearFilter, setYearFilter] = useState("all")
  
  // 🔥 NEW: Dynamic Barangays State
  const [barangaysList, setBarangaysList] = useState<string[]>([]) 

  // REAL-TIME LISTENER FOR SCHOLARS
  useEffect(() => {
    let unsubscribeUsers: () => void;
    let unsubscribeApps: () => void;
    let unsubscribeHistory: () => void;
    let unsubscribeBarangays: () => void; // 🔥 NEW

    const setupRealtimeListeners = () => {
      setIsLoading(true);

      let allUsers: any[] = [];
      let approvedApps: any[] = [];
      let historyRecords: any[] = [];

      const loadedStates = { users: false, apps: false, history: false };

      const processScholarsData = () => {
        if (!loadedStates.users || !loadedStates.apps || !loadedStates.history) return;

        // 1. Process Active Scholars
        const scholarsData = approvedApps.map(app => {
          const student = allUsers.find(u => u.id === app.studentId)
          const profile = student?.profileData || {} as any
          
          return {
            id: app.studentId,
            applicationId: app.id,
            name: app.fullName || profile.fullName || student?.name || "Unknown",
            email: app.email || student?.email || "Unknown",
            course: app.course || profile.course || "Unknown",
            yearLevel: app.yearLevel || profile.yearLevel || "Unknown",
            school: app.school || profile.schoolName || "Unknown",
            barangay: app.barangay || profile.barangay || "Unknown",
            isClaimed: app.isClaimed || false,
            profilePicture: profile.studentPhoto || profile.profilePicture || student?.profilePicture || null
          }
        })
        setScholars(scholarsData)

        // 2. Process Archived/Historical Scholars (From History Collection)
        const enrichedHistory = historyRecords.map(record => {
          const student = allUsers.find(u => u.id === record.studentId)
          const profile = student?.profileData || {} as any
          
          const archivedDate = record.claimedAt || record.archivedAt || record.updatedAt || record.createdAt;
          const recordYear = archivedDate ? new Date(archivedDate).getFullYear().toString() : "Unknown";

          return {
            id: record.id,
            studentId: record.studentId,
            name: record.fullName || profile.fullName || student?.name || "Unknown",
            email: record.email || student?.email || "Unknown",
            course: record.course || profile.course || "Unknown",
            yearLevel: record.yearLevel || profile.yearLevel || "Unknown",
            school: record.schoolName || record.school || profile.schoolName || "Unknown",
            barangay: record.barangay || profile.barangay || "Unknown",
            isClaimed: record.isClaimed || false,
            claimedAt: record.claimedAt || null,
            outcome: record.status || record.outcome || "approved",
            completedAt: archivedDate,
            year: recordYear, 
            profilePicture: profile.studentPhoto || profile.profilePicture || student?.profilePicture || null
          }
        })
        setArchivedScholars(enrichedHistory)
        setIsLoading(false); 
      };

      // Listen to Users Collection
      const usersQ = query(collection(db, "users"), where("role", "==", "student"));
      unsubscribeUsers = onSnapshot(usersQ, (usersSnap) => {
        allUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        loadedStates.users = true;
        processScholarsData();
      }, (error) => {
        console.error("Users listener error:", error);
      });

      // Listen to Active Approved Applications
      const appsQ = query(collection(db, "applications"), where("isApproved", "==", true));
      unsubscribeApps = onSnapshot(appsQ, (appsSnap) => {
        approvedApps = appsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((app: any) => !app.isArchived); // Double check
          
        loadedStates.apps = true;
        processScholarsData();
      }, (error) => {
        console.error("Apps listener error:", error);
      });

      // Listen to History Collection
      const historyQ = query(collection(db, "history"));
      unsubscribeHistory = onSnapshot(historyQ, (historySnap) => {
        historyRecords = historySnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((app: any) => app.isApproved === true || app.status === "approved"); // Only show winners
          
        loadedStates.history = true;
        processScholarsData();
      }, (error) => {
        console.error("History listener error:", error);
      });

      // 🔥 NEW: Real-time Barangay Sync
      unsubscribeBarangays = onSnapshot(doc(db, "settings", "barangays"), (docSnap) => {
        if (docSnap.exists() && docSnap.data().list) {
          const rawList = docSnap.data().list;
          const namesList: string[] = rawList.map((item: any) => {
            if (typeof item === "string") return item;
            if (item && typeof item.name === "string") return item.name;
            return String(item);
          });
          namesList.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
          setBarangaysList(namesList);
        }
      });
    };

    setupRealtimeListeners();

    return () => {
      setTimeout(() => {
        try {
          if (typeof unsubscribeUsers === 'function') unsubscribeUsers();
          if (typeof unsubscribeApps === 'function') unsubscribeApps();
          if (typeof unsubscribeHistory === 'function') unsubscribeHistory();
          if (typeof unsubscribeBarangays === 'function') unsubscribeBarangays(); // 🔥 NEW
        } catch (e) {
          console.warn("Firestore unsubscribe cleanup ignored:", e);
        }
      }, 10);
    };
  }, []);

  // Filter Logic for Active Scholars
  const filteredScholars = useMemo(() => {
    return scholars.filter(scholar => {
      const matchesSearch = 
        scholar.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        scholar.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scholar.school.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesBarangay = barangayFilter === "all" || scholar.barangay === barangayFilter
      return matchesSearch && matchesBarangay
    })
  }, [scholars, searchQuery, barangayFilter])

  // Extract unique available years for the dropdown
  const availableYears = useMemo(() => {
    const years = new Set(archivedScholars.map(s => s.year).filter(y => y !== "Unknown"));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [archivedScholars]);

  // Filter Logic for Historical Scholars
  const filteredArchivedScholars = useMemo(() => {
    return archivedScholars.filter(scholar => {
      const matchesSearch = 
        scholar.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        scholar.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scholar.school.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesBarangay = barangayFilter === "all" || scholar.barangay === barangayFilter
      const matchesYear = yearFilter === "all" || scholar.year === yearFilter
      
      return matchesSearch && matchesBarangay && matchesYear
    })
  }, [archivedScholars, searchQuery, barangayFilter, yearFilter])

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric"
      })
    } catch (e) {
      return "Invalid Date"
    }
  }

  return (
    <PermissionGuard permission="scholars">
      <AdminLayout>
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
          
          {/* Header */}
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Approved Scholars</h1>
            <p className="text-slate-500 font-medium mt-1">View and filter the official list of active and past scholarship recipients.</p>
          </div>

          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
            <div className="h-2 bg-gradient-to-r from-emerald-400 to-emerald-600" />
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6 flex flex-col xl:flex-row justify-between gap-6 p-6 md:p-8">
                
                <div className="space-y-4">
                  <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
                    <Users className="h-6 w-6 text-emerald-600" /> Scholars Directory
                  </CardTitle>
                  
                  {/* Tabs for toggling Active vs History */}
                  <TabsList className="bg-slate-200/50 p-1 rounded-xl h-10 border border-slate-200 w-full sm:w-auto overflow-x-auto flex-nowrap">
                    <TabsTrigger value="active" className="rounded-lg font-bold text-xs whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">
                      <CheckCircle className="w-3 h-3 mr-2 hidden sm:inline-block" /> Active Scholars
                    </TabsTrigger>
                    <TabsTrigger value="history" className="rounded-lg font-bold text-xs whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">
                      <History className="w-3 h-3 mr-2 hidden sm:inline-block" /> Alumni & History
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap items-end gap-3 w-full xl:w-auto mt-auto">
                  {/* Search Input */}
                  <div className="relative w-full sm:flex-1 xl:w-64 shrink-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-11 rounded-2xl bg-white border-slate-200 focus-visible:ring-emerald-500 h-12 font-medium shadow-sm"
                    />
                  </div>

                  {/* Barangay Dropdown */}
                  <Select value={barangayFilter} onValueChange={setBarangayFilter}>
                    <SelectTrigger className="w-full sm:flex-1 xl:w-[200px] h-12 rounded-2xl border-slate-200 bg-white font-medium shadow-sm focus:ring-emerald-500 pl-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="whitespace-nowrap">
                          <SelectValue placeholder="Filter by Barangay" />
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-[300px] border-slate-200 shadow-xl">
                      <SelectItem value="all" className="font-bold cursor-pointer py-3">All Barangays</SelectItem>
                      {/* 🔥 NEW: Dynamic Barangays */}
                      {barangaysList.map(brgy => (
                        <SelectItem key={brgy} value={brgy} className="font-medium cursor-pointer py-2">
                          {brgy}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Year Dropdown (Only visible on History Tab) */}
                  {activeTab === "history" && (
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                      <SelectTrigger className="w-full sm:flex-1 xl:w-[150px] h-12 rounded-2xl border-slate-200 bg-white font-medium shadow-sm focus:ring-emerald-500 pl-4 transition-all">
                        <div className="flex items-center gap-2 text-slate-600">
                          <CalendarDays className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="whitespace-nowrap">
                            <SelectValue placeholder="Filter by Year" />
                          </span>
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl max-h-[300px] border-slate-200 shadow-xl">
                        <SelectItem value="all" className="font-bold cursor-pointer py-3">All Years</SelectItem>
                        {availableYears.map(year => (
                          <SelectItem key={year} value={year} className="font-medium cursor-pointer py-2">
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {isLoading ? (
                  <div className="py-24 flex flex-col items-center justify-center text-emerald-600">
                    <Loader2 className="h-10 w-10 animate-spin mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading scholars...</p>
                  </div>
                ) : (
                  <>
                    {/* ==================== ACTIVE TAB ==================== */}
                    <TabsContent value="active" className="m-0 border-none outline-none">
                      {filteredScholars.length === 0 ? (
                        <div className="py-24 text-center text-slate-400">
                          <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          <p className="font-bold uppercase tracking-widest text-sm text-slate-500">No active scholars found.</p>
                          <p className="text-xs mt-1">Try adjusting your search or barangay filter.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader className="bg-slate-50/50">
                              <TableRow className="border-slate-100 hover:bg-transparent">
                                <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest pl-8 py-5">Student</TableHead>
                                <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-5">Academic Info</TableHead>
                                <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-5">Barangay</TableHead>
                                <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest text-right pr-8 py-5">Payout Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="bg-white">
                              {filteredScholars.map((scholar) => (
                                <TableRow key={scholar.id} className="hover:bg-emerald-50/30 transition-colors border-slate-100">
                                  <TableCell className="pl-8 py-4 align-middle">
                                    <div className="flex items-center gap-4">
                                      <Avatar className="h-11 w-11 border-2 border-white shadow-sm shrink-0 bg-emerald-100">
                                        <AvatarImage src={scholar.profilePicture} className="object-cover" />
                                        <AvatarFallback className="text-emerald-700 font-bold text-sm">
                                          {(scholar.name || "?").charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col">
                                        <span className="font-black text-slate-800 text-sm uppercase tracking-tight">{scholar.name}</span>
                                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-1">
                                          <Mail className="h-3 w-3" /> {scholar.email}
                                        </span>
                                      </div>
                                    </div>
                                  </TableCell>

                                  <TableCell className="py-4 align-middle">
                                    <div className="flex flex-col gap-1.5">
                                      <div className="flex items-start gap-2">
                                        <School className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                                        <span className="text-xs font-bold text-slate-700 leading-tight">{scholar.school}</span>
                                      </div>
                                      <div className="flex items-start gap-2">
                                        <GraduationCap className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                                        <span className="text-xs font-medium text-slate-500 leading-tight">
                                          {scholar.course} <span className="text-slate-300 mx-1">•</span> {scholar.yearLevel}
                                        </span>
                                      </div>
                                    </div>
                                  </TableCell>

                                  <TableCell className="py-4 align-middle">
                                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-bold">
                                      {scholar.barangay}
                                    </Badge>
                                  </TableCell>

                                  <TableCell className="text-right pr-8 py-4 align-middle">
                                    {scholar.isClaimed ? (
                                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none shadow-none font-bold">
                                        <CheckCircle className="h-3 w-3 mr-1" /> Claimed
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 font-bold shadow-none">
                                        Pending Payout
                                      </Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>

                    {/* ==================== HISTORY TAB ==================== */}
                    <TabsContent value="history" className="m-0 border-none outline-none">
                      {filteredArchivedScholars.length === 0 ? (
                        <div className="py-24 text-center text-slate-400">
                          <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          <p className="font-bold uppercase tracking-widest text-sm text-slate-500">
                            {yearFilter === "all" ? "No historical scholars found." : `No scholars found for ${yearFilter}.`}
                          </p>
                          <p className="text-xs mt-1">Try adjusting your search or filters.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader className="bg-slate-50/50">
                              <TableRow className="border-slate-100 hover:bg-transparent">
                                <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest pl-8 py-5">Student</TableHead>
                                <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-5">Academic Info</TableHead>
                                <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-5">Barangay</TableHead>
                                <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest text-right pr-8 py-5">Claim / End Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="bg-white">
                              {filteredArchivedScholars.map((scholar) => (
                                <TableRow key={scholar.id} className="hover:bg-slate-50 transition-colors border-slate-100">
                                  
                                  <TableCell className="pl-8 py-4 align-middle">
                                    <div className="flex items-center gap-4">
                                      <Avatar className="h-11 w-11 border-2 border-white shadow-sm shrink-0 bg-slate-100">
                                        <AvatarImage src={scholar.profilePicture} className="object-cover grayscale" />
                                        <AvatarFallback className="text-slate-500 font-bold text-sm">
                                          {(scholar.name || "?").charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col">
                                        <span className="font-black text-slate-700 text-sm uppercase tracking-tight">{scholar.name}</span>
                                        <span className="text-xs font-medium text-slate-400 flex items-center gap-1 mt-1">
                                          <Mail className="h-3 w-3" /> {scholar.email}
                                        </span>
                                      </div>
                                    </div>
                                  </TableCell>

                                  <TableCell className="py-4 align-middle">
                                    <div className="flex flex-col gap-1.5 opacity-80">
                                      <div className="flex items-start gap-2">
                                        <School className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                                        <span className="text-xs font-bold text-slate-600 leading-tight">{scholar.school}</span>
                                      </div>
                                      <div className="flex items-start gap-2">
                                        <GraduationCap className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                                        <span className="text-xs font-medium text-slate-500 leading-tight">
                                          {scholar.course} <span className="text-slate-300 mx-1">•</span> {scholar.yearLevel}
                                        </span>
                                      </div>
                                    </div>
                                  </TableCell>

                                  <TableCell className="py-4 align-middle">
                                    <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 font-bold">
                                      {scholar.barangay}
                                    </Badge>
                                  </TableCell>

                                  <TableCell className="text-right pr-8 py-4 align-middle">
                                    <div className="flex flex-col items-end gap-1">
                                      {scholar.isClaimed && scholar.claimedAt ? (
                                        <>
                                          <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-50 border-emerald-200 shadow-none font-bold">
                                            <CalendarDays className="h-3 w-3 mr-1" /> {formatDate(scholar.claimedAt)}
                                          </Badge>
                                          <span className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase mt-1">
                                            <CheckCircle className="h-2.5 w-2.5 inline mr-1" /> Payout Claimed
                                          </span>
                                        </>
                                      ) : (
                                        <Badge className="bg-slate-50 text-slate-600 hover:bg-slate-50 border-slate-200 shadow-none font-bold">
                                          <CalendarDays className="h-3 w-3 mr-1" /> Ended {formatDate(scholar.completedAt)}
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>

                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>
                  </>
                )}
              </CardContent>
            </Tabs>
          </Card>

        </div>
      </AdminLayout>
    </PermissionGuard>
  )
}
