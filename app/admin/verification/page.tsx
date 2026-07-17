"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AdminLayout } from "@/components/admin-layout"
import { QrScanner } from "@/components/qr-scanner"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { Check, CheckCircle, User, QrCode, Keyboard, Search, Loader2, XCircle, AlertCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// 🔥 Added AlertDialog imports here
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { collection, query, where, getDocs, getDoc, doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { markStudentAsClaimed } from "@/lib/storage"

async function decryptData(encryptedData: string, key: string): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const keyBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(key))
    const cryptoKey = await crypto.subtle.importKey("raw", keyBuffer, { name: "AES-GCM" }, false, ["decrypt"])
    const combined = new Uint8Array(
      atob(encryptedData).split("").map((char) => char.charCodeAt(0)),
    )
    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, encrypted)
    return new TextDecoder().decode(decrypted)
  } catch (error) {
    throw new Error("Failed to decrypt QR code data")
  }
}

// Hash function to match hashed QR codes
async function hashValue(value: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

const extractProfilePicture = (userData: any): string | null => {
  if (!userData) return null;
  const keysToCheck = ['profilePicture', 'photoURL', 'photoUrl', 'imageUrl', 'image', 'avatar', 'picture'];
  for (const key of keysToCheck) {
    if (typeof userData[key] === 'string' && userData[key].length > 10) return userData[key];
  }
  const nestedObjects = [userData.profileData, userData.profile, userData.personalInfo, userData.user];
  for (const nested of nestedObjects) {
     if (nested && typeof nested === 'object') {
        for (const key of keysToCheck) {
           if (typeof nested[key] === 'string' && nested[key].length > 10) return nested[key];
        }
     }
  }
  let found = null;
  const search = (obj: any) => {
     if (!obj || typeof obj !== 'object') return;
     for (const key in obj) {
        const val = obj[key];
        if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('data:image/'))) {
           const lowerKey = key.toLowerCase();
           if (lowerKey.includes('pic') || lowerKey.includes('photo') || lowerKey.includes('img') || lowerKey.includes('avatar') || lowerKey.includes('url')) {
              found = val;
              return;
           }
        } else if (typeof val === 'object') {
           search(val);
           if (found) return;
        }
     }
  }
  search(userData);
  return found;
}

