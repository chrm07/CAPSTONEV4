"use client"

import React, { useState, useEffect, useMemo } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Users, CheckCircle, Clock, XCircle, TrendingUp, GraduationCap, 
  MapPin, School, BookOpen, UserIcon, ChevronDown, Loader2, Activity, 
  FileSpreadsheet, FileImage, FileBarChart, CalendarDays, Download, Ban, Banknote, Archive, Accessibility, Search
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  Bar, BarChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip,
} from "recharts"

import { PermissionGuard } from "@/components/permission-guard"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"

type ReportScholar = {
  id: string
  studentId: string
  name: string
  email: string
  contactNumber: string
  age: string
  gender: string
  course: string
  schoolName: string
  barangay: string
  yearLevel: string
  applicationStatus: string
  archivedAt?: string
  archiveCycle?: string
  year: string
  isClaimed: boolean
  claimedAt: string
  amountReceived: string
  rejectionReason: string
  isPWD: boolean
}

interface StatCardProps {
  title: string; value: number | string; description: string; icon: React.ReactNode; iconBg: string; iconColor: string;
}

// --- EXTRACTED COMPONENTS ---

const UnclaimedIcon = ({ className }: { className?: string }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <Banknote className="w-full h-full" />
    <div className="absolute w-[120%] h-[2px] bg-current -rotate-45 rounded-full" />
  </div>
)

function StatCard({ title, value, description, icon, iconBg, iconColor }: StatCardProps) {
  return (
    <Card 
      className="relative overflow-hidden transition-all duration-200 border border-slate-100 shadow-sm hover:shadow-md rounded-[20px] bg-white p-5 flex flex-col h-full min-h-[140px] break-inside-avoid w-full"
    >
      <div className="flex flex-row justify-between items-start gap-3 mb-2 w-full">
        <h3 className="text-[11px] lg:text-xs font-black uppercase tracking-widest text-slate-500 leading-snug whitespace-normal break-words flex-1 pr-1">
          {title}
        </h3>
        <div className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl shrink-0 ${iconBg} ${iconColor} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <div className="mt-auto pt-2 flex flex-col">
        <div className="text-3xl lg:text-4xl font-black text-slate-800 leading-none mb-1.5">{value}</div>
        <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-tight whitespace-normal break-words">{description}</p>
      </div>
    </Card>
  )
}

const DateWindowDisplay = ({ start, end }: { start?: string, end?: string }) => (
  <div className="flex flex-col items-center justify-center text-center">
    <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">{start || "N/A"}</span>
    <span className="text-[9px] font-black text-slate-400 my-0.5 tracking-widest uppercase">TO</span>
    <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">{end || "N/A"}</span>
  </div>
);

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) { 
    return ( 
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-50 relative"> 
        <p className="font-black text-slate-800 uppercase tracking-tight">{payload[0].name}</p> 
        <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Count: <span className="text-emerald-600 text-base">{payload[0].value}</span></p> 
      </div> 
    ) 
  }
  return null
}

// --- MAIN PAGE COMPONENT ---

