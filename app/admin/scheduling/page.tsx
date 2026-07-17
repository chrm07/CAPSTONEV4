"use client"

import React, { useState, useEffect, useMemo } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { PermissionGuard } from "@/components/permission-guard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  CalendarDays, Plus, Loader2, Banknote, Clock, MapPin, StopCircle, UploadCloud, RotateCcw, ChevronDown, ChevronRight, Search, Edit, Trash2, Archive, Users
} from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

import { useAuth } from "@/contexts/auth-context"
import { collection, onSnapshot, query, doc, setDoc, getDocs, writeBatch, addDoc, where } from "firebase/firestore"
import { db } from "@/lib/firebase"

type Barangay = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const DateWindowDisplay = ({ start, end }: { start?: string, end?: string }) => (
  <div className="flex flex-col items-center justify-center text-center py-1">
    <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">{start || "N/A"}</span>
    <span className="text-[9px] font-black text-slate-400 my-0.5 tracking-widest uppercase">TO</span>
    <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">{end || "N/A"}</span>
  </div>
);

export default function SchedulingPage() {
  const { toast } = useToast(); 
  const { user } = useAuth()
  
  const [schedule, setSchedule] = useState<any>(null)
  const [scheduleHistory, setScheduleHistory] = useState<any[]>([]) 
  const [barangaysList, setBarangaysList] = useState<Barangay[]>([])
  
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const [historyYearFilter, setHistoryYearFilter] = useState("all")

  const [isSubModalOpen, setIsSubModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  
  const [isManageBarangaysOpen, setIsManageBarangaysOpen] = useState(false)
  const [barangaySearch, setBarangaySearch] = useState("")
  
  const [barangaySelectionSearch, setBarangaySelectionSearch] = useState("")
  
  const [isBarangayFormOpen, setIsBarangayFormOpen] = useState(false)
  const [editingBarangay, setEditingBarangay] = useState<Barangay | null>(null)
  const [barangayFormName, setBarangayFormName] = useState("")
  const [isSavingBarangay, setIsSavingBarangay] = useState(false)

  const [isDeleteBarangayOpen, setIsDeleteBarangayOpen] = useState(false)
  const [barangayToDelete, setBarangayToDelete] = useState<Barangay | null>(null)

  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [isCloseSubDialogOpen, setIsCloseSubDialogOpen] = useState(false)
  const [isCloseDistDialogOpen, setIsCloseDistDialogOpen] = useState(false)

  const [subFormData, setSubFormData] = useState({ startDate: "", endDate: "" })
  const [formData, setFormData] = useState({ barangays: [] as string[], startDate: "", endDate: "", startTime: "", distributionAmount: "" })
  
  const [distributionType, setDistributionType] = useState<"regular" | "extension">("regular")
  const [distributionStep, setDistributionStep] = useState(1)

  useEffect(() => {
    let unsubSched: () => void;
    let unsubHist: () => void;
    let unsubBarangays: () => void;

    unsubSched = onSnapshot(doc(db, "settings", "schedule"), (docSnap) => {
      if (docSnap.exists()) {
        setSchedule(docSnap.data());
      } else {
        setDoc(doc(db, "settings", "schedule"), {
          submissionOpen: false,
          distributionOpen: false,
        }, { merge: true })
      }
      setIsFetching(false);
    });

    const histQ = query(collection(db, "schedule_history"));
    unsubHist = onSnapshot(histQ, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      historyData.sort((a: any, b: any) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());
      setScheduleHistory(historyData);
    });

    unsubBarangays = onSnapshot(doc(db, "settings", "barangays"), (docSnap) => {
      if (docSnap.exists() && docSnap.data().list) {
        const rawList = docSnap.data().list;
        const mappedList: Barangay[] = rawList.map((b: any) => {
          if (typeof b === "string") {
            return {
              id: Math.random().toString(36).substr(2, 9),
              name: b,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
          return b;
        });
        
        setBarangaysList(mappedList.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })));
      } else {
        setBarangaysList([]);
      }
    });

    return () => {
      if (unsubSched) unsubSched();
      if (unsubHist) unsubHist();
      if (unsubBarangays) unsubBarangays();
    }
  }, []);

  const handleOpenSubmissions = async () => {
    if (!subFormData.startDate || !subFormData.endDate) return toast({ variant: "destructive", title: "Error", description: "Please fill in dates." })
    setIsLoading(true)
    try {
      await setDoc(doc(db, "settings", "schedule"), {
        submissionOpen: true,
        submissionStart: subFormData.startDate,
        submissionEnd: subFormData.endDate
      }, { merge: true })

      const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "student")));
      const notifPromises = usersSnap.docs.map(u => 
        addDoc(collection(db, "notifications"), {
          to: "student",
          userId: u.id,
          message: `The scholarship submission portal is now open from ${formatDate(subFormData.startDate)} to ${formatDate(subFormData.endDate)}.`,
          link: "/student/documents",
          read: false,
          createdAt: new Date().toISOString()
        })
      );
      await Promise.all(notifPromises);

      toast({ title: "Success", description: "Submission portal is now OPEN." })
      setIsSubModalOpen(false)
      setSubFormData({ startDate: "", endDate: "" })
    } catch (e) { 
      toast({ variant: "destructive", title: "Error", description: "Failed to open submissions." }) 
    } 
    finally { setIsLoading(false) }
  }

  const handleCloseSubmissions = async () => {
    setIsLoading(true)
    try {
      await setDoc(doc(db, "settings", "schedule"), { submissionOpen: false }, { merge: true })
      toast({ title: "Closed", description: "Submission portal is now CLOSED." })
      setIsCloseSubDialogOpen(false)
    } catch (e) { 
      toast({ variant: "destructive", title: "Error", description: "Failed to close submissions." }) 
    } 
    finally { setIsLoading(false) }
  }

  const handleOpenDistribution = async () => {
    if (distributionType === "regular") {
      if (!formData.startDate || !formData.endDate || formData.barangays.length === 0 || !formData.startTime || !formData.distributionAmount) {
        return toast({ variant: "destructive", title: "Error", description: "Please fill required fields." })
      }
    } else {
      if (!formData.startDate || !formData.endDate) {
        return toast({ variant: "destructive", title: "Error", description: "Please fill start and end dates." })
      }
    }

    setIsLoading(true)
    try {
      const schedulePayload: any = {
        distributionOpen: true, 
      };

      if (distributionType === "regular") {
        schedulePayload.distributionStart = formData.startDate;
        schedulePayload.distributionEnd = formData.endDate;
        schedulePayload.distributionTime = formData.startTime;
        schedulePayload.distributionAmount = formData.distributionAmount;
        schedulePayload.targetBarangays = formData.barangays;
        schedulePayload.isExtended = false;
        schedulePayload.extensionStart = null;
        schedulePayload.extensionEnd = null;
      } else {
        schedulePayload.isExtended = true;
        schedulePayload.extensionStart = formData.startDate;
        schedulePayload.extensionEnd = formData.endDate;
      }

      await setDoc(doc(db, "settings", "schedule"), schedulePayload, { merge: true })

      let targetUserIds: string[] = [];

      if (distributionType === "extension") {
          const appsSnap = await getDocs(query(collection(db, "applications"), where("isApproved", "==", true)));
          targetUserIds = appsSnap.docs
              .filter(d => {
                const appData = d.data();
                return !appData.isClaimed && formData.barangays.includes(appData.barangay);
              })
              .map(d => d.data().studentId);
          targetUserIds = [...new Set(targetUserIds)]; 
      } else {
          const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "student")));
          targetUserIds = usersSnap.docs
              .filter(u => {
                const userData = u.data();
                return formData.barangays.includes(userData.barangay);
              })
              .map(u => u.id);
      }

      const selectedBarangaysStr = formData.barangays.length === 1 
        ? formData.barangays[0] 
        : `${formData.barangays.length} barangays`;
      
      const message = distributionType === "extension"
        ? `Financial distribution has been extended from ${formatDate(formData.startDate)} to ${formatDate(formData.endDate)}. Please proceed to claim your payout at your barangay.`
        : `Financial distribution is scheduled from ${formatDate(formData.startDate)} to ${formatDate(formData.endDate)} (${formData.startTime}) for ${selectedBarangaysStr}.`;

      const notifPromises = targetUserIds.map(userId => 
        addDoc(collection(db, "notifications"), {
          to: "student",
          userId: userId,
          message: message,
          link: "/student/qrcode",
          read: false,
          createdAt: new Date().toISOString()
        })
      );
      await Promise.all(notifPromises);

      toast({ title: "Success", description: distributionType === "extension" ? "Distribution successfully extended." : "Financial Distribution is now OPEN." })
      setIsAddModalOpen(false)
      resetForm()
    } catch (e) { 
      toast({ variant: "destructive", title: "Error", description: "Failed to open distribution." }) 
    } 
    finally { setIsLoading(false) }
  }

  const handleCloseDistribution = async () => {
    setIsLoading(true)
    try {
      await setDoc(doc(db, "settings", "schedule"), { distributionOpen: false }, { merge: true })
      toast({ title: "Closed", description: "Financial Distribution is now CLOSED." })
      setIsCloseDistDialogOpen(false)
    } catch (e) { 
      toast({ variant: "destructive", title: "Error", description: "Failed to close distribution." }) 
    } 
    finally { setIsLoading(false) }
  }

  const resetCycle = async () => {
    setIsLoading(true);
    try {
      const batch = writeBatch(db);

      const appsSnapshot = await getDocs(query(collection(db, "applications")));
      const docsSnapshot = await getDocs(query(collection(db, "documents")));
      const allDocs = docsSnapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));

      const studentHistoryMap: Record<string, string> = {};

      appsSnapshot.forEach((appSnap) => {
        const appData = appSnap.data();
        const historyRef = doc(collection(db, "history"));
        
        batch.set(historyRef, {
          ...appData,
          archivedAt: new Date().toISOString(),
          originalAppId: appSnap.id
        });
        
        studentHistoryMap[appData.studentId] = historyRef.id;
        batch.delete(doc(db, "applications", appSnap.id));
      });

      allDocs.forEach(d => {
        if (!d.isArchived) {
          batch.update(doc(db, "documents", d.id), {
            isArchived: true,
            applicationId: studentHistoryMap[d.studentId] || null, 
            archivedAt: new Date().toISOString()
          });
        }
      });

      if (schedule) {
        const scheduleHistRef = doc(collection(db, "schedule_history"));
        batch.set(scheduleHistRef, {
          ...schedule,
          endedAt: new Date().toISOString()
        });
      }

      batch.set(doc(db, "settings", "schedule"), {
        submissionOpen: false, submissionStart: null, submissionEnd: null,
        distributionOpen: false, distributionStart: null, distributionEnd: null,
        distributionTime: null, distributionAmount: null, targetBarangays: null,
        isExtended: false, extensionStart: null, extensionEnd: null
      }, { merge: true });

      await batch.commit();
      
      toast({ title: "Cycle Ended", description: "Applications securely archived. Dashboards reset.", className: "bg-emerald-600 text-white" });
      setIsResetDialogOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to end cycle." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBarangay = async () => {
    if (!barangayFormName.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Barangay name cannot be empty." });
      return;
    }

    const isDuplicate = barangaysList.some(b => b.name.toLowerCase() === barangayFormName.trim().toLowerCase() && b.id !== editingBarangay?.id);
    if (isDuplicate) {
      toast({ variant: "destructive", title: "Error", description: "A barangay with this name already exists." });
      return;
    }

    setIsSavingBarangay(true);
    try {
      const now = new Date().toISOString();
      let updatedList;
      
      if (editingBarangay) {
        const oldName = editingBarangay.name;
        const newName = barangayFormName.trim();
        
        updatedList = barangaysList.map(b => b.id === editingBarangay.id ? { ...b, name: newName, updatedAt: now } : b);
        
        if (oldName !== newName) {
           const batch = writeBatch(db);
           
           const usersSnap = await getDocs(query(collection(db, "users"), where("profileData.barangay", "==", oldName)));
           usersSnap.forEach(userDoc => {
               batch.update(userDoc.ref, { "profileData.barangay": newName });
           });
           
           const appsSnap = await getDocs(query(collection(db, "applications"), where("barangay", "==", oldName)));
           appsSnap.forEach(appDoc => {
               batch.update(appDoc.ref, { "barangay": newName });
           });
           
           await batch.commit();
        }
      } else {
        const newBarangay = { id: Math.random().toString(36).substr(2, 9), name: barangayFormName.trim(), createdAt: now, updatedAt: now };
        updatedList = [...barangaysList, newBarangay];
      }

      await setDoc(doc(db, "settings", "barangays"), { list: updatedList }, { merge: true });
      toast({ title: "Success", description: editingBarangay ? "Barangay updated & synced successfully." : "Barangay added successfully.", className: "bg-emerald-600 text-white" });
      setIsBarangayFormOpen(false);
      setBarangayFormName("");
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save and sync barangay." });
    } finally {
      setIsSavingBarangay(false);
    }
  }

  const confirmDeleteBarangay = async () => {
    if (!barangayToDelete) return;
    setIsSavingBarangay(true);
    try {
      const updatedList = barangaysList.filter(b => b.id !== barangayToDelete.id);
      await setDoc(doc(db, "settings", "barangays"), { list: updatedList }, { merge: true });
      toast({ title: "Success", description: "Barangay removed successfully." });
      setIsDeleteBarangayOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete barangay." });
    } finally {
      setIsSavingBarangay(false);
    }
  }

  const resetForm = () => { 
    setFormData({ barangays: [], startDate: "", endDate: "", startTime: "", distributionAmount: "" });
    setBarangaySelectionSearch("");
    setDistributionType("regular");
    setDistributionStep(1);
  }

  const toggleBarangay = (barangayName: string) => { setFormData(prev => ({ ...prev, barangays: prev.barangays.includes(barangayName) ? prev.barangays.filter(b => b !== barangayName) : [...prev.barangays, barangayName] })) }

  const formatCurrency = (amount: string) => amount ? new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(amount)) : "N/A"
  
  const formatDate = (dateValue: any) => {
    if (!dateValue) return "N/A";
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const availableYears = useMemo(() => {
    const years = new Set(scheduleHistory.map(h => new Date(h.endedAt).getFullYear().toString()));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [scheduleHistory]);

  const filteredHistory = useMemo(() => {
    if (historyYearFilter === "all") return scheduleHistory;
    return scheduleHistory.filter(h => new Date(h.endedAt).getFullYear().toString() === historyYearFilter);
  }, [scheduleHistory, historyYearFilter]);

  const filteredBarangays = useMemo(() => {
    return barangaysList.filter(b => b.name.toLowerCase().includes(barangaySearch.toLowerCase()));
  }, [barangaysList, barangaySearch]);

  const filteredSelectionBarangays = useMemo(() => {
    return barangaysList.filter(b => b.name.toLowerCase().includes(barangaySelectionSearch.toLowerCase()));
  }, [barangaysList, barangaySelectionSearch]);

  return (
    <PermissionGuard permission="scheduling">
      <AdminLayout>
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
          
          <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400 rounded-full filter blur-[80px] opacity-10 -mr-20 -mt-20 pointer-events-none"></div>
            <div className="relative flex items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shrink-0">
                  <CalendarDays className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Global Scheduling</h1>
                  <p className="text-slate-500 font-medium mt-1">Control submission and distribution portals.</p>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="submissions" className="space-y-6">
            <TabsList className="bg-slate-100/50 p-1.5 shadow-sm flex flex-wrap h-auto w-full lg:w-fit justify-start rounded-2xl border border-slate-200 gap-1">
              <TabsTrigger value="submissions" className="gap-2 h-10 px-6 rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"><UploadCloud className="h-4 w-4" /> Submission Portal</TabsTrigger>
              <TabsTrigger value="financial" className="gap-2 h-10 px-6 rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"><Banknote className="h-4 w-4" /> Financial Distribution</TabsTrigger>
              <TabsTrigger value="reset" className="gap-2 h-10 px-6 rounded-xl font-bold text-slate-600 data-[state=active]:bg-red-50 data-[state=active]:text-red-700 data-[state=active]:shadow-sm"><RotateCcw className="h-4 w-4" /> End Cycle</TabsTrigger>
              <TabsTrigger value="history" className="gap-2 h-10 px-6 rounded-xl font-bold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"><Archive className="h-4 w-4" /> History</TabsTrigger>
            </TabsList>

            <TabsContent value="submissions">
              <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-200">
                <div className="h-2 bg-blue-500 w-full" />
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
                  <div>
                    <CardTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">Submission Portal</CardTitle>
                    <CardDescription className="font-medium text-slate-500">Allow students to submit applications for the current cycle.</CardDescription>
                  </div>
                  {!schedule?.submissionOpen ? (
                    <Button onClick={() => setIsSubModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md font-bold h-11 px-6">
                      <Plus className="w-4 h-4 mr-2" /> Open Submissions
                    </Button>
                  ) : (
                    <Button onClick={() => setIsCloseSubDialogOpen(true)} disabled={isLoading} variant="destructive" className="rounded-xl shadow-md font-bold h-11 px-6">
                      <StopCircle className="w-4 h-4 mr-2" /> Close Submissions
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {isFetching ? <div className="py-24 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div> : 
                   (!schedule?.submissionStart && !schedule?.submissionOpen) ? (
                    <div className="py-24 text-center text-slate-400 flex flex-col items-center">
                      <UploadCloud className="h-12 w-12 mb-4 opacity-20" />
                      <p className="font-bold uppercase tracking-widest text-sm text-slate-500">No active submission schedule.</p>
                      <p className="text-xs mt-1">Open a schedule to allow student submissions.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-white">
                        <TableRow className="border-slate-100">
                          <TableHead className="pl-6 font-black text-slate-400 uppercase text-[10px] tracking-widest py-4">Date Range</TableHead>
                          <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="bg-white">
                        <TableRow className="hover:bg-slate-50 transition-colors border-slate-100">
                          <TableCell className="pl-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800">{schedule.submissionStart}</span>
                              <span className="text-[10px] text-slate-500 uppercase tracking-widest">to {schedule.submissionEnd}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {schedule.submissionOpen ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-none shadow-none font-bold px-3 py-1 uppercase tracking-widest text-[10px]">Active</Badge>
                            ) : (
                                <Badge className="bg-red-50 text-red-700 border-none shadow-none font-bold px-3 py-1 uppercase tracking-widest text-[10px]">Closed</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="financial">
              <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-200">
                <div className="h-2 bg-emerald-500 w-full" />
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
                  <div>
                    <CardTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">
                      Financial Distribution Portal
                    </CardTitle>
                    <CardDescription className="font-medium text-slate-500 mt-1">
                      Allow approved scholars to claim their assistance.
                    </CardDescription>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={() => setIsManageBarangaysOpen(true)} className="rounded-xl font-bold h-11 px-4 border-slate-200 text-slate-600 bg-white hover:bg-slate-50">
                      <MapPin className="w-4 h-4 mr-2" /> Manage Barangays
                    </Button>
                    {!schedule?.distributionOpen ? (
                      <Button onClick={() => setIsAddModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-bold h-11 px-6">
                        <Plus className="w-4 h-4 mr-2" /> Open Distribution
                      </Button>
                    ) : (
                      <Button onClick={() => setIsCloseDistDialogOpen(true)} disabled={isLoading} variant="destructive" className="rounded-xl shadow-md font-bold h-11 px-6">
                        <StopCircle className="w-4 h-4 mr-2" /> Close Distribution
                      </Button>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  {isFetching ? (
                    <div className="py-24 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
                  ) : (!schedule?.distributionStart && !schedule?.distributionOpen) ? (
                    <div className="py-24 text-center text-slate-400 flex flex-col items-center">
                      <CalendarDays className="h-12 w-12 mb-4 opacity-20" />
                      <p className="font-bold uppercase tracking-widest text-sm text-slate-500">No active distribution schedule.</p>
                      <p className="text-xs mt-1">Open a schedule to allow QR verification.</p>
                    </div>
                  ) : (
                    <div className="p-6 space-y-8">
                      {/* SECTION 1: PRIMARY DISTRIBUTION */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-emerald-500" /> Primary Distribution Schedule
                        </h3>
                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                          <Table>
                            <TableHeader className="bg-slate-50/50">
                              <TableRow className="border-slate-200">
                                <TableHead className="pl-6 font-black text-slate-400 uppercase text-[10px] tracking-widest py-4">Barangay(s)</TableHead>
                                <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Date Range</TableHead>
                                <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Time</TableHead>
                                <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Amount</TableHead>
                                <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="bg-white">
                                <TableRow className="hover:bg-slate-50 transition-colors border-slate-100">
                                  <TableCell className="pl-6 py-4">
                                    <div className="flex items-start gap-3">
                                      <MapPin className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                                      <div className="flex flex-wrap gap-2 max-w-[280px]">
                                        {schedule.targetBarangays?.map((b: string) => (
                                          <Badge key={b} className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-black px-2.5 py-1 uppercase tracking-wider text-[10px] shadow-sm">
                                            {b}
                                          </Badge>
                                        ))}
                                        {(!schedule.targetBarangays || schedule.targetBarangays.length === 0) && (
                                          <span className="text-sm font-medium text-slate-400 italic">Not specified</span>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <DateWindowDisplay start={schedule.distributionStart} end={schedule.distributionEnd} />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700">
                                      <Clock className="h-4 w-4 text-amber-600/60" />
                                      {schedule.distributionTime || "N/A"}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span className="font-black text-emerald-700 text-sm">
                                      {formatCurrency(schedule.distributionAmount)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {schedule.distributionOpen ? (
                                        <Badge className="bg-emerald-50 text-emerald-700 border-none shadow-none font-bold px-3 py-1 uppercase tracking-widest text-[10px]">Active</Badge>
                                    ) : (
                                        <Badge className="bg-red-50 text-red-700 border-none shadow-none font-bold px-3 py-1 uppercase tracking-widest text-[10px]">Closed</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* SECTION 2: EXTENSION SCHEDULE */}
                      {schedule.isExtended && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                          <h3 className="text-sm font-black uppercase tracking-widest text-purple-600 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-purple-500" /> Extension Period
                          </h3>
                          <div className="border border-purple-200 rounded-2xl overflow-hidden shadow-sm bg-purple-50/30 overflow-x-auto">
                            <Table>
                              <TableHeader className="bg-purple-100/50">
                                <TableRow className="border-purple-200/50">
                                  <TableHead className="pl-6 font-black text-purple-400 uppercase text-[10px] tracking-widest py-4">Targeted</TableHead>
                                  <TableHead className="font-black text-purple-400 uppercase text-[10px] tracking-widest text-center">Date Range</TableHead>
                                  <TableHead className="font-black text-purple-400 uppercase text-[10px] tracking-widest text-center">Time</TableHead>
                                  <TableHead className="font-black text-purple-400 uppercase text-[10px] tracking-widest text-center">Amount</TableHead>
                                  <TableHead className="font-black text-purple-400 uppercase text-[10px] tracking-widest text-center">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody className="bg-white">
                                  <TableRow className="hover:bg-purple-50/50 transition-colors border-purple-100">
                                    <TableCell className="pl-6 py-4">
                                      <div className="flex items-start gap-3">
                                        <Users className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />
                                        <div className="flex flex-col">
                                          <span className="text-sm font-black text-slate-800">Unclaimed Students</span>
                                          <span className="text-[10px] text-slate-500 uppercase tracking-widest">From previous schedule</span>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <DateWindowDisplay start={schedule.extensionStart} end={schedule.extensionEnd} />
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700">
                                        <Clock className="h-4 w-4 text-purple-600/60" />
                                        {schedule.distributionTime || "N/A"}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <span className="font-black text-purple-700 text-sm">
                                        {formatCurrency(schedule.distributionAmount)}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {schedule.distributionOpen ? (
                                          <Badge className="bg-purple-100 text-purple-700 border-none shadow-none font-bold px-3 py-1 uppercase tracking-widest text-[10px]">Extension Active</Badge>
                                      ) : (
                                          <Badge className="bg-red-50 text-red-700 border-none shadow-none font-bold px-3 py-1 uppercase tracking-widest text-[10px]">Closed</Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reset">
               <Card className="rounded-3xl border-red-200 shadow-sm overflow-hidden bg-red-50/50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="h-2 bg-red-600 w-full" />
                  <CardHeader className="pb-6 text-center">
                    <CardTitle className="text-2xl font-black text-red-700 uppercase tracking-tight">End Current Cycle</CardTitle>
                    <CardDescription className="font-bold text-red-900/60 mt-2 max-w-lg mx-auto">
                      Warning: This will move all current applications into the History collection and close both the submission and distribution portals. Students will need to re-apply for the next cycle.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center pb-12">
                     <Button 
                       onClick={() => setIsResetDialogOpen(true)} 
                       className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-black h-14 px-8 text-lg shadow-xl hover:scale-105 transition-transform"
                     >
                       <RotateCcw className="mr-2 h-5 w-5" /> End Cycle & Archive Applications
                     </Button>
                  </CardContent>
               </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-200">
                <div className="h-2 bg-slate-600 w-full" />
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
                  <div>
                    <CardTitle className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                      <Archive className="h-5 w-5 text-slate-500" /> Historical Cycles
                    </CardTitle>
                    <CardDescription className="font-medium text-slate-500 mt-1">
                      A complete log of previous scholarship cycles and their configurations. Click a row to expand details.
                    </CardDescription>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                    <CalendarDays className="h-5 w-5 text-slate-400 ml-2 shrink-0" />
                    <Select value={historyYearFilter} onValueChange={setHistoryYearFilter}>
                      <SelectTrigger className="w-full sm:w-[150px] bg-transparent border-none shadow-none font-black uppercase tracking-widest text-slate-800 h-10">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 font-bold">
                        <SelectItem value="all">All Time</SelectItem>
                        {availableYears.map(year => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  {isFetching ? (
                    <div className="py-24 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-600" /></div>
                  ) : filteredHistory.length === 0 ? (
                    <div className="py-24 text-center text-slate-400 flex flex-col items-center">
                      <Archive className="h-12 w-12 mb-4 opacity-20" />
                      <p className="font-bold uppercase tracking-widest text-sm text-slate-500">No History Available.</p>
                      <p className="text-xs mt-1">Past cycles will appear here after they are ended.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto w-full">
                      <Table className="min-w-full">
                        <TableHeader className="bg-white">
                          <TableRow className="border-slate-100">
                            <TableHead className="w-[30%] pl-6 font-black text-slate-400 uppercase text-[10px] tracking-widest py-4">Ended Date</TableHead>
                            <TableHead className="w-[20%] font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Submission Window</TableHead>
                            <TableHead className="w-[20%] font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Distribution Window</TableHead>
                            <TableHead className="w-[15%] font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Amount Displayed</TableHead>
                            <TableHead className="w-[15%] text-right pr-6 font-black text-slate-400 uppercase text-[10px] tracking-widest">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white">
                          {filteredHistory.map((hist) => {
                            const isExpanded = expandedHistoryId === hist.id;
                            return (
                              <React.Fragment key={hist.id}>
                                <TableRow className={`cursor-pointer transition-colors border-slate-100 ${isExpanded ? "bg-slate-50/50" : "hover:bg-slate-50/50"}`} onClick={() => setExpandedHistoryId(isExpanded ? null : hist.id)}>
                                  <TableCell className="pl-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-black text-slate-800">
                                        {formatDate(hist.endedAt)}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <DateWindowDisplay start={hist.submissionStart} end={hist.submissionEnd} />
                                  </TableCell>
                                  <TableCell>
                                    <DateWindowDisplay start={hist.distributionStart} end={hist.distributionEnd} />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      {hist.isExtended && (
                                         <Badge className="bg-purple-100 text-purple-700 border-none shadow-none font-bold px-1.5 py-0 uppercase tracking-widest text-[8px]">EXT</Badge>
                                      )}
                                      <span className="font-black text-emerald-700 text-sm whitespace-nowrap">
                                        {formatCurrency(hist.distributionAmount)}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right pr-6">
                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setExpandedHistoryId(isExpanded ? null : hist.id); }} className="font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 rounded-xl px-4 whitespace-nowrap">
                                      {isExpanded ? "Hide Details" : "View Details"}
                                      <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${isExpanded ? "rotate-180" : ""}`}/>
                                    </Button>
                                  </TableCell>
                                </TableRow>

                                {/* EXPANDABLE CONTENT ROW WITH IMPROVED UI */}
                                {isExpanded && (
                                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-emerald-100">
                                    <TableCell colSpan={5} className="p-0 border-b-0 w-full">
                                      <div className="p-4 sm:p-6 lg:p-8 animate-in slide-in-from-top-2 duration-300 w-full overflow-hidden">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                          
                                          {/* Column 1: Barangays */}
                                          <div className="space-y-3 md:border-r border-slate-100 md:pr-6 md:col-span-2">
                                            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                              <MapPin className="h-4 w-4 text-emerald-500 shrink-0" /> Targeted Barangays
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                              {hist.targetBarangays?.map((b: string) => (
                                                <Badge key={b} className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2.5 py-1 uppercase tracking-wider text-[10px] shadow-sm">
                                                  {b}
                                                </Badge>
                                              ))}
                                              {(!hist.targetBarangays || hist.targetBarangays.length === 0) && (
                                                <span className="text-sm text-slate-500 italic">No barangays specified</span>
                                              )}
                                            </div>
                                          </div>
                                          
                                          {/* Column 2: Timings */}
                                          <div className="space-y-4 md:border-r border-slate-100 md:pr-6 text-center">
                                            <div>
                                              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-center gap-2 mb-1">
                                                <Clock className="h-4 w-4 text-amber-500 shrink-0" /> Time
                                              </h4>
                                              <p className="text-xs font-bold text-slate-700">{hist.distributionTime || "N/A"}</p>
                                            </div>
                                            {hist.isExtended && (
                                              <div>
                                                <h4 className="text-[11px] font-black uppercase tracking-widest text-purple-500 flex items-center justify-center gap-2 mb-1">
                                                  <CalendarDays className="h-4 w-4 text-purple-400 shrink-0" /> Extension
                                                </h4>
                                                <p className="text-xs font-bold text-slate-700">{hist.extensionStart} TO {hist.extensionEnd}</p>
                                              </div>
                                            )}
                                          </div>
                                          
                                          {/* Column 3: Meta */}
                                          <div className="space-y-2 text-center">
                                              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-center gap-2 mb-1">
                                                <Banknote className="h-4 w-4 text-emerald-600 shrink-0" /> Scheduled Amount
                                              </h4>
                                              <p className="text-xl font-black text-emerald-700">{formatCurrency(hist.distributionAmount)}</p>
                                          </div>

                                        </div>
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

          {/* MANAGE BARANGAYS MODAL */}
          <Dialog open={isManageBarangaysOpen} onOpenChange={(open) => { setIsManageBarangaysOpen(open); if (open) setBarangaySearch(""); }}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] rounded-3xl border-0 shadow-2xl p-0 overflow-hidden flex flex-col bg-slate-50">
              <div className="h-2 bg-emerald-600 w-full shrink-0" />
              <DialogHeader className="px-8 py-6 border-b shrink-0 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <DialogTitle className="text-2xl font-black uppercase text-slate-800 tracking-tight flex items-center gap-2"><MapPin className="h-6 w-6 text-emerald-600" /> Manage Barangays</DialogTitle>
                  <DialogDescription className="font-medium text-slate-500 mt-1">Maintain the list of barangays globally available for student registration and payouts.</DialogDescription>
                </div>
                <Button onClick={() => { setEditingBarangay(null); setBarangayFormName(""); setIsBarangayFormOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-bold h-12 px-8 shrink-0 text-base"><Plus className="w-5 h-5 mr-2" /> Add Barangay</Button>
              </DialogHeader>
              <div className="flex-1 overflow-hidden px-8 py-6 flex flex-col gap-6 min-h-0">
                <div className="relative shrink-0">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                  <Input placeholder="Search all barangays..." value={barangaySearch} onChange={(e) => setBarangaySearch(e.target.value)} className="pl-12 h-14 rounded-2xl bg-white border-slate-200 shadow-sm font-medium text-lg" />
                </div>
                <div className="flex-1 overflow-y-auto pr-2">
                  {filteredBarangays.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <MapPin className="h-12 w-12 mb-4 opacity-20" />
                      <p className="font-black text-xl text-slate-500 uppercase tracking-tight">No barangays found</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {filteredBarangays.map((barangay, index) => (
                        <div key={barangay.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-emerald-400 hover:shadow-md transition-all">
                          <div className="flex items-center gap-4 overflow-hidden">
                            <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100 shadow-sm">
                              <span className="font-black text-xl">{index + 1}</span>
                            </div>
                            <span className="font-black text-slate-900 text-xl uppercase tracking-tight whitespace-nowrap">{barangay.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button variant="outline" onClick={() => { setEditingBarangay(barangay); setBarangayFormName(barangay.name); setIsBarangayFormOpen(true); }} className="h-12 px-5 rounded-xl border-slate-200 text-blue-600 hover:bg-blue-50 font-bold text-base"><Edit className="h-5 w-5 sm:mr-2" /><span className="hidden sm:inline">Edit</span></Button>
                            <Button variant="outline" onClick={() => { setBarangayToDelete(barangay); setIsDeleteBarangayOpen(true); }} className="h-12 px-5 rounded-xl border-slate-200 text-red-600 hover:bg-red-50 font-bold text-base"><Trash2 className="h-5 w-5 sm:mr-2" /><span className="hidden sm:inline">Delete</span></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter className="px-8 py-4 border-t bg-white shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] z-10">
                <div className="flex w-full items-center justify-between">
                  <div className="text-sm font-bold text-slate-500">Total Barangays: <span className="text-slate-800 text-lg ml-1">{filteredBarangays.length}</span></div>
                  <Button variant="outline" onClick={() => setIsManageBarangaysOpen(false)} className="rounded-xl font-bold h-12 px-10 text-slate-600 text-base">Close</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* DISTRIBUTION SELECTION MODAL */}
          <Dialog open={isAddModalOpen} onOpenChange={(open) => { setIsAddModalOpen(open); if (!open) { setDistributionStep(1); } }}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 rounded-3xl overflow-hidden border-0 shadow-2xl">
              <div className="h-2 bg-emerald-600 w-full shrink-0" />
              <DialogHeader className="px-6 py-4 border-b shrink-0 bg-white">
                <DialogTitle className="text-xl font-black uppercase text-slate-800 tracking-tight flex items-center gap-2"><Banknote className="h-5 w-5 text-emerald-600" /> {distributionType === "extension" ? "Extend Financial Distribution" : "Open Financial Distribution"}</DialogTitle>
                <DialogDescription className="font-medium text-slate-500 text-sm">{distributionType === "extension" ? "Set the new deadline. Notifications will only be sent to approved students who have not yet claimed their payout." : "Select the targeted barangays and define the distribution schedule for all students."}</DialogDescription>
              </DialogHeader>
              
              {/* Step Indicator */}
              {distributionType === "regular" && (
                <div className="flex items-center justify-center gap-4 py-4 bg-slate-50 border-b border-slate-100 shrink-0">
                  <div className={`flex items-center gap-2 ${distributionStep >= 1 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${distributionStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>1</div>
                    <span className="font-bold text-sm">Type & Barangay</span>
                  </div>
                  <div className="w-12 h-0.5 bg-slate-200"><div className={`h-full bg-emerald-500 transition-all ${distributionStep >= 2 ? 'w-full' : 'w-0'}`} /></div>
                  <div className={`flex items-center gap-2 ${distributionStep >= 2 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${distributionStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
                    <span className="font-bold text-sm">Date, Time & Amount</span>
                  </div>
                </div>
              )}
              
              <div className="flex-1 overflow-y-auto px-6 py-4 bg-slate-50/50 flex flex-col gap-4">
                {/* Distribution Type Selection */}
                <div className="space-y-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Distribution Type <span className="text-red-500">*</span></Label>
                  <Select value={distributionType} onValueChange={(v: any) => { setDistributionType(v); setDistributionStep(1); }}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 focus:bg-white border-slate-200 font-bold text-base"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                      <SelectItem value="regular" className="font-bold text-base py-3">Financial Distribution (New Schedule)</SelectItem>
                      <SelectItem value="extension" className="font-bold text-purple-700 text-base py-3">Extension (Extend Existing Dates for Unclaimed Students)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* STEP 1: Type & Barangay (Regular) OR Dates (Extension) */}
                {distributionType === "regular" ? (
                  distributionStep === 1 ? (
                    <div className="space-y-4 flex flex-col animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <Label className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-600" /> Target Barangays <span className="text-red-500">*</span></Label>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="relative flex-1 sm:flex-none sm:w-40"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" /><Input placeholder="Search..." value={barangaySelectionSearch} onChange={e => setBarangaySelectionSearch(e.target.value)} className="pl-9 h-10 rounded-lg bg-white border-slate-200 text-sm font-medium" /></div>
                            <Button size="sm" variant="outline" onClick={() => setFormData({ ...formData, barangays: filteredSelectionBarangays.map(b => b.name) })} className="rounded-lg font-bold h-10 px-3 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 text-emerald-600 text-xs whitespace-nowrap">Select All</Button>
                            <Button size="sm" variant="outline" onClick={() => setFormData({ ...formData, barangays: [] })} className="rounded-lg font-bold h-10 px-3 text-xs whitespace-nowrap">Clear All</Button>
                          </div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm overflow-y-auto max-h-[240px]">
                          {filteredSelectionBarangays.length === 0 ? (
                            <div className="h-32 flex items-center justify-center text-slate-400 py-8 font-bold text-sm text-center">
                              <div>
                                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                No barangays match your search.
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {filteredSelectionBarangays.map((barangay, index) => (
                                <label key={barangay.id} className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-all ${formData.barangays.includes(barangay.name) ? 'bg-emerald-50 border-emerald-300 shadow-sm ring-1 ring-emerald-100' : 'bg-slate-50 border-slate-200 hover:border-emerald-300 hover:bg-white'}`}>
                                  <input type="checkbox" checked={formData.barangays.includes(barangay.name)} onChange={() => toggleBarangay(barangay.name)} className="w-5 h-5 text-emerald-600 rounded-lg border-slate-300 focus:ring-2 focus:ring-emerald-500 shrink-0 cursor-pointer" />
                                  <span className={`text-xs font-bold uppercase tracking-tight truncate ${formData.barangays.includes(barangay.name) ? 'text-emerald-900' : 'text-slate-700'}`}>{barangay.name}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-xs font-bold text-slate-600 uppercase tracking-widest text-center bg-emerald-50 p-3 rounded-lg border border-emerald-100">{formData.barangays.length} Barangay{formData.barangays.length !== 1 ? 's' : ''} Selected</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-emerald-600 shrink-0" />
                        <div className="flex flex-wrap gap-1.5">
                          {formData.barangays.length > 0 ? formData.barangays.map(b => (
                            <Badge key={b} className="bg-white text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 text-xs">{b}</Badge>
                          )) : <span className="text-sm font-medium text-emerald-600">No barangays selected</span>}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setDistributionStep(1)} className="ml-auto text-emerald-600 hover:bg-emerald-100 h-7 px-2 font-bold text-xs">Edit</Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="space-y-2"><Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Start Date *</Label><Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="h-10 rounded-lg bg-slate-50 focus:bg-white border-slate-200 font-medium text-sm" /></div>
                        <div className="space-y-2"><Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Start Time *</Label><Input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className="h-10 rounded-lg bg-slate-50 focus:bg-white border-slate-200 font-medium text-sm" /></div>
                        <div className="space-y-2"><Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">End Date *</Label><Input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="h-10 rounded-lg bg-slate-50 focus:bg-white border-slate-200 font-medium text-sm" /></div>
                        <div className="space-y-2"><Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Amount (₱) *</Label><Input type="number" placeholder="e.g. 5000" value={formData.distributionAmount} onChange={(e) => setFormData({ ...formData, distributionAmount: e.target.value })} className="h-10 rounded-lg bg-slate-50 focus:bg-white border-slate-200 font-black text-emerald-700" /></div>
                      </div>
                    </div>
                  )
                ) : (
                  /* Extension Type - Simple Form */
                  <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-in fade-in duration-300">
                    <div className="space-y-2 col-span-2 md:col-span-1"><Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">New Start Date *</Label><Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="h-10 rounded-lg bg-slate-50 focus:bg-white border-slate-200 font-medium text-sm" /></div>
                    <div className="space-y-2 col-span-2 md:col-span-1"><Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">New End Date *</Label><Input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="h-10 rounded-lg bg-slate-50 focus:bg-white border-slate-200 font-medium text-sm" /></div>
                  </div>
                )}
              </div>
              
              <DialogFooter className="flex justify-between gap-3 px-6 py-4 border-t shrink-0 bg-white">
                <Button variant="outline" onClick={() => { setIsAddModalOpen(false); resetForm(); setDistributionStep(1); }} className="rounded-xl font-bold h-10 px-6">Cancel</Button>
                {distributionType === "regular" ? (
                  distributionStep === 1 ? (
                    <Button onClick={() => { if (formData.barangays.length > 0) setDistributionStep(2); }} disabled={formData.barangays.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold h-10 px-6 shadow-md">
                      Next Step <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button onClick={handleOpenDistribution} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold h-10 px-6 shadow-md" disabled={isLoading || !formData.startDate || !formData.endDate || !formData.startTime || !formData.distributionAmount}>
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Banknote className="mr-2 h-4 w-4" />} Open Distribution
                    </Button>
                  )
                ) : (
                  <Button onClick={handleOpenDistribution} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold h-10 px-6 shadow-md" disabled={isLoading || !formData.startDate || !formData.endDate}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />} Extend Schedule & Notify
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* NESTED ADD/EDIT BARANGAY MODAL */}
          <Dialog open={isBarangayFormOpen} onOpenChange={setIsBarangayFormOpen}>
            <DialogContent className="sm:max-w-[450px] rounded-3xl p-6 shadow-2xl border-0">
              <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-800">
                  {editingBarangay ? "Edit Barangay" : "Add New Barangay"}
                </DialogTitle>
                <DialogDescription className="font-medium text-slate-500">
                  {editingBarangay ? "Modify the name of the existing barangay." : "Enter a unique name to add it to the global list."}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="barangayName" className="text-xs font-bold uppercase tracking-wider text-slate-700">Barangay Name <span className="text-red-500">*</span></Label>
                  <Input 
                    id="barangayName"
                    autoFocus
                    placeholder="e.g. Barangay 1" 
                    value={barangayFormName}
                    onChange={(e) => setBarangayFormName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBarangay() }}
                    className="h-12 rounded-xl bg-slate-50 focus:bg-white text-base font-bold uppercase"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0 mt-4">
                <Button variant="outline" onClick={() => setIsBarangayFormOpen(false)} disabled={isSavingBarangay} className="rounded-xl font-bold border-slate-200 h-11 px-6">Cancel</Button>
                <Button onClick={handleSaveBarangay} disabled={isSavingBarangay} className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md h-11 px-8">
                  {isSavingBarangay ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingBarangay ? "Save Changes" : "Add Barangay"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* DELETE CONFIRMATION DIALOG */}
          <AlertDialog open={isDeleteBarangayOpen} onOpenChange={setIsDeleteBarangayOpen}>
            <AlertDialogContent className="rounded-3xl border-0 shadow-2xl p-6">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-500" /> Confirm Deletion
                </AlertDialogTitle>
                <AlertDialogDescription className="font-medium text-slate-600 text-base">
                  Are you sure you want to delete <span className="font-black text-slate-900 uppercase">"{barangayToDelete?.name}"</span>? This will remove it from the registration dropdown and cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-6">
                <AlertDialogCancel disabled={isSavingBarangay} className="rounded-xl font-bold border-slate-200 text-slate-600 h-11 px-6">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDeleteBarangay(); }} disabled={isSavingBarangay} className="bg-red-600 hover:bg-red-700 rounded-xl font-bold text-white shadow-md h-11 px-6">
                  {isSavingBarangay ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {isSavingBarangay ? "Deleting..." : "Yes, Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* SUBMISSION MODAL - ENHANCED */}
          <Dialog open={isSubModalOpen} onOpenChange={setIsSubModalOpen}>
            <DialogContent className="sm:max-w-2xl rounded-3xl border-0 shadow-2xl p-0 overflow-hidden">
              <div className="h-2 bg-blue-500 w-full shrink-0" />
              <DialogHeader className="px-8 py-6 border-b shrink-0 bg-white">
                <DialogTitle className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                  <UploadCloud className="h-6 w-6 text-blue-600" /> Open Submission Portal
                </DialogTitle>
                <DialogDescription className="font-medium text-slate-500 mt-2 text-base">
                  Define the date range for students to submit their scholarship applications and documents.
                </DialogDescription>
              </DialogHeader>
              <div className="px-8 py-6 bg-slate-50 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-blue-500" /> Start Date <span className="text-red-500">*</span>
                      </Label>
                      <Input type="date" value={subFormData.startDate} onChange={(e) => setSubFormData({...subFormData, startDate: e.target.value})} className="h-12 rounded-xl bg-slate-50 focus:bg-white border-slate-200 text-base font-medium" />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-blue-500" /> End Date <span className="text-red-500">*</span>
                      </Label>
                      <Input type="date" value={subFormData.endDate} onChange={(e) => setSubFormData({...subFormData, endDate: e.target.value})} className="h-12 rounded-xl bg-slate-50 focus:bg-white border-slate-200 text-base font-medium" />
                    </div>
                  </div>
                  {subFormData.startDate && subFormData.endDate && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 animate-in fade-in">
                      <p className="text-sm font-bold text-blue-900">
                        <span className="uppercase tracking-widest text-[11px] text-blue-600 block mb-1">Submission Window</span>
                        {formatDate(subFormData.startDate)} <span className="text-blue-400 mx-2">→</span> {formatDate(subFormData.endDate)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter className="px-8 py-5 border-t bg-white shrink-0 flex justify-end gap-3">
                <Button variant="outline" className="rounded-xl font-bold h-11 px-6 border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => { setIsSubModalOpen(false); setSubFormData({ startDate: "", endDate: "" }); }}>Cancel</Button>
                <Button onClick={handleOpenSubmissions} className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md h-11 px-8" disabled={isLoading || !subFormData.startDate || !subFormData.endDate}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />} Open Submissions
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={isCloseSubDialogOpen} onOpenChange={setIsCloseSubDialogOpen}>
            <AlertDialogContent className="rounded-3xl border-0 shadow-2xl p-6">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">Close Submissions?</AlertDialogTitle>
                <AlertDialogDescription className="font-medium text-slate-600">
                  Are you sure you want to close the submission portal? Students will no longer be able to upload documents or submit applications until you open it again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4">
                <AlertDialogCancel className="rounded-xl font-bold border-slate-200 text-slate-600">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleCloseSubmissions} className="bg-red-600 hover:bg-red-700 rounded-xl font-bold text-white shadow-md" disabled={isLoading}>{isLoading ? "Closing..." : "Close Submissions"}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={isCloseDistDialogOpen} onOpenChange={setIsCloseDistDialogOpen}>
            <AlertDialogContent className="rounded-3xl border-0 shadow-2xl p-6">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">Close Distribution?</AlertDialogTitle>
                <AlertDialogDescription className="font-medium text-slate-600">
                  Are you sure you want to close the financial distribution portal? QR codes cannot be verified and payouts cannot be processed until it is reopened.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4">
                <AlertDialogCancel className="rounded-xl font-bold border-slate-200 text-slate-600">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleCloseDistribution} className="bg-red-600 hover:bg-red-700 rounded-xl font-bold text-white shadow-md" disabled={isLoading}>{isLoading ? "Closing..." : "Close Distribution"}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
            <AlertDialogContent className="rounded-3xl border-0 shadow-2xl p-6">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-black text-red-600 uppercase tracking-tight">End Current Cycle?</AlertDialogTitle>
                <AlertDialogDescription className="font-medium text-slate-600">
                  This action will: <br/>
                  1. Move all current applications into the History collection.<br/>
                  2. Delete all uploaded documents to clear the slate for students.<br/>
                  3. Close Submission and Distribution portals.<br/>
                  4. Save this cycle to the History Tab.<br/><br/>
                  Are you absolutely sure?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4">
                <AlertDialogCancel className="rounded-xl font-bold border-slate-200 text-slate-600">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetCycle} className="bg-red-600 hover:bg-red-700 rounded-xl font-bold text-white shadow-md" disabled={isLoading}>{isLoading ? "Ending Cycle..." : "End Cycle & Archive"}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

        </div>
      </AdminLayout>
    </PermissionGuard>
  )
}
