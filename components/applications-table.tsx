"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { MoreHorizontal, Check, X, FileText, Loader2, ExternalLink, ChevronRight, User } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"

// 🔥 IMPORT FIRESTORE REAL-TIME UTILS
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"

import { 
  updateApplicationStatusDb, 
  createNotificationDb, 
  type Application as BaseApplication,
  type Document 
} from "@/lib/storage"

type Application = BaseApplication & { studentPhoto?: string }

interface ApplicationsTableProps {
  limit?: number
}

const openBase64InNewTab = async (base64Data: string) => {
  try {
    const response = await fetch(base64Data)
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    window.open(blobUrl, '_blank')
  } catch (error) {
    console.error("Failed to open document", error)
    window.open(base64Data, '_blank')
  }
}

export function ApplicationsTable({ limit }: ApplicationsTableProps) {
  const { toast } = useToast()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false)
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [studentDocs, setStudentDocs] = useState<Document[]>([])
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  
  const [activeDocument, setActiveDocument] = useState<Document | null>(null)
  
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [applicationToReject, setApplicationToReject] = useState<Application | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [isRejecting, setIsRejecting] = useState(false)
  const [isApproving, setIsApproving] = useState<string | null>(null)

  // 🔥 REAL-TIME LISTENER FOR APPLICATIONS & USER PHOTOS
  useEffect(() => {
    let unsubscribeUsers: () => void;
    let unsubscribeApps: () => void;

    const setupRealtimeListeners = () => {
      setLoading(true);

      // Maintain a local map of user photos
      let userPhotos: Record<string, string> = {};

      // 1. Listen to Users for photos
      const usersQ = query(collection(db, "users"));
      unsubscribeUsers = onSnapshot(usersQ, (usersSnap) => {
        const newPhotos: Record<string, string> = {};
        usersSnap.docs.forEach((doc) => {
          const data = doc.data();
          newPhotos[doc.id] = data.profileData?.studentPhoto || data.profilePicture || "";
        });
        userPhotos = newPhotos;
        
        // Re-map current applications with new photos if users update
        setApplications(prevApps => prevApps.map(app => ({
           ...app,
           studentPhoto: newPhotos[app.studentId] || ""
        })));
      });

      // 2. Listen to Applications
      const appsQ = query(collection(db, "applications"));
      unsubscribeApps = onSnapshot(appsQ, (snapshot) => {
        const apps = snapshot.docs.map((doc) => ({
          id: doc.id,
          studentPhoto: userPhotos[doc.data().studentId] || "",
          ...doc.data(),
        } as Application));

        // Sort by newest first
        apps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        const limitedApplications = limit ? apps.slice(0, limit) : apps;
        setApplications(limitedApplications);
        setLoading(false);
      }, (error) => {
        console.error("Error connecting to live applications:", error);
        toast({ title: "Error", description: "Failed to load live applications.", variant: "destructive" });
        setLoading(false);
      });
    };

    setupRealtimeListeners();

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeApps) unsubscribeApps();
    };
  }, [limit, toast]);

  // 🔥 REAL-TIME LISTENER FOR DOCUMENTS (Active only when modal is open)
  useEffect(() => {
    let unsubscribeDocs: () => void;

    if (documentsModalOpen && selectedApplication) {
      setLoadingDocs(true);
      const docsQ = query(collection(db, "documents"), where("studentId", "==", selectedApplication.studentId));
      
      unsubscribeDocs = onSnapshot(docsQ, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Document));
        setStudentDocs(docs);
        
        // If active document is deleted, clear it. If it doesn't exist, set to first.
        if (docs.length > 0) {
            if (!activeDocument || !docs.find(d => d.id === activeDocument?.id)) {
                setActiveDocument(docs[0]);
            }
        } else {
            setActiveDocument(null);
        }
        setLoadingDocs(false);
      }, (error) => {
        console.error("Failed to connect to live documents:", error);
        toast({ title: "Error", description: "Could not retrieve live documents.", variant: "destructive" });
        setLoadingDocs(false);
      });
    }

    return () => {
      if (unsubscribeDocs) unsubscribeDocs();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentsModalOpen, selectedApplication, toast]); 

  const handleViewDocuments = (application: Application) => {
    setSelectedApplication(application)
    setDocumentsModalOpen(true)
  }

  const handleApproveApplication = async (applicationId: string) => {
    setIsApproving(applicationId)
    const appToApprove = applications.find(a => a.id === applicationId)
    
    try {
      await updateApplicationStatusDb(applicationId, "approved")
      toast({ title: "Approved!", description: "Application status updated.", variant: "success" })

      if (appToApprove) {
        await createNotificationDb({
          userId: appToApprove.studentId,
          title: "Application Approved! 🎉",
          message: "Congratulations! Your scholarship application has been verified and approved. Check your portal for claiming instructions.",
          type: "success",
          actionUrl: "/student/dashboard"
        })
      }
    } catch (error) {
      toast({ title: "Error", description: "Approval failed.", variant: "destructive" })
    } finally {
      setIsApproving(null)
    }
  }

  const handleRejectApplication = async () => {
    if (!applicationToReject || !rejectionReason.trim()) return
    setIsRejecting(true)
    try {
      await updateApplicationStatusDb(applicationToReject.id, "rejected", rejectionReason.trim())
      setRejectDialogOpen(false)
      toast({ title: "Rejected", description: "Student has been notified." })

      await createNotificationDb({
        userId: applicationToReject.studentId,
        title: "Application Update Required",
        message: `Your application requires attention. Reason: ${rejectionReason.trim()}`,
        type: "warning",
        actionUrl: "/student/dashboard"
      })
      setRejectionReason("");
    } catch (error) {
      toast({ title: "Error", description: "Rejection failed.", variant: "destructive" })
    } finally {
      setIsRejecting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleDateString() } catch (e) { return "N/A" }
  }

  return (
    <>
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-slate-100">
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest pl-6">ID</TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Student</TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">School & Course</TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Location</TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Date Applied</TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Status</TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {loading ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400"/></TableCell></TableRow>
            ) : applications.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No applications found.</TableCell></TableRow>
            ) : (
              applications.map((app) => (
                <TableRow key={app.id} className="hover:bg-slate-50 transition-colors border-slate-100">
                  <TableCell className="pl-6 font-mono text-[10px] text-slate-400">{app.id.substring(0, 8)}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                        {app.studentPhoto ? (
                          <img src={app.studentPhoto} alt={app.fullName} className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <span className="font-bold text-slate-800 uppercase text-xs">{app.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col min-w-0">
                       <span className="font-bold text-slate-700 text-xs whitespace-nowrap">{app.school}</span>
                       <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">{app.course}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 font-medium">{app.barangay}</TableCell>
                  <TableCell className="text-xs text-slate-500 font-medium">{formatDate(app.createdAt)}</TableCell>
                  <TableCell>
                    <Badge className={`shadow-none font-bold uppercase tracking-widest text-[9px] border-none ${
                        app.status === "approved" ? "bg-emerald-100 text-emerald-700" : 
                        app.status === "rejected" ? "bg-red-100 text-red-700" : 
                        "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {app.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isApproving === app.id} className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl">
                          {isApproving === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-slate-200 p-2 min-w-[150px]">
                        <DropdownMenuItem onClick={() => handleViewDocuments(app)} className="cursor-pointer font-bold text-xs rounded-lg">
                          <FileText className="mr-2 h-4 w-4 text-slate-400" /> View Documents
                        </DropdownMenuItem>
                        {app.status === "pending" && (
                          <>
                            <DropdownMenuSeparator className="bg-slate-100 my-1"/>
                            <DropdownMenuItem className="text-emerald-700 focus:text-emerald-800 focus:bg-emerald-50 cursor-pointer font-bold text-xs rounded-lg" onClick={() => handleApproveApplication(app.id)}>
                              <Check className="mr-2 h-4 w-4" /> Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer font-bold text-xs rounded-lg" onClick={() => { setApplicationToReject(app); setRejectDialogOpen(true); }}>
                              <X className="mr-2 h-4 w-4" /> Reject
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* --- SPLIT-PANE DOCUMENTS MODAL --- */}
      <Dialog open={documentsModalOpen} onOpenChange={(open) => {
          setDocumentsModalOpen(open);
          if (!open) {
              setSelectedApplication(null);
              setStudentDocs([]);
              setActiveDocument(null);
          }
      }}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50 border-none shadow-2xl rounded-3xl">
          <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-white shrink-0">
            <DialogTitle className="text-xl font-black uppercase text-slate-800 tracking-tight">Documents for {selectedApplication?.fullName}</DialogTitle>
            <DialogDescription className="font-medium text-slate-500">Select a document from the sidebar to view it.</DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-1 overflow-hidden">
            <div className="w-1/3 max-w-[300px] border-r border-slate-200 bg-white flex flex-col z-10">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {loadingDocs ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                    </div>
                  ) : studentDocs.length === 0 ? (
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-400 text-center py-10">No documents found.</p>
                  ) : (
                    studentDocs.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => setActiveDocument(doc)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-2 ${
                          activeDocument?.id === doc.id 
                            ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500 shadow-sm' 
                            : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between w-full">
                          <span className="font-bold text-xs text-slate-800 pr-2 leading-tight uppercase">{doc.name}</span>
                        </div>
                        <div className="flex items-center justify-between w-full text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          <span>{doc.fileSize}</span>
                          <Badge variant="outline" className={`text-[9px] shadow-none ${doc.type === 'pdf' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>{doc.type}</Badge>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="flex-1 bg-slate-900 flex flex-col relative overflow-hidden">
              {activeDocument ? (
                <div className="flex-1 flex flex-col w-full h-full">
                  <div className="h-14 border-b border-white/10 bg-slate-800/90 backdrop-blur-md flex items-center justify-between px-6 shrink-0 shadow-sm z-10 absolute top-0 w-full">
                    <span className="font-bold text-xs uppercase tracking-widest text-white flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-400"/>
                      {activeDocument.name}
                    </span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-white hover:bg-white/20 rounded-xl text-xs font-bold"
                      onClick={() => openBase64InNewTab(activeDocument.url)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" /> Open in New Tab
                    </Button>
                  </div>

                  <div className="flex-1 overflow-hidden flex items-center justify-center pt-14">
                    {activeDocument.type === 'pdf' ? (
                      <div className="w-full h-full bg-white">
                        <object data={`${activeDocument.url}#toolbar=0&navpanes=0&view=FitH`} type="application/pdf" className="w-full h-full">
                          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-8 bg-slate-100">
                            <FileText className="h-16 w-16 text-slate-300" />
                            <p className="text-slate-500 font-medium">PDF Viewer not supported in this browser.</p>
                            <Button onClick={() => openBase64InNewTab(activeDocument.url)} className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700">Download / Open PDF</Button>
                          </div>
                        </object>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-4">
                        <img src={activeDocument.url} alt={activeDocument.name} className="max-w-full max-h-full object-contain rounded-md drop-shadow-2xl select-none" draggable={false} />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 bg-slate-50">
                  <FileText className="h-16 w-16 mb-4 opacity-20 text-slate-400" />
                  <p className="font-bold uppercase tracking-widest text-xs">Select a document to preview</p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="p-4 border-t border-slate-200 bg-white shrink-0">
            <Button variant="outline" onClick={() => setDocumentsModalOpen(false)} className="rounded-xl font-bold">Close Viewer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- REJECTION MODAL --- */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-md bg-white border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-red-600 tracking-tight">Reject Application</DialogTitle>
            <DialogDescription className="font-medium text-slate-500 mt-2">
              Please provide a reason for rejecting <span className="font-bold text-slate-700">{applicationToReject?.fullName}</span>&apos;s application.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Reason for Rejection</Label>
            <Textarea 
              className="w-full min-h-[100px] p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none text-sm font-medium shadow-sm transition-all"
              placeholder="e.g. Incomplete documents, invalid ID..." 
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="outline" className="rounded-xl font-bold" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="rounded-xl font-bold shadow-md" onClick={handleRejectApplication} disabled={isRejecting || !rejectionReason.trim()}>
              {isRejecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}