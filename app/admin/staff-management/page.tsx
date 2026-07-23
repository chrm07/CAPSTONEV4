"use client"

import { useState, useEffect, useMemo } from "react"
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
import { DataPagination } from "@/components/data-pagination"

// 🔥 IMPORT FIRESTORE REAL-TIME UTILS
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"

import {
  createStaffMemberDb, updateStaffPermissionsDb, deleteStaffMemberDb, getAdminRoleLabel, hasPermission, getDefaultAdminRoute, type User, type Permissions, type PermissionKey, ALL_PERMISSIONS, DEFAULT_PERMISSIONS,
} from "@/lib/storage"

import { UserPlus, Shield, ShieldCheck, Trash2, Edit, Eye, EyeOff, Loader2, Check, X, LayoutDashboard, Mail, FileText, Users, Calendar, QrCode, BarChart3 } from "lucide-react"
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
  
  const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "", permissions: { ...DEFAULT_PERMISSIONS } })
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    if (user && !hasPermission(user, "staff-management")) {
      router.push(getDefaultAdminRoute(user))
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
    
    setIsProcessing(false); setIsAddDialogOpen(false); setNewStaff({ name: "", email: "", password: "", permissions: { ...DEFAULT_PERMISSIONS } })
    toast({ title: "Staff Added", description: `${result.user?.name} has been added as Staff.` })
  }

  const handleEditPermissions = async () => {
    if (!selectedStaff || !selectedStaff.permissions) return
    setIsProcessing(true)
    const success = await updateStaffPermissionsDb(selectedStaff.id, selectedStaff.permissions)
    if (success) { setIsEditDialogOpen(false); toast({ title: "Permissions Updated", description: `${selectedStaff.name}'s permissions have been updated.` }) } 
    else { toast({ variant: "destructive", title: "Error", description: "Failed to update permissions." }) }
    setSelectedStaff(null); setIsProcessing(false)
  }

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return
    const isAdmin = selectedStaff.adminRole === "admin" || selectedStaff.adminRole === "head_admin"
    if (isAdmin) { toast({ variant: "destructive", title: "Cannot Delete", description: "Cannot delete a head administrator." }); setIsDeleteDialogOpen(false); return }
    setIsProcessing(true)
    const success = await deleteStaffMemberDb(selectedStaff.id)
    if (success) { setIsDeleteDialogOpen(false); toast({ title: "Staff Removed", description: `${selectedStaff.name} has been removed from the system.` }) } 
    else { toast({ variant: "destructive", title: "Error", description: "Failed to remove staff member." }) }
    setSelectedStaff(null); setIsProcessing(false)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
      case "head_admin": return "bg-purple-100 text-purple-700 border-none shadow-none font-bold uppercase tracking-widest text-[10px]"
      case "staff": return "bg-slate-100 text-slate-700 border-none shadow-none font-bold uppercase tracking-widest text-[10px]"
      default: return "bg-slate-100 text-slate-700 border-none shadow-none font-bold uppercase tracking-widest text-[10px]"
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
      case "head_admin": return <ShieldCheck className="h-3 w-3 mr-1" />
      case "staff": return <Shield className="h-3 w-3 mr-1" />
      default: return <Shield className="h-3 w-3 mr-1" />
    }
  }

  const paginatedStaff = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return staffMembers.slice(start, start + ITEMS_PER_PAGE);
  }, [staffMembers, currentPage]);

  useEffect(() => {
    const maxPage = Math.ceil(staffMembers.length / ITEMS_PER_PAGE);
    if (currentPage > maxPage && maxPage > 0) setCurrentPage(maxPage);
  }, [staffMembers.length, currentPage]);

  const getDefaultPermissionsForStaff = (staff: User): Permissions => {
    if (staff.permissions) return staff.permissions
    const legacyRole = staff.adminRole as string
    if (legacyRole === "verifier_staff") {
      return { dashboard: true, approvedEmails: false, applications: true, scholars: true, scheduling: false, qrVerification: true, reports: false }
    }
    if (legacyRole === "scanner_staff") {
      return { dashboard: true, approvedEmails: false, applications: false, scholars: false, scheduling: false, qrVerification: true, reports: false }
    }
    if (legacyRole === "head_admin" || legacyRole === "admin") {
      return ALL_PERMISSIONS.reduce((acc, key) => ({ ...acc, [key]: true }), {} as Permissions)
    }
    return { ...DEFAULT_PERMISSIONS }
  }

  if (!user || !hasPermission(user, "staff-management")) return null

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
        
        <div className="flex justify-end">
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md font-bold h-11 px-6 w-full md:w-auto">
            <UserPlus className="h-4 w-4 mr-2" /> Add Staff Member
          </Button>
        </div>

        {/* Account Type Explanation */}
        <Card className="rounded-3xl border border-slate-200 shadow-sm bg-gradient-to-br from-slate-50 to-white overflow-hidden">
          <div className="h-2 bg-slate-800 w-full" />
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-black uppercase tracking-tight text-slate-800">Account Types</CardTitle>
            <CardDescription className="font-medium text-slate-500">
              Two account types: <strong>Head Admin</strong> (full system access) and <strong>Staff</strong> (individual configurable permissions).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-3">
                <Badge className="bg-purple-100 text-purple-700 border-none shadow-none font-bold uppercase tracking-widest text-[10px]">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Head Admin
                </Badge>
                <span className="text-xs font-medium text-slate-500">— Full system access</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-slate-100 text-slate-700 border-none shadow-none font-bold uppercase tracking-widest text-[10px]">
                  <Shield className="h-3 w-3 mr-1" /> Staff
                </Badge>
                <span className="text-xs font-medium text-slate-500">— Custom permissions per module</span>
              </div>
            </div>
          </CardContent>
        </Card>

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
                    <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-5">Type</TableHead>
                    <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-5">Permissions</TableHead>
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
                    paginatedStaff.map((staff) => (
                      <TableRow key={staff.id} className="hover:bg-slate-50 transition-colors border-slate-100">
                        <TableCell className="pl-8 py-4 align-middle">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800 text-sm uppercase tracking-tight">{staff.name}</span>
                            <span className="text-xs font-medium text-slate-500 mt-0.5">{staff.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 align-middle">
                          {staff.adminRole === "admin" || staff.adminRole === "head_admin" ? (
                            <Badge className="bg-purple-100 text-purple-700 border-none shadow-none font-bold uppercase tracking-widest text-[10px]">
                              <ShieldCheck className="h-3 w-3 mr-1" /> Admin
                            </Badge>
                          ) : staff.adminRole === "staff" ? (
                            <Badge className="bg-slate-100 text-slate-700 border-none shadow-none font-bold uppercase tracking-widest text-[10px]">
                              <Shield className="h-3 w-3 mr-1" /> Staff
                            </Badge>
                          ) : (
                            <Badge className={getRoleBadgeColor(staff.adminRole!)}>
                              {getRoleIcon(staff.adminRole!)} {getAdminRoleLabel(staff.adminRole!)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-4 align-middle">
                          <div className="flex flex-wrap gap-1 max-w-[250px]">
                            {staff.adminRole === "admin" || staff.adminRole === "head_admin" ? (
                              <Badge variant="outline" className="text-[9px] font-bold tracking-widest uppercase bg-emerald-50 border-emerald-200 text-emerald-700 shadow-none">
                                Full Access
                              </Badge>
                            ) : staff.permissions ? (
                              (() => {
                                const enabled = ALL_PERMISSIONS.filter(p => staff.permissions![p])
                                return enabled.length > 0 ? (
                                  enabled.slice(0, 4).map((perm) => (
                                    <Badge key={perm} variant="outline" className="text-[9px] font-bold tracking-widest uppercase bg-slate-50 border-slate-200 text-slate-500 shadow-none">
                                      {perm.replace(/([A-Z])/g, " $1").trim()}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-[9px] font-medium text-slate-400">No permissions</span>
                                )
                              })()
                            ) : (
                              /* Legacy role-based permissions fallback */
                              (() => {
                                const perms = staff.adminRole === "verifier_staff" 
                                  ? ["dashboard", "applications", "scholars", "qrVerification"]
                                  : staff.adminRole === "scanner_staff"
                                  ? ["dashboard", "qrVerification"]
                                  : []
                                return perms.map((perm) => (
                                  <Badge key={perm} variant="outline" className="text-[9px] font-bold tracking-widest uppercase bg-slate-50 border-slate-200 text-slate-500 shadow-none">
                                    {perm === "qrVerification" ? "QR Verification" : perm.charAt(0).toUpperCase() + perm.slice(1)}
                                  </Badge>
                                ))
                              })()
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-8 py-4 align-middle">
                          {staff.adminRole !== "admin" && staff.adminRole !== "head_admin" ? (
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-xl" onClick={() => { setSelectedStaff({ ...staff, permissions: getDefaultPermissionsForStaff(staff) }); setIsEditDialogOpen(true); }}>
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
            <DataPagination
              currentPage={currentPage}
              totalPages={Math.ceil(staffMembers.length / ITEMS_PER_PAGE)}
              onPageChange={setCurrentPage}
              totalItems={staffMembers.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </CardContent>
        </Card>
      </div>

      <AddStaffDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        newStaff={newStaff}
        setNewStaff={setNewStaff}
        isProcessing={isProcessing}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        onAdd={handleAddStaff}
      />

      <EditStaffPermissionsDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        selectedStaff={selectedStaff}
        setSelectedStaff={setSelectedStaff}
        isProcessing={isProcessing}
        onSave={handleEditPermissions}
        getRoleBadgeColor={getRoleBadgeColor}
        getRoleIcon={getRoleIcon}
        getAdminRoleLabel={getAdminRoleLabel}
      />

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

// ─── Shared permission icon map ───────────────────────────────────────────────
const PERMISSION_ICONS: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard className="h-4 w-4" />,
  approvedEmails: <Mail className="h-4 w-4" />,
  applications: <FileText className="h-4 w-4" />,
  scholars: <Users className="h-4 w-4" />,
  scheduling: <Calendar className="h-4 w-4" />,
  qrVerification: <QrCode className="h-4 w-4" />,
  reports: <BarChart3 className="h-4 w-4" />,
}

const PERMISSION_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  approvedEmails: "Approved Emails",
  applications: "Applications",
  scholars: "Scholars",
  scheduling: "Scheduling",
  qrVerification: "QR Verification",
  reports: "Reports",
}

// ─── AddStaffDialog ───────────────────────────────────────────────────────────
function AddStaffDialog({
  open, onOpenChange, newStaff, setNewStaff, isProcessing, showPassword, setShowPassword, onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  newStaff: { name: string; email: string; password: string; permissions: Permissions }
  setNewStaff: (v: any) => void
  isProcessing: boolean
  showPassword: boolean
  setShowPassword: (v: boolean) => void
  onAdd: () => void
}) {
  const togglePermission = (key: PermissionKey) => {
    setNewStaff({ ...newStaff, permissions: { ...newStaff.permissions, [key]: !newStaff.permissions[key] } })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[90vh] p-0 gap-0 sm:max-w-[540px] w-[95vw] rounded-3xl border-0 shadow-2xl overflow-hidden">
        <div className="h-2 bg-slate-900 w-full shrink-0" />

        {/* Header */}
        <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shrink-0 shadow-sm">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-slate-900 uppercase">
                Add New Staff Member
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-slate-500 mt-0.5">
                Create a staff account with custom access permissions.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-slate-50/50">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Full Name</Label>
            <Input
              placeholder="Enter full name"
              value={newStaff.name}
              onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
              disabled={isProcessing}
              className="rounded-xl bg-white border-slate-200 shadow-sm h-10"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</Label>
            <Input
              type="email"
              placeholder="staff@carmona.gov.ph"
              value={newStaff.email}
              onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
              disabled={isProcessing}
              className="rounded-xl bg-white border-slate-200 shadow-sm h-10"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter temporary password"
                value={newStaff.password}
                onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                disabled={isProcessing}
                className="rounded-xl bg-white border-slate-200 shadow-sm pr-10 h-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-slate-600 rounded-lg"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isProcessing}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Permissions</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-[10px] font-black h-6 px-2 text-emerald-600 hover:text-emerald-700 transition-colors rounded-lg"
                  onClick={() => {
                    const allEnabled = ALL_PERMISSIONS.reduce((acc, key) => ({ ...acc, [key]: true }), {} as Permissions)
                    setNewStaff({ ...newStaff, permissions: allEnabled })
                  }}
                  disabled={isProcessing}
                >
                  SELECT ALL
                </button>
                <button
                  type="button"
                  className="text-[10px] font-black h-6 px-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg"
                  onClick={() => setNewStaff({ ...newStaff, permissions: { ...DEFAULT_PERMISSIONS } })}
                  disabled={isProcessing}
                >
                  CLEAR
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PERMISSIONS.map((key) => (
                <label
                  key={key}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all duration-150 select-none ${
                    newStaff.permissions[key]
                      ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={newStaff.permissions[key]}
                    onChange={() => togglePermission(key)}
                    disabled={isProcessing}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0"
                  />
                  <span className="text-slate-500 shrink-0">{PERMISSION_ICONS[key]}</span>
                  <span className="text-sm font-bold text-slate-700 flex-1">{PERMISSION_LABELS[key]}</span>
                  {newStaff.permissions[key] && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <DialogFooter className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white rounded-b-3xl">
          <div className="flex justify-end gap-3 w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button onClick={onAdd} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-md px-6" disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── EditStaffPermissionsDialog ───────────────────────────────────────────────
function EditStaffPermissionsDialog({
  open, onOpenChange, selectedStaff, setSelectedStaff, isProcessing, onSave, getRoleBadgeColor: badgeFn, getRoleIcon: iconFn, getAdminRoleLabel: labelFn,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedStaff: User | null
  setSelectedStaff: (v: User | null) => void
  isProcessing: boolean
  onSave: () => void
  getRoleBadgeColor: (role: string) => string
  getRoleIcon: (role: string) => React.ReactNode
  getAdminRoleLabel: (role: string) => string
}) {
  const togglePermission = (key: PermissionKey) => {
    if (!selectedStaff || !selectedStaff.permissions) return
    setSelectedStaff({ ...selectedStaff, permissions: { ...selectedStaff.permissions, [key]: !selectedStaff.permissions[key] } })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[90vh] p-0 gap-0 sm:max-w-[540px] w-[95vw] rounded-3xl border-0 shadow-2xl overflow-hidden">
        <div className="h-2 bg-blue-500 w-full shrink-0" />

        {/* Header */}
        <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-500 flex items-center justify-center shrink-0 shadow-sm">
              <Edit className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-slate-900 uppercase">
                Edit Staff Permissions
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-slate-500 mt-0.5">
                Update this staff member&apos;s access permissions.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-slate-50/50">
          {/* Staff info summary */}
          {selectedStaff && (
            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Badge className={badgeFn(selectedStaff.adminRole || "staff") + " shrink-0"}>
                  {iconFn(selectedStaff.adminRole || "staff")}
                  {labelFn(selectedStaff.adminRole || "staff")}
                </Badge>
                <span className="text-sm font-bold text-slate-700 truncate">{selectedStaff.name}</span>
              </div>
              <span className="text-xs font-medium text-slate-500 truncate ml-2 shrink-0">{selectedStaff.email}</span>
            </div>
          )}

          {/* Permissions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Permissions</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-[10px] font-black h-6 px-2 text-emerald-600 hover:text-emerald-700 transition-colors rounded-lg"
                  onClick={() => {
                    if (!selectedStaff) return
                    const allEnabled = ALL_PERMISSIONS.reduce((acc, key) => ({ ...acc, [key]: true }), {} as Permissions)
                    setSelectedStaff({ ...selectedStaff, permissions: allEnabled })
                  }}
                  disabled={isProcessing}
                >
                  SELECT ALL
                </button>
                <button
                  type="button"
                  className="text-[10px] font-black h-6 px-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg"
                  onClick={() => {
                    if (!selectedStaff) return
                    setSelectedStaff({ ...selectedStaff, permissions: { ...DEFAULT_PERMISSIONS } })
                  }}
                  disabled={isProcessing}
                >
                  CLEAR
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PERMISSIONS.map((key) => (
                <label
                  key={key}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all duration-150 select-none ${
                    selectedStaff?.permissions?.[key]
                      ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedStaff?.permissions?.[key] || false}
                    onChange={() => togglePermission(key)}
                    disabled={isProcessing}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0"
                  />
                  <span className="text-slate-500 shrink-0">{PERMISSION_ICONS[key]}</span>
                  <span className="text-sm font-bold text-slate-700 flex-1">{PERMISSION_LABELS[key]}</span>
                  {selectedStaff?.permissions?.[key] && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <DialogFooter className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white rounded-b-3xl">
          <div className="flex justify-end gap-3 w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button onClick={onSave} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md px-6" disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}