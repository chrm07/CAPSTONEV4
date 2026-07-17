"use client"

import { useState, useEffect } from "react"
import { StudentLayout } from "@/components/student-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { 
  FileText, CheckCircle, AlertCircle, Trash2, 
  Eye, Loader2, Lock, Download, X, CalendarDays, UploadCloud
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"

import { collection, query, where, onSnapshot, doc, deleteDoc, addDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase" 
import { createDocumentDb, createApplicationDb } from "@/lib/storage"

const REQUIRED_DOC_TYPES = [
  { id: "app_form", name: "Filled-out Application Form" },
  { id: "reg_form", name: "School Registration Form" },
  { id: "receipt", name: "Enrollment Receipt" },
  { id: "id_cert", name: "School ID / Cert of Non-issuance" },
  { id: "indigency", name: "Original Barangay Indigency" },
  { id: "clearance", name: "Original Barangay Clearance" },
  { id: "mayor_letter", name: "Letter to City Mayor" },
  { id: "voter_cert", name: "Voter's Certification" },
  { id: "grades", name: "Previous Grades" }
]

export default function StudentDocumentsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [documents, setDocuments] = useState<any[]>([])
  const [application, setApplication] = useState<any>(null)
  const [schedule, setSchedule] = useState<any>(null) 
  const [isLoading, setIsLoading] = useState(true)
  
  // Track individual file uploading states
  const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewingDoc, setViewingDoc] = useState<{ url: string; name: string; isPdf: boolean } | null>(null)

  useEffect(() => {
    if (!user) return
    setIsLoading(true)

    const unsubs: (() => void)[] = []

    unsubs.push(onSnapshot(doc(db, "settings", "schedule"), (docSnap) => {
      if (docSnap.exists()) setSchedule(docSnap.data())
    }))

    const docsQ = query(collection(db, "documents"), where("studentId", "==", user.id))
    unsubs.push(onSnapshot(docsQ, (snapshot) => {
      const activeDocs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((d: any) => !d.isArchived)
      setDocuments(activeDocs)
    }))

    const appQ = query(collection(db, "applications"), where("studentId", "==", user.id))
    unsubs.push(onSnapshot(appQ, async (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      const activeApp = apps.find((a: any) => !a.isArchived)
      setApplication(activeApp || null)
      setIsLoading(false)
    }))

    return () => {
      unsubs.forEach(unsub => unsub())
    }
  }, [user])

  // Automatically locks the portal if submitted (pending or approved). Unlocks if rejected (Resubmit).
  const isActuallySubmitted = application?.status === 'pending' || application?.status === 'approved';
  const canUpload = schedule?.submissionOpen && !isActuallySubmitted && !application?.isClaimed;
  const isLocked = !canUpload;
  
  // Calculate completed count purely from database documents
  const uploadedCount = REQUIRED_DOC_TYPES.filter(req => 
    documents.some(d => (d.categoryName || d.name) === req.name)
  ).length;
  
  // For resubmission: check if all required documents are uploaded
  const isResubmission = application?.status === 'rejected';
  const requiredResubmitDocs = isResubmission && application?.resubmitDocuments 
    ? application.resubmitDocuments.length 
    : 0;
  const uploadedResubmitDocs = isResubmission && application?.resubmitDocuments
    ? application.resubmitDocuments.filter((docName: string) => 
        documents.some(d => (d.categoryName || d.name) === docName)
      ).length
    : 0;
  const hasAllDocuments = isResubmission 
    ? uploadedResubmitDocs === requiredResubmitDocs && requiredResubmitDocs > 0
    : uploadedCount === REQUIRED_DOC_TYPES.length;

  // Immediate upload to Cloudinary and Firebase DB
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, reqName: string) => {
    if (!canUpload) return 
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Please upload a file smaller than 5MB." })
      e.target.value = ''
      return
    }

    setUploadingDocs(prev => ({ ...prev, [reqName]: true }))

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
      if (!cloudName || !uploadPreset) throw new Error("Cloudinary credentials missing")

      const formData = new FormData()
      formData.append("file", file)
      formData.append("upload_preset", uploadPreset)
      formData.append("folder", `bts_documents/${user?.id}`)

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`
      const res = await fetch(cloudinaryUrl, { method: "POST", body: formData })

      if (!res.ok) throw new Error(`Upload failed for ${reqName}`)

      const data = await res.json()

      // Check if replacing an existing DB doc to avoid duplicates
      const existingDbDoc = documents.find(d => (d.categoryName || d.name) === reqName);
      if (existingDbDoc) {
         await deleteDoc(doc(db, "documents", existingDbDoc.id));
      }

      await createDocumentDb({
        studentId: user!.id,
        name: file.name,
        categoryName: reqName,
        url: data.secure_url, 
        type: file.type,
        uploadedAt: new Date().toISOString()
      })

      toast({ title: "Uploaded", description: `${reqName} uploaded successfully.` })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: error.message })
    } finally {
      setUploadingDocs(prev => ({ ...prev, [reqName]: false }))
      e.target.value = ''
    }
  }

  // Deletes an already submitted database file
  const handleDelete = async (docId: string) => {
    if (!canUpload) return
    try {
      await deleteDoc(doc(db, "documents", docId))
      toast({ title: "Deleted", description: "Document removed successfully. You can now upload a replacement." })
    } catch (e) { 
      toast({ variant: "destructive", title: "Error", description: "Could not delete document." }) 
    }
  }

  // Submits the application object (locks the documents)
  const handleSubmitApplication = async () => {
    if (!user) return
    setIsSubmitting(true)
    
    try {
      const profile = user.profileData as any || {}
      const isResubmission = application?.status === 'rejected';
      
      if (application?.id) {
        await updateDoc(doc(db, "applications", application.id), {
          isSubmitted: true,
          isApproved: false,
          isRejected: false,
          isClaimed: false,
          status: "pending",
          round: schedule?.round || 1,
          updatedAt: new Date().toISOString()
        })
      } else {
        await createApplicationDb({
          studentId: user.id,
          status: 'pending',
          isSubmitted: true,
          isApproved: false,
          isRejected: false,
          isClaimed: false,
          isArchived: false,
          round: schedule?.round || 1,
          school: profile.schoolName || "N/A",
          course: profile.course || "N/A",
          yearLevel: profile.yearLevel || "N/A",
          semester: profile.semester || "N/A",
          fullName: profile.fullName || user.name || "Unknown",
          barangay: profile.barangay || "Unknown",
        })
      }

      await addDoc(collection(db, "activity_logs"), {
        studentId: user.id,
        action: isResubmission ? "Application Resubmitted" : "Application Submitted",
        details: isResubmission ? "Student updated documents and resubmitted." : "Application documents submitted for review.",
        timestamp: new Date().toISOString(),
        type: "submission"
      })

      await addDoc(collection(db, "notifications"), {
        to: "admin",
        senderId: user.id,
        userId: "admin", 
        message: isResubmission 
          ? `${profile.fullName || user.name} has corrected and resubmitted their documents.`
          : `${profile.fullName || user.name} has submitted a new application.`,
        link: "/admin/applications",
        read: false,
        createdAt: new Date().toISOString()
      })

      toast({ 
        title: isResubmission ? "Application Resubmitted!" : "Application Submitted!", 
        description: "Your documents are successfully locked and under review.", 
        className: "bg-emerald-600 text-white border-none" 
      })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Submission Failed", description: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getThumbnailUrl = (url?: string) => {
    if (!url) return "";
    if (url.toLowerCase().endsWith(".pdf")) return url.replace(/\.pdf$/i, ".jpg");
    return url;
  };

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-emerald-600">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p className="text-sm font-bold tracking-widest uppercase text-slate-400">Loading Documents...</p>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
        
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-emerald-900 uppercase">Document Portal</h1>
          <p className="text-slate-500 font-medium">Follow the steps below to complete your application.</p>
        </div>

        {application?.status === 'rejected' && (
          <Alert variant="destructive" className="bg-red-50 border-red-200 rounded-3xl p-6">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <AlertTitle className="text-red-800 font-black uppercase tracking-tight ml-2">Action Required: Resubmit Your Documents</AlertTitle>
            <AlertDescription className="text-red-700 font-medium mt-2 ml-2 space-y-3">
              <p className="text-base font-bold">Reason: {application.feedback || application.remarks || application.resubmissionReason || "Please review and update your documents."}</p>
              {application.resubmitDocuments && application.resubmitDocuments.length > 0 && (
                <div className="mt-3 p-4 bg-white rounded-xl border border-red-200">
                  <p className="text-sm font-black text-red-800 uppercase tracking-wide mb-2">Please resubmit the following:</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {application.resubmitDocuments.map((docName: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2 text-sm font-medium text-red-700">
                        <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                        {docName}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {!schedule?.submissionOpen && (
          <div className="bg-slate-50 border-2 border-slate-200 p-8 rounded-3xl flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm animate-in zoom-in-95">
            <div className="bg-slate-200 p-4 rounded-full shrink-0">
              <CalendarDays className="h-8 w-8 text-slate-500" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 uppercase tracking-tight text-2xl">Submissions Closed</h3>
              <p className="text-slate-600 font-bold mt-2 text-lg">
                The application period is not currently active.
              </p>
            </div>
          </div>
        )}

        <div className="bg-emerald-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-100 flex flex-col md:flex-row items-center justify-between gap-6 border-4 border-emerald-400/30">
          <div className="flex items-center gap-5">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-2xl border border-white/30 shrink-0">1</div>
            <div>
              <h3 className="font-black text-xl uppercase tracking-tight">Step 1: Download Official Form</h3>
              <p className="text-emerald-50 text-sm font-medium">Download, print, and fill out the BTS Application Form before uploading.</p>
            </div>
          </div>
          <Button asChild className="bg-white text-emerald-600 hover:bg-emerald-50 rounded-2xl font-black h-14 px-8 shrink-0 shadow-lg">
            <a href="/BTS_Application_Form.pdf" download>
              <Download className="mr-2 h-5 w-5" /> Download Form
            </a>
          </Button>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className={`font-black uppercase tracking-tight text-sm ${application?.status === 'rejected' ? 'text-red-700' : 'text-emerald-800'}`}>
              {application?.status === 'rejected' ? 'Step 2: Resubmit Required Documents' : 'Step 2: Upload Progress'}
            </h3>
            <Badge variant="outline" className={`font-black border-emerald-200 px-3 py-1 ${
              application?.status === 'rejected' 
                ? 'bg-red-50 text-red-700 border-red-200' 
                : 'text-emerald-700 bg-emerald-50'
            }`}>
              {application?.status === 'rejected' && application?.resubmitDocuments 
                ? `${application.resubmitDocuments.length} document(s) need resubmission`
                : `${uploadedCount} / ${REQUIRED_DOC_TYPES.length} Completed`
              }
            </Badge>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-3 rounded-full transition-all duration-700 ${
                application?.status === 'rejected' && application?.resubmitDocuments
                  ? 'bg-red-500'
                  : 'bg-emerald-500'
              }`} 
              style={{ 
                width: application?.status === 'rejected' && application?.resubmitDocuments
                  ? `${(application.resubmitDocuments.filter((doc: string) => 
                      documents.some(d => (d.categoryName || d.name) === doc)
                    ).length / application.resubmitDocuments.length) * 100}%`
                  : `${(uploadedCount / REQUIRED_DOC_TYPES.length) * 100}%`
              }} 
            />
          </div>
        </div>

        <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 ${!schedule?.submissionOpen ? "opacity-60 grayscale" : ""}`}>
          {REQUIRED_DOC_TYPES.map((req) => {
            const dbDoc = documents.find(d => (d.categoryName || d.name) === req.name)
            const hasDoc = !!dbDoc
            const isUploading = uploadingDocs[req.name]
            const isResubmitRequested = application?.status === 'rejected' && 
              application?.resubmitDocuments?.includes(req.name)
            
            const isPdf = dbDoc?.url?.toLowerCase().endsWith('.pdf')

            return (
              <Card key={req.id} className={`rounded-3xl border-2 shadow-sm flex flex-col transition-all ${isResubmitRequested ? 'border-red-300 bg-red-50/50' : hasDoc ? 'border-emerald-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50/50'}`}>
                <CardHeader className="p-5 pb-3 flex flex-row justify-between items-start gap-2 space-y-0">
                  <div className="flex flex-col gap-1">
                    <CardTitle className={`text-sm font-black leading-tight ${isResubmitRequested ? 'text-red-700' : 'text-slate-800'}`}>{req.name}</CardTitle>
                    {isResubmitRequested && (
                      <Badge variant="outline" className={`w-fit text-[9px] font-black uppercase tracking-widest ${isResubmitRequested ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                        Resubmit Required
                      </Badge>
                    )}
                  </div>
                  {isResubmitRequested ? <AlertCircle className="h-5 w-5 text-red-500 shrink-0" /> : (hasDoc ? <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" /> : <AlertCircle className="h-5 w-5 text-slate-300 shrink-0" />)}
                </CardHeader>
                
                <CardContent className="p-5 pt-0 mt-auto">
                  {isUploading ? (
                    <div className="flex flex-col items-center justify-center py-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <Loader2 className="h-6 w-6 text-emerald-500 animate-spin mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Uploading...</span>
                    </div>
                  ) : hasDoc && dbDoc ? (
                    <div className="flex flex-col gap-2">
                      <Badge className={`w-fit shadow-none mb-2 font-bold uppercase text-[10px] tracking-widest ${isResubmitRequested ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                        {isResubmitRequested ? 'Uploaded (Needs Correction)' : 'Uploaded'}
                      </Badge>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={`flex-1 h-10 rounded-xl font-bold bg-white ${isResubmitRequested ? 'text-red-700 border-red-200 hover:bg-red-50' : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'}`} 
                          onClick={() => setViewingDoc({ url: dbDoc.url, name: req.name, isPdf: !!isPdf })}
                        >
                          <Eye className="h-4 w-4 mr-2" /> Review
                        </Button>
                        {!isLocked && (
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className={`h-10 w-10 rounded-xl ${isResubmitRequested ? 'text-red-500 border-red-200 hover:bg-red-50' : 'text-slate-400 border-slate-200 hover:text-red-600 hover:bg-red-50'}`} 
                            onClick={() => handleDelete(dbDoc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2">
                      {isLocked ? (
                        <div className="bg-slate-100 rounded-2xl p-4 text-center border border-slate-200">
                          <Lock className="h-5 w-5 mx-auto mb-1 text-slate-400" />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {!schedule?.submissionOpen ? "Submissions Closed" : "Locked"}
                          </span>
                        </div>
                      ) : (
                        <label className={`cursor-pointer group flex flex-col items-center justify-center py-4 border-2 border-dashed rounded-2xl transition-all ${isResubmitRequested ? 'border-red-200 bg-red-50/50 hover:bg-red-100/80' : 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/80'}`}>
                          <UploadCloud className={`h-5 w-5 ${isResubmitRequested ? 'text-red-600' : 'text-emerald-500'} mb-1 group-hover:scale-110 transition-transform`} />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isResubmitRequested ? 'text-red-700' : 'text-emerald-700'}`}>
                            {isResubmitRequested ? 'Upload Replacement' : 'Select File'}
                          </span>
                          <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileSelect(e, req.name)} disabled={!canUpload || isSubmitting} />
                        </label>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* SUBMIT CONTAINER & WARNING REMARK */}
        {canUpload && (
           <div className={`p-6 md:p-8 rounded-3xl border flex flex-col items-center justify-between gap-6 shadow-sm ${hasAllDocuments ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
             
             <div className="flex flex-col md:flex-row w-full items-start md:items-center justify-between gap-6">
               <div>
                 <h3 className={`font-black uppercase tracking-tight text-xl md:text-2xl ${
                   application?.status === 'rejected'
                     ? (hasAllDocuments ? 'text-emerald-900' : 'text-red-800')
                     : (hasAllDocuments ? 'text-emerald-900' : 'text-slate-600')
                 }`}>
                   {application?.status === 'rejected' ? "Correct & Resubmit" : (hasAllDocuments ? "Ready to Submit" : "Submit Application")}
                 </h3>
                 <p className={`text-sm md:text-base font-medium mt-1 ${
                   application?.status === 'rejected'
                     ? (hasAllDocuments ? 'text-emerald-700' : 'text-red-700')
                     : (hasAllDocuments ? 'text-emerald-700' : 'text-slate-500')
                 }`}>
                   {application?.status === 'rejected' 
                     ? (hasAllDocuments 
                        ? "All corrections have been made. Resubmit your application for re-review." 
                        : `Please upload the ${application.resubmitDocuments?.length || 0} required document(s) before resubmitting.`)
                     : (hasAllDocuments 
                        ? "You have uploaded all required documents. Submit your application to lock them in."
                        : `You must select all ${REQUIRED_DOC_TYPES.length} documents before you can submit.`)
                   }
                 </p>
               </div>
               <Button 
                 onClick={handleSubmitApplication} 
                 disabled={isSubmitting || !hasAllDocuments} 
                 className={`w-full md:w-auto shrink-0 font-black px-8 h-14 rounded-2xl text-lg shadow-lg active:scale-95 transition-transform ${
                   application?.status === 'rejected'
                     ? (hasAllDocuments ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-300 text-red-800 cursor-not-allowed')
                     : (hasAllDocuments ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed')
                 }`}
               >
                 {isSubmitting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : null} 
                 {isSubmitting ? "Submitting..." : (application?.status === 'rejected' ? "Resubmit Documents" : "Submit All Documents")}
               </Button>
             </div>

             {/* WARNING NOTE */}
             <div className="w-full bg-amber-50/80 border border-amber-200 text-amber-800 p-4 md:p-5 rounded-2xl flex items-start gap-3 mt-2">
               <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-amber-600 shrink-0 mt-0.5" />
               <p className="text-sm md:text-base font-bold leading-snug">
                 Please ensure you have uploaded the correct documents as they will be reviewed by the admin. Once submitted, your files will be locked and you cannot change them temporarily. You will only be able to edit or upload new files if the admin requires a resubmission.
               </p>
             </div>

           </div>
        )}

        <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
          <DialogContent aria-describedby={undefined} className="max-w-5xl w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden bg-slate-900 border-none rounded-3xl shadow-2xl [&>button]:hidden z-[100]">
            <DialogHeader className="p-4 bg-white border-b border-slate-200 flex flex-row items-center justify-between shrink-0">
              <DialogTitle className="text-lg font-black uppercase text-emerald-900 whitespace-nowrap pr-4">
                {viewingDoc?.name}
              </DialogTitle>
              <DialogClose className="rounded-full h-10 w-10 flex items-center justify-center hover:bg-slate-100 transition-colors shrink-0">
                <X className="h-5 w-5 text-slate-500" />
              </DialogClose>
            </DialogHeader>
            <div className="flex-1 w-full bg-slate-900 flex items-center justify-center overflow-hidden">
              {viewingDoc?.isPdf ? (
                <iframe src={`${viewingDoc.url}#toolbar=0`} className="w-full h-full border-none bg-white" title="Document Preview" />
              ) : (
                <img src={viewingDoc?.url} alt="Document Preview" className="w-full h-full object-contain bg-slate-900" />
              )}
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </StudentLayout>
  )
}
