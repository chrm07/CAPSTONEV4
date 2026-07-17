"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Search, MoreHorizontal, Eye, CheckCircle, XCircle, Clock, FileText, Loader2, Inbox } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// 🔥 IMPORT FIRESTORE REAL-TIME UTILS
import { collection, query, onSnapshot, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { addPreApprovedEmailDb } from "@/lib/storage"

type NewScholarApplication = {
  id: string
  firstName: string
  middleName?: string
  lastName: string
  email: string
  barangayClearance?: string
  indigencyCertificate?: string
  voterCertification?: string
  status: string
  submittedAt: string
}

export default function ApplyNowPage() {
  const [applications, setApplications] = useState<NewScholarApplication[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null)
  
  const { toast } = useToast()

  // 🔥 REAL-TIME LISTENER FOR NEW SCHOLAR APPLICATIONS
  useEffect(() => {
    setIsLoading(true)
    const q = query(collection(db, "new_scholar_applications"))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as NewScholarApplication))
      
      // Sort newest first
      apps.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      
      setApplications(apps)
      setIsLoading(false)
    }, (error) => {
      console.error("Error fetching live applications:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to connect to live applications feed." })
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [toast])

  const handleApproveApplication = async (application: NewScholarApplication) => {
    setIsProcessingId(application.id)
    try {
      // 1. Add email to pre-approved emails list in Firestore
      await addPreApprovedEmailDb(application.email.toLowerCase())

      // 2. Update application status to approved
      await updateDoc(doc(db, "new_scholar_applications", application.id), { 
        status: "approved",
        updatedAt: new Date().toISOString()
      })

      toast({
        title: "Application Approved",
        description: `${application.firstName} ${application.lastName}'s email has been whitelisted.`,
        className: "bg-emerald-600 text-white border-none"
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve application",
        variant: "destructive",
      })
    } finally {
      setIsProcessingId(null)
    }
  }

  const handleRejectApplication = async (applicationId: string) => {
    setIsProcessingId(applicationId)
    try {
      await updateDoc(doc(db, "new_scholar_applications", applicationId), { 
        status: "rejected",
        updatedAt: new Date().toISOString()
      })

      toast({
        title: "Application Rejected",
        description: "The application has been rejected.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to reject application.",
        variant: "destructive",
      })
    } finally {
      setIsProcessingId(null)
    }
  }

  const filteredApplications = applications.filter((app) => {
    const fullName = `${app.firstName} ${app.lastName}`.toLowerCase()
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || app.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none shadow-none font-bold uppercase tracking-widest text-[10px]"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none shadow-none font-bold uppercase tracking-widest text-[10px]"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none shadow-none font-bold uppercase tracking-widest text-[10px]"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>
      default:
        return <Badge variant="outline" className="font-bold uppercase tracking-widest text-[10px]">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    })
  }

  const statusCounts = {
    all: applications.length,
    pending: applications.filter((app) => app.status === "pending").length,
    approved: applications.filter((app) => app.status === "approved").length,
    rejected: applications.filter((app) => app.status === "rejected").length,
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
        
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400 rounded-full filter blur-[80px] opacity-10 -mr-20 -mt-20 pointer-events-none"></div>
          <div className="relative flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shrink-0">
              <Inbox className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">New Scholar Intakes</h1>
              <p className="text-slate-500 font-medium mt-1">Manage and approve scholarship applications submitted through the landing page.</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Total Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-800">{statusCounts.all}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-amber-200 shadow-sm bg-amber-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-amber-600/70">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-amber-600">{statusCounts.pending}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-emerald-200 shadow-sm bg-emerald-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-600/70">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-emerald-600">{statusCounts.approved}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-red-200 shadow-sm bg-red-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-red-600/70">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-red-600">{statusCounts.rejected}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="h-2 bg-blue-500 w-full" />
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 md:p-8">
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-600" /> Intake Queue
              </CardTitle>
              <CardDescription className="font-medium text-slate-500 mt-1">Review documents and whitelist emails for registration.</CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
              <div className="flex bg-slate-200/50 p-1 rounded-xl h-12 w-full sm:w-auto overflow-x-auto border border-slate-200 hide-scrollbar">
                {["all", "pending", "approved", "rejected"].map((status) => (
                  <Button
                    key={status}
                    variant="ghost"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-lg font-bold text-xs h-full whitespace-nowrap ${
                      statusFilter === status 
                        ? "bg-white text-blue-700 shadow-sm hover:text-blue-800 hover:bg-white" 
                        : "text-slate-600 hover:bg-slate-200/50"
                    }`}
                  >
                    {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                    <Badge variant="secondary" className={`ml-2 rounded-full px-1.5 shadow-none ${statusFilter === status ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"}`}>
                      {statusCounts[status as keyof typeof statusCounts]}
                    </Badge>
                  </Button>
                ))}
              </div>

              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search applicants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 rounded-xl bg-white border-slate-200 focus-visible:ring-blue-500 h-12 font-medium shadow-sm"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-24 flex flex-col items-center justify-center text-blue-600">
                <Loader2 className="h-10 w-10 animate-spin mb-4" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Applications...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-slate-100 hover:bg-transparent">
                      <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest pl-8 py-5">Applicant</TableHead>
                      <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-5">Attached Documents</TableHead>
                      <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-5">Status</TableHead>
                      <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-5">Submitted</TableHead>
                      <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest text-right pr-8 py-5">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-white">
                    {filteredApplications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-16 text-slate-500">
                          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-20" />
                          <span className="font-bold uppercase tracking-widest text-xs">
                            {applications.length === 0 ? "No applications submitted yet." : "No applications found matching your criteria."}
                          </span>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredApplications.map((application) => (
                        <TableRow key={application.id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                          
                          <TableCell className="pl-8 py-5 align-middle">
                            <div className="flex flex-col">
                              <span className="font-black text-slate-800 text-sm uppercase tracking-tight">
                                {application.firstName} {application.middleName && `${application.middleName} `}{application.lastName}
                              </span>
                              <span className="text-xs font-medium text-slate-500 mt-1">{application.email}</span>
                              <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase mt-1">ID: {application.id.substring(0, 8)}</span>
                            </div>
                          </TableCell>
                          
                          <TableCell className="py-5 align-middle">
                            <div className="flex flex-col gap-2">
                              {application.barangayClearance ? (
                                <Badge variant="outline" className="w-fit bg-slate-50 border-slate-200 text-slate-600 shadow-none font-medium"><FileText className="w-3 h-3 mr-1.5 text-blue-500" /> Barangay Clearance</Badge>
                              ) : null}
                              {application.indigencyCertificate ? (
                                <Badge variant="outline" className="w-fit bg-slate-50 border-slate-200 text-slate-600 shadow-none font-medium"><FileText className="w-3 h-3 mr-1.5 text-blue-500" /> Cert of Indigency</Badge>
                              ) : null}
                              {application.voterCertification ? (
                                <Badge variant="outline" className="w-fit bg-slate-50 border-slate-200 text-slate-600 shadow-none font-medium"><FileText className="w-3 h-3 mr-1.5 text-blue-500" /> Voter's ID</Badge>
                              ) : null}
                              
                              {!application.barangayClearance && !application.indigencyCertificate && !application.voterCertification && (
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">No files attached</span>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell className="py-5 align-middle">
                            {getStatusBadge(application.status)}
                          </TableCell>
                          
                          <TableCell className="py-5 align-middle text-xs font-medium text-slate-500">
                            {formatDate(application.submittedAt)}
                          </TableCell>
                          
                          <TableCell className="text-right pr-8 py-5 align-middle">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={isProcessingId === application.id} className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl">
                                  {isProcessingId === application.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 rounded-xl border-slate-200 p-2 shadow-xl">
                                <DropdownMenuItem className="cursor-pointer font-bold text-xs rounded-lg">
                                  <Eye className="mr-2 h-4 w-4 text-slate-400" /> View Full Details
                                </DropdownMenuItem>
                                
                                {application.status !== "approved" && (
                                  <>
                                    <DropdownMenuSeparator className="bg-slate-100 my-1"/>
                                    <DropdownMenuItem 
                                      onClick={() => handleApproveApplication(application)}
                                      className="text-emerald-700 focus:text-emerald-800 focus:bg-emerald-50 cursor-pointer font-bold text-xs rounded-lg"
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" /> Approve & Whitelist
                                    </DropdownMenuItem>
                                  </>
                                )}
                                
                                {application.status !== "rejected" && (
                                  <DropdownMenuItem 
                                    onClick={() => handleRejectApplication(application.id)}
                                    className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer font-bold text-xs rounded-lg mt-1"
                                  >
                                    <XCircle className="mr-2 h-4 w-4" /> Reject Application
                                  </DropdownMenuItem>
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
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}