export default function ReportsPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)

  const [activeScholars, setActiveScholars] = useState<ReportScholar[]>([])
  const [historyRecords, setHistoryRecords] = useState<ReportScholar[]>([])
  const [scheduleHistory, setScheduleHistory] = useState<any[]>([])
  const [groupedHistory, setGroupedHistory] = useState<Record<string, ReportScholar[]>>({})
  
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null)
  const [historyYearFilter, setHistoryYearFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    let unsubscribeUsers: () => void;
    let unsubscribeApps: () => void;
    let unsubscribeHistory: () => void;
    let unsubscribeSchedHistory: () => void;

    const setupRealtimeListeners = () => {
      setLoading(true);

      let allUsers: any[] = [];
      let allApps: any[] = [];
      let historyData: any[] = [];

      let usersLoaded = false;
      let appsLoaded = false;
      let historyLoaded = false;

      const processData = () => {
        if (!usersLoaded || !appsLoaded || !historyLoaded) return;

        const activeData = allApps.map((app) => {
          const user = allUsers.find(u => u.id === app.studentId);
          const profile = user?.profileData || {} as any;
          
          let status = "pending";
          if (app.isApproved) status = "approved";
          if (app.isRejected) status = "rejected";

          return {
            id: app.id, 
            studentId: app.studentId, 
            name: app.fullName || profile.fullName || user?.name || "Unknown", 
            email: app.email || user?.email || "Unknown",
            contactNumber: profile.contactNumber || "N/A", 
            age: profile.age || "Unknown", 
            gender: profile.gender || "Unknown", 
            course: app.course || profile.course || "Unknown",
            schoolName: app.school || profile.schoolName || "Unknown", 
            barangay: app.barangay || profile.barangay || "Unknown", 
            yearLevel: app.yearLevel || profile.yearLevel || "Unknown",
            applicationStatus: status,
            year: new Date().getFullYear().toString(),
            isClaimed: !!app.isClaimed,
            claimedAt: app.claimedAt ? new Date(app.claimedAt).toLocaleString() : "N/A",
            amountReceived: app.amountReceived ? `₱${app.amountReceived}` : "N/A",
            rejectionReason: app.remarks || app.rejectionReason || (app.isRejected ? "Failed to resubmit required documents / Verification failed" : "N/A"),
            isPWD: !!app.isPWD || !!profile.isPWD
          };
        });
        setActiveScholars(activeData);

        const formattedHistoryRecords = historyData.map(record => {
          const user = allUsers.find(u => u.id === record.studentId);
          const profile = user?.profileData || {} as any;
          
          let status = "pending";
          if (record.isApproved) {
            status = record.isClaimed ? "claimed" : "unclaimed";
          } else if (record.isRejected) {
            status = "rejected";
          }

          const archivedDate = record.archivedAt || record.createdAt;
          const recordYear = archivedDate ? new Date(archivedDate).getFullYear().toString() : "Unknown";
          const dateStr = archivedDate ? new Date(archivedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Unknown Date";

          return {
            id: record.id, 
            studentId: record.studentId, 
            archiveCycle: `Cycle Ended: ${dateStr}`, 
            name: record.fullName || profile.fullName || user?.name || "Unknown", 
            email: record.email || user?.email || "Unknown",
            contactNumber: profile.contactNumber || "N/A", 
            age: profile.age || "Unknown", 
            gender: profile.gender || "Unknown", 
            course: record.course || profile.course || "Unknown",
            schoolName: record.school || profile.schoolName || "Unknown", 
            barangay: record.barangay || profile.barangay || "Unknown", 
            yearLevel: record.yearLevel || profile.yearLevel || "Unknown", 
            applicationStatus: status, 
            archivedAt: archivedDate,
            year: recordYear,
            isClaimed: !!record.isClaimed,
            claimedAt: record.claimedAt ? new Date(record.claimedAt).toLocaleString() : "N/A",
            amountReceived: record.amountReceived ? `₱${record.amountReceived}` : "N/A",
            rejectionReason: record.remarks || record.rejectionReason || (record.isRejected ? "Failed verification / Incomplete docs" : "N/A"),
            isPWD: !!record.isPWD || !!profile.isPWD
          };
        });
        setHistoryRecords(formattedHistoryRecords);

        const grouped = formattedHistoryRecords.reduce((acc, curr) => {
          const cycle = curr.archiveCycle || "Unknown Cycle";
          if (!acc[cycle]) acc[cycle] = [];
          acc[cycle].push(curr);
          return acc;
        }, {} as Record<string, ReportScholar[]>);
        
        setGroupedHistory(grouped);
        setLoading(false);
      };

      const usersQ = query(collection(db, "users"), where("role", "==", "student"));
      unsubscribeUsers = onSnapshot(usersQ, (snap) => {
        allUsers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        usersLoaded = true;
        processData();
      });

      const appsQ = query(collection(db, "applications"), where("isSubmitted", "==", true));
      unsubscribeApps = onSnapshot(appsQ, (snap) => {
        allApps = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        appsLoaded = true;
        processData();
      });

      const historyQ = query(collection(db, "history"));
      unsubscribeHistory = onSnapshot(historyQ, (snap) => {
        historyData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        historyLoaded = true;
        processData();
      });

      const schedHistQ = query(collection(db, "schedule_history"));
      unsubscribeSchedHistory = onSnapshot(schedHistQ, (snap) => {
        setScheduleHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    };

    setupRealtimeListeners();

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeApps) unsubscribeApps();
      if (unsubscribeHistory) unsubscribeHistory();
      if (unsubscribeSchedHistory) unsubscribeSchedHistory();
    };
  }, [toast])

  const availableYears = useMemo(() => {
    const years = new Set(historyRecords.map(r => r.year));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [historyRecords]);

  const displayedHistoryGroups = useMemo(() => {
    if (historyYearFilter === "all") return groupedHistory;
    const filtered: Record<string, ReportScholar[]> = {};
    Object.entries(groupedHistory).forEach(([cycle, data]) => {
      if (data[0]?.year === historyYearFilter) {
        filtered[cycle] = data;
      }
    });
    return filtered;
  }, [historyYearFilter, groupedHistory]);

  const getStats = (data: ReportScholar[]) => {
    const approvedList = data.filter(a => a.applicationStatus === "approved" || a.applicationStatus === "claimed" || a.applicationStatus === "unclaimed");
    const approved = approvedList.length;
    const claimed = approvedList.filter(a => a.isClaimed).length;
    const unclaimed = approved - claimed;
    const pending = data.filter(a => a.applicationStatus === "pending").length;
    const rejected = data.filter(a => a.applicationStatus === "rejected").length;
    const pwd = data.filter(a => a.isPWD).length;
    
    return { total: data.length, approved, claimed, unclaimed, pending, rejected, pwd, approvalRate: data.length > 0 ? Math.round((approved / data.length) * 100) : 0 }
  }

  const formatCurrency = (amount: string) => amount ? new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(amount)) : "N/A"
  
  const formatDate = (dateValue: any) => {
    if (!dateValue) return "N/A";
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "N/A";
    }
  };

  // --- DATA AGGREGATION FOR CHARTS ---
  const getYearLevelData = (data: ReportScholar[]) => { const counts = data.reduce((acc, s) => { acc[s.yearLevel] = (acc[s.yearLevel] || 0) + 1; return acc }, {} as Record<string, number>); const colors: Record<string, string> = { "1st Year": "#3b82f6", "2nd Year": "#10b981", "3rd Year": "#f59e0b", "4th Year": "#ef4444", "5th Year": "#8b5cf6" }; return Object.entries(counts).map(([name, value]) => ({ name, value, fill: colors[name] || "#6b7280" })) }
  const getBarangayData = (data: ReportScholar[]) => { const counts = data.reduce((acc, s) => { acc[s.barangay] = (acc[s.barangay] || 0) + 1; return acc }, {} as Record<string, number>); const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]; return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, value], i) => ({ name, value, fill: colors[i % colors.length] })) }
  const getGenderData = (data: ReportScholar[]) => { const counts = data.reduce((acc, s) => { acc[s.gender] = (acc[s.gender] || 0) + 1; return acc }, {} as Record<string, number>); return Object.entries(counts).map(([name, value]) => ({ name, value, fill: name === "Female" ? "#ec4899" : name === "Male" ? "#3b82f6" : "#6b7280" })) }
  const getAgeData = (data: ReportScholar[]) => { const counts = data.reduce((acc, s) => { const age = Number.parseInt(s.age || "0"); let group = age >= 16 && age <= 18 ? "16-18" : age >= 19 && age <= 21 ? "19-21" : age >= 22 && age <= 24 ? "22-24" : age >= 25 ? "25+" : "Unknown"; acc[group] = (acc[group] || 0) + 1; return acc }, {} as Record<string, number>); const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"]; return ["16-18", "19-21", "22-24", "25+"].map((name, i) => ({ name, value: counts[name] || 0, fill: colors[i] })) }
  const getPWDData = (data: ReportScholar[]) => { const pwdCount = data.filter(s => s.isPWD).length; const nonPwdCount = data.length - pwdCount; return [ { name: "PWD", value: pwdCount, fill: "#8b5cf6" }, { name: "Non-PWD", value: nonPwdCount, fill: "#cbd5e1" } ]; }
  
  const getCourseData = (data: ReportScholar[]) => { 
    const counts = data.reduce((acc, s) => { 
      const programName = s.course && s.course.trim() !== "" ? s.course : "Unspecified";
      acc[programName] = (acc[programName] || 0) + 1; 
      return acc; 
    }, {} as Record<string, number>); 
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"]; 
    return Object.entries(counts).map(([name, value], i) => ({ name, value, fill: colors[i % colors.length] }));
  }
  
  const getSchoolData = (data: ReportScholar[]) => { const counts = data.reduce((acc, s) => { const shortName = s.schoolName.length > 25 ? s.schoolName.substring(0, 25) + "..." : s.schoolName; acc[shortName] = (acc[shortName] || 0) + 1; return acc }, {} as Record<string, number>); const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]; return Object.entries(counts).map(([name, value], i) => ({ name, value, fill: colors[i % colors.length] })) }
  
  const getApplicationStatusData = (stats: any) => [ 
    { name: "Approved", value: stats.approved, fill: "#10b981" }, 
    { name: "Pending", value: stats.pending, fill: "#f59e0b" }, 
    { name: "Unsuccessful", value: stats.rejected, fill: "#ef4444" } 
  ]

  const handleExportExcel = (cycleData: ReportScholar[], exportName: string, reportType: string, scheduledAmount: string) => {
    try {
      let filteredData = cycleData;
      let headers = ["Student Name", "Email", "Mobile Number", "Age", "Gender", "School / Program", "Barangay", "Status", "PWD"];
      
      if (reportType === "Claimed") { 
        filteredData = cycleData.filter(s => s.applicationStatus === "claimed" || (s.applicationStatus === "approved" && s.isClaimed)); 
        headers.push("Date Claimed", "Amount Received"); 
      }
      else if (reportType === "Unclaimed") { 
        filteredData = cycleData.filter(s => s.applicationStatus === "unclaimed" || (s.applicationStatus === "approved" && !s.isClaimed)); 
        headers.push("Payout Status"); 
      }
      else if (reportType === "Unsuccessful") { 
        filteredData = cycleData.filter(s => s.applicationStatus === "rejected"); 
        headers.push("Reason for Rejection / Remarks"); 
      }

      if (filteredData.length === 0) { 
        toast({ title: "No Data", description: `There are no ${reportType.toLowerCase()} records to export.` }); 
        return; 
      }

      const rows = filteredData.map(s => {
        let displayStatus = s.applicationStatus.toUpperCase();
        if (s.applicationStatus === "rejected") displayStatus = "UNSUCCESSFUL";
        if (reportType === "Claimed" || s.isClaimed) displayStatus = "CLAIMED";
        if (reportType === "Unclaimed" || (s.applicationStatus === "approved" && !s.isClaimed)) displayStatus = "UNCLAIMED";

        const fallbackAmount = (s.amountReceived && s.amountReceived !== "N/A") ? s.amountReceived : scheduledAmount;
        
        const baseRow = [ `"${s.name}"`, `"${s.email}"`, `"${s.contactNumber}"`, s.age, s.gender, `"${s.schoolName} / ${s.course}"`, `"${s.barangay}"`, displayStatus, s.isPWD ? "YES" : "NO" ];
        
        if (reportType === "Claimed") baseRow.push(`"${s.claimedAt}"`, `"${fallbackAmount}"`);
        else if (reportType === "Unclaimed") baseRow.push(`"PENDING PAYOUT"`);
        else if (reportType === "Unsuccessful") baseRow.push(`"${s.rejectionReason}"`);
        return baseRow;
      });

      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); 
      const url = URL.createObjectURL(blob); 
      const link = document.body.appendChild(document.createElement("a")); 
      link.href = url; link.download = `Student_List_${reportType}_${exportName.replace(/\s+/g, '_')}.csv`; link.click(); 
      document.body.removeChild(link);
      toast({ title: "Export Successful", description: `${reportType} list has been downloaded.`, className: "bg-emerald-600 text-white" });
    } catch (error) { toast({ title: "Export Failed", variant: "destructive" }); }
  }

  // 🔥 COMPLETELY LOCAL, HIGH-RES VISUAL GRAPH EXPORTER
  // Creates a single custom-dimension PDF so charts are NEVER sliced off!
  const handleExportPDF = async (cycleName: string) => {
    const targetId = `pdf-charts-export-${cycleName.replace(/\s+/g, '-')}`;
    const element = document.getElementById(targetId);
    
    if (!element) {
      toast({ title: "Export Failed", description: "Could not find the graphs.", variant: "destructive" });
      return;
    }

    toast({ 
      title: "Generating PDF...", 
      description: "Taking a snapshot of your graphs...", 
      className: "bg-blue-600 text-white" 
    });

    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      // Temporarily force desktop formatting for the DOM so the responsive charts don't get squished
      const originalWidth = element.style.width;
      const originalMaxWidth = element.style.maxWidth;
      const originalBg = element.style.backgroundColor;
      const originalPadding = element.style.padding;

      element.style.width = "1200px";
      element.style.maxWidth = "1200px";
      element.style.backgroundColor = "#ffffff";
      element.style.padding = "40px";

      const canvas = await html2canvas(element, { 
        scale: 2, // 2x scale for crisp high-definition charts
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1200
      });

      // Restore the DOM immediately after capture
      element.style.width = originalWidth;
      element.style.maxWidth = originalMaxWidth;
      element.style.backgroundColor = originalBg;
      element.style.padding = originalPadding;

      // Use JPEG because it's significantly smaller file size than PNG for large graphs
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      // We set the PDF size to exactly match the canvas! 
      // This prevents the graphs from being sliced awkwardly across multiple pages.
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      
      const safeExportName = cycleName.replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`Analytics_${safeExportName}.pdf`);
      
      toast({ title: "Export Successful", description: "Visual report downloaded.", className: "bg-emerald-600 text-white" });
    } catch (error: any) {
      console.error("PDF Export error:", error);
      toast({ 
        title: "Export Failed", 
        description: "An error occurred. Make sure 'html2canvas' and 'jspdf' are installed.", 
        variant: "destructive",
        duration: 8000 
      });
    }
  }

  const renderChart = (data: any[], chartElement: React.ReactNode, emptyMessage: string) => {
    if (loading) return <div className="flex flex-col items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
    if (!data || data.length === 0 || data.every((d) => d.value === 0)) return <div className="flex flex-col items-center justify-center h-full text-slate-400"><p className="font-bold uppercase tracking-widest text-xs">{emptyMessage}</p></div>
    return chartElement
  }

  const activeStats = getStats(activeScholars);

  return (
    <PermissionGuard permission="reports">
      <AdminLayout>
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
          
          <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400 rounded-full filter blur-[80px] opacity-10 -mr-20 -mt-20 pointer-events-none"></div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shrink-0">
                  <FileBarChart className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Reports & Analytics</h1>
                  <p className="text-slate-500 font-medium mt-1">Generate actionable insights based on active or historical data.</p>
                </div>
              </div>
              {activeTab !== "history" && <Badge className="bg-emerald-100 text-emerald-800 text-lg px-4 py-2 border-none shadow-none font-black uppercase tracking-widest hidden sm:flex">Active Cycle</Badge>}
            </div>
          </div>

          <Tabs value={activeTab} className="space-y-6" onValueChange={setActiveTab}>
            <TabsList className="bg-slate-100/50 p-1.5 flex flex-wrap h-auto w-full md:w-fit justify-start rounded-2xl border border-slate-200 gap-1">
              <TabsTrigger value="overview" className="gap-2 h-10 px-6 rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"><TrendingUp className="h-4 w-4" /> Overview</TabsTrigger>
              <TabsTrigger value="demographics" className="gap-2 h-10 px-6 rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"><Users className="h-4 w-4" /> Demographics</TabsTrigger>
              <TabsTrigger value="academic" className="gap-2 h-10 px-6 rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"><GraduationCap className="h-4 w-4" /> Academic</TabsTrigger>
              <TabsTrigger value="history" className="gap-2 h-10 px-6 rounded-xl font-bold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"><Archive className="h-4 w-4" /> History Archives</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-black text-slate-800 uppercase tracking-tight text-xl">Showing Data For: <span className="text-emerald-600">Active Cycle</span></h3>
              </div>

              <div id={`pdf-charts-export-Active_Cycle`} className="bg-slate-50/50 p-4 sm:p-6 lg:p-8 rounded-3xl w-full mx-auto max-w-[1100px]">
                
                <div className="hidden print:block text-center mb-6 border-b border-slate-200 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">Active Scholarship Cycle</h2>
                  <p className="text-slate-500 font-medium text-sm">Historical Analytics & Data Report</p>
                </div>

                <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4 mb-8">
                  <StatCard title="Total Applications" value={activeStats.total} description="Active Submissions" icon={<Users className="h-5 w-5" />} iconBg="bg-blue-50" iconColor="text-blue-600" />
                  <StatCard title="Approved" value={activeStats.approved} description={`${activeStats.approvalRate}% rate`} icon={<CheckCircle className="h-5 w-5" />} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                  <StatCard title="Unsuccessful" value={activeStats.rejected} description="Did not qualify" icon={<XCircle className="h-5 w-5" />} iconBg="bg-red-50" iconColor="text-red-600" />
                  <StatCard title="Persons w/ Disability" value={activeStats.pwd} description="PWD Applicants" icon={<Accessibility className="h-5 w-5" />} iconBg="bg-indigo-50" iconColor="text-indigo-600" />
                </div>

                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                  <Card className="rounded-2xl border-slate-200 shadow-sm bg-white break-inside-avoid">
                    <CardHeader className="pb-1 border-b border-slate-100 mb-2"><CardTitle className="flex items-center gap-2 text-xs font-black uppercase text-slate-700"><Activity className="h-4 w-4 text-emerald-600" /> Application Status</CardTitle></CardHeader>
                    <CardContent className="h-[210px]">
                      {renderChart(getApplicationStatusData(activeStats), 
                        <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={getApplicationStatusData(activeStats)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} isAnimationActive={false}>{getApplicationStatusData(activeStats).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Pie><Tooltip content={<CustomTooltip />} /><Legend /></PieChart></ResponsiveContainer>, "No data."
                      )}
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-slate-200 shadow-sm bg-white break-inside-avoid">
                    <CardHeader className="pb-1 border-b border-slate-100 mb-2"><CardTitle className="flex items-center gap-2 text-xs font-black uppercase text-slate-700"><UserIcon className="h-4 w-4 text-emerald-600" /> Gender Distribution</CardTitle></CardHeader>
                    <CardContent className="h-[210px]">
                      {renderChart(getGenderData(activeScholars), 
                        <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={getGenderData(activeScholars)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} isAnimationActive={false}>{getGenderData(activeScholars).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Pie><Tooltip content={<CustomTooltip />} /><Legend /></PieChart></ResponsiveContainer>, "No data."
                      )}
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-slate-200 shadow-sm bg-white break-inside-avoid">
                    <CardHeader className="pb-1 border-b border-slate-100 mb-2"><CardTitle className="flex items-center gap-2 text-xs font-black uppercase text-slate-700"><Users className="h-4 w-4 text-emerald-600" /> Age Distribution</CardTitle></CardHeader>
                    <CardContent className="h-[210px]">
                      {renderChart(getAgeData(activeScholars), 
                        <ResponsiveContainer width="100%" height="100%"><BarChart data={getAgeData(activeScholars)}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" stroke="#6b7280" fontSize={12} axisLine={false} tickLine={false} /><YAxis stroke="#6b7280" fontSize={12} axisLine={false} tickLine={false} /><Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} /><Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>{getAgeData(activeScholars).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Bar></BarChart></ResponsiveContainer>, "No data."
                      )}
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-slate-200 shadow-sm bg-white break-inside-avoid">
                    <CardHeader className="pb-1 border-b border-slate-100 mb-2"><CardTitle className="flex items-center gap-2 text-xs font-black uppercase text-slate-700"><Accessibility className="h-4 w-4 text-emerald-600" /> PWD Distribution</CardTitle></CardHeader>
                    <CardContent className="h-[210px]">
                      {renderChart(getPWDData(activeScholars), 
                        <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={getPWDData(activeScholars)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} isAnimationActive={false}>{getPWDData(activeScholars).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Pie><Tooltip content={<CustomTooltip />} /><Legend /></PieChart></ResponsiveContainer>, "No data."
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="demographics" className="space-y-6">
              <Card className="rounded-3xl border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-2 border-b border-slate-100 mb-4"><CardTitle className="flex items-center gap-2 text-sm font-black uppercase text-slate-700"><MapPin className="h-4 w-4 text-emerald-600" /> Applicants by Barangay (Active)</CardTitle></CardHeader>
                <CardContent className="h-96">
                  {renderChart(getBarangayData(activeScholars), 
                    <ResponsiveContainer width="100%" height={350}><BarChart data={getBarangayData(activeScholars)} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} /><XAxis dataKey="name" stroke="#6b7280" fontSize={12} axisLine={false} tickLine={false} /><YAxis stroke="#6b7280" axisLine={false} tickLine={false} /><Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} /><Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60} isAnimationActive={false}>{getBarangayData(activeScholars).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Bar></BarChart></ResponsiveContainer>, "No data."
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="academic" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="rounded-3xl border-slate-200 shadow-sm bg-white">
                  <CardHeader className="pb-2 border-b border-slate-100 mb-4"><CardTitle className="flex items-center gap-2 text-sm font-black uppercase text-slate-700"><GraduationCap className="h-4 w-4 text-emerald-600" /> Year Level (Active)</CardTitle></CardHeader>
                  <CardContent className="h-96">
                    {renderChart(getYearLevelData(activeScholars), 
                      <ResponsiveContainer width="100%" height={350}><PieChart margin={{ top: 10, bottom: 10 }}><Pie data={getYearLevelData(activeScholars)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} isAnimationActive={false}>{getYearLevelData(activeScholars).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Pie><Tooltip content={<CustomTooltip />} /><Legend /></PieChart></ResponsiveContainer>, "No data."
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-200 shadow-sm bg-white lg:col-span-2">
                  <CardHeader className="pb-2 border-b border-slate-100 mb-4"><CardTitle className="flex items-center gap-2 text-sm font-black uppercase text-slate-700"><BookOpen className="h-4 w-4 text-emerald-600" /> Applicants by Program (Active)</CardTitle></CardHeader>
                  <CardContent className="h-96">
                    {renderChart(getCourseData(activeScholars), 
                      <ResponsiveContainer width="100%" height={350}><BarChart data={getCourseData(activeScholars)} layout="vertical" margin={{ top: 20, right: 30, left: 0, bottom: 20 }}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} /><XAxis type="number" stroke="#6b7280" axisLine={false} tickLine={false} /><YAxis dataKey="name" type="category" width={220} stroke="#6b7280" fontSize={11} axisLine={false} tickLine={false} /><Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} /><Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false}>{getCourseData(activeScholars).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Bar></BarChart></ResponsiveContainer>, "No data."
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-200 shadow-sm bg-white md:col-span-2 lg:col-span-3">
                  <CardHeader className="pb-2 border-b border-slate-100 mb-4"><CardTitle className="flex items-center gap-2 text-sm font-black uppercase text-slate-700"><School className="h-4 w-4 text-emerald-600" /> Applicants by School (Active)</CardTitle></CardHeader>
                  <CardContent className="h-96">
                    {renderChart(getSchoolData(activeScholars), 
                      <ResponsiveContainer width="100%" height={350}><PieChart margin={{ top: 20, bottom: 20 }}><Pie data={getSchoolData(activeScholars)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} isAnimationActive={false}>{getSchoolData(activeScholars).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Pie><Tooltip content={<CustomTooltip />} /><Legend wrapperStyle={{ paddingTop: '20px' }} /></PieChart></ResponsiveContainer>, "No data."
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
                <div className="h-2 bg-slate-500 w-full" />
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2"><Archive className="h-5 w-5 text-slate-500" /> Historical Cycles</CardTitle>
                    <CardDescription className="font-medium text-slate-500 mt-1">Expand an archived cycle to view its specific data and export options.</CardDescription>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                    <CalendarDays className="h-5 w-5 text-slate-400 ml-2 shrink-0" />
                    <Select value={historyYearFilter} onValueChange={setHistoryYearFilter}>
                      <SelectTrigger className="w-full sm:w-[150px] bg-transparent border-none shadow-none font-black uppercase tracking-widest text-slate-800 h-10"><SelectValue placeholder="Year" /></SelectTrigger>
                      <SelectContent className="rounded-xl font-bold"><SelectItem value="all">All Time</SelectItem>{availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  {loading ? <div className="py-24 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-600" /></div> : 
                   Object.keys(displayedHistoryGroups).length === 0 ? <div className="py-24 text-center text-slate-400 flex flex-col items-center"><Archive className="h-12 w-12 mb-4 opacity-20" /><p className="font-bold uppercase tracking-widest text-sm">No History Available.</p></div> : (
                    <div className="overflow-x-auto w-full">
                      <Table className="min-w-full">
                        <TableHeader className="bg-white">
                          <TableRow className="border-slate-100">
                            <TableHead className="w-[20%] pl-6 font-black text-slate-400 uppercase text-[10px] tracking-widest py-4">Ended Date</TableHead>
                            <TableHead className="w-[15%] font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Submission Window</TableHead>
                            <TableHead className="w-[15%] font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Distribution Window</TableHead>
                            <TableHead className="w-[15%] font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Scheduled Amount</TableHead>
                            <TableHead className="w-[15%] font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Approved</TableHead>
                            <TableHead className="w-[20%] text-right pr-6 font-black text-slate-400 uppercase text-[10px] tracking-widest">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white">
                          {Object.entries(displayedHistoryGroups).sort((a, b) => b[0].localeCompare(a[0])).map(([cycle, data]) => {
                            const cycleStats = getStats(data);
                            const isExpanded = expandedCycle === cycle;
                            const cycleDateStr = cycle.replace("Cycle Ended: ", "").trim();
                            const matchedSchedule = scheduleHistory.find(sh => formatDate(sh.endedAt) === cycleDateStr);
                            const scheduledAmountText = matchedSchedule?.distributionAmount ? `₱${matchedSchedule.distributionAmount}` : "N/A";

                            const filteredStudents = data.filter(s => 
                              (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (s.email || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (s.course || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (s.schoolName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (s.barangay || "").toLowerCase().includes(searchQuery.toLowerCase())
                            );

                            return (
                              <React.Fragment key={cycle}>
                                <TableRow className={`cursor-pointer transition-colors border-slate-100 ${isExpanded ? "bg-emerald-50/50 border-b-emerald-100" : "hover:bg-slate-50/50"}`} 
                                  onClick={() => { 
                                    setExpandedCycle(isExpanded ? null : cycle);
                                    if (!isExpanded) setSearchQuery("");
                                  }}
                                >
                                  <TableCell className="pl-6 py-4 font-black text-slate-800 text-sm whitespace-nowrap">{cycleDateStr}</TableCell>
                                  <TableCell><DateWindowDisplay start={matchedSchedule?.submissionStart} end={matchedSchedule?.submissionEnd} /></TableCell>
                                  <TableCell><DateWindowDisplay start={matchedSchedule?.distributionStart} end={matchedSchedule?.distributionEnd} /></TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      {matchedSchedule?.isExtended && <Badge className="bg-purple-100 text-purple-700 border-none shadow-none font-bold px-1.5 py-0 uppercase tracking-widest text-[8px]">EXT</Badge>}
                                      <span className="font-black text-emerald-700 text-sm whitespace-nowrap">{scheduledAmountText}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center font-black text-slate-600 text-sm">{cycleStats.approved}</TableCell>
                                  <TableCell className="text-right pr-6"><Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setExpandedCycle(isExpanded ? null : cycle); if (!isExpanded) setSearchQuery(""); }} className="font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl px-4">{isExpanded ? "Hide Reports" : "View Reports"}<ChevronDown className={`w-4 h-4 ml-1 transition-transform ${isExpanded ? "rotate-180" : ""}`}/></Button></TableCell>
                                </TableRow>

                                {isExpanded && (
                                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-emerald-100">
                                    <TableCell colSpan={6} className="p-0 border-b-0 w-full">
                                      <div className="p-4 sm:p-6 lg:p-8 animate-in slide-in-from-top-2 duration-300 w-full">
                                        
                                        <Card className="rounded-3xl border-slate-200 shadow-sm bg-white overflow-hidden mb-8 print:hidden">
                                          <div className="h-1 bg-emerald-500 w-full" />
                                          <CardHeader className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                              <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                                                <Download className="h-5 w-5 text-emerald-600" /> GENERATE SPECIFIC REPORTS
                                              </CardTitle>
                                              <CardDescription className="font-medium text-slate-500 mt-1">Download detailed lists for {cycle}.</CardDescription>
                                            </div>
                                          </CardHeader>
                                          <CardContent className="pt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                             <Button onClick={() => handleExportExcel(filteredStudents, cycle, 'All', scheduledAmountText)} variant="outline" className="h-auto py-3 px-2 flex flex-col items-center justify-center rounded-xl border-slate-200 font-bold group gap-1.5"><FileSpreadsheet className="h-5 w-5 text-blue-500 shrink-0 group-hover:scale-110 transition-transform" /><span className="text-center text-[10px] uppercase tracking-tight whitespace-normal leading-tight">All Students<br/>(XLSX)</span></Button>
                                             <Button onClick={() => handleExportExcel(filteredStudents, cycle, 'Claimed', scheduledAmountText)} variant="outline" className="h-auto py-3 px-2 flex flex-col items-center justify-center rounded-xl border-slate-200 font-bold group gap-1.5"><Banknote className="h-5 w-5 text-teal-500 shrink-0 group-hover:scale-110 transition-transform" /><span className="text-center text-[10px] uppercase tracking-tight whitespace-normal leading-tight">Claimed List<br/>(XLSX)</span></Button>
                                             <Button onClick={() => handleExportExcel(filteredStudents, cycle, 'Unclaimed', scheduledAmountText)} variant="outline" className="h-auto py-3 px-2 flex flex-col items-center justify-center rounded-xl border-slate-200 font-bold group gap-1.5"><UnclaimedIcon className="h-5 w-5 text-red-500 shrink-0 group-hover:scale-110 transition-transform" /><span className="text-center text-[10px] uppercase tracking-tight whitespace-normal leading-tight text-red-600">Unclaimed<br/>(XLSX)</span></Button>
                                             <Button onClick={() => handleExportExcel(filteredStudents, cycle, 'Unsuccessful', scheduledAmountText)} variant="outline" className="h-auto py-3 px-2 flex flex-col items-center justify-center rounded-xl border-slate-200 font-bold group gap-1.5"><XCircle className="h-5 w-5 text-red-500 shrink-0 group-hover:scale-110 transition-transform" /><span className="text-center text-[10px] uppercase tracking-tight whitespace-normal leading-tight">Unsuccessful List<br/>(XLSX)</span></Button>
                                             
                                             {/* 🔥 NEW GRAPH EXPORTER */}
                                             <Button onClick={() => handleExportPDF(cycle)} variant="outline" className="h-auto py-3 px-2 flex flex-col items-center justify-center rounded-xl border-slate-200 font-bold group gap-1.5">
                                               <FileImage className="h-5 w-5 text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
                                               <span className="text-center text-[10px] uppercase tracking-tight whitespace-normal leading-tight">Export Graphs<br/>(PDF)</span>
                                             </Button>
                                          </CardContent>
                                        </Card>

                                        <div id={`pdf-charts-export-${cycle.replace(/\s+/g, '-')}`} className="bg-slate-50/50 p-4 sm:p-6 lg:p-8 rounded-3xl w-full mx-auto max-w-[1100px]">
                                          
                                          <div className="hidden print:block text-center mb-6 border-b border-slate-200 pb-4">
                                            <h2 className="text-2xl font-black text-slate-900 uppercase">{cycle}</h2>
                                            <p className="text-slate-500 font-medium text-sm">Historical Analytics & Data Report</p>
                                          </div>

                                          <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-3 mb-8 w-full">
                                            <StatCard title="Total Applications" value={cycleStats.total} description="Archived records" icon={<Users className="h-4 w-4 sm:h-5 sm:w-5" />} iconBg="bg-blue-50" iconColor="text-blue-600" />
                                            <StatCard title="Approved" value={cycleStats.approved} description={`${cycleStats.approvalRate}% rate`} icon={<CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                                            <StatCard title="Unsuccessful" value={cycleStats.rejected} description="Did not qualify" icon={<XCircle className="h-4 w-4 sm:h-5 sm:w-5" />} iconBg="bg-red-50" iconColor="text-red-600" />
                                            <StatCard title="Persons w/ Disability" value={cycleStats.pwd} description="PWD Applicants" icon={<Accessibility className="h-4 w-4 sm:h-5 sm:w-5" />} iconBg="bg-indigo-50" iconColor="text-indigo-600" />
                                            <StatCard title="Claimed (Paid)" value={cycleStats.claimed} description="Successful payouts" icon={<Banknote className="h-4 w-4 sm:h-5 sm:w-5" />} iconBg="bg-teal-50" iconColor="text-teal-600" />
                                            <StatCard title="Unclaimed" value={cycleStats.unclaimed} description="Missed payouts" icon={<UnclaimedIcon className="h-4 w-4 sm:h-5 sm:w-5" />} iconBg="bg-red-50" iconColor="text-red-600" />
                                          </div>

                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <Card className="rounded-2xl border-slate-200 shadow-sm bg-white" style={{ pageBreakInside: 'avoid' }}>
                                              <CardHeader className="pb-1 border-b border-slate-100 mb-2"><CardTitle className="flex items-center gap-2 text-xs font-black uppercase text-slate-700"><UserIcon className="h-4 w-4 text-emerald-600" /> Gender Distribution</CardTitle></CardHeader>
                                              <CardContent className="h-[210px]">
                                                {renderChart(getGenderData(data), <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={getGenderData(data)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} isAnimationActive={false}>{getGenderData(data).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Pie><Tooltip content={<CustomTooltip />} /><Legend /></PieChart></ResponsiveContainer>, "No gender data.")}
                                              </CardContent>
                                            </Card>
                                            <Card className="rounded-2xl border-slate-200 shadow-sm bg-white" style={{ pageBreakInside: 'avoid' }}>
                                              <CardHeader className="pb-1 border-b border-slate-100 mb-2"><CardTitle className="flex items-center gap-2 text-xs font-black uppercase text-slate-700"><Users className="h-4 w-4 text-emerald-600" /> Age Distribution</CardTitle></CardHeader>
                                              <CardContent className="h-[210px]">
                                                {renderChart(getAgeData(data), <ResponsiveContainer width="100%" height="100%"><BarChart data={getAgeData(data)}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false}/><YAxis fontSize={12} axisLine={false} tickLine={false}/><Tooltip content={<CustomTooltip />} cursor={{fill:'#f8fafc'}}/><Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>{getAgeData(data).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Bar></BarChart></ResponsiveContainer>, "No age data.")}
                                              </CardContent>
                                            </Card>
                                            <Card className="rounded-2xl border-slate-200 shadow-sm bg-white" style={{ pageBreakInside: 'avoid' }}>
                                              <CardHeader className="pb-1 border-b border-slate-100 mb-2"><CardTitle className="flex items-center gap-2 text-xs font-black uppercase text-slate-700"><Accessibility className="h-4 w-4 text-emerald-600" /> PWD Distribution</CardTitle></CardHeader>
                                              <CardContent className="h-[210px]">
                                                {renderChart(getPWDData(data), <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={getPWDData(data)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} isAnimationActive={false}>{getPWDData(data).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Pie><Tooltip content={<CustomTooltip />} /><Legend /></PieChart></ResponsiveContainer>, "No PWD data.")}
                                              </CardContent>
                                            </Card>
                                            <Card className="rounded-2xl border-slate-200 shadow-sm bg-white" style={{ pageBreakInside: 'avoid' }}>
                                              <CardHeader className="pb-1 border-b border-slate-100 mb-2"><CardTitle className="flex items-center gap-2 text-xs font-black uppercase text-slate-700"><MapPin className="h-4 w-4 text-emerald-600" /> Top Barangays</CardTitle></CardHeader>
                                              <CardContent className="h-[210px]">
                                                {renderChart(getBarangayData(data), <ResponsiveContainer width="100%" height="100%"><BarChart data={getBarangayData(data)}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false}/><YAxis fontSize={12} axisLine={false} tickLine={false}/><Tooltip content={<CustomTooltip />} cursor={{fill:'#f8fafc'}}/><Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50} isAnimationActive={false}>{getBarangayData(data).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Bar></BarChart></ResponsiveContainer>, "No barangay data.")}
                                              </CardContent>
                                            </Card>
                                          </div>
                                        </div>

                                        <Card className="rounded-3xl border-slate-200 shadow-sm mt-8 print:hidden bg-white w-full">
                                          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-800 flex items-center gap-2"><BookOpen className="w-4 h-4 text-emerald-600" /> Students - {cycleDateStr}</CardTitle>
                                            <div className="relative w-full sm:w-64">
                                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                              <Input 
                                                placeholder="Search students..." 
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-9 h-9 bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-xl text-sm"
                                              />
                                            </div>
                                          </CardHeader>
                                          <CardContent className="p-0 overflow-hidden w-full">
                                            <div className="overflow-x-auto custom-scrollbar w-full max-h-[400px] overflow-y-auto">
                                              <Table className="min-w-[800px] w-full">
                                                <TableHeader className="bg-white sticky top-0 shadow-sm z-10">
                                                  <TableRow className="border-slate-100">
                                                    <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest pl-4 py-4 w-[25%]">Student Name</TableHead>
                                                    <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest w-[30%]">School / Program</TableHead>
                                                    <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest w-[15%]">Barangay</TableHead>
                                                    <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest text-center w-[15%]">Status</TableHead>
                                                    <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest pr-4 text-right w-[15%]">Amount Claimed</TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {filteredStudents.length > 0 ? filteredStudents.map(s => (
                                                    <TableRow key={s.id} className="hover:bg-slate-50 transition-colors border-slate-100">
                                                      <TableCell className="pl-4 py-3">
                                                        <div className="font-bold text-slate-800 text-sm whitespace-nowrap">{s.name}</div>
                                                        <div className="text-slate-400 font-bold text-[10px] tracking-widest mt-0.5">{s.contactNumber} • {s.gender.charAt(0)}</div>
                                                      </TableCell>
                                                      <TableCell className="whitespace-normal leading-tight">
                                                        <div className="flex flex-col gap-0.5">
                                                          <span className="font-bold text-slate-700 text-xs break-words line-clamp-1" title={s.schoolName}>{s.schoolName}</span>
                                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest break-words line-clamp-1" title={s.course}>{s.course}</span>
                                                        </div>
                                                      </TableCell>
                                                      <TableCell>
                                                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 shadow-none text-[10px] whitespace-nowrap">{s.barangay}</Badge>
                                                      </TableCell>
                                                      <TableCell className="text-center">
                                                        <Badge className={`shadow-none font-bold uppercase tracking-widest text-[9px] border-none ${
                                                          s.applicationStatus === "claimed" || s.applicationStatus === "approved" ? "bg-emerald-100 text-emerald-700" : 
                                                          s.applicationStatus === "unclaimed" || s.applicationStatus === "rejected" ? "bg-red-100 text-red-700" : 
                                                          "bg-amber-100 text-amber-700"
                                                        }`}>
                                                          {s.applicationStatus === "rejected" ? "Unsuccessful" : s.applicationStatus}
                                                        </Badge>
                                                      </TableCell>
                                                      <TableCell className="pr-4 font-black text-slate-700 text-xs text-right">
                                                         {s.applicationStatus === "claimed" || (s.applicationStatus === "approved" && s.isClaimed) ? ((s.amountReceived && s.amountReceived !== "N/A") ? s.amountReceived : scheduledAmountText) : <span className="text-slate-300">-</span>}
                                                      </TableCell>
                                                    </TableRow>
                                                  )) : (
                                                    <TableRow>
                                                      <TableCell colSpan={5} className="text-center py-8 text-slate-500 font-medium">No students found matching your search.</TableCell>
                                                    </TableRow>
                                                  )}
                                                </TableBody>
                                              </Table>
                                            </div>
                                          </CardContent>
                                        </Card>

                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </AdminLayout>
    </PermissionGuard>
  )
}
