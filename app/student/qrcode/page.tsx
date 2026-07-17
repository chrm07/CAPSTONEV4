"use client"

import { useState, useEffect } from "react"
import { StudentLayout } from "@/components/student-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import QRCode from "react-qr-code"
import { QrCode as QrIcon, AlertCircle, Loader2, Lock, CheckCircle, CalendarDays, Info, Shield, Smartphone, Download, Clock } from "lucide-react"
import { collection, query, where, onSnapshot, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

// Hash function for QR code data
async function hashValue(value: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function StudentQRCodePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [application, setApplication] = useState<any>(null)
  const [schedule, setSchedule] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("view")
  const [qrValue, setQrValue] = useState("")

  const profileData = (user?.profileData as any) || {}

  useEffect(() => {
    if (!user) return

    const unsubs: (() => void)[] = []

    unsubs.push(onSnapshot(doc(db, "settings", "schedule"), (docSnap) => {
      if (docSnap.exists()) {
        setSchedule(docSnap.data())
      }
    }))

    const q = query(collection(db, "applications"), where("studentId", "==", user.id))
    unsubs.push(onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      const activeApp = apps.find((a: any) => !a.isArchived)
      setApplication(activeApp || null)
      setIsLoading(false)
    }))

    return () => unsubs.forEach(unsub => unsub())
  }, [user])

  // Generate hashed QR code value
  useEffect(() => {
    const generateHashedQR = async () => {
      if (user) {
        const profileData = user.profileData as any || {}
        const studentId = profileData.studentId || user.id
        const hashedId = await hashValue(studentId)
        setQrValue(`BTS:${hashedId}`)
      }
    }
    generateHashedQR()
  }, [user])

  const handleDownloadQRCode = async () => {
    const svg = document.getElementById("QRCode")
    if (svg) {
      try {
        const svgData = new XMLSerializer().serializeToString(svg)
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        const img = new Image()
        
        img.onload = () => {
          canvas.width = img.width * 2
          canvas.height = img.height * 2
          ctx?.scale(2, 2)
          ctx?.drawImage(img, 0, 0)
          
          const pngFile = canvas.toDataURL("image/png")
          const downloadLink = document.createElement("a")
          downloadLink.download = `BTS_QR_${user?.name || "Ticket"}.png`
          downloadLink.href = `${pngFile}`
          downloadLink.click()
          
          toast({ title: "Success", description: "QR Code downloaded to your device.", className: "bg-emerald-600 text-white border-none" })
        }
        img.src = "data:image/svg+xml;base64," + btoa(svgData)
      } catch (err) {
        toast({ variant: "destructive", title: "Download failed", description: "Could not generate image." })
      }
    }
  }

  // qrValue is now set via useEffect with hashed value

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-emerald-600">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p className="text-sm font-bold tracking-widest uppercase text-slate-400">Loading Pass...</p>
        </div>
      </StudentLayout>
    )
  }

  const isApproved = application?.status === 'approved'
  const isClaimed = application?.isClaimed

  return (
    <StudentLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Claiming Ticket</h1>
          <p className="text-slate-500 font-medium mt-1">View and manage your scholarship verification QR code.</p>
        </div>
      </div>

      <Tabs defaultValue="view" className="space-y-6" onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 p-1 border rounded-2xl">
          <TabsTrigger value="view" className="rounded-xl font-bold">View Ticket</TabsTrigger>
          <TabsTrigger value="usage" className="rounded-xl font-bold">How to Use</TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl font-bold">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="view" className="space-y-6 animate-in fade-in duration-500">
          
          {/* THE DIGITAL TICKET CARD */}
          <Card className="border-0 shadow-2xl overflow-hidden max-w-md mx-auto bg-white rounded-3xl relative">
            <div className="bg-emerald-600 p-6 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-black opacity-10 rounded-full -ml-8 -mb-8" />
              
              <Badge className="bg-emerald-950/40 hover:bg-emerald-950/40 text-emerald-50 border-none mb-3 px-3 py-1 rounded-xl text-[10px] uppercase tracking-widest font-black backdrop-blur-sm shadow-none">
                {isClaimed ? "Ticket Used" : "Official Claiming Pass"}
              </Badge>
              {/* 🔥 FIX: Replaced line-clamp-1 with break-words and text-balance to show full long names */}
              <h2 className="text-2xl font-black text-white uppercase tracking-tight break-words text-balance leading-snug">
                {profileData.fullName || user?.name}
              </h2>
              <p className="text-emerald-100/80 font-bold text-xs uppercase tracking-widest mt-2">
                ID: {application?.id ? application.id.substring(0, 8) : "Pending"}
              </p>
            </div>
            
            <CardContent className="flex flex-col items-center justify-center p-8 bg-slate-50/50">
              
              {/* SCENARIO 1: ALREADY CLAIMED */}
              {isClaimed ? (
                <div className="text-center w-full animate-in zoom-in-95">
                  <div className="h-24 w-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border-4 border-white ring-4 ring-emerald-50">
                    <CheckCircle className="h-12 w-12" />
                  </div>
                  <h2 className="text-2xl font-black text-emerald-900 uppercase tracking-tight mb-2">Payout Claimed</h2>
                  <p className="text-slate-500 font-medium mb-6 text-sm">
                    You have successfully received your financial assistance.
                  </p>
                  <Badge className="bg-slate-200 text-slate-700 shadow-none border-none px-4 py-2 font-bold uppercase tracking-widest text-[10px]">
                    Claimed on {application.claimedAt ? new Date(application.claimedAt).toLocaleDateString() : 'Unknown Date'}
                  </Badge>
                </div>
              ) 
              
              /* SCENARIO 2: APPROVED (READY TO CLAIM) - Displays immediately upon approval */
              : isApproved ? (
                <div className="text-center w-full animate-fade-in">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 inline-block mb-6 relative group">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-[1.5rem] -translate-x-1 -translate-y-1" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-[1.5rem] translate-x-1 -translate-y-1" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-[1.5rem] -translate-x-1 translate-y-1" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-[1.5rem] translate-x-1 translate-y-1" />
                    
                    <div className="bg-white rounded-xl">
                      <QRCode
                        id="QRCode"
                        value={qrValue}
                        size={220}
                        level="H"
                        bgColor="#ffffff"
                        fgColor="#000000"
                        style={{ display: "block" }}
                      />
                    </div>
                  </div>
                  
                  {/* Schedule Info - Shows if an admin has set the dates */}
                  {schedule?.distributionStart ? (
                    <div className="w-full bg-indigo-50 border border-indigo-100 rounded-2xl p-5 space-y-4 text-left shadow-sm">
                      <div className="flex items-start gap-3">
                        <CalendarDays className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                            {schedule.distributionType === "extension" ? "Extended Schedule" : "Schedule"}
                          </p>
                          <p className="font-bold text-indigo-900 leading-tight text-sm">{schedule.distributionStart} to {schedule.distributionEnd}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) 
              
              /* SCENARIO 3: PENDING / REJECTED / DRAFT */
              : (
                <div className="text-center w-full">
                  <div className="h-[220px] bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 mx-auto mb-6 relative overflow-hidden shadow-sm">
                    <QrIcon className="h-16 w-16 mb-2 opacity-20 blur-[2px]" />
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                       <div className="bg-white p-4 rounded-full shadow-xl">
                         <Lock className="h-8 w-8 text-slate-400" />
                       </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 mb-3 text-[10px] uppercase font-black tracking-widest px-3 py-1">
                    {application?.status === 'pending' ? 'Pending Approval' : application?.status === 'rejected' ? 'Application Rejected' : 'Ticket Locked'}
                  </Badge>
                  <p className="text-xs font-bold text-slate-500 max-w-[250px] mx-auto leading-relaxed">
                    Your QR code will unlock automatically once your application has been officially <strong>Approved</strong>.
                  </p>
                </div>
              )}
            </CardContent>
            
            <div className="relative h-6 bg-slate-50/50 flex items-center justify-between px-[-10px] overflow-hidden">
                <div className="w-full border-t-[3px] border-dashed border-slate-200 absolute top-1/2 -translate-y-1/2 left-0 z-0"></div>
                <div className="h-6 w-6 rounded-full bg-slate-50 absolute -left-3 shadow-inner z-10 border border-slate-100"></div>
                <div className="h-6 w-6 rounded-full bg-slate-50 absolute -right-3 shadow-inner z-10 border border-slate-100"></div>
            </div>

            {/* Download button only visible if approved and not yet claimed */}
            {isApproved && !isClaimed && (
              <div className="bg-white p-6">
                <Button 
                  onClick={handleDownloadQRCode} 
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 font-black uppercase tracking-widest text-xs shadow-md hover:scale-[1.02] transition-transform"
                >
                  <Download className="mr-2 h-4 w-4" /> Save Ticket to Gallery
                </Button>
              </div>
            )}
          </Card>

          {/* IMPORTANT REMINDER LOGIC */}
          {isClaimed ? (
            <Alert className="max-w-md mx-auto border-emerald-200 bg-emerald-50 rounded-2xl shadow-sm">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <AlertTitle className="text-emerald-900 font-black uppercase tracking-tight text-sm">Financial Assistance Claimed</AlertTitle>
              <AlertDescription className="text-emerald-800 font-bold text-xs mt-1 leading-relaxed">
                Congrats, you’ve claimed your financial assistance for this cycle.
              </AlertDescription>
            </Alert>
          ) : isApproved ? (
            <Alert className="max-w-md mx-auto border-amber-200 bg-amber-50 rounded-2xl shadow-sm">
              <Info className="h-5 w-5 text-amber-600" />
              <AlertTitle className="text-amber-900 font-black uppercase tracking-tight text-sm">Important Reminder</AlertTitle>
              <AlertDescription className="text-amber-800 font-bold text-xs mt-1 leading-relaxed">
                Only the registered scholar can present this QR code to the municipal staff. Do not share this code online.
              </AlertDescription>
            </Alert>
          ) : null}

        </TabsContent>

        {/* HOW TO USE */}
        <TabsContent value="usage" className="space-y-4">
          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-black uppercase tracking-wider text-slate-800">How to Use Your Ticket</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 flex items-center">
                  <Smartphone className="mr-2 h-4 w-4 text-emerald-600" /> Digital Verification
                </h3>
                <ol className="list-decimal list-inside space-y-3 text-sm font-medium text-slate-600 pl-2 mt-3">
                  <li>Save the QR code to your phone gallery before arriving at the venue.</li>
                  <li>Present the QR code (turn screen brightness up) to the Scanner Staff.</li>
                  <li>Staff will scan your code using the official municipal tablet.</li>
                  <li>Once the system says "Verified", proceed to claim your financial assistance.</li>
                </ol>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 flex items-center">
                  <Shield className="mr-2 h-4 w-4 text-emerald-600" /> Identity Verification
                </h3>
                <p className="text-sm font-medium text-slate-600">
                  For security purposes, you will need to present a physical valid ID along with your QR code to prove ownership.
                </p>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-3">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-800 mb-2">Acceptable IDs:</p>
                  <ul className="list-disc list-inside space-y-2 text-sm font-medium text-slate-600 pl-2">
                    <li>Valid School ID for the current semester</li>
                    <li>Government-issued ID (National ID, Driver's License, Passport)</li>
                    <li>Barangay Certification of Identity with photo</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECURITY */}
        <TabsContent value="security" className="space-y-4">
          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-black uppercase tracking-wider text-slate-800">QR Code Security</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <Alert variant="destructive" className="bg-red-50 border-red-200 rounded-2xl">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <AlertTitle className="text-red-900 font-black uppercase tracking-tight text-sm">Security Warning</AlertTitle>
                <AlertDescription className="text-red-800 font-medium text-xs mt-1 leading-relaxed">
                  Never post your QR code on Facebook, Instagram, or any public platform. If someone else scans your code, they may claim your financial aid.
                </AlertDescription>
              </Alert>

              <div className="space-y-2 pt-2">
                <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">System Protections</h3>
                <ul className="list-disc list-inside space-y-2 text-sm font-medium text-slate-600 pl-2 mt-2">
                  <li>Tickets can only be verified by logged-in official Scanner Staff.</li>
                  <li>The code automatically locks immediately after being scanned once.</li>
                  <li>QR payloads use encrypted, database-linked identifiers.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </StudentLayout>
  )
}
