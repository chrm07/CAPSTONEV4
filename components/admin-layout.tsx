"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import {
  LayoutDashboard,
  FileText,
  Users,
  QrCode,
  BarChart3,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Bell,
  Search,
  Calendar,
  CheckCircle,
  Info,
  AlertCircle,
  Mail,
  UsersRound,
  Trash2,
  Check
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

import {
  markNotificationAsReadDb,
  markNotificationAsUnreadDb,
  deleteNotificationDb,
  hasPermission,
} from "@/lib/storage"

import { collection, query, where, onSnapshot, writeBatch, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const { user, logout, isLoading } = useAuth()
  
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)
  
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  
  const [notifications, setNotifications] = useState<any[]>([])
  const [pendingAppsCount, setPendingAppsCount] = useState(0)

  useEffect(() => {
    if (!isLoading && !hasCheckedAuth) {
      setHasCheckedAuth(true)
      if (!user) {
        router.push("/login")
      } else if (user.role !== "admin") {
        router.push("/student/dashboard")
      }
    }
  }, [user, isLoading, hasCheckedAuth, router])

  // Listen for admin bell notifications
  useEffect(() => {
    if (!user || user.role !== "admin") return
    
    if (user.adminRole === "scanner_staff" || user.adminRole === "verifier_staff") return

    const qDocs = query(collection(db, "notifications"), where("userId", "==", "admin"))
    const unsubscribeApp = onSnapshot(qDocs, (snapshot) => {
       const rtNotifs = snapshot.docs.map(doc => {
         const data = doc.data() as any
         return { ...data, id: doc.id }
       }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
       
       setNotifications(rtNotifs)
    })

    return () => {
      setTimeout(() => {
        if (typeof unsubscribeApp === 'function') {
          try {
            unsubscribeApp()
          } catch (e) {}
        }
      }, 10)
    }
  }, [user])

  // Listen exclusively for active, pending applications to update the nav badge
  useEffect(() => {
    if (!user || user.role !== "admin") return
    if (user.adminRole === "scanner_staff" || user.adminRole === "verifier_staff") return

    const qApps = query(collection(db, "applications"), where("isSubmitted", "==", true))
    const unsubscribeApps = onSnapshot(qApps, (snapshot) => {
      let count = 0
      snapshot.forEach((doc) => {
        const data = doc.data()
        // Only count if it's strictly pending (not archived, approved, or rejected)
        if (!data.isArchived && !data.isApproved && !data.isRejected && (data.status === "pending" || !data.status)) {
          count++
        }
      })
      setPendingAppsCount(count)
    })

    return () => unsubscribeApps()
  }, [user])

  const unreadCount = notifications.filter((n) => !n.read && !n.isRead).length

  const getNotificationTitle = (n: any) => {
    if (n.title) return n.title;
    const msg = (n.message || "").toLowerCase();
    if (msg.includes("submitted a new application")) return "New Application Submitted";
    return "System Notification";
  }

  const getNotificationIcon = (n: any) => {
    const type = n.type || "";
    const msg = (n.message || "").toLowerCase();
    if (type === "success" || msg.includes("submitted")) return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    if (type === "warning") return <AlertCircle className="h-4 w-4 text-amber-500" />;
    if (type === "announcement" || msg.includes("schedule")) return <Calendar className="h-4 w-4 text-blue-500" />;
    return <Info className="h-4 w-4 text-blue-500" />;
  }

  const handleNotificationClick = async (notification: any) => {
    const isUnread = !notification.read && !notification.isRead;
    if (isUnread) {
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true, read: true } : n))
      try {
        await updateDoc(doc(db, "notifications", notification.id), { read: true, isRead: true })
      } catch (e) {
        await markNotificationAsReadDb(notification.id)
      }
    }
    
    if (notification.link) {
      router.push(notification.link)
    } else if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
    
    setIsNotificationOpen(false)
  }

  const handleMarkAsReadInline = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation()
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true, read: true } : n))
    try {
      await updateDoc(doc(db, "notifications", notificationId), { read: true, isRead: true })
    } catch (e) {
      await markNotificationAsReadDb(notificationId)
    }
  }

  const handleMarkAsUnread = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation() 
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: false, read: false } : n))
    try {
      await updateDoc(doc(db, "notifications", notificationId), { read: false, isRead: false })
    } catch (e) {
      await markNotificationAsUnreadDb(notificationId)
    }
    toast({ title: "Marked as unread" })
  }

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation()
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
    await deleteNotificationDb(notificationId)
    toast({ title: "Notification deleted" })
  }

  const handleMarkAllAsRead = async () => {
    if (!user) return
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })))
    
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        if (!n.read || !n.isRead) {
          const ref = doc(db, "notifications", n.id);
          batch.update(ref, { read: true, isRead: true });
        }
      });
      await batch.commit();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  }

  const getDashboardUrl = () => {
    if (user?.adminRole === "scanner_staff") return "/admin/scanner-dashboard"
    if (user?.adminRole === "verifier_staff") return "/admin/verifier-dashboard"
    return "/admin/dashboard" 
  }

  const allNavigationItems = [
    { href: getDashboardUrl(), icon: LayoutDashboard, label: "Dashboard", permission: "dashboard" },
    { href: "/admin/approved-emails", icon: Mail, label: "Approved Emails", permission: "approved-emails" },
    { href: "/admin/applications", icon: FileText, label: "Applications", permission: "applications" },
    { href: "/admin/scholars", icon: Users, label: "Scholars", permission: "scholars" },
    { href: "/admin/scheduling", icon: Calendar, label: "Scheduling", permission: "scheduling" },
    { href: "/admin/verification", icon: QrCode, label: "QR Verification", permission: "verification" },
    { href: "/admin/reports", icon: BarChart3, label: "Reports", permission: "reports" },
    { href: "/admin/staff-management", icon: UsersRound, label: "Staff Management", permission: "staff-management" },
  ]

  const navigationItems = allNavigationItems.filter((item) => hasPermission(user, item.permission))

  const filteredSearchPages = searchQuery.trim() === "" 
    ? [] 
    : navigationItems.filter(page => page.label.toLowerCase().includes(searchQuery.toLowerCase()))

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    const isYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toDateString() === date.toDateString()
    const isToday = now.toDateString() === date.toDateString()

    const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true }
    const timeString = date.toLocaleTimeString('en-US', timeOptions)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (isToday) return `${diffHours}h ago`
    if (isYesterday) return `Yesterday at ${timeString}`
    
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${timeString}`
  }

  const isActive = (path: string) => pathname === path

  if (isLoading || !hasCheckedAuth || !user || user.role !== "admin") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  const profilePicUrl = user?.profilePicture || (user?.profileData as any)?.profilePicture || null;
  const isHeadAdmin = !user?.adminRole || user?.adminRole === "head_admin";

  return (
    <div className="flex h-screen flex-col bg-slate-50/50 overflow-hidden text-left">
      <header className="shrink-0 z-50 bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 text-white shadow-lg h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0 flex flex-col">
              
              <div className="sr-only">
                <SheetTitle>Admin Navigation Menu</SheetTitle>
                <SheetDescription>Mobile navigation sidebar for the admin dashboard</SheetDescription>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center shadow-inner overflow-hidden">
                    <img src="/images/image.png" alt="Logo" className="object-cover" />
                  </div>
                  <span className="text-lg font-bold text-slate-900">BTS Admin</span>
                </div>
              </div>

              <div className="flex-1 flex flex-col py-4 overflow-hidden">
                <nav className="flex-1 flex flex-col px-4">
                  <div className="flex-1 overflow-y-auto pt-2">
                    <p className="mb-3 px-3 text-xs font-bold uppercase tracking-widest text-slate-400">Navigation</p>
                    <div className="space-y-1">
                      {navigationItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
                            isActive(item.href) ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
                          }`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className="h-5 w-5" />
                            {item.label}
                          </div>
                          {item.label === "Applications" && pendingAppsCount > 0 && (
                            <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-black shadow-sm ${
                              isActive(item.href) ? 'bg-white text-emerald-600' : 'bg-red-500 text-white'
                            }`}>
                              {pendingAppsCount > 9 ? "9+" : pendingAppsCount}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                </nav>
              </div>
              
              <div className="border-t border-slate-200 p-4 shrink-0 space-y-1">
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-red-600 transition-all hover:bg-red-50" onClick={() => { setIsMobileMenuOpen(false); setIsLogoutDialogOpen(true); }}>
                  <LogOut className="h-5 w-5" /> Logout
                </button>
              </div>
            </SheetContent>
          </Sheet>

          <div className="hidden lg:flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-inner overflow-hidden">
              <img src="/images/image.png" alt="Logo" className="object-cover" />
            </div>
            <span className="text-lg font-black text-white tracking-tighter uppercase">BTS Admin</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex relative w-64 mx-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60 z-10" />
            <Input 
              placeholder="Search anything..." 
              className="pl-10 w-full h-9 border-white/20 focus:border-white focus:bg-white/20 rounded-full bg-white/10 text-white placeholder:text-white/60 text-sm transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />

            {isSearchFocused && searchQuery.trim() !== "" && (
              <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[100]">
                {filteredSearchPages.length > 0 ? (
                  filteredSearchPages.map(page => (
                    <button
                      key={page.href}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        router.push(page.href);
                        setSearchQuery("");
                        setIsSearchFocused(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left group border-b border-slate-100 last:border-0"
                    >
                      <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors border border-emerald-100/50">
                        <page.icon className="h-4 w-4 text-emerald-600" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 group-hover:text-emerald-700 transition-colors">{page.label}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-6 text-sm text-slate-500 font-medium text-center flex flex-col items-center justify-center gap-2">
                    <Search className="h-5 w-5 text-slate-300" />
                    No pages found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          {isHeadAdmin && (
            <DropdownMenu open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full text-white hover:bg-white/10">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center border-2 border-emerald-600 shadow-sm">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[380px] p-0 shadow-2xl border-slate-200 rounded-2xl z-[100]">
                <div className="p-4 border-b flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
                  <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Admin Notifications</h3>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="text-[10px] font-black h-7 text-emerald-600 hover:text-emerald-700">
                      MARK ALL READ
                    </Button>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-10 text-center">
                      <Bell className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">All caught up</p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const isUnread = !n.read && !n.isRead;
                      return (
                        <div 
                          key={n.id} 
                          onClick={() => handleNotificationClick(n)}
                          className={`relative p-4 border-b last:border-0 cursor-pointer hover:bg-slate-50 transition-colors flex gap-3 group ${isUnread ? 'bg-emerald-50/30' : ''}`}
                        >
                          <div className="mt-1 shrink-0">
                            {n.iconOverride || getNotificationIcon(n)}
                          </div>
                          <div className="flex-1 pr-14 min-w-0 text-left">
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <p className={`text-sm leading-tight truncate ${isUnread ? 'font-black text-slate-900' : 'text-slate-500 font-bold'}`}>
                                {getNotificationTitle(n)}
                              </p>
                              <span className="text-[9px] font-black text-slate-400 whitespace-nowrap uppercase">
                                {formatNotificationTime(n.createdAt)}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-medium">{n.message}</p>
                          </div>

                          <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/80 p-1 rounded-full shadow-sm border border-slate-100 backdrop-blur-sm">
                            {isUnread ? (
                              <button 
                                onClick={(e) => handleMarkAsReadInline(e, n.id)}
                                className="p-1.5 rounded-full hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 transition-colors"
                                title="Mark as read"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button 
                                onClick={(e) => handleMarkAsUnread(e, n.id)}
                                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-emerald-600 transition-colors"
                                title="Mark as unread"
                              >
                                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 m-0.5"></div>
                              </button>
                            )}
                            <button 
                              onClick={(e) => handleDeleteNotification(e, n.id)}
                              className="p-1.5 rounded-full hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 hover:bg-white/10 rounded-full pl-2 text-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 font-black text-white text-xs overflow-hidden border border-white/30">
                  {profilePicUrl ? (
                     <img src={profilePicUrl} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                     user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="hidden sm:inline-block text-sm font-black">{user.name.split(' ')[0]}</span>
                <ChevronDown className="h-4 w-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl z-[100]">
              <DropdownMenuLabel className="font-black text-xs uppercase tracking-widest text-slate-400">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsLogoutDialogOpen(true)} className="text-red-600 font-bold cursor-pointer hover:bg-red-50">
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden lg:flex w-64 flex-col border-r bg-white p-4 shrink-0">
          <nav className="flex-1 flex flex-col px-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto pt-4">
              <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Main Navigation</p>
              <div className="space-y-1">
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all ${
                      isActive(item.href) 
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-emerald-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </div>
                    {item.label === "Applications" && pendingAppsCount > 0 && (
                      <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-black shadow-sm ${
                        isActive(item.href) ? 'bg-white text-emerald-600' : 'bg-red-500 text-white'
                      }`}>
                        {pendingAppsCount > 9 ? "9+" : pendingAppsCount}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100 space-y-1">
              <button 
                onClick={() => setIsLogoutDialogOpen(true)} 
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold text-red-600 transition-all hover:bg-red-50"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto bg-slate-50/50">
          <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <AlertDialogContent className="rounded-3xl border-0 shadow-2xl z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-slate-900 tracking-tight">CONFIRM LOGOUT</AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-slate-500">
              Are you sure you want to end your current session? You will be redirected to the login page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold border-slate-200 text-slate-600">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={logout} className="bg-red-600 hover:bg-red-700 rounded-xl font-bold text-white">Logout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
