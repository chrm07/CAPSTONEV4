"use client"

import { useState, useEffect, useMemo } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PermissionGuard } from "@/components/permission-guard"
import { 
  Plus, Trash2, Mail, CheckCircle, XCircle, 
  Calendar, AlertCircle, Loader2, Undo, Search, ShieldCheck, Edit
} from "lucide-react"

// IMPORT FIRESTORE REAL-TIME UTILS
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

import { addPreApprovedEmailDb, deletePreApprovedEmailDb } from "@/lib/storage"

type PreApprovedEmail = {
  id: string
  email: string
  isUsed: boolean
  createdAt: string
  fullName?: string
}

export default function ApprovedEmailsPage() {
  const { toast } = useToast()
  
  const [emails, setEmails] = useState<PreApprovedEmail[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  
  const [emailsInput, setEmailsInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [addResults, setAddResults] = useState<{ success: string[]; failed: string[] }>({ success: [], failed: [] })

  const [deletingIds, setDeletingIds] = useState<Record<string, ReturnType<typeof setTimeout>>>({})

  // State for Edit Dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingEmail, setEditingEmail] = useState<PreApprovedEmail | null>(null)
  const [editInput, setEditInput] = useState("")
  const [isEditLoading, setIsEditLoading] = useState(false)

  // REAL-TIME LISTENER FOR APPROVED EMAILS
  useEffect(() => {
    setIsFetching(true)
    
    const unsubscribe = onSnapshot(collection(db, "pre_approved_emails"), (snapshot) => {
      const preApprovedEmails = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PreApprovedEmail))
      const sortedEmails = preApprovedEmails.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setEmails(sortedEmails)
      setIsFetching(false)
    }, (error) => {
      console.error("Failed to load pre-approved emails:", error)
      toast({ title: "Error", description: "Failed to connect to live emails database.", variant: "destructive" })
      setIsFetching(false)
    })

    return () => {
      setTimeout(() => {
        if (typeof unsubscribe === 'function') {
          try {
            unsubscribe()
          } catch (e) {
            console.warn("Firestore unsubscribe cleanup ignored:", e)
          }
        }
      }, 10)
      
      Object.values(deletingIds).forEach(timer => clearTimeout(timer))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) 

  const handleAddEmails = async () => {
    if (!emailsInput.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter at least one email address" })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const rawEmails = emailsInput.split(/[\n,;\s]+/).map((e) => e.trim().toLowerCase()).filter((e) => e.length > 0)
    const uniqueEmails = [...new Set(rawEmails)]

    if (uniqueEmails.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "No valid email addresses found" })
      return
    }

    setIsLoading(true)
    const successEmails: string[] = []
    const failedEmails: string[] = []

    try {
      const currentEmailStrings = emails.map(e => e.email.toLowerCase())

      for (const email of uniqueEmails) {
        if (!emailRegex.test(email)) {
          failedEmails.push(`${email} (invalid format)`)
          continue
        }
        
        if (currentEmailStrings.includes(email)) {
          failedEmails.push(`${email} (already exists)`)
          continue
        }

        try {
          await addPreApprovedEmailDb(email)
          successEmails.push(email)
        } catch (error: any) {
          failedEmails.push(`${email} (${error.message || "failed"})`)
        }
      }

      setAddResults({ success: successEmails, failed: failedEmails })

      if (successEmails.length > 0) {
        toast({
          title: "Emails Added",
          description: `Successfully added ${successEmails.length} email${successEmails.length > 1 ? "s" : ""}. ${failedEmails.length > 0 ? `${failedEmails.length} failed.` : ""}`,
          className: "bg-emerald-600 text-white border-none"
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No emails were added. Check the results below.",
        })
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Database Error", description: "Could not connect to the database to add emails." })
    } finally {
      setIsLoading(false)
    }
  }

  // 🔥 FIX: Safer edit logic by adding the new email and deleting the old one
  const handleEditEmail = async () => {
    if (!editingEmail || !editInput.trim()) return

    const newEmail = editInput.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailRegex.test(newEmail)) {
      toast({ variant: "destructive", title: "Invalid Email", description: "Please enter a valid email format." })
      return
    }

    if (newEmail === editingEmail.email) {
      setIsEditDialogOpen(false)
      return // No changes made
    }

    const isDuplicate = emails.some(e => e.email.toLowerCase() === newEmail && e.id !== editingEmail.id)
    if (isDuplicate) {
      toast({ variant: "destructive", title: "Duplicate Email", description: "This email is already in the approved list." })
      return
    }

    setIsEditLoading(true)
    try {
      // Safely replace the document
      await addPreApprovedEmailDb(newEmail)
      await deletePreApprovedEmailDb(editingEmail.id)
      
      toast({ title: "Email Updated", description: "The email has been successfully updated.", className: "bg-emerald-600 text-white border-none" })
      setIsEditDialogOpen(false)
      setEditingEmail(null)
      setEditInput("")
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Failed to update the email." })
    } finally {
      setIsEditLoading(false)
    }
  }

  // Remove `disabled` from the button itself and handle the restriction here so the Toast correctly pops up.
  const openEditDialog = (emailRecord: PreApprovedEmail) => {
    if (emailRecord.isUsed) {
      toast({ variant: "destructive", title: "Cannot Edit", description: "This email has already been used for registration and cannot be changed." })
      return
    }
    setEditingEmail(emailRecord)
    setEditInput(emailRecord.email)
    setIsEditDialogOpen(true)
  }

  const resetDialog = () => {
    setEmailsInput("")
    setAddResults({ success: [], failed: [] })
    setIsAddDialogOpen(false)
  }

  const triggerDelete = (id: string, emailAddress: string) => {
    const timer = setTimeout(async () => {
      try {
        await deletePreApprovedEmailDb(id)
        setDeletingIds(prev => {
          const next = { ...prev }
          delete next[id]
          return next
        })
        toast({ title: "Success", description: `Removed ${emailAddress} from pre-approved list` })
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message || "Failed to remove email" })
        setDeletingIds(prev => {
          const next = { ...prev }
          delete next[id]
          return next
        })
      }
    }, 3000)

    setDeletingIds(prev => ({ ...prev, [id]: timer }))
  }

  const undoDelete = (id: string) => {
    if (deletingIds[id]) {
      clearTimeout(deletingIds[id])
      setDeletingIds(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      toast({ 
        title: "Undo Successful", 
        description: "The email was not deleted.", 
        className: "bg-slate-800 text-white border-none" 
      })
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
  }

  const filteredEmails = useMemo(() => {
    return emails.filter(e => e.email.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [emails, searchQuery])

  return (
    <PermissionGuard permission="approved-emails">
      <AdminLayout>
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Approved Emails</h1>
              <p className="text-slate-500 font-medium mt-1">Manage the whitelist of emails authorized to register for scholarships.</p>
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              if (!open) resetDialog()
              else setIsAddDialogOpen(true)
            }}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 px-6 font-bold shadow-md shadow-emerald-200">
                  <Plus className="mr-2 h-5 w-5" /> Add Emails
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px] rounded-3xl border-0 shadow-2xl overflow-hidden p-0">
                <div className="h-2 bg-emerald-500 w-full" />
                <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
                  <DialogTitle className="text-xl font-black uppercase text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" /> Whitelist Emails
                  </DialogTitle>
                  <DialogDescription className="font-medium text-slate-500">
                    Paste a list of emails separated by commas, spaces, or new lines. Only these students will be allowed to register.
                  </DialogDescription>
                </DialogHeader>
                <div className="p-6 grid gap-4 bg-white">
                  <div className="space-y-3">
                    <Label htmlFor="emails" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email Addresses *</Label>
                    <Textarea
                      id="emails"
                      placeholder="student1@cvsu.edu.ph, student2@cvsu.edu.ph..."
                      value={emailsInput}
                      onChange={(e) => setEmailsInput(e.target.value)}
                      className="min-h-[140px] font-mono text-sm rounded-xl border-slate-200 focus-visible:ring-emerald-500 bg-slate-50/50 p-4"
                    />
                  </div>

                  {(addResults.success.length > 0 || addResults.failed.length > 0) && (
                    <div className="space-y-3">
                      {addResults.success.length > 0 && (
                        <Alert className="border-emerald-200 bg-emerald-50 rounded-xl">
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                          <AlertDescription className="text-emerald-800">
                            <span className="font-bold">Added ({addResults.success.length}):</span>
                            <div className="mt-1 text-xs max-h-20 overflow-y-auto font-mono">
                              {addResults.success.join(", ")}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                      {addResults.failed.length > 0 && (
                        <Alert className="border-red-200 bg-red-50 rounded-xl">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-800">
                            <span className="font-bold">Failed ({addResults.failed.length}):</span>
                            <div className="mt-1 text-xs max-h-20 overflow-y-auto font-mono">
                              {addResults.failed.join(", ")}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex gap-2 sm:justify-end">
                  <Button variant="outline" onClick={resetDialog} disabled={isLoading} className="rounded-xl font-bold">
                    {addResults.success.length > 0 ? "Done" : "Cancel"}
                  </Button>
                  <Button onClick={handleAddEmails} disabled={isLoading || !emailsInput.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold px-8">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isLoading ? "Adding..." : "Add Emails"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
              if (!open) {
                setIsEditDialogOpen(false)
                setEditingEmail(null)
              }
            }}>
              <DialogContent className="sm:max-w-md rounded-3xl border-0 shadow-2xl p-0 overflow-hidden bg-white">
                <div className="h-2 bg-blue-500 w-full" />
                <DialogHeader className="p-6 border-b border-slate-100">
                  <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-800">Edit Email</DialogTitle>
                  <DialogDescription className="font-medium text-slate-500 mt-1">
                    Update the pre-approved email address.
                  </DialogDescription>
                </DialogHeader>
                <div className="p-6">
                  <div className="space-y-2">
                    <Label htmlFor="edit-email" className="text-xs font-bold uppercase tracking-widest text-slate-500">Email Address</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editInput}
                      onChange={(e) => setEditInput(e.target.value)}
                      className="h-12 rounded-xl focus-visible:ring-blue-500 font-medium"
                    />
                  </div>
                </div>
                <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isEditLoading} className="rounded-xl font-bold">
                    Cancel
                  </Button>
                  <Button onClick={handleEditEmail} disabled={isEditLoading || !editInput.trim()} className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                    {isEditLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-6 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <Mail className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-wider">Total Pre-Approved</span>
                </div>
                <span className="text-4xl font-black text-slate-900">{emails.length}</span>
                <p className="text-xs font-medium text-slate-400 mt-1">Emails whitelisted in system</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-emerald-200 shadow-sm bg-emerald-50/30">
              <CardContent className="p-6 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                  <CheckCircle className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-wider">Available</span>
                </div>
                <span className="text-4xl font-black text-emerald-700">{emails.filter(e => !e.isUsed).length}</span>
                <p className="text-xs font-medium text-emerald-600/70 mt-1">Ready for registration</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-blue-200 shadow-sm bg-blue-50/30">
              <CardContent className="p-6 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <XCircle className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-wider">Used</span>
                </div>
                <span className="text-4xl font-black text-blue-700">{emails.filter(e => e.isUsed).length}</span>
                <p className="text-xs font-medium text-blue-600/70 mt-1">Already registered</p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-white border-b border-slate-100 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-800">Email Directory</CardTitle>
                <CardDescription className="font-medium text-slate-500">Manage individual email records</CardDescription>
              </div>
              <div className="relative w-full sm:w-72 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-emerald-500 h-10 font-medium shadow-none"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isFetching ? (
                <div className="py-24 flex flex-col items-center justify-center text-emerald-600">
                  <Loader2 className="h-10 w-10 animate-spin mb-4" />
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading directory...</p>
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="py-24 text-center text-slate-400">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="font-bold uppercase tracking-widest text-sm">No emails found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-slate-100">
                        <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest pl-8 py-4">Email Address</TableHead>
                        <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-4">Status</TableHead>
                        <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-4">Added Date</TableHead>
                        <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest text-right pr-8 py-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-white">
                      {filteredEmails.map((email) => (
                        deletingIds[email.id] ? (
                          <TableRow key={email.id} className="bg-red-50/80 hover:bg-red-50/80 border-b border-red-100/50">
                            <TableCell colSpan={4} className="py-3 px-8">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Loader2 className="w-5 h-5 animate-spin text-red-600" />
                                  <span className="text-sm font-black text-red-700 tracking-tight">
                                    Permanently deleting {email.email} in 3 seconds...
                                  </span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => undoDelete(email.id)}
                                  className="border-red-200 bg-white text-red-700 hover:bg-red-100 hover:text-red-800 font-bold rounded-xl h-9 px-4 shadow-sm"
                                >
                                  <Undo className="w-4 h-4 mr-2" /> Undo
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          <TableRow key={email.id} className="hover:bg-slate-50/80 transition-colors border-slate-100">
                            <TableCell className="pl-8 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                  <Mail className="h-4 w-4" />
                                </div>
                                <span className="font-bold text-slate-800 text-sm">{email.email}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              {email.isUsed ? (
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none font-bold shadow-none">Used</Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none font-bold shadow-none">Available</Badge>
                              )}
                            </TableCell>
                            <TableCell className="py-4">
                              <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(email.createdAt)}
                              </span>
                            </TableCell>
                            
                            {/* 🔥 FIX: Changed to visually clear, distinct bordered buttons and removed hover hiding */}
                            <TableCell className="text-right pr-8 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openEditDialog(email)
                                  }}
                                  className={`h-8 w-8 rounded-lg shadow-sm border ${
                                    email.isUsed 
                                      ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50' 
                                      : 'border-blue-200 text-blue-600 hover:text-blue-700 hover:bg-blue-50 bg-white'
                                  }`}
                                  title={email.isUsed ? "Cannot edit used email" : "Edit email"}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    triggerDelete(email.id, email.email)
                                  }}
                                  className="h-8 w-8 rounded-lg shadow-sm border border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50 bg-white"
                                  title="Delete email"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>

                          </TableRow>
                        )
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </PermissionGuard>
  )
}
