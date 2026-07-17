"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { 
  FileText, Upload, CheckCircle, X, 
  ImageIcon, RefreshCw, ExternalLink, ZoomIn, ZoomOut, Send
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { 
  createDocumentDb, 
  deleteDocumentDb, 
  updateApplicationStatusDb, 
  createNotificationDb,
  createApplicationDb
} from "@/lib/storage"

import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

type DocumentStatus = {
  isUploading: boolean
  isUploaded: boolean
  progress: number
  fileName: string
  fileSize: string
  url?: string
  status?: string 
  error: string | null
}

const initialDocumentStatus: DocumentStatus = {
  isUploading: false, isUploaded: false, progress: 0,
  fileName: "", fileSize: "", error: null,
}

interface DocumentUploadProps {
  onUploadComplete?: () => void
}

export function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  
  const [documents, setDocuments] = useState<Record<string, DocumentStatus>>({
    appForm: { ...initialDocumentStatus }, regForm: { ...initialDocumentStatus },
    receipt: { ...initialDocumentStatus }, schoolId: { ...initialDocumentStatus },
    indigency: { ...initialDocumentStatus }, clearance: { ...initialDocumentStatus },
    mayorLetter: { ...initialDocumentStatus }, votersCert: { ...initialDocumentStatus },
    grades: { ...initialDocumentStatus },
  })
  
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [applicationStatus, setApplicationStatus] = useState<string>("draft")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [previewDoc, setPreviewDoc] = useState<DocumentStatus | null>(null)
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  useEffect(() => {
    setZoom(1); setPosition({ x: 0, y: 0 })
  }, [previewDoc])

  useEffect(() => {
    if (!user) return
    const qApp = query(collection(db, "applications"), where("studentId", "==", user.id))
    const unsubscribeApp = onSnapshot(qApp, (snapshot) => {
      if (!snapshot.empty) {
        const appData = snapshot.docs[0].data()
        setApplicationStatus(appData.status || "draft")
      }
    })
    return () => unsubscribeApp()
  }, [user])

  useEffect(() => {
    if (!user) return
    const qDocs = query(collection(db, "documents"), where("studentId", "==", user.id))
    const unsubscribeDocs = onSnapshot(qDocs, (snapshot) => {
      const updatedDocuments: Record<string, DocumentStatus> = {
        appForm: { ...initialDocumentStatus }, regForm: { ...initialDocumentStatus },
        receipt: { ...initialDocumentStatus }, schoolId: { ...initialDocumentStatus },
        indigency: { ...initialDocumentStatus }, clearance: { ...initialDocumentStatus },
        mayorLetter: { ...initialDocumentStatus }, votersCert: { ...initialDocumentStatus },
        grades: { ...initialDocumentStatus },
      }

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data()
        const docType = getDocumentType(data.categoryName || data.name)
        
        if (docType) {
          updatedDocuments[docType] = {
            ...initialDocumentStatus,
            isUploaded: true, 
            fileName: data.name, 
            fileSize: data.fileSize,
            url: data.url, 
            status: data.status,
          }
        }
      })

      setDocuments((prev) => {
        const merged = { ...updatedDocuments }
        Object.keys(prev).forEach((key) => {
          if (prev[key].isUploading || (prev[key].isUploaded && !updatedDocuments[key].isUploaded)) {
            merged[key] = prev[key]
          }
        })
        return merged
      })
    })

    return () => unsubscribeDocs()
  }, [user])

  const getDocumentType = (name: string): string | null => {
    const nameMap: Record<string, string> = {
      "Filled-out Application Form": "appForm", "School Registration Form": "regForm",
      "Enrollment Receipt": "receipt", "School ID / Cert of Non-issuance": "schoolId",
      "Original Barangay Indigency": "indigency", "Original Barangay Clearance": "clearance",
      "Letter to City Mayor": "mayorLetter", "Voter's Certification": "votersCert",
      "Previous Grades": "grades",
    }
    return nameMap[name] || null
  }

  const getDocumentName = (documentType: string) => {
    switch (documentType) {
      case "appForm": return "Filled-out Application Form"
      case "regForm": return "School Registration Form"
      case "receipt": return "Enrollment Receipt"
      case "schoolId": return "School ID / Cert of Non-issuance"
      case "indigency": return "Original Barangay Indigency"
      case "clearance": return "Original Barangay Clearance"
      case "mayorLetter": return "Letter to City Mayor"
      case "votersCert": return "Voter's Certification"
      case "grades": return "Previous Grades"
      default: return documentType
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const handleFileUpload = useCallback(async (documentType: string, file: File, acceptedTypes: string) => {
    // 🔥 THE FIX: Removed "applicationStatus === 'pending'" from the absolute lock.
    if (documents[documentType]?.status === "approved" || applicationStatus === "approved") {
      toast({ variant: "destructive", title: "Locked", description: "Documents cannot be modified at this stage." })
      return
    }

    if (file.size > 10 * 1024 * 1024) return toast({ variant: "destructive", title: "Upload failed", description: "File size exceeds 10MB limit." })

    const fileSize = formatFileSize(file.size)
    setDocuments(prev => ({ ...prev, [documentType]: { ...prev[documentType], isUploading: true, progress: 30, fileName: file.name, fileSize, error: null } }))

    try {
      if (!user) throw new Error("Must be logged in to upload")

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
      const formData = new FormData()
      formData.append("file", file)
      formData.append("upload_preset", uploadPreset || "")
      formData.append("folder", `bts_portal/documents/${user.id}`)

      setDocuments(prev => ({ ...prev, [documentType]: { ...prev[documentType], progress: 60 } }))
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body: formData })
      if (!res.ok) throw new Error("Failed to upload to Cloudinary")

      const data = await res.json()
      setDocuments(prev => ({ ...prev, [documentType]: { ...prev[documentType], progress: 90 } }))

      await createDocumentDb({
        studentId: user.id, 
        name: file.name, 
        categoryName: getDocumentName(documentType),
        type: file.type.includes("pdf") ? "pdf" : "image", 
        status: "pending",
        fileSize, 
        semester: "1st Semester", 
        academicYear: "2025-2026", 
        url: data.secure_url,
      })

      setDocuments(prev => ({
        ...prev,
        [documentType]: { ...prev[documentType], isUploading: false, isUploaded: true, progress: 100, url: data.secure_url }
      }))

      if (onUploadComplete) onUploadComplete()
      toast({ title: "Success", description: "Document uploaded successfully." }) 
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message })
      setDocuments(prev => ({ ...prev, [documentType]: { ...initialDocumentStatus } }))
    }
  }, [user, toast, onUploadComplete, documents, applicationStatus])

  const handleSubmitApplication = async () => {
    if (!user) return
    setIsSubmitting(true)
    try {
      const qApp = query(collection(db, "applications"), where("studentId", "==", user.id));
      const appSnap = await getDocs(qApp);
      
      if (appSnap.empty) {
        const profile: any = user.profileData || {};
        await createApplicationDb({
          studentId: user.id,
          fullName: user.name,
          email: user.email,
          course: profile.course || "",
          yearLevel: profile.yearLevel || "",
          semester: "1st Semester",
          school: profile.schoolName || "",
          barangay: profile.barangay || "",
          status: "pending"
        });
      } else {
        await updateApplicationStatusDb(appSnap.docs[0].id, "pending");
      }
      
      await createNotificationDb({
        userId: "admin", 
        title: "New Application Submitted",
        message: `${user.name} has submitted all 9 required documents and is ready for your review.`,
        type: "info",
        actionUrl: `/admin/applications?studentId=${user.id}`,
        createdAt: new Date().toISOString(),
        isRead: false
      })

      toast({
        title: "Application Submitted! 🚀",
        description: "Your documents have been successfully sent to the admin for review.",
      })
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to submit application." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileChange = (documentType: string, acceptedTypes: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFileUpload(documentType, e.target.files[0], acceptedTypes)
  }

  const handleDrop = useCallback((documentType: string, acceptedTypes: string, e: React.DragEvent) => {
    e.preventDefault(); setDragOver(null)
    if (documents[documentType]?.status === "approved" || applicationStatus === "approved") {
      toast({ title: "Locked", description: "Cannot modify documents at this stage.", variant: "default" })
      return
    }
    if (e.dataTransfer.files?.[0]) handleFileUpload(documentType, e.dataTransfer.files[0], acceptedTypes)
  }, [handleFileUpload, documents, applicationStatus, toast])

  const handleDragOver = (documentType: string, e: React.DragEvent) => {
    e.preventDefault(); 
    if (documents[documentType]?.status !== "approved" && applicationStatus !== "approved") setDragOver(documentType)
  }

  const handleRemoveDocument = async (documentType: string) => {
    if (!user) return
    try {
      await deleteDocumentDb(user.id, documents[documentType].fileName || getDocumentName(documentType))
      toast({ title: "Document removed", description: "You can upload a new document" })
      setDocuments(prev => ({ ...prev, [documentType]: { ...initialDocumentStatus } }))
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to remove document" })
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => { setIsDragging(true); setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y }) }
  const handleMouseMove = (e: React.MouseEvent) => { if (isDragging) setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }) }
  const handleMouseUp = () => setIsDragging(false)

  const documentConfigs = [
    { type: "appForm", title: "1. Filled-out Application Form", typeDesc: ".pdf,.jpg,.jpeg,.png", icon: FileText, required: true },
    { type: "regForm", title: "2. School Registration Form", typeDesc: ".pdf,.jpg,.jpeg,.png", icon: FileText, required: true },
    { type: "receipt", title: "3. Enrollment Receipt", typeDesc: ".pdf,.jpg,.jpeg,.png", icon: FileText, required: true },
    { type: "schoolId", title: "4. School ID / Cert of Non-issuance", typeDesc: ".pdf,.jpg,.jpeg,.png", icon: ImageIcon, required: true },
    { type: "indigency", title: "5. Original Barangay Indigency", typeDesc: ".pdf,.jpg,.jpeg,.png", icon: FileText, required: true },
    { type: "clearance", title: "6. Original Barangay Clearance", typeDesc: ".pdf,.jpg,.jpeg,.png", icon: FileText, required: true },
    { type: "mayorLetter", title: "7. Letter to City Mayor", typeDesc: ".pdf,.jpg,.jpeg,.png", icon: FileText, required: true },
    { type: "votersCert", title: "8. Voter's Certification", typeDesc: ".pdf,.jpg,.jpeg,.png", icon: FileText, required: true },
    { type: "grades", title: "9. Previous Grades", typeDesc: ".pdf,.jpg,.jpeg,.png", icon: FileText, required: true },
  ]

  const uploadedCount = Object.values(documents).filter((d) => d.isUploaded).length
  const isPdf = previewDoc?.url?.toLowerCase().endsWith('.pdf')

  // 🔥 THE FIX: Always show submit button unless application is explicitly approved
  const canSubmit = applicationStatus !== "approved";

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <span className="text-sm font-bold">UPLOAD PROGRESS</span>
          <span className="text-sm text-muted-foreground font-bold ml-4">{uploadedCount} of 9 documents uploaded</span>
        </div>
        
        <div className="flex items-center gap-3">
          {applicationStatus === "pending" && uploadedCount === 9 && (
             <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 shadow-none border-none py-1.5 px-3">Application Under Review</Badge>
          )}
          {applicationStatus === "approved" && (
             <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 shadow-none border-none py-1.5 px-3">Documents Verified</Badge>
          )}
          {canSubmit && (
             <Button
               onClick={handleSubmitApplication}
               disabled={uploadedCount < 9 || isSubmitting}
               className={`rounded-xl font-bold transition-all ${
                 uploadedCount === 9 
                   ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:scale-105" 
                   : "bg-slate-200 text-slate-400 cursor-not-allowed"
               }`}
             >
               {isSubmitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
               Submit All Documents
             </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {documentConfigs.map((config) => {
          const docStatus = documents[config.type]
          const IconComponent = config.icon
          // 🔥 THE FIX: Removed pending from rendering block condition
          const isLocked = docStatus.status === "approved" || applicationStatus === "approved"

          return (
            <Card key={config.type} className={`transition-all duration-200 rounded-2xl ${dragOver === config.type ? "ring-2 ring-green-500 bg-green-50" : ""} ${docStatus.isUploaded ? (isLocked ? "bg-emerald-50/50 border-emerald-200" : "bg-green-50/50 border-green-200") : ""}`}>
              <CardContent className="p-4">
                <div 
                  className={`flex flex-col ${isLocked ? 'opacity-95' : ''}`}
                  onDrop={(e) => handleDrop(config.type, config.typeDesc, e)}
                  onDragOver={(e) => handleDragOver(config.type, e)}
                  onDragLeave={() => setDragOver(null)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${docStatus.isUploaded ? (isLocked ? "bg-emerald-100 text-emerald-600" : "bg-green-100 text-green-600") : "bg-muted text-muted-foreground"}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <h3 className="font-bold text-sm text-slate-800">{config.title}</h3>
                    </div>
                  </div>

                  {docStatus.isUploaded ? (
                    <div className={`border rounded-xl p-3 shadow-sm ${isLocked ? 'bg-emerald-50/80 border-emerald-100' : 'bg-background'}`}>
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex items-center gap-2 min-w-0 cursor-pointer hover:text-emerald-600 transition-colors group"
                          onClick={() => setPreviewDoc(docStatus)}
                        >
                          <CheckCircle className={`h-4 w-4 shrink-0 group-hover:text-emerald-500 ${isLocked ? 'text-emerald-500' : 'text-green-600'}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium whitespace-nowrap group-hover:underline decoration-dashed underline-offset-4">{docStatus.fileName}</p>
                            <p className="text-xs text-muted-foreground font-medium flex gap-1 whitespace-nowrap">
                              {docStatus.fileSize} <span className="text-[10px] uppercase font-bold text-emerald-600/70 group-hover:text-emerald-600 transition-colors">• View Document</span>
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          {isLocked ? (
                            <Badge className="bg-emerald-100 text-emerald-700 pointer-events-none text-[9px] uppercase tracking-widest font-black shadow-none border-none">LOCKED</Badge>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => handleRemoveDocument(config.type)}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : docStatus.isUploading ? (
                    <div className="border rounded-xl p-3 bg-background">
                      <div className="flex items-center gap-2 mb-2"><RefreshCw className="h-4 w-4 animate-spin text-green-600" /><span className="text-sm font-medium">Uploading...</span></div>
                      <Progress value={docStatus.progress} className="h-1.5 bg-slate-100" />
                    </div>
                  ) : (
                    <div className="relative">
                      <Input id={config.type} type="file" accept={config.typeDesc} className="hidden" onChange={(e) => handleFileChange(config.type, config.typeDesc, e)} disabled={isLocked} />
                      <Label htmlFor={config.type} className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl transition-colors ${isLocked ? "cursor-not-allowed opacity-50" : "hover:border-green-500 hover:bg-muted/50 cursor-pointer"}`}>
                        <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                        <span className="text-sm font-medium text-slate-600">Click to browse or drag file</span>
                      </Label>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 rounded-3xl overflow-hidden flex flex-col border-0 shadow-2xl bg-slate-900 z-[100] [&>button]:hidden">
          <DialogHeader className="p-4 bg-white shrink-0 flex flex-row items-center justify-between border-b border-slate-200">
            <div className="flex-1 min-w-0 pr-4 text-left">
              <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-800 whitespace-nowrap">{previewDoc?.fileName}</DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase tracking-widest mt-1 text-slate-500">
                {previewDoc?.fileSize} {(previewDoc?.status === 'approved' || applicationStatus === 'approved') && "• APPROVED DOCUMENT"}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => window.open(previewDoc?.url, '_blank')} className="font-bold text-xs rounded-xl hidden sm:flex"><ExternalLink className="w-4 h-4 mr-2" /> Open in New Tab</Button>
              <Button variant="ghost" size="icon" onClick={() => setPreviewDoc(null)} className="rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600"><X className="w-5 h-5" /></Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 w-full relative flex flex-col overflow-hidden bg-slate-900/95">
            {!isPdf && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur-md p-1.5 rounded-full flex items-center gap-1 z-50 border border-white/10 shadow-2xl">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full h-8 w-8" onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}><ZoomOut className="w-4 h-4" /></Button>
                <span className="text-xs font-bold text-white w-12 text-center select-none">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full h-8 w-8" onClick={() => setZoom(z => Math.min(z + 0.25, 3))}><ZoomIn className="w-4 h-4" /></Button>
              </div>
            )}
            <div 
              className={`flex-1 overflow-hidden flex items-center justify-center ${!isPdf ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
              onMouseDown={!isPdf ? handleMouseDown : undefined} onMouseMove={!isPdf ? handleMouseMove : undefined}
              onMouseUp={!isPdf ? handleMouseUp : undefined} onMouseLeave={!isPdf ? handleMouseUp : undefined}
            >
              {isPdf ? (
                <iframe src={`${previewDoc.url}#toolbar=1&navpanes=0&view=FitH`} className="w-full h-full bg-white shadow-2xl" title={previewDoc.fileName} />
              ) : (
                <img src={previewDoc?.url} alt={previewDoc?.fileName} draggable={false}
                  style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`, transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}
                  className="max-h-[90vh] w-auto object-contain drop-shadow-2xl rounded-md pointer-events-none select-none"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}