export default function QRVerificationPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  
  const [studentId, setStudentId] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const [activeUserId, setActiveUserId] = useState<string | null>(null)
  const [isClaimed, setIsClaimed] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean
    userId?: string
    failureReason?: string
    failureDetails?: string
    student?: {
      id: string
      name: string
      course: string
      yearLevel: string
      status: string
      profilePicture?: string | null
    }
  } | null>(null)

  useEffect(() => {
    if (!activeUserId) return;

    let unsubUser: () => void;
    let unsubApp: () => void;

    const userRef = doc(db, "users", activeUserId);
    unsubUser = onSnapshot(userRef, (userSnap) => {
      if (!userSnap.exists()) return;
      const studentUser = { id: userSnap.id, ...userSnap.data() } as any;
      const profile = studentUser.profileData || {};
      const uploadedProfilePic = extractProfilePicture(studentUser);

      const appQ = query(collection(db, "applications"), where("studentId", "==", activeUserId));
      
      if (unsubApp) unsubApp(); 
      
      unsubApp = onSnapshot(appQ, (appSnap) => {
        const application = appSnap.empty ? null : { id: appSnap.docs[0].id, ...appSnap.docs[0].data() } as any;
        
        if (application && application.status === "approved") {
          const alreadyClaimed = application.isClaimed || false;
          setIsClaimed(alreadyClaimed);

          setVerificationResult({
            verified: true,
            userId: studentUser.id,
            student: {
              id: profile.studentId || studentUser.id,
              name: profile.fullName || studentUser.name || "Unknown",
              course: application.course || profile.course || "N/A",
              yearLevel: application.yearLevel || profile.yearLevel || "N/A",
              status: alreadyClaimed ? "claimed" : application.status,
              profilePicture: uploadedProfilePic,
            },
          });
        } else {
          let failureReason = "No Approved Application"
          let failureDetails = "Student found but has no approved scholarship application."

          if (application) {
            if (application.status === "pending") {
              failureReason = "Application Pending"
              failureDetails = "Student's application is still under review."
            } else if (application.status === "rejected") {
              failureReason = "Application Rejected"
              failureDetails = application.feedback ? `Rejected: ${application.feedback}` : "Application was rejected."
            }
          } else {
            failureReason = "No Application Found"
            failureDetails = "Student is registered but has not submitted an application."
          }

          setVerificationResult({ verified: false, failureReason, failureDetails })
        }
        setIsProcessing(false);
      });
    });

    return () => {
      if (unsubUser) unsubUser();
      if (unsubApp) unsubApp();
    };
  }, [activeUserId]);

  const resolveStudentInFirestore = async (searchTerm: string) => {
    setIsProcessing(true);
    setVerificationResult(null);

    try {
      const usersRef = collection(db, "users");
      let foundId = null;

      const directDoc = await getDoc(doc(db, "users", searchTerm));
      if (directDoc.exists() && directDoc.data().role === "student") {
        foundId = directDoc.id;
      }

      if (!foundId) {
        const q1 = query(usersRef, where("profileData.studentId", "==", searchTerm), where("role", "==", "student"));
        const s1 = await getDocs(q1);
        if (!s1.empty) foundId = s1.docs[0].id;
      }

      if (!foundId) {
        const q2 = query(usersRef, where("studentId", "==", searchTerm), where("role", "==", "student"));
        const s2 = await getDocs(q2);
        if (!s2.empty) foundId = s2.docs[0].id;
      }

      if (!foundId) {
        const q3 = query(usersRef, where("email", "==", searchTerm), where("role", "==", "student"));
        const s3 = await getDocs(q3);
        if (!s3.empty) foundId = s3.docs[0].id;
      }

      if (foundId) {
        if (foundId === activeUserId) {
           setIsProcessing(false); 
        } else {
           setActiveUserId(foundId); 
        }
        
        toast({
          title: <div className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> Student Found</div>,
          description: "Connecting to live application data...",
        })
      } else {
        setActiveUserId(null);
        setVerificationResult({
          verified: false,
          failureReason: "Student Not Found",
          failureDetails: "No student found with this ID or email in the database.",
        });
        toast({ variant: "destructive", title: "Verification failed", description: "Student not found." });
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Resolution Error:", error);
      toast({ variant: "destructive", title: "Error", description: "Database connection failed." });
      setIsProcessing(false);
      setActiveUserId(null);
    }
  }

  const handleMarkAsClaimed = async () => {
    if (!verificationResult?.userId || !user) {
      toast({ variant: "destructive", title: "Error", description: "Cannot mark as claimed. Missing information." })
      return
    }

    setIsProcessing(true)
    try {
      const result = await markStudentAsClaimed(verificationResult.userId, user.id)
      
      if (result.success) {
        toast({ title: "Financial Aid Claimed", description: result.message, className: "bg-emerald-600 text-white border-none" })
        setTimeout(() => {
          setActiveUserId(null)
          setVerificationResult(null)
          setIsClaimed(false)
          setStudentId("")
        }, 3000)
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message })
        setIsProcessing(false)
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to mark as claimed." })
      setIsProcessing(false)
    }
  }

  const handleManualVerify = () => {
    if (!studentId.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a student ID or email" })
      return
    }
    resolveStudentInFirestore(studentId.trim())
  }

  const handleQRCodeResult = async (result: string) => {
    try {
      let studentIdFromQR: string

      if (result.startsWith("BTS:")) {
        const qrValue = result.replace("BTS:", "")
        
        if (/^[a-f0-9]{64}$/i.test(qrValue)) {
          setStudentId(qrValue)
          setIsScanning(false)
          await resolveStudentByHash(qrValue)
          return
        }
        
        studentIdFromQR = qrValue
      } else if (result.startsWith("BTS_ENCRYPTED:")) {
        const encryptedData = result.replace("BTS_ENCRYPTED:", "")
        const secretKey = "BTS-SCHOLARSHIP-SECRET-KEY-2024"
        const decryptedJson = await decryptData(encryptedData, secretKey)
        const data = JSON.parse(decryptedJson)
        studentIdFromQR = data.id || data.studentId
      } else {
        try {
          const data = JSON.parse(result)
          studentIdFromQR = data.id || data.studentId
        } catch {
          studentIdFromQR = result
        }
      }

      setStudentId(studentIdFromQR)
      setIsScanning(false)
      resolveStudentInFirestore(studentIdFromQR)
      
    } catch (error) {
      console.error("QR Code parse error:", error)
      toast({ variant: "destructive", title: "Invalid QR code", description: "Could not read QR data" })
    }
  }

  const resolveStudentByHash = async (hashedId: string) => {
    setIsProcessing(true)
    setVerificationResult(null)

    try {
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("role", "==", "student"))
      const snapshot = await getDocs(q)

      let foundId: string | null = null

      for (const docSnap of snapshot.docs) {
        const userData = docSnap.data()
        const profileData = userData.profileData || {}
        const studentId = profileData.studentId || docSnap.id
        
        const hashedStudentId = await hashValue(studentId)
        if (hashedStudentId === hashedId) {
          foundId = docSnap.id
          break
        }
      }

      if (foundId) {
        if (foundId === activeUserId) {
          setIsProcessing(false)
        } else {
          setActiveUserId(foundId)
        }
        toast({
          title: <div className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> Student Found</div>,
          description: "Connecting to live application data...",
        })
      } else {
        setActiveUserId(null)
        setVerificationResult({
          verified: false,
          failureReason: "Student Not Found",
          failureDetails: "No student found with this QR code in the database.",
        })
        toast({ variant: "destructive", title: "Verification failed", description: "Student not found." })
        setIsProcessing(false)
      }
    } catch (error) {
      console.error("Hash resolution error:", error)
      toast({ variant: "destructive", title: "Error", description: "Database connection failed." })
      setIsProcessing(false)
      setActiveUserId(null)
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-12">
        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400 rounded-full filter blur-[80px] opacity-10 -mr-20 -mt-20 pointer-events-none"></div>
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shrink-0">
                <QrCode className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">QR Verification</h1>
                <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Verify students for financial aid distribution.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
          
          <Card className="rounded-3xl border-slate-200 shadow-sm bg-white overflow-hidden h-fit">
            <div className="h-2 bg-slate-800 w-full" />
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 md:p-8 pb-6">
              <CardTitle className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight">Verify Student</CardTitle>
              <CardDescription className="font-medium text-slate-500 mt-1">Scan QR code or enter student details manually</CardDescription>
            </CardHeader>
            <CardContent className="p-6 md:p-8 pt-6">
              <Tabs defaultValue="manual" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 p-1 rounded-2xl h-14">
                  <TabsTrigger value="manual" className="rounded-xl font-bold flex items-center gap-2 h-full text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Keyboard className="h-4 w-4" /> Manual
                  </TabsTrigger>
                  <TabsTrigger value="qr" className="rounded-xl font-bold flex items-center gap-2 h-full text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <QrCode className="h-4 w-4" /> Scanner
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="manual" className="space-y-6 mt-0">
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm font-medium text-blue-800 leading-relaxed">
                      Enter the student's ID, email address, or user ID to verify their eligibility.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500">Student ID / Email</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input
                          placeholder="e.g. 2024-00001 or student@email.com"
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleManualVerify()}
                          className="pl-12 h-14 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-emerald-500 font-medium w-full"
                          disabled={isProcessing}
                        />
                      </div>
                      <Button 
                        onClick={handleManualVerify} 
                        className="w-full sm:w-auto shrink-0 h-14 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black px-8 shadow-md" 
                        disabled={isProcessing || !studentId.trim()}
                      >
                        {isProcessing ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Check className="h-5 w-5 mr-2" />}
                        {isProcessing ? "Verifying..." : "Verify"}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="qr" className="mt-0 space-y-6">
                  {isScanning ? (
                    <div className="space-y-4 animate-in zoom-in-95 duration-300">
                      <div className="rounded-3xl overflow-hidden border-4 border-slate-100 shadow-inner">
                        <QrScanner onResult={handleQRCodeResult} />
                      </div>
                      <Button variant="outline" className="w-full h-14 rounded-xl font-bold text-slate-600 border-slate-200 hover:bg-slate-50" onClick={() => setIsScanning(false)}>
                        Cancel Scanning
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                        <p className="text-xs sm:text-sm font-medium text-amber-800 leading-relaxed">
                          Make sure to allow camera access when prompted. Position the QR code within the scanner frame.
                        </p>
                      </div>
                      <Button 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-14 rounded-xl font-black text-base shadow-md" 
                        onClick={() => setIsScanning(true)}
                      >
                        <QrCode className="h-5 w-5 mr-2" /> Start Scanner
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm bg-white overflow-hidden flex flex-col h-full min-h-[400px]">
            <div className={`h-2 w-full ${verificationResult?.verified ? 'bg-emerald-500' : verificationResult?.failureReason ? 'bg-red-500' : 'bg-slate-200'}`} />
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6 p-6 md:p-8 shrink-0">
              <CardTitle className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight">Result</CardTitle>
              <CardDescription className="font-medium text-slate-500 mt-1">Student information and verification status</CardDescription>
            </CardHeader>
            <CardContent className="p-6 md:p-8 pt-6 flex-1 flex flex-col">
              
              {isProcessing && !verificationResult ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in">
                   <div className="h-20 w-20 rounded-full bg-emerald-50 flex items-center justify-center mb-4 border border-emerald-100">
                     <Loader2 className="h-10 w-10 text-emerald-600 animate-spin" />
                   </div>
                   <h3 className="text-xl font-black text-slate-800 tracking-tight">Verifying...</h3>
                   <p className="text-slate-500 text-sm font-medium mt-2">Checking database records</p>
                 </div>
              ) : verificationResult ? (
                verificationResult.verified ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 flex-1 flex flex-col">
                    
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3 shrink-0">
                      <CheckCircle className="w-6 h-6 sm:w-5 sm:h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm sm:text-base font-black text-emerald-800 uppercase tracking-tight">Student Verified</h4>
                        <p className="text-[10px] sm:text-xs font-bold text-emerald-700/80 mt-1 leading-relaxed">This student has been verified and marked as eligible for financial aid distribution.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-5 p-4 sm:p-5 bg-slate-50 border border-slate-100 rounded-3xl relative shrink-0">
                      <div className="w-16 h-16 sm:w-20 sm:w-20 rounded-full overflow-hidden bg-white border-2 border-emerald-500 shrink-0 flex items-center justify-center relative shadow-sm">
                        {verificationResult.student?.profilePicture ? (
                          <img src={verificationResult.student.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 text-slate-300" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-slate-800 text-base sm:text-lg uppercase tracking-tight whitespace-nowrap">{verificationResult.student?.name}</h3>
                        <p className="text-[10px] sm:text-xs font-bold text-slate-500 tracking-wider whitespace-nowrap mt-0.5">ID: {verificationResult.student?.id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-sm bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm flex-1">
                      <div className="col-span-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">School / Course</p>
                        <p className="text-xs sm:text-sm font-bold text-slate-800 whitespace-nowrap">{verificationResult.student?.course}</p>
                        <p className="text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5 whitespace-nowrap">Year {verificationResult.student?.yearLevel}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Payout Status</p>
                        <Badge className="px-3 py-1 font-black uppercase tracking-widest text-[10px] sm:text-xs bg-emerald-100 text-emerald-700 border-transparent shadow-none">
                          {verificationResult.student?.status}
                        </Badge>
                      </div>
                    </div>

                    {isClaimed ? (
                      <div className="w-full p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center mt-2 shrink-0">
                        <div className="flex items-center justify-center gap-2 text-emerald-700 font-black uppercase tracking-wide text-sm">
                          <Check className="h-5 w-5" /> Financial Aid Claimed
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 shrink-0">
                        {/* 🔥 Added AlertDialog Confirmation Here */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-14 rounded-xl font-black text-base shadow-lg transition-transform active:scale-95" 
                              disabled={isProcessing}
                            >
                              {isProcessing ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : null}
                              {isProcessing ? "Processing..." : "Confirm Payout"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-3xl border-0 shadow-2xl p-6">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">Are you sure to mark this claimed?</AlertDialogTitle>
                              <AlertDialogDescription className="font-medium text-slate-600">
                                This will verify the scholar has received their assistance. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-4">
                              <AlertDialogCancel className="rounded-xl font-bold border-slate-200 text-slate-600">No, Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={handleMarkAsClaimed} 
                                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold text-white shadow-md"
                              >
                                Yes, Mark as Claimed
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 flex-1 flex flex-col">
                    <div className="rounded-2xl bg-red-50 p-4 text-red-700 border border-red-200 shrink-0">
                      <div className="flex items-center gap-2 font-black uppercase tracking-wide text-sm sm:text-base">
                        <XCircle className="h-5 w-5 shrink-0" /> Verification Failed
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-3xl border border-slate-100 p-5 sm:p-6 space-y-4 flex-1">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Reason</p>
                        <p className="text-sm sm:text-base font-black text-red-600 uppercase tracking-tight">{verificationResult.failureReason}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Details</p>
                        <p className="text-xs sm:text-sm font-bold text-slate-600 leading-relaxed">{verificationResult.failureDetails}</p>
                      </div>
                    </div>
                    
                    <div className="pt-2 shrink-0">
                      <Button 
                        onClick={() => { setActiveUserId(null); setVerificationResult(null); setStudentId(""); }} 
                        variant="outline"
                        className="w-full rounded-xl h-14 font-bold text-slate-600 border-slate-200 hover:bg-slate-50"
                      >
                        Clear Result
                      </Button>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                  <QrCode className="w-16 h-16 sm:w-20 sm:w-20 mb-4 opacity-20" />
                  <p className="font-bold text-xs sm:text-sm uppercase tracking-widest text-center leading-relaxed">No verification result yet.<br/>Scan a QR code to begin.</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </AdminLayout>
  )
}
