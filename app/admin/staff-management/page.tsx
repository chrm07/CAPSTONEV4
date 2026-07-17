"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"

// 🔥 IMPORT FIRESTORE REAL-TIME UTILS
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"

import {
  createStaffMemberDb, updateStaffRoleDb, deleteStaffMemberDb, getAdminRoleLabel, hasPermission, type User, type AdminRole, ADMIN_PERMISSIONS,
} from "@/lib/storage"

import { UserPlus, Shield, ShieldCheck, QrCode, Trash2, Edit, Users, Eye, EyeOff, Loader2, UsersRound } from "lucide-react"
import { useRouter } from "next/navigation"

export default function StaffManagementPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  const [staffMembers, setStaffMembers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  
  const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "", adminRole: "verifier_staff" as AdminRole })

  useEffect(() => {
    if (user && !hasPermission(user, "staff-management")) {
      router.push("/admin/dashboard")
      toast({ variant: "destructive", title: "Access Denied", description: "You don't have permission to access staff management." })
    }
  }, [user, router, toast])

  // 🔥 REAL-TIME LISTENER FOR STAFF DIRECTORY
  useEffect(() => {
    setIsLoading(true)
    const staffQ = query(collection(db, "users"), where("role", "==", "admin"))
    
    const unsubscribe = onSnapshot(staffQ, (snapshot) => {
      const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User))
      setStaffMembers(members)
      setIsLoading(false)
    }, (error) => {
      console.error("Error fetching live staff data:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to connect to live staff directory." })
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [toast])

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.email || !newStaff.password) return toast({ variant: "destructive", title: "Missing Information", description: "Please fill in all required fields." })
    setIsProcessing(true)
    const result = await createStaffMemberDb(newStaff)
    if (!result.success) { toast({ variant: "destructive", title: "Error", description: result.error }); setIsProcessing(false); return }
    
    // No need to manually reload staff, onSnapshot handles it!
    setIsProcessing(false); setIsAddDialogOpen(false); setNewStaff({ name: "", email: "", password: "", adminRole: "verifier_staff" })
    toast({ title: "Staff Added", description: `${result.user?.name} has been added as ${getAdminRoleLabel(result.user?.adminRole!)}.` })
  }

  const handleEditRole = async () => {
    if (!selectedStaff) return
    setIsProcessing(true)
    const success = await updateStaffRoleDb(selectedStaff.id, selectedStaff.adminRole!)
    if (success) { setIsEditDialogOpen(false); toast({ title: "Role Updated", description: `${selectedStaff.name}'s role has been updated.` }) } 
    else { toast({ variant: "destructive", title: "Error", description: "Failed to update role." }) }
    setSelectedStaff(null); setIsProcessing(false)
  }

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return
    if (selectedStaff.adminRole === "head_admin") { toast({ variant: "destructive", title: "Cannot Delete", description: "Cannot delete a head administrator." }); setIsDeleteDialogOpen(false); return }
    setIsProcessing(true)
    const success = await deleteStaffMemberDb(selectedStaff.id)
    if (success) { setIsDeleteDialogOpen(false); toast({ title: "Staff Removed", description: `${selectedStaff.name} has been removed from the system.` }) } 
    else { toast({ variant: "destructive", title: "Error", description: "Failed to remove staff member." }) }
    setSelectedStaff(null); setIsProcessing(false)
  }

  const getRoleBadgeColor = (role: AdminRole) => {
    switch (role) {
      case "head_admin": return "bg-purple-100 text-purple-700 border-none shadow-none font-bold uppercase tracking-widest text-[10px]"
      case "verifier_staff": return "bg-blue-100 text-blue-700 border-none shadow-none font-bold uppercase tracking-widest text-[10px]"
      case "scanner_staff": return "bg-emerald-100 text-emerald-700 border-none shadow-none font-bold uppercase tracking-widest text-[10px]"
      default: return "bg-slate-100 text-slate-700 border-none shadow-none font-bold uppercase tracking-widest text-[10px]"
    }
  }

  const getRoleIcon = (role: AdminRole) => {
    switch (role) {
      case "head_admin": return <ShieldCheck className="h-3 w-3 mr-1" />
      case "verifier_staff": return <Shield className="h-3 w-3 mr-1" />
      case "scanner_staff": return <QrCode className="h-3 w-3 mr-1" />
      default: return <Users className="h-3 w-3 mr-1" />
    }
  }

  if (!user || !hasPermission(user, "staff-management")) return null

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
        
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400 rounded-full filter blur-[80px] opacity-10 -mr-20 -mt-20 pointer-events-none"></div>
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg shrink-0">
                <UsersRound className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Staff Management</h1>
                <p className="text-slate-500 font-medium mt-1">Manage admin accounts and their access permissions.</p>
              </div>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md font-bold h-11 px-6 w-full md:w-auto">
              <UserPlus className="h-4 w-4 mr-2" /> Add Staff Member
            </Button>
          </div>
        </div>

        {/* Role Permissions Overview */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border border-purple-100 shadow-sm bg-gradient-to-br from-purple-50 to-white rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-2 bg-purple-500 w-full" />
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-2xl bg-purple-100 shadow-inner"><ShieldCheck className="h-6 w-6 text-purple-600" /></div>
                <CardTitle className="text-base font-black uppercase tracking-tight text-slate-800">Head Admin</CardTitle>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Full System Access</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {ADMIN_PERMISSIONS.head_admin.slice(0, 5).map((perm) => (<Badge key={perm} variant="outline" className="text-[10px] font-bold tracking-widest uppercase bg-white border-purple-200 text-purple-700 shadow-sm">{perm.replace("-", " ")}</Badge>))}
                <Badge variant="outline" className="text-[10px] font-bold tracking-widest uppercase bg-white border-purple-200 text-purple-700 shadow-sm">+{ADMIN_PERMISSIONS.head_admin.length - 5} More</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-blue-100 shadow-sm bg-gradient-to-br from-blue-50 to-white rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-2 bg-blue-500 w-full" />
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-2xl bg-blue-100 shadow-inner"><Shield className="h-6 w-6 text-blue-600" /></div>
                <CardTitle className="text-base font-black uppercase tracking-tight text-slate-800">Verifier</CardTitle>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Manage Applications</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {ADMIN_PERMISSIONS.verifier_staff.map((perm) => (<Badge key={perm} variant="outline" className="text-[10px] font-bold tracking-widest uppercase bg-white border-blue-200 text-blue-700 shadow-sm">{perm.replace("-", " ")}</Badge>))}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-emerald-100 shadow-sm bg-gradient-to-br from-emerald-50 to-white rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-2 bg-emerald-500 w-full" />
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-2xl bg-emerald-100 shadow-inner"><QrCode className="h-6 w-6 text-emerald-600" /></div>
                <CardTitle className="text-base font-black uppercase tracking-tight text-slate-800">Scanner</CardTitle>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">QR Scanning Only</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {ADMIN_PERMISSIONS.scanner_staff.map((perm) => (<Badge key={perm} variant="outline" className="text-[10px] font-bold tracking-widest uppercase bg-white border-emerald-200 text-emerald-700 shadow-sm">{perm.replace("-", " ")}</Badge>))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Staff List */}
        <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="h-2 bg-slate-800 w-full" />
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
            <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-800">Active Staff Directory</CardTitle>
            <CardDescription className="font-medium text-slate-500">{isLoading ? "Loading..." : `${staffMembers.length} staff member${staffMembers.length !== 1 ? "s" : ""} in the system.`}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white">
                  <TableRow className="border-slate-100">
                    <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest pl-8 py-5">Staff Member</TableHead>
                    <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-5">Assigned Role</TableHead>
                    <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-5">Access Scope</TableHead>
                    <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest text-right pr-8 py-5">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white">
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                      </TableCell>
                    </TableRow>
                  ) : staffMembers.length === 0 ? (
                     <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                        No staff members found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    staffMembers.map((staff) => (
                      <TableRow key={staff.id} className="hover:bg-slate-50 transition-colors border-slate-100">
                        <TableCell className="pl-8 py-4 align-middle">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800 text-sm uppercase tracking-tight">{staff.name}</span>
                            <span className="text-xs font-medium text-slate-500 mt-0.5">{staff.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 align-middle">
                          <Badge className={getRoleBadgeColor(staff.adminRole!)}>
                            {getRoleIcon(staff.adminRole!)} {getAdminRoleLabel(staff.adminRole!)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 align-middle">
                          {/* 🔥 FIX APPLIED HERE: Safe fallback array for missing roles */}
                          <div className="flex flex-wrap gap-1 max-w-[250px]">
                            {(ADMIN_PERMISSIONS[staff.adminRole as AdminRole] || []).slice(0, 3).map((perm) => (
                              <Badge key={perm} variant="outline" className="text-[9px] font-bold tracking-widest uppercase bg-slate-50 border-slate-200 text-slate-500 shadow-none">{perm.replace("-", " ")}</Badge>
                            ))}
                            {(ADMIN_PERMISSIONS[staff.adminRole as AdminRole]?.length || 0) > 3 && (
                              <Badge variant="outline" className="text-[9px] font-bold tracking-widest uppercase bg-slate-100 border-slate-200 text-slate-600 shadow-none">
                                +{(ADMIN_PERMISSIONS[staff.adminRole as AdminRole]?.length || 0) - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-8 py-4 align-middle">
                          {staff.adminRole !== "head_admin" ? (
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-xl" onClick={() => { setSelectedStaff(staff); setIsEditDialogOpen(true); }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-xl" onClick={() => { setSelectedStaff(staff); setIsDeleteDialogOpen(true); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="outline" className="bg-slate-100 text-slate-400 border-none shadow-none font-bold uppercase tracking-widest text-[9px] mr-2">Protected</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Staff Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="rounded-3xl border-0 shadow-2xl p-0 overflow-hidden sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="h-2 bg-slate-900 w-full shrink-0" />
          <DialogHeader className="px-6 py-6 border-b shrink-0 bg-white">
            <DialogTitle className="text-xl font-black uppercase text-slate-800 tracking-tight flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-slate-600" /> Add New Staff Member
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500 mt-1">Create a new staff account with specific role permissions.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-6 space-y-5 bg-slate-50">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Full Name</Label>
              <Input placeholder="Enter full name" value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} disabled={isProcessing} className="rounded-xl bg-white border-slate-200 shadow-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</Label>
              <Input type="email" placeholder="staff@carmona.gov.ph" value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} disabled={isProcessing} className="rounded-xl bg-white border-slate-200 shadow-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Password</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="Enter temporary password" value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} disabled={isProcessing} className="rounded-xl bg-white border-slate-200 shadow-sm pr-10" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-slate-600 rounded-lg" onClick={() => setShowPassword(!showPassword)} disabled={isProcessing}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Staff Role</Label>
              <Select value={newStaff.adminRole} onValueChange={(value: AdminRole) => setNewStaff({ ...newStaff, adminRole: value })} disabled={isProcessing}>
                <SelectTrigger className="rounded-xl bg-white border-slate-200 shadow-sm h-11"><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-xl p-1">
                  <SelectItem value="verifier_staff" className="font-bold rounded-lg py-2.5 cursor-pointer text-slate-700 focus:bg-blue-50 focus:text-blue-700"><div className="flex items-center gap-2"><Shield className="h-4 w-4 text-blue-600" /><span>Verification Staff</span></div></SelectItem>
                  <SelectItem value="scanner_staff" className="font-bold rounded-lg py-2.5 cursor-pointer text-slate-700 focus:bg-emerald-50 focus:text-emerald-700"><div className="flex items-center gap-2"><QrCode className="h-4 w-4 text-emerald-600" /><span>QR Scanner Staff</span></div></SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs font-medium text-slate-500 mt-2 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                {newStaff.adminRole === "verifier_staff" ? "Verifier: Can view scholars, applications, and verify students." : "Scanner: Can only scan QR codes for verification during events."}
              </p>
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-3 px-6 py-4 border-t shrink-0 bg-white rounded-b-3xl">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isProcessing} className="rounded-xl font-bold">Cancel</Button>
            <Button onClick={handleAddStaff} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-md px-6" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-3xl border-0 shadow-2xl p-0 overflow-hidden sm:max-w-[400px]">
          <div className="h-2 bg-blue-500 w-full shrink-0" />
          <DialogHeader className="px-6 py-6 border-b shrink-0 bg-white">
            <DialogTitle className="text-xl font-black uppercase text-slate-800 tracking-tight flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" /> Edit Staff Role
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500 mt-1">Change access permissions for <span className="font-bold text-slate-700">{selectedStaff?.name}</span>.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-6 space-y-5 bg-slate-50">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Current Role</Label>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <Badge className={getRoleBadgeColor(selectedStaff?.adminRole!)}>
                  {getRoleIcon(selectedStaff?.adminRole!)} {selectedStaff && getAdminRoleLabel(selectedStaff.adminRole!)}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">New Role</Label>
              {/* 🔥 FIX APPLIED HERE: Added || "" fallback for empty roles to prevent Select component warnings */}
              <Select value={selectedStaff?.adminRole || ""} onValueChange={(value: AdminRole) => setSelectedStaff(selectedStaff ? { ...selectedStaff, adminRole: value } : null)} disabled={isProcessing}>
                <SelectTrigger className="rounded-xl bg-white border-slate-200 shadow-sm h-11"><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-xl p-1">
                  <SelectItem value="verifier_staff" className="font-bold rounded-lg py-2.5 cursor-pointer text-slate-700 focus:bg-blue-50 focus:text-blue-700"><div className="flex items-center gap-2"><Shield className="h-4 w-4 text-blue-600" /><span>Verification Staff</span></div></SelectItem>
                  <SelectItem value="scanner_staff" className="font-bold rounded-lg py-2.5 cursor-pointer text-slate-700 focus:bg-emerald-50 focus:text-emerald-700"><div className="flex items-center gap-2"><QrCode className="h-4 w-4 text-emerald-600" /><span>QR Scanner Staff</span></div></SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-3 px-6 py-4 border-t shrink-0 bg-white rounded-b-3xl">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isProcessing} className="rounded-xl font-bold">Cancel</Button>
            <Button onClick={handleEditRole} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md px-6" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl border-0 shadow-2xl p-6 sm:max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-red-600 tracking-tight flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Remove Staff Member?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-slate-600 mt-2">
              Are you sure you want to permanently remove <span className="font-bold text-slate-800">{selectedStaff?.name}</span> from the system? They will lose all access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={isProcessing} className="rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStaff} className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Remove Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  )
}