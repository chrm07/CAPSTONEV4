"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AdminLayout } from "@/components/admin-layout"
import { useToast } from "@/components/ui/use-toast"
import { Moon, Sun, Laptop, Bell, Database, Settings2, Shield, FileText, Save, RefreshCw, CheckCircle } from "lucide-react"

const appearanceSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  fontSize: z.enum(["small", "medium", "large"]),
  language: z.string().min(1, { message: "Please select a language" }),
})

const notificationSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  systemAlerts: z.boolean(),
  applicationUpdates: z.boolean(),
  securityAlerts: z.boolean(),
})

const systemSchema = z.object({
  autoApproveDocuments: z.boolean(),
  requireAdminVerification: z.boolean(),
  enableQRVerification: z.boolean(),
  enableBulkOperations: z.boolean(),
  enableAuditLog: z.boolean(),
  backupFrequency: z.enum(["daily", "weekly", "monthly"]),
  retentionPeriod: z.enum(["30days", "60days", "90days", "1year"]),
})

export default function AdminSettingsPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("appearance")
  const [isLoading, setIsLoading] = useState(false)

  const appearanceForm = useForm<z.infer<typeof appearanceSchema>>({
    resolver: zodResolver(appearanceSchema),
    defaultValues: { theme: "system", fontSize: "medium", language: "en" },
  })

  const notificationForm = useForm<z.infer<typeof notificationSchema>>({
    resolver: zodResolver(notificationSchema),
    defaultValues: { emailNotifications: true, smsNotifications: true, systemAlerts: true, applicationUpdates: true, securityAlerts: true },
  })

  const systemForm = useForm<z.infer<typeof systemSchema>>({
    resolver: zodResolver(systemSchema),
    defaultValues: { autoApproveDocuments: false, requireAdminVerification: true, enableQRVerification: true, enableBulkOperations: true, enableAuditLog: true, backupFrequency: "daily", retentionPeriod: "90days" },
  })

  async function onAppearanceSubmit(values: z.infer<typeof appearanceSchema>) {
    setIsLoading(true)
    setTimeout(() => {
      toast({ title: "Appearance settings updated", description: "Your appearance settings have been updated successfully.", className: "bg-emerald-600 text-white border-none" })
      setIsLoading(false)
    }, 1000)
  }

  async function onNotificationSubmit(values: z.infer<typeof notificationSchema>) {
    setIsLoading(true)
    setTimeout(() => {
      toast({ title: "Notification settings updated", description: "Your notification settings have been updated successfully.", className: "bg-emerald-600 text-white border-none" })
      setIsLoading(false)
    }, 1000)
  }

  async function onSystemSubmit(values: z.infer<typeof systemSchema>) {
    setIsLoading(true)
    setTimeout(() => {
      toast({ title: "System settings updated", description: "The system settings have been updated successfully.", className: "bg-emerald-600 text-white border-none" })
      setIsLoading(false)
    }, 1000)
  }

  const handleBackupDatabase = () => {
    setIsLoading(true)
    setTimeout(() => {
      toast({ title: "Database backup initiated", description: "The database backup has been initiated. You will be notified when it's complete.", className: "bg-blue-600 text-white border-none" })
      setIsLoading(false)
    }, 1500)
  }

  const handleRestoreDatabase = () => {
    setIsLoading(true)
    setTimeout(() => {
      toast({ title: "Database restore initiated", description: "The database restore has been initiated. You will be notified when it's complete.", className: "bg-amber-600 text-white border-none" })
      setIsLoading(false)
    }, 1500)
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
        
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-400 rounded-full filter blur-[80px] opacity-10 -mr-20 -mt-20 pointer-events-none"></div>
          <div className="relative flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg shrink-0">
              <Settings2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">System Settings</h1>
              <p className="text-slate-500 font-medium mt-1">Manage global preferences, notifications, and database configurations.</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="appearance" className="space-y-6" onValueChange={setActiveTab}>
          
          <TabsList className="bg-slate-100/50 p-1.5 shadow-sm flex flex-wrap h-auto w-full md:w-fit justify-start rounded-2xl border border-slate-200 gap-1">
            <TabsTrigger value="appearance" className="gap-2 h-10 px-6 shrink-0 rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"><Sun className="h-4 w-4" /> Appearance</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 h-10 px-6 shrink-0 rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"><Bell className="h-4 w-4" /> Notifications</TabsTrigger>
            <TabsTrigger value="system" className="gap-2 h-10 px-6 shrink-0 rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"><Shield className="h-4 w-4" /> System Config</TabsTrigger>
            <TabsTrigger value="database" className="gap-2 h-10 px-6 shrink-0 rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"><Database className="h-4 w-4" /> Database</TabsTrigger>
          </TabsList>

          {/* ================= APPEARANCE TAB ================= */}
          <TabsContent value="appearance">
            <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
              <div className="h-2 bg-gradient-to-r from-blue-400 to-blue-600 w-full" />
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
                <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-800">Appearance</CardTitle>
                <CardDescription className="font-medium text-slate-500">Customize how the scholarship system looks for you.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <Form {...appearanceForm}>
                  <form onSubmit={appearanceForm.handleSubmit(onAppearanceSubmit)} className="space-y-8">
                    
                    <FormField control={appearanceForm.control} name="theme" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-black uppercase tracking-wider text-slate-500">Theme Preference</FormLabel>
                        <div className="mt-3">
                          <FormControl>
                            <div className="flex flex-wrap gap-4">
                              <div className={`flex flex-col items-center justify-center p-4 w-28 rounded-2xl border-2 transition-all cursor-pointer ${field.value === "light" ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`} onClick={() => field.onChange("light")}>
                                <Sun className="h-8 w-8 mb-2" />
                                <span className="text-xs font-bold uppercase tracking-widest">Light</span>
                              </div>
                              <div className={`flex flex-col items-center justify-center p-4 w-28 rounded-2xl border-2 transition-all cursor-pointer ${field.value === "dark" ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`} onClick={() => field.onChange("dark")}>
                                <Moon className="h-8 w-8 mb-2" />
                                <span className="text-xs font-bold uppercase tracking-widest">Dark</span>
                              </div>
                              <div className={`flex flex-col items-center justify-center p-4 w-28 rounded-2xl border-2 transition-all cursor-pointer ${field.value === "system" ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`} onClick={() => field.onChange("system")}>
                                <Laptop className="h-8 w-8 mb-2" />
                                <span className="text-xs font-bold uppercase tracking-widest">System</span>
                              </div>
                            </div>
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={appearanceForm.control} name="fontSize" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black uppercase tracking-wider text-slate-500">Font Size</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl h-12 bg-slate-50 border-slate-200 font-medium focus:ring-blue-500">
                                <SelectValue placeholder="Select font size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-slate-200">
                              <SelectItem value="small" className="font-medium rounded-lg cursor-pointer">Small</SelectItem>
                              <SelectItem value="medium" className="font-medium rounded-lg cursor-pointer">Medium</SelectItem>
                              <SelectItem value="large" className="font-medium rounded-lg cursor-pointer">Large</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs font-medium">This will adjust the size of text globally.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={appearanceForm.control} name="language" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black uppercase tracking-wider text-slate-500">Language</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl h-12 bg-slate-50 border-slate-200 font-medium focus:ring-blue-500">
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-slate-200">
                              <SelectItem value="en" className="font-medium rounded-lg cursor-pointer">English</SelectItem>
                              <SelectItem value="fil" className="font-medium rounded-lg cursor-pointer">Filipino</SelectItem>
                              <SelectItem value="es" className="font-medium rounded-lg cursor-pointer">Spanish</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs font-medium">Interface language preference.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <Button type="submit" disabled={isLoading} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 px-8 font-black tracking-wide shadow-md">
                        {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Appearance
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= NOTIFICATIONS TAB ================= */}
          <TabsContent value="notifications">
            <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
              <div className="h-2 bg-gradient-to-r from-amber-400 to-amber-600 w-full" />
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
                <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-800">Notification Settings</CardTitle>
                <CardDescription className="font-medium text-slate-500">Manage how you receive alerts and system updates.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <Form {...notificationForm}>
                  <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-8">
                    
                    <div className="space-y-4">
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2"><Bell className="h-4 w-4" /> Communication Channels</h3>
                      <div className="grid gap-3">
                        <FormField control={notificationForm.control} name="emailNotifications" render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-slate-200 p-4 bg-slate-50/50 shadow-sm">
                            <div className="space-y-1">
                              <FormLabel className="text-sm font-bold text-slate-800">Email Notifications</FormLabel>
                              <FormDescription className="text-xs font-medium">Receive important updates directly to your inbox.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-amber-500" /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={notificationForm.control} name="smsNotifications" render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-slate-200 p-4 bg-slate-50/50 shadow-sm">
                            <div className="space-y-1">
                              <FormLabel className="text-sm font-bold text-slate-800">SMS Notifications</FormLabel>
                              <FormDescription className="text-xs font-medium">Receive brief text alerts for urgent matters.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-amber-500" /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Notification Types</h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        <FormField control={notificationForm.control} name="systemAlerts" render={({ field }) => (
                          <FormItem className="flex flex-row items-start justify-between rounded-2xl border border-slate-200 p-4 bg-white shadow-sm">
                            <div className="space-y-1 pr-4">
                              <FormLabel className="text-sm font-bold text-slate-800">System Alerts</FormLabel>
                              <FormDescription className="text-xs font-medium">Platform maintenance and outages.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-amber-500 mt-1" /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={notificationForm.control} name="applicationUpdates" render={({ field }) => (
                          <FormItem className="flex flex-row items-start justify-between rounded-2xl border border-slate-200 p-4 bg-white shadow-sm">
                            <div className="space-y-1 pr-4">
                              <FormLabel className="text-sm font-bold text-slate-800">Application Updates</FormLabel>
                              <FormDescription className="text-xs font-medium">Alerts for new student submissions.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-amber-500 mt-1" /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={notificationForm.control} name="securityAlerts" render={({ field }) => (
                          <FormItem className="flex flex-row items-start justify-between rounded-2xl border border-slate-200 p-4 bg-white shadow-sm md:col-span-2">
                            <div className="space-y-1 pr-4">
                              <FormLabel className="text-sm font-bold text-slate-800">Security Alerts</FormLabel>
                              <FormDescription className="text-xs font-medium">Unusual login attempts or permission changes.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-amber-500 mt-1" /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <Button type="submit" disabled={isLoading} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 px-8 font-black tracking-wide shadow-md">
                        {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Notifications
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= SYSTEM TAB ================= */}
          <TabsContent value="system">
            <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
              <div className="h-2 bg-gradient-to-r from-emerald-400 to-emerald-600 w-full" />
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
                <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-800">System Configuration</CardTitle>
                <CardDescription className="font-medium text-slate-500">Configure core workflow rules for the scholarship pipeline.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <Form {...systemForm}>
                  <form onSubmit={systemForm.handleSubmit(onSystemSubmit)} className="space-y-8">
                    
                    <div className="space-y-4">
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2"><Settings2 className="h-4 w-4" /> Application Processing</h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        <FormField control={systemForm.control} name="autoApproveDocuments" render={({ field }) => (
                          <FormItem className="flex flex-row items-start justify-between rounded-2xl border border-slate-200 p-4 bg-white shadow-sm">
                            <div className="space-y-1 pr-4">
                              <FormLabel className="text-sm font-bold text-slate-800">Auto-Approve Docs</FormLabel>
                              <FormDescription className="text-xs font-medium">Bypass manual review if all docs are present.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-emerald-500 mt-1" /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={systemForm.control} name="requireAdminVerification" render={({ field }) => (
                          <FormItem className="flex flex-row items-start justify-between rounded-2xl border border-slate-200 p-4 bg-white shadow-sm">
                            <div className="space-y-1 pr-4">
                              <FormLabel className="text-sm font-bold text-slate-800">Strict Verification</FormLabel>
                              <FormDescription className="text-xs font-medium">Require Head Admin sign-off for approval.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-emerald-500 mt-1" /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={systemForm.control} name="enableQRVerification" render={({ field }) => (
                          <FormItem className="flex flex-row items-start justify-between rounded-2xl border border-slate-200 p-4 bg-white shadow-sm">
                            <div className="space-y-1 pr-4">
                              <FormLabel className="text-sm font-bold text-slate-800">QR Check-in System</FormLabel>
                              <FormDescription className="text-xs font-medium">Allow Scanners to mark payouts via QR.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-emerald-500 mt-1" /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={systemForm.control} name="enableBulkOperations" render={({ field }) => (
                          <FormItem className="flex flex-row items-start justify-between rounded-2xl border border-slate-200 p-4 bg-white shadow-sm">
                            <div className="space-y-1 pr-4">
                              <FormLabel className="text-sm font-bold text-slate-800">Bulk Operations</FormLabel>
                              <FormDescription className="text-xs font-medium">Enable multi-select actions in tables.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-emerald-500 mt-1" /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2"><Shield className="h-4 w-4" /> Security & Compliance</h3>
                      
                      <FormField control={systemForm.control} name="enableAuditLog" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-slate-200 p-4 bg-slate-50/50 shadow-sm mb-4">
                          <div className="space-y-1 pr-4">
                            <FormLabel className="text-sm font-bold text-slate-800">Enable Audit Logging</FormLabel>
                            <FormDescription className="text-xs font-medium">Track all administrative changes in the database.</FormDescription>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-emerald-500" /></FormControl>
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={systemForm.control} name="backupFrequency" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-black uppercase tracking-wider text-slate-500">Auto Backup Frequency</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="rounded-xl h-12 bg-slate-50 border-slate-200 font-medium focus:ring-emerald-500">
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-xl border-slate-200">
                                <SelectItem value="daily" className="font-medium rounded-lg cursor-pointer">Daily</SelectItem>
                                <SelectItem value="weekly" className="font-medium rounded-lg cursor-pointer">Weekly</SelectItem>
                                <SelectItem value="monthly" className="font-medium rounded-lg cursor-pointer">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={systemForm.control} name="retentionPeriod" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-black uppercase tracking-wider text-slate-500">Data Retention Period</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="rounded-xl h-12 bg-slate-50 border-slate-200 font-medium focus:ring-emerald-500">
                                  <SelectValue placeholder="Select period" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-xl border-slate-200">
                                <SelectItem value="30days" className="font-medium rounded-lg cursor-pointer">30 Days</SelectItem>
                                <SelectItem value="60days" className="font-medium rounded-lg cursor-pointer">60 Days</SelectItem>
                                <SelectItem value="90days" className="font-medium rounded-lg cursor-pointer">90 Days</SelectItem>
                                <SelectItem value="1year" className="font-medium rounded-lg cursor-pointer">1 Year</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <Button type="submit" disabled={isLoading} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 px-8 font-black tracking-wide shadow-md">
                        {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save System Rules
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= DATABASE TAB ================= */}
          <TabsContent value="database">
            <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
              <div className="h-2 bg-gradient-to-r from-purple-400 to-purple-600 w-full" />
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
                <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-800">Database Management</CardTitle>
                <CardDescription className="font-medium text-slate-500">Manual overrides, backups, and structural statistics.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8 space-y-8">
                
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2"><Database className="h-4 w-4" /> System Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50 text-center">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Records</div>
                      <div className="text-2xl font-black text-slate-800">1,256</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50 text-center">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">DB Size</div>
                      <div className="text-2xl font-black text-slate-800">256 MB</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50 text-center">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Last Backup</div>
                      <div className="text-2xl font-black text-slate-800 text-sm flex items-center justify-center h-8">Yesterday</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50 text-center">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Backup Size</div>
                      <div className="text-2xl font-black text-slate-800">128 MB</div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-purple-50 border border-purple-200 p-6 rounded-3xl">
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-purple-800 uppercase tracking-tight">Generate Snapshot</h3>
                      <p className="text-xs font-medium text-purple-700/80">Manually trigger an encrypted backup of all student and system records.</p>
                    </div>
                    <Button onClick={handleBackupDatabase} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-12 px-6 font-bold shadow-md shrink-0 w-full md:w-auto">
                      <Database className="mr-2 h-4 w-4" />
                      {isLoading ? "Generating..." : "Backup Database"}
                    </Button>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <div className="space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-red-500 mb-2 flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Critical Operations</h3>
                    <Alert className="border-red-200 bg-red-50 rounded-2xl shadow-sm">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <AlertTitle className="font-black text-red-800">DANGER ZONE: Restore from Backup</AlertTitle>
                      <AlertDescription className="text-xs font-medium text-red-700 mt-1">
                        Restoring the database will overwrite all current live data with the selected snapshot. This action is irreversible.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 bg-white border border-slate-200 p-4 rounded-2xl">
                      <Select defaultValue="latest">
                        <SelectTrigger className="w-full sm:flex-1 h-12 rounded-xl bg-slate-50 border-slate-200 font-medium focus:ring-red-500">
                          <SelectValue placeholder="Select backup snapshot" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                          <SelectItem value="latest" className="font-medium cursor-pointer rounded-lg">Latest (Mar 29, 2026 - 10:30 AM)</SelectItem>
                          <SelectItem value="march28" className="font-medium cursor-pointer rounded-lg">Mar 28, 2026 - 10:30 AM</SelectItem>
                          <SelectItem value="march27" className="font-medium cursor-pointer rounded-lg">Mar 27, 2026 - 10:30 AM</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="destructive" onClick={handleRestoreDatabase} disabled={isLoading} className="w-full sm:w-auto rounded-xl h-12 px-8 font-black shadow-md shrink-0">
                        {isLoading ? "Restoring..." : "Force Restore"}
                      </Button>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </AdminLayout>
  )
}