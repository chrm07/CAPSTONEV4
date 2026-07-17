"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { PermissionGuard } from "@/components/permission-guard"
import { 
  Search, MapPin, Loader2, FileText, Mail, GraduationCap, School, 
  CheckCircle, History, CalendarDays, Clock, XCircle, ChevronRight, AlertCircle, Eye, ExternalLink, X, ZoomIn, ZoomOut
} from "lucide-react"

import { collection, query, where, onSnapshot, doc, updateDoc, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

const REQUIRED_DOCS = [
  "Filled-out Application Form",
  "School Registration Form",
  "Enrollment Receipt",
  "School ID / Cert of Non-issuance",
  "Original Barangay Indigency",
  "Original Barangay Clearance",
  "Letter to City Mayor",
  "Voter's Certification",
  "Previous Grades"
];

export default function ApplicationsPage() {
  const { toast } = useToast();
  
  const [activeApps, setActiveApps] = useState<any[]>([]);
  const [historyApps, setHistoryApps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState("active");

  const [searchQuery, setSearchQuery] = useState("");
  const [barangayFilter, setBarangayFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  
  // 🔥 NEW: Dynamic Barangays State
  const [barangaysList, setBarangaysList] = useState<string[]>([]);

  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [studentDocs, setStudentDocs] = useState<any[]>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedDocsForResubmit, setSelectedDocsForResubmit] = useState<string[]>([]);
  
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [previewDoc]);

  useEffect(() => {
    let unsubscribeUsers: () => void;
    let unsubscribeApps: () => void;
    let unsubscribeHistory: () => void;
    let unsubscribeBarangays: () => void; // 🔥 NEW

    const setupRealtimeListeners = () => {
      setIsLoading(true);

      let allUsers: any[] = [];
      let currentAppsData: any[] = [];
      let historyRecordsData: any[] = [];

      const loadedStates = { users: false, apps: false, history: false };

      const processData = () => {
        if (!loadedStates.users || !loadedStates.apps || !loadedStates.history) return;

        const active = currentAppsData.map(app => {
          const student = allUsers.find(u => u.id === app.studentId);
          const profile = student?.profileData || {};
          
          let currentStatus = "pending";
          if (app.isApproved) currentStatus = "approved";
          if (app.isRejected) currentStatus = "rejected";

          return {
            id: app.id,
            studentId: app.studentId,
            name: app.fullName || profile.fullName || student?.name || "Unknown",
            email: app.email || student?.email || "Unknown",
            course: app.course || profile.course || "Unknown",
            yearLevel: app.yearLevel || profile.yearLevel || "Unknown",
            school: app.school || profile.schoolName || "Unknown",
            barangay: app.barangay || profile.barangay || "Unknown",
            status: currentStatus,
            submittedAt: app.submittedAt || app.createdAt,
            profilePicture: profile.studentPhoto || profile.profilePicture || student?.profilePicture || null
          };
        });
        setActiveApps(active);

        const history = historyRecordsData.map(record => {
          const student = allUsers.find(u => u.id === record.studentId);
          const profile = student?.profileData || {};
          
          let currentStatus = "pending";
          if (record.isApproved) currentStatus = "approved";
          if (record.isRejected) currentStatus = "rejected";

          const archivedDate = record.archivedAt || record.updatedAt || record.createdAt;
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
            status: currentStatus,
            archivedAt: archivedDate,
            year: recordYear,
            profilePicture: profile.studentPhoto || profile.profilePicture || student?.profilePicture || null
          };
        });
        setHistoryApps(history);
        setIsLoading(false); 
      };

      const usersQ = query(collection(db, "users"), where("role", "==", "student"));
      unsubscribeUsers = onSnapshot(usersQ, (usersSnap) => {
        allUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        loadedStates.users = true;
        processData();
      });

      const appsQ = query(collection(db, "applications"), where("isSubmitted", "==", true));
      unsubscribeApps = onSnapshot(appsQ, (appsSnap) => {
        currentAppsData = appsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((app: any) => !app.isArchived); 
          
        loadedStates.apps = true;
        processData();
      });

      const historyQ = query(collection(db, "history"));
      unsubscribeHistory = onSnapshot(historyQ, (historySnap) => {
        historyRecordsData = historySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        loadedStates.history = true;
        processData();
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
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeApps) unsubscribeApps();
      if (unsubscribeHistory) unsubscribeHistory();
      if (unsubscribeBarangays) unsubscribeBarangays(); // 🔥 NEW
    };
  }, []);

  useEffect(() => {
    let unsubscribeDocs: () => void;

    if (selectedApp) {
      setIsDocsLoading(true);
      const docsQ = query(collection(db, "documents"), where("studentId", "==", selectedApp.studentId));
      
      unsubscribeDocs = onSnapshot(docsQ, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        const isHistoryMode = !!selectedApp.archivedAt;
        let relevantDocs = docs.filter(doc => {
          if (isHistoryMode) {
            return doc.applicationId === selectedApp.id || (doc.isArchived === true && !doc.applicationId);
          }
          return !doc.isArchived;
        });

        if (isHistoryMode && relevantDocs.length === 0) {
          relevantDocs = docs;
        }
        
        setStudentDocs(relevantDocs);
        setIsDocsLoading(false);
      }, (error) => {
        toast({ variant: "destructive", title: "Error", description: "Failed to load live student documents." });
        setIsDocsLoading(false);
      });
    } else {
      setStudentDocs([]);
    }

    return () => {
      if (unsubscribeDocs) unsubscribeDocs();
    };
  }, [selectedApp, toast]);

  const handleUpdateStatus = async (status: "approved" | "rejected", feedbackText?: string) => {
    if (!selectedApp || selectedApp.archivedAt) return;
    setIsUpdating(true);

    try {
      const appRef = doc(db, "applications", selectedApp.id);
      
      const updateData: any = { 
        status, 
        isApproved: status === "approved",
        isRejected: status === "rejected",
        updatedAt: new Date().toISOString() 
      };

      if (status === "rejected" && feedbackText) {
        updateData.feedback = feedbackText;
        // Store the list of documents that need to be resubmitted
        if (selectedDocsForResubmit.length > 0) {
          updateData.resubmitDocuments = selectedDocsForResubmit;
        }
      } else if (status === "approved") {
        updateData.feedback = "";
      }

      await updateDoc(appRef, updateData);
      
      await addDoc(collection(db, "notifications"), {
        to: "student",
        userId: selectedApp.studentId,
        message: status === "approved" 
          ? "Your application has been approved! You can now view your QR Ticket." 
          : `Action Required: Resubmit your application (${selectedDocsForResubmit.length} document(s)): ${feedbackText}`,
        link: "/student/documents",
        read: false,
        createdAt: new Date().toISOString()
      });
      
      toast({
        title: `Application ${status === 'approved' ? 'Approved' : 'Resubmit Requested'}`,
        description: `The student has been notified immediately.`,
        variant: status === 'approved' ? 'default' : 'destructive'
      });
      
      setSelectedApp(null);
      setPreviewDoc(null);
      setIsRejectDialogOpen(false);
      setRejectReason("");
      setSelectedDocsForResubmit([]);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update status." });
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredActiveApps = useMemo(() => {
    return activeApps.filter(app => {
      const matchesSearch = 
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.school.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesBarangay = barangayFilter === "all" || app.barangay === barangayFilter;
      const matchesStatus = statusFilter === "all" || app.status === statusFilter;
      
      return matchesSearch && matchesBarangay && matchesStatus;
    }).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [activeApps, searchQuery, barangayFilter, statusFilter]);

  const availableYears = useMemo(() => {
    const years = new Set(historyApps.map(s => s.year).filter(y => y !== "Unknown"));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [historyApps]);

  const filteredHistoryApps = useMemo(() => {
    return historyApps.filter(app => {
      const matchesSearch = 
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.school.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesBarangay = barangayFilter === "all" || app.barangay === barangayFilter;
      const matchesStatus = statusFilter === "all" || app.status === statusFilter;
      const matchesYear = yearFilter === "all" || app.year === yearFilter;
      
      return matchesSearch && matchesBarangay && matchesStatus && matchesYear;
    }).sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime());
  }, [historyApps, searchQuery, barangayFilter, statusFilter, yearFilter]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch (e) { 
      return "Invalid Date"; 
    }
  };

  const getThumbnailUrl = (url?: string) => {
    if (!url) return "";
    if (url.toLowerCase().endsWith(".pdf")) return url.replace(/\.pdf$/i, ".jpg");
    return url;
  };

  const handleMouseDown = (e: React.MouseEvent) => { 
    setIsDragging(true); 
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y }); 
  };
  
  const handleMouseMove = (e: React.MouseEvent) => { 
    if (isDragging) setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); 
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const isPdf = previewDoc?.url?.toLowerCase().endsWith('.pdf') || false;
  const validUploadedDocsCount = REQUIRED_DOCS.filter(reqName => 
    studentDocs.some(d => (d.categoryName || d.name) === reqName)
  ).length;

  return (
    <>
      <PermissionGuard permission="applications">
        <AdminLayout>
          <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
            
            <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Applications</h1>
              <p className="text-slate-500 font-medium mt-1">Review active submissions and browse historical records.</p>
            </div>

            <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
              <div className="h-2 bg-gradient-to-r from-blue-400 to-blue-600" />
              
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6 flex flex-col xl:flex-row justify-between gap-6 p-6 md:p-8">
                  
                  <div className="space-y-4">
                    <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
                      <FileText className="h-6 w-6 text-blue-600" /> Applications Dashboard
                    </CardTitle>
                    
                    <TabsList className="bg-slate-200/50 p-1 rounded-xl h-10 border border-slate-200 w-full sm:w-auto overflow-x-auto flex-nowrap">
                      <TabsTrigger value="active" className="rounded-lg font-bold text-xs whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                        <Clock className="w-3 h-3 mr-2 hidden sm:inline-block" /> Active Cycle
                      </TabsTrigger>
                      <TabsTrigger value="history" className="rounded-lg font-bold text-xs whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                        <History className="w-3 h-3 mr-2 hidden sm:inline-block" /> Archives
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex flex-col sm:flex-row flex-wrap items-end gap-3 w-full xl:w-auto mt-auto">
                    <div className="relative w-full sm:flex-1 xl:w-60 shrink-0">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search name/email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-11 rounded-2xl bg-white border-slate-200 focus-visible:ring-blue-500 h-12 font-medium shadow-sm"
                      />
                    </div>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:flex-1 xl:w-[160px] h-12 rounded-2xl border-slate-200 bg-white font-medium shadow-sm focus:ring-blue-500 pl-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="whitespace-nowrap">
                            <SelectValue placeholder="Status" />
                          </span>
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                        <SelectItem value="all" className="font-bold py-2">All Status</SelectItem>
                        <SelectItem value="pending" className="font-medium py-2">Pending</SelectItem>
                        <SelectItem value="approved" className="font-medium py-2">Approved</SelectItem>
                        <SelectItem value="rejected" className="font-medium py-2">Resubmit</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={barangayFilter} onValueChange={setBarangayFilter}>
                      <SelectTrigger className="w-full sm:flex-1 xl:w-[180px] h-12 rounded-2xl border-slate-200 bg-white font-medium shadow-sm focus:ring-blue-500 pl-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                          <span className="whitespace-nowrap">
                            <SelectValue placeholder="Barangay" />
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

                    {activeTab === "history" && (
                      <Select value={yearFilter} onValueChange={setYearFilter}>
                        <SelectTrigger className="w-full sm:flex-1 xl:w-[130px] h-12 rounded-2xl border-slate-200 bg-white font-medium shadow-sm focus:ring-blue-500 pl-4 transition-all">
                          <div className="flex items-center gap-2 text-slate-600">
                            <CalendarDays className="h-4 w-4 text-blue-600 shrink-0" />
                            <span className="whitespace-nowrap">
                              <SelectValue placeholder="Year" />
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
                    <div className="py-24 flex flex-col items-center justify-center text-blue-600">
                      <Loader2 className="h-10 w-10 animate-spin mb-4" />
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading applications...</p>
                    </div>
                  ) : (
                    <>
                      <TabsContent value="active" className="m-0 border-none outline-none">
                        {filteredActiveApps.length === 0 ? (
                          <div className="py-24 text-center text-slate-400">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p className="font-bold uppercase tracking-widest text-sm text-slate-500">No active applications found.</p>
                            <p className="text-xs mt-1">Try adjusting your search or filters.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader className="bg-slate-50/50">
                                <TableRow className="border-slate-100 hover:bg-transparent">
                                  <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest pl-8 py-5">Applicant</TableHead>
                                  <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-5">Academic Info</TableHead>
                                  <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-5">Barangay</TableHead>
                                  <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-5">Date Submitted</TableHead>
                                  <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest text-right pr-8 py-5">Status & Action</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody className="bg-white">
                                {filteredActiveApps.map((app) => (
                                  <TableRow key={app.id} className="hover:bg-blue-50/30 transition-colors border-slate-100">
                                    <TableCell className="pl-8 py-4 align-middle">
                                      <div className="flex items-center gap-4">
                                        <Avatar className="h-11 w-11 border-2 border-white shadow-sm shrink-0 bg-blue-100">
                                          <AvatarImage src={app.profilePicture} className="object-cover" />
                                          <AvatarFallback className="text-blue-700 font-bold text-sm">
                                            {(app.name || "?").charAt(0).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                          <span className="font-black text-slate-800 text-sm uppercase tracking-tight">{app.name}</span>
                                          <span className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-1">
                                            <Mail className="h-3 w-3" /> {app.email}
                                          </span>
                                        </div>
                                      </div>
                                    </TableCell>

                                    <TableCell className="py-4 align-middle">
                                      <div className="flex flex-col gap-1.5">
                                        <div className="flex items-start gap-2">
                                          <School className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                                          <span className="text-xs font-bold text-slate-700 leading-tight">{app.school}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                          <GraduationCap className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                                          <span className="text-xs font-medium text-slate-500 leading-tight">
                                            {app.course} <span className="text-slate-300 mx-1">•</span> {app.yearLevel}
                                          </span>
                                        </div>
                                      </div>
                                    </TableCell>

                                    <TableCell className="py-4 align-middle">
                                      <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-bold">
                                        {app.barangay}
                                      </Badge>
                                    </TableCell>

                                    <TableCell className="py-4 align-middle">
                                      <span className="text-xs font-bold text-slate-600">
                                        {formatDate(app.submittedAt)}
                                      </span>
                                    </TableCell>

                                    <TableCell className="text-right pr-8 py-4 align-middle">
                                      <div className="flex flex-col items-end gap-2">
                                        <Badge 
                                          variant="outline"
                                          className={`shadow-none font-bold uppercase tracking-widest text-[10px] border-none ${
                                            app.status === "approved" ? "bg-emerald-100 text-emerald-700" : 
                                            app.status === "rejected" ? "bg-red-100 text-red-700" : 
                                            "bg-amber-100 text-amber-700"
                                          }`}
                                        >
                                          {app.status === "approved" && <CheckCircle className="h-3 w-3 mr-1" />}
                                          {app.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                                          {app.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                                          {app.status === "rejected" ? "Resubmit" : app.status}
                                        </Badge>
                                        
                                        <Button 
                                          size="sm" 
                                          variant="ghost" 
                                          className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold text-xs pr-1"
                                          onClick={() => { setSelectedApp(app); setPreviewDoc(null); }}
                                        >
                                          Review <ChevronRight className="h-3 w-3 ml-1" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="history" className="m-0 border-none outline-none">
                        {filteredHistoryApps.length === 0 ? (
                          <div className="py-24 text-center text-slate-400">
                            <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p className="font-bold uppercase tracking-widest text-sm text-slate-500">
                              {yearFilter === "all" ? "No historical records found." : `No records found for ${yearFilter}.`}
                            </p>
                            <p className="text-xs mt-1">Try adjusting your search or filters.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader className="bg-slate-50/50">
                                <TableRow className="border-slate-100 hover:bg-transparent">
                                  <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest pl-8 py-5">Applicant</TableHead>
                                  <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-5">Academic Info</TableHead>
                                  <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-5">Barangay</TableHead>
                                  <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-5">Archived Date</TableHead>
                                  <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest text-right pr-8 py-5">Status & Action</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody className="bg-white">
                                {filteredHistoryApps.map((app) => (
                                  <TableRow key={app.id} className="hover:bg-slate-50 transition-colors border-slate-100">
                                    
                                    <TableCell className="pl-8 py-4 align-middle">
                                      <div className="flex items-center gap-4">
                                        <Avatar className="h-11 w-11 border-2 border-white shadow-sm shrink-0 bg-slate-100">
                                          <AvatarImage src={app.profilePicture} className="object-cover grayscale" />
                                          <AvatarFallback className="text-slate-500 font-bold text-sm">
                                            {(app.name || "?").charAt(0).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                          <span className="font-black text-slate-700 text-sm uppercase tracking-tight">{app.name}</span>
                                          <span className="text-xs font-medium text-slate-400 flex items-center gap-1 mt-1">
                                            <Mail className="h-3 w-3" /> {app.email}
                                          </span>
                                        </div>
                                      </div>
                                    </TableCell>

                                    <TableCell className="py-4 align-middle">
                                      <div className="flex flex-col gap-1.5 opacity-80">
                                        <div className="flex items-start gap-2">
                                          <School className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                                          <span className="text-xs font-bold text-slate-600 leading-tight">{app.school}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                          <GraduationCap className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                                          <span className="text-xs font-medium text-slate-500 leading-tight">
                                            {app.course} <span className="text-slate-300 mx-1">•</span> {app.yearLevel}
                                          </span>
                                        </div>
                                      </div>
                                    </TableCell>

                                    <TableCell className="py-4 align-middle">
                                      <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 font-bold">
                                        {app.barangay}
                                      </Badge>
                                    </TableCell>

                                    <TableCell className="py-4 align-middle">
                                      <span className="text-xs font-bold text-slate-500">
                                        {formatDate(app.archivedAt)}
                                      </span>
                                    </TableCell>

                                    <TableCell className="text-right pr-8 py-4 align-middle">
                                      <div className="flex flex-col items-end gap-2">
                                        <Badge 
                                          variant="outline"
                                          className={`shadow-none font-bold uppercase tracking-widest text-[10px] border-none ${
                                            app.status === "approved" ? "bg-emerald-50 text-emerald-700" : 
                                            app.status === "rejected" ? "bg-red-50 text-red-700" : 
                                            "bg-slate-100 text-slate-600"
                                          }`}
                                        >
                                          {app.status === "approved" && <CheckCircle className="h-3 w-3 mr-1" />}
                                          {app.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                                          {app.status === "rejected" ? "Resubmit" : app.status}
                                        </Badge>
                                        
                                        <Button 
                                          size="sm" 
                                          variant="ghost" 
                                          className="h-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-bold text-xs pr-1"
                                          onClick={() => { setSelectedApp(app); setPreviewDoc(null); }}
                                        >
                                          View Details <ChevronRight className="h-3 w-3 ml-1" />
                                        </Button>
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

          <Dialog open={!!selectedApp} onOpenChange={(open) => { if (!open) { setSelectedApp(null); setPreviewDoc(null); } }}>
            <DialogContent className="max-w-6xl w-[95vw] h-[90vh] rounded-3xl p-0 overflow-hidden border-0 shadow-2xl flex flex-col bg-slate-50">
              {selectedApp && (
                <>
                  <div className={`h-2 w-full shrink-0 ${selectedApp.archivedAt ? 'bg-slate-500' : 'bg-blue-600'}`} />
                  <DialogHeader className="p-6 bg-white border-b border-slate-200 shrink-0">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-slate-100 flex items-center justify-center rounded-full border border-slate-200 overflow-hidden shrink-0">
                          {selectedApp.profilePicture ? (
                            <img src={selectedApp.profilePicture} alt="Student" className="h-full w-full object-cover" />
                          ) : (
                            <span className="font-bold text-slate-400 text-lg">{(selectedApp.name || "?").charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <DialogTitle className="text-2xl font-black uppercase text-slate-800 tracking-tight">
                            {selectedApp.name}
                          </DialogTitle>
                          <DialogDescription className="font-bold text-slate-500 flex items-center gap-2 mt-1">
                            <School className="h-4 w-4 text-blue-600" /> {selectedApp.school} • {selectedApp.course}
                          </DialogDescription>
                        </div>
                      </div>
                      <Badge className={`px-3 py-1 font-bold uppercase tracking-widest text-[10px] border-none shadow-none ${
                          selectedApp.status === "approved" ? "bg-emerald-100 text-emerald-700" : 
                          selectedApp.status === "rejected" ? "bg-red-100 text-red-700" : 
                          "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {selectedApp.status === "rejected" ? "Resubmit" : selectedApp.status}
                      </Badge>
                    </div>
                  </DialogHeader>

                  <div className="flex-1 overflow-y-auto p-6">
                    {isDocsLoading ? (
                      <div className="py-24 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {REQUIRED_DOCS.map((reqName, idx) => {
                          const uploadedDoc = studentDocs.find(d => (d.categoryName || d.name) === reqName);

                          return uploadedDoc ? (
                            <Card key={idx} className="rounded-3xl border-slate-200 shadow-sm overflow-hidden flex flex-col bg-white">
                              <div className="p-3 flex items-center gap-3 border-b border-slate-100 bg-slate-50/50">
                                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                  <FileText className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-slate-800 leading-tight whitespace-nowrap" title={reqName}>{reqName}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{uploadedDoc.uploadedAt ? formatDate(uploadedDoc.uploadedAt) : "Uploaded"}</p>
                                </div>
                                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                              </div>
                              
                              <div 
                                className="relative w-full h-32 bg-slate-100 overflow-hidden cursor-pointer group"
                                onClick={() => setPreviewDoc(uploadedDoc)}
                              >
                                <img 
                                  src={getThumbnailUrl(uploadedDoc.url)} 
                                  alt={uploadedDoc.name}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/400x300/f8fafc/94a3b8?text=Preview+Not+Available"; }}
                                />
                              </div>
                              
                              <div className="p-1.5 border-t border-slate-100 bg-white flex gap-1">
                                <Button variant="ghost" className="flex-1 h-8 text-[10px] font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg" onClick={() => setPreviewDoc(uploadedDoc)}>
                                  <Eye className="w-3 h-3 mr-1.5" /> View
                                </Button>
                                <div className="w-px bg-slate-100 my-1" />
                                <Button variant="ghost" className="flex-1 h-8 text-[10px] font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg" onClick={() => window.open(uploadedDoc.url, '_blank')}>
                                  <ExternalLink className="w-3 h-3 mr-1.5" /> New Tab
                                </Button>
                              </div>
                            </Card>
                          ) : (
                            <Card key={idx} className="rounded-3xl border-dashed border-2 border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-6 text-center h-full min-h-[200px]">
                              <AlertCircle className="h-8 w-8 text-slate-300 mb-3" />
                              <p className="text-xs font-bold text-slate-500 uppercase leading-snug">{reqName}</p>
                              <Badge variant="outline" className="mt-3 bg-red-50 text-red-600 border-red-100 rounded-lg uppercase text-[9px] tracking-widest font-black">Missing</Badge>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <DialogFooter className="p-6 bg-white border-t border-slate-200 flex sm:justify-between items-center gap-4 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider hidden sm:block">
                      {validUploadedDocsCount} of {REQUIRED_DOCS.length} documents uploaded
                    </p>
                    
                    {selectedApp.archivedAt ? (
                      <Badge variant="outline" className="bg-slate-50 text-slate-500 uppercase tracking-widest text-[10px] font-black border-slate-200 px-4 py-2">
                         Archived Record (Read-Only)
                      </Badge>
                    ) : (
                      <div className="flex gap-3 w-full sm:w-auto">
                        <Button 
                          variant="outline" 
                          onClick={() => setIsRejectDialogOpen(true)}
                          disabled={isUpdating || selectedApp.status === 'rejected'}
                          className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 w-full sm:w-auto font-bold h-11 px-6"
                        >
                          Resubmit
                        </Button>
                        <Button 
                          onClick={() => handleUpdateStatus("approved")}
                          disabled={isUpdating || selectedApp.status === 'approved' || validUploadedDocsCount < REQUIRED_DOCS.length}
                          className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto font-bold shadow-md h-11 px-6"
                        >
                          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                          Approve Scholarship
                        </Button>
                      </div>
                    )}
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
             <DialogContent className="rounded-3xl p-4 sm:max-w-2xl md:max-w-3xl lg:max-w-4xl bg-white border-0 shadow-2xl max-h-[85vh] flex flex-col">
               <DialogHeader className="shrink-0">
                 <DialogTitle className="text-xl font-black text-red-600 tracking-tight">Request Resubmit</DialogTitle>
                 <DialogDescription className="font-medium text-slate-500 mt-1">
                   Select the documents that need to be resubmitted and provide a reason. This will be sent directly to the student.
                 </DialogDescription>
               </DialogHeader>
               
               {/* Scrollable Content Area */}
               <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                 {/* Document Selection - Compact Layout */}
                 <div className="space-y-2">
                   <p className="text-sm font-bold text-slate-700">Select documents to resubmit:</p>
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[120px] overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                     {REQUIRED_DOCS.map((docName) => {
                       const isUploaded = studentDocs.some(d => (d.categoryName || d.name) === docName);
                       return (
                         <label 
                           key={docName} 
                           className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                             isUploaded 
                               ? 'hover:bg-blue-50 bg-white border border-slate-200' 
                               : 'opacity-50 cursor-not-allowed bg-slate-100 border border-slate-100'
                           }`}
                         >
                           <input
                             type="checkbox"
                             checked={selectedDocsForResubmit.includes(docName)}
                             onChange={(e) => {
                               if (e.target.checked) {
                                 setSelectedDocsForResubmit([...selectedDocsForResubmit, docName]);
                               } else {
                                 setSelectedDocsForResubmit(selectedDocsForResubmit.filter(d => d !== docName));
                               }
                             }}
                             disabled={!isUploaded}
                             className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 shrink-0"
                           />
                           <span className="text-xs font-medium text-slate-700 truncate" title={docName}>
                             {docName}
                           </span>
                           {isUploaded ? (
                             <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                           ) : (
                             <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />
                           )}
                         </label>
                       );
                     })}
                   </div>
                   {selectedDocsForResubmit.length === 0 && (
                     <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                       <AlertCircle className="h-3 w-3" /> Please select at least one document
                     </p>
                   )}
                 </div>

                 {/* Remarks Section - Compact */}
                 <div className="space-y-2">
                   <p className="text-sm font-bold text-slate-700">Remarks (reason for resubmission):</p>
                   <textarea
                     className="w-full h-20 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none text-sm font-medium shadow-sm transition-all"
                     placeholder="e.g. Your Barangay Clearance is expired. Please upload a valid one."
                     value={rejectReason}
                     onChange={(e) => setRejectReason(e.target.value)}
                   />
                 </div>
               </div>

               {/* Fixed Footer - Always Visible */}
               <DialogFooter className="gap-3 sm:gap-0 shrink-0 pt-4 border-t border-slate-100 bg-white">
                 <Button variant="outline" className="rounded-xl font-bold" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
                 <Button 
                   variant="destructive" 
                   className="rounded-xl font-bold shadow-md" 
                   disabled={!rejectReason.trim() || isUpdating || selectedDocsForResubmit.length === 0} 
                   onClick={async () => {
                     await handleUpdateStatus("rejected", rejectReason);
                   }}
                 >
                   {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                   Confirm Resubmit
                 </Button>
               </DialogFooter>
             </DialogContent>
          </Dialog>

          <Dialog open={!!previewDoc} onOpenChange={(open) => { if (!open) setPreviewDoc(null); }}>
            <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 rounded-3xl overflow-hidden flex flex-col border-0 shadow-2xl bg-slate-900 z-[100] [&>button]:hidden">
              <DialogHeader className="p-4 bg-white shrink-0 flex flex-row items-center justify-between border-b border-slate-200">
                <div className="flex-1 min-w-0 pr-4">
                  <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-800 whitespace-nowrap">
                    {previewDoc?.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs font-bold uppercase tracking-widest mt-1 text-slate-500">
                    Uploaded {previewDoc?.uploadedAt ? formatDate(previewDoc.uploadedAt) : ''}
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.open(previewDoc?.url, '_blank')} 
                    className="font-bold text-xs rounded-xl hidden sm:flex border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" /> Open in New Tab
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setPreviewDoc(null)} 
                    className="rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 bg-slate-50 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </DialogHeader>
              
              <div className="flex-1 w-full relative flex flex-col overflow-hidden bg-slate-900/95">
                {!isPdf && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur-md p-1.5 rounded-full flex items-center gap-1 z-50 border border-white/10 shadow-2xl">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-white hover:bg-white/20 rounded-full h-8 w-8" 
                      onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-xs font-bold text-white w-12 text-center select-none">
                      {Math.round(zoom * 100)}%
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-white hover:bg-white/20 rounded-full h-8 w-8" 
                      onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <div 
                  className={`flex-1 overflow-hidden flex items-center justify-center ${!isPdf ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
                  onMouseDown={!isPdf ? handleMouseDown : undefined}
                  onMouseMove={!isPdf ? handleMouseMove : undefined}
                  onMouseUp={!isPdf ? handleMouseUp : undefined}
                  onMouseLeave={!isPdf ? handleMouseUp : undefined}
                >
                  {isPdf ? (
                    <iframe 
                      src={`${previewDoc?.url}#toolbar=1&navpanes=0&view=FitH`} 
                      className="w-full h-full bg-white shadow-2xl"
                      title={previewDoc?.name || "Document Preview"}
                    />
                  ) : (
                    <img 
                      src={previewDoc?.url} 
                      alt={previewDoc?.name} 
                      draggable={false}
                      style={{ 
                        transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                      }}
                      className="max-h-[90vh] w-auto object-contain drop-shadow-2xl rounded-md pointer-events-none select-none"
                    />
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

        </AdminLayout>
      </PermissionGuard>
    </>
  );
}
