"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StudentLayout } from "@/components/student-layout"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { collection, query, where, onSnapshot, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { 
  School, CheckCircle, FileText, ArrowRight, 
  CalendarDays, UploadCloud, Loader2, Banknote, 
  Clock, XCircle, Facebook, Activity, Calendar, AlertCircle, Info
} from "lucide-react"

function getTimelineSteps(application: any, schedule: any, studentBarangay: string) {
  const formatDate = (dateString?: string) => dateString ? new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "";

  const hasApp = application?.isSubmitted;
  const isApproved = application?.isApproved;
  const isRejected = application?.status === 'rejected'; 
  const isClaimed = application?.isClaimed;

  // Strict Barangay Filtering for the Timeline
  const isTargetBarangay = schedule?.targetBarangays && Array.isArray(schedule.targetBarangays) 
      ? schedule.targetBarangays.includes(studentBarangay) 
      : true;

  const hasFinancialSchedule = schedule?.distributionOpen && isTargetBarangay;
  const isExtension = schedule?.distributionType === "extension" || schedule?.isExtended;
  const distributionEnded = !schedule?.distributionOpen && schedule?.distributionStart;

  return [
    { 
      id: "submit", 
      title: "Application Submitted", 
      description: hasApp ? "Your application has been received." : "Submit your required documents.", 
      state: hasApp ? "completed" : "pending", 
      date: hasApp ? formatDate(application.submittedAt || application.createdAt) : "" 
    },
    { 
      id: "review", 
      title: "Under Review", 
      description: "The scholarship committee is verifying your documents.", 
      state: !hasApp ? "pending" : ((!isApproved && !isRejected) ? "current" : "completed"), 
      date: (isApproved || isRejected) ? formatDate(application.updatedAt) : (hasApp && !isApproved && !isRejected ? "In Progress" : "") 
    },
    { 
      id: "decision", 
      title: isRejected ? "Resubmit Required" : (isApproved ? "Application Approved" : "Approved or Resubmit"), 
      description: isRejected ? "Action required on your submitted documents." : (isApproved ? "Congratulations! Your documents have been verified." : "Awaiting final decision from the committee."), 
      state: isRejected ? "error" : (isApproved ? "completed" : "pending"), 
      date: (isApproved || isRejected) ? formatDate(application.updatedAt) : "" 
    },
    { 
      id: "announcement", 
      title: isExtension ? "Distribution Extended" : (distributionEnded && isApproved && !isClaimed ? "Distribution Ended" : "Financial Assistance Schedule"),
      description: hasFinancialSchedule ? (
        isExtension 
          ? "The distribution period has been extended. Please claim your assistance at the Municipal Treasury." 
          : "Your schedule is ready! Please check your QR Ticket for the exact claiming date and venue."
      ) : (distributionEnded && isApproved && !isClaimed) ? (
        "The distribution has ended. Please wait for the extension to be announced."
      ) : (
        <div className="flex flex-col gap-2">
          <span>Wait for the official financial release schedule.</span>
          <div className="flex items-center gap-2 mt-1 pt-2 border-t border-slate-200/60">
            <span className="text-[10px] text-slate-400 uppercase font-black italic">or wait for the announcement on our</span>
            <a href="https://www.facebook.com/groups/426596700233927" target="_blank" rel="noopener noreferrer" className="bg-[#1877F2] p-1.5 rounded-lg hover:bg-[#166fe5] transition-colors shadow-sm">
              <Facebook className="h-3.5 w-3.5 text-white fill-current" />
            </a>
          </div>
        </div>
      ), 
      state: isClaimed ? "completed" : (hasFinancialSchedule && isApproved ? "completed" : (isApproved ? "current" : "pending")), 
      date: "" 
    },
    { 
      id: "distribution", 
      title: "Financial Distribution", 
      description: isClaimed ? "You have successfully claimed your financial assistance." : "Claim your financial assistance at the designated municipal venue.", 
      state: isClaimed ? "completed" : (hasFinancialSchedule && isApproved && !isClaimed ? "current" : "pending"), 
      date: isClaimed ? formatDate(application.claimedAt) : "" 
    }
  ];
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const [studentData, setStudentData] = useState<any>(null)
  
  const [docProgress, setDocProgress] = useState({ uploadedCount: 0, totalRequired: 9 })
  const [currentApp, setCurrentApp] = useState<any>(null)
  const [pastApp, setPastApp] = useState<any>(null)
  
  const [schedule, setSchedule] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setIsLoading(true)

    const unsubs: (() => void)[] = []

    unsubs.push(onSnapshot(doc(db, "settings", "schedule"), (docSnap) => {
      if (docSnap.exists()) setSchedule(docSnap.data())
    }))

    const qApp = query(collection(db, "applications"), where("studentId", "==", user.id))
    unsubs.push(onSnapshot(qApp, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      const activeApp = apps.find(a => !(a as any).isArchived)
      setCurrentApp(activeApp || null)
      setIsLoading(false)
    }))

    const qDocs = query(collection(db, "documents"), where("studentId", "==", user.id))
    unsubs.push(onSnapshot(qDocs, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      const active = docs.filter(d => !(d as any).isArchived)
      const uploadedNames = new Set(active.map((d: any) => d.categoryName || d.name))
      setDocProgress({ uploadedCount: uploadedNames.size, totalRequired: 9 })
    }))

    const qHistory = query(collection(db, "history"), where("studentId", "==", user.id))
    unsubs.push(onSnapshot(qHistory, (snapshot) => {
      const histories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      histories.sort((a: any, b: any) => new Date(b.archivedAt || 0).getTime() - new Date(a.archivedAt || 0).getTime())
      setPastApp(histories[0] || null)
    }))

    return () => {
      unsubs.forEach(unsub => unsub())
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    const profile = user.profileData as any
    setStudentData({
      name: profile?.fullName || user.name || "Student",
      course: currentApp?.course || profile?.course || "Not specified",
      yearLevel: currentApp?.yearLevel || profile?.yearLevel || "Not specified",
      semester: currentApp?.semester || profile?.semester || "Not specified",
      school: currentApp?.school || profile?.schoolName || "Not specified",
      barangay: currentApp?.barangay || profile?.barangay || "Not specified",
    })
  }, [user, currentApp])

  if (isLoading || !studentData) {
    return (
      <StudentLayout>
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-emerald-600">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p className="text-sm font-bold tracking-widest uppercase text-slate-400">Loading Dashboard...</p>
        </div>
      </StudentLayout>
    )
  }

  const profilePicUrl = user?.profileData?.studentPhoto || user?.profilePicture || null;
  const initial = studentData.name.charAt(0).toUpperCase();
  const isDocsComplete = docProgress.uploadedCount >= docProgress.totalRequired;

  const isSubmitted = currentApp?.isSubmitted;
  const isApproved = currentApp?.isApproved;
  const isRejected = currentApp?.status === 'rejected';

  // Strict Barangay Evaluation
  const isTargetBarangay = schedule?.targetBarangays && Array.isArray(schedule.targetBarangays) 
    ? schedule.targetBarangays.includes(studentData.barangay) 
    : true;
  const isDistributionActive = schedule?.distributionOpen && isTargetBarangay;

  let messageData = { 
    color: "slate", icon: CalendarDays, 
    title: "Submissions Closed", 
    text: "Please wait for the application portal to open.",
    actionText: "View Profile", actionLink: "/student/profile"
  };
  
  if (currentApp?.isClaimed) {
    messageData = { 
      color: "emerald", icon: CheckCircle, 
      title: "Financial Assistance Claimed", 
      text: "Congrats, you have received the financial assistance. Please wait for the next financial assistance.",
      actionText: "View History", actionLink: "/student/history"
    };
  } else if (isDistributionActive && isApproved) {
    if (schedule?.distributionType === "extension" || schedule?.isExtended) {
      messageData = { 
        color: "purple", icon: Banknote, 
        title: "Distribution Extended", 
        text: "The Distribution is Extended. Please Claim in the Treasury.",
        actionText: "View QR Pass", actionLink: "/student/qrcode"
      };
    } else {
      messageData = { 
        color: "amber", icon: Calendar, 
        title: "Ready for Claiming", 
        text: "You can now claim your financial assistance. Please check the Claiming Ticket tab.",
        actionText: "View QR Pass", actionLink: "/student/qrcode"
      };
    }
  } else if (isApproved && !isDistributionActive) {
    if (schedule?.distributionOpen && !isTargetBarangay) {
      // Distribution is open, but NOT for this student's barangay yet
      messageData = { 
        color: "amber", icon: Clock, 
        title: "Not Your Schedule", 
        text: "Your barangay is not scheduled for claiming today. Please wait for your barangay's turn.",
        actionText: "View Documents", actionLink: "/student/documents"
      };
    } else if (schedule?.distributionStart) {
      messageData = { 
        color: "amber", icon: Clock, 
        title: "Distribution Ended", 
        text: "The distribution has ended. Please wait for the extension to be announced.",
        actionText: "View QR Pass", actionLink: "/student/qrcode"
      };
    } else {
      messageData = { 
        color: "blue", icon: Banknote, 
        title: "Application Approved", 
        text: "Wait for financial schedules.",
        actionText: "View Documents", actionLink: "/student/documents"
      };
    }
  } else if (isRejected) {
    const resubmitDocs = currentApp?.resubmitDocuments || [];
    const docsList = resubmitDocs.length > 0 ? ` (${resubmitDocs.join(', ')})` : '';
    messageData = { 
      color: "red", icon: AlertCircle, 
      title: "Action Required: Resubmit Application", 
      text: `Reason: ${currentApp?.feedback || currentApp?.remarks || currentApp?.resubmissionReason || "Please review your documents and resubmit."}${docsList}`,
      actionText: "Update Documents", actionLink: "/student/documents"
    };
  } else if (schedule?.submissionOpen) {
    messageData = { 
      color: "indigo", icon: UploadCloud, 
      title: "The submission is now open", 
      text: isSubmitted ? "Your application is currently pending review." : "The portal is accepting new applications. Upload your documents to proceed.",
      actionText: isSubmitted ? "View Documents" : "Apply Now", actionLink: "/student/documents"
    };
  }

  return (
    <StudentLayout>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
        
        {/* UNIFIED WELCOME & HISTORY REMARKS CARD */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm animate-in slide-in-from-top-4">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400 rounded-full filter blur-[80px] opacity-10 -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="relative p-6 md:p-8 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center font-black text-emerald-700 text-3xl shrink-0 overflow-hidden border-2 border-emerald-200 shadow-inner">
                 {profilePicUrl ? <img src={profilePicUrl} alt={studentData.name} className="h-full w-full object-cover" /> : initial}
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Welcome, {studentData.name.split(' ')[0]}!</h1>
                <p className="text-slate-500 font-medium mt-1">Here is the current status of your scholarship application.</p>
              </div>
            </div>

            {!currentApp && pastApp && (
              <>
                <hr className="border-slate-100" />
                
                <div className="flex items-start gap-4">
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-2xl shrink-0">
                    <Info className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="pt-1">
                    <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">Scholarship Cycle Ended</h3>
                    <p className="text-slate-600 font-medium mt-1 text-sm md:text-base leading-snug">
                      Please update your information and academic information in the Profiles tab to match your documents/requirements to avoid conflicts.
                    </p>
                  </div>
                </div>

                {pastApp.isApproved && !pastApp.isClaimed && (
                  <>
                    <hr className="border-slate-100" />
                    <div className="flex items-start gap-4">
                      <div className="bg-amber-50 border border-amber-100 p-3 rounded-2xl shrink-0">
                        <AlertCircle className="h-6 w-6 text-amber-600" />
                      </div>
                      <div className="pt-1">
                        <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">Unclaimed Assistance</h3>
                        <p className="text-slate-600 font-medium mt-1 text-sm md:text-base leading-snug">
                          Failed to receive assistance during the given time period.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* DYNAMIC MESSAGING BANNER */}
        <div className={`bg-${messageData.color}-50 border-2 border-${messageData.color}-200 rounded-3xl animate-in zoom-in-95 shadow-sm flex flex-col overflow-hidden`}>
          <div className={`p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6`}>
            <div className="flex items-start md:items-center gap-5">
              <div className={`bg-${messageData.color}-100 h-14 w-14 rounded-full flex items-center justify-center shrink-0`}>
                <messageData.icon className={`h-7 w-7 text-${messageData.color}-600`} />
              </div>
              <div className="flex flex-col justify-center">
                <h3 className={`font-black text-${messageData.color}-900 uppercase tracking-tight text-xl md:text-2xl`}>{messageData.title}</h3>
                <p className={`text-${messageData.color}-700 font-bold mt-1 text-base md:text-lg leading-snug`}>
                  {messageData.text}
                </p>
              </div>
            </div>
            
            <Button asChild className={`bg-${messageData.color === 'slate' ? 'slate' : messageData.color}-600 hover:bg-${messageData.color === 'slate' ? 'slate' : messageData.color}-700 text-white rounded-xl font-black shadow-md h-12 px-8 w-full md:w-auto shrink-0 text-base md:text-lg transition-transform active:scale-95`}>
              <Link href={messageData.actionLink}>{messageData.actionText} <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </div>
        </div>

        {/* --- 3-COLUMN SIDE-BY-SIDE CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          <Link href={!isSubmitted ? "/student/documents" : "#timeline"} className="block group h-full">
            <Card className="overflow-hidden border border-slate-200 shadow-sm rounded-3xl bg-white transition-all group-hover:border-emerald-400 group-hover:shadow-md active:scale-[0.99] h-full flex flex-col">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-600" /> Status
                  </CardTitle>
                  <div className="text-[9px] font-black uppercase text-emerald-600 tracking-widest flex items-center group-hover:translate-x-1 transition-transform">
                    {!isSubmitted ? "Upload" : "Timeline"} <ArrowRight className="ml-1 h-3 w-3" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 flex-1 flex flex-col justify-center">
                <div className="flex items-start justify-between relative mt-2">
                  <div className="absolute left-[15%] right-[15%] top-4 h-1 bg-slate-100 rounded-full -z-0">
                    <div className="h-full bg-emerald-500 transition-all duration-700 rounded-full" style={{ width: isApproved ? '100%' : (isSubmitted || isRejected) ? '50%' : '0%' }}/>
                  </div>
                  <div className="flex flex-col items-center gap-2 z-10 w-16">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black shadow-sm ${(!isSubmitted && !isRejected) ? 'bg-amber-400 text-white ring-4 ring-amber-100' : 'bg-emerald-500 text-white'}`}>
                      {(!isSubmitted && !isRejected) ? "1" : <CheckCircle className="h-4 w-4" />}
                    </div>
                    <span className={`text-center text-[9px] uppercase font-black tracking-widest ${(!isSubmitted && !isRejected) ? 'text-amber-600' : 'text-emerald-600'}`}>Draft</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 z-10 w-16">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black shadow-sm ${
                      isRejected ? 'bg-red-500 text-white ring-4 ring-red-100 animate-pulse' :
                      (isSubmitted && !isApproved) ? 'bg-amber-400 text-white ring-4 ring-amber-100 animate-pulse' : 
                      isApproved ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {isApproved ? <CheckCircle className="h-4 w-4" /> : isRejected ? <XCircle className="h-4 w-4" /> : "2"}
                    </div>
                    <span className={`text-center text-[9px] uppercase font-black tracking-widest ${
                      isRejected ? 'text-red-600' :
                      (isSubmitted && !isApproved) ? 'text-amber-600' : 
                      isApproved ? 'text-emerald-600' : 'text-slate-400'
                    }`}>{isRejected ? 'Resubmit' : 'Review'}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 z-10 w-16">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black shadow-sm ${isApproved ? 'bg-emerald-500 text-white ring-4 ring-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                      {isApproved ? <CheckCircle className="h-4 w-4" /> : "3"}
                    </div>
                    <span className={`text-center text-[9px] uppercase font-black tracking-widest ${isApproved ? 'text-emerald-600' : 'text-slate-400'}`}>Approved</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/student/profile" className="block transition-transform hover:scale-[1.01] active:scale-[0.99] group h-full">
            <Card className="overflow-hidden border border-blue-100 shadow-sm hover:shadow-md transition-shadow rounded-3xl bg-white h-full flex flex-col">
              <div className="h-1.5 bg-blue-500"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 border-b border-slate-100">
                <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-800 group-hover:text-blue-600 transition-colors">Academic</CardTitle>
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                  <School className="h-3 w-3 text-blue-600 group-hover:text-white transition-colors" />
                </div>
              </CardHeader>
              <CardContent className="p-5 flex-1 flex flex-col justify-between">
                <div className="flex flex-col gap-2 flex-1">
                  <div className="flex flex-col p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">School</span>
                    <span className="text-xs font-bold text-slate-800 line-clamp-1">{studentData.school}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Year Level</span>
                      <span className="text-xs font-bold text-slate-800 line-clamp-1">{studentData.yearLevel}</span>
                    </div>
                    <div className="flex flex-col p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Semester</span>
                      <span className="text-xs font-bold text-slate-800 line-clamp-1">{studentData.semester}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/student/documents" className="block transition-transform hover:scale-[1.01] active:scale-[0.99] h-full">
            <Card className={`overflow-hidden border ${isDocsComplete ? 'border-emerald-200' : 'border-slate-200'} shadow-sm hover:shadow-md transition-shadow rounded-3xl bg-white h-full flex flex-col`}>
              <div className={`h-1.5 ${isDocsComplete ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
              <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-800">Documents</CardTitle>
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center ${isDocsComplete ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                    <FileText className={`h-3 w-3 ${isDocsComplete ? 'text-emerald-600' : 'text-amber-600'}`} />
                  </div>
              </CardHeader>
              <CardContent className="p-5 flex-1 flex flex-col">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-2 font-bold text-slate-700">
                    <span>Uploaded</span>
                    <span>{docProgress.uploadedCount} / {docProgress.totalRequired}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${isDocsComplete ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${(docProgress.uploadedCount / docProgress.totalRequired) * 100}%` }}
                    ></div>
                  </div>
                  
                  {isDocsComplete ? (
                    <div className="flex items-center justify-center gap-1.5 p-2 bg-emerald-50 rounded-xl border border-emerald-100 text-center w-full">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span className="text-[10px] font-black text-emerald-800 uppercase tracking-tight">Complete</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 text-center w-full">
                      <UploadCloud className="h-4 w-4 text-slate-400" />
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">Incomplete</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-4">
                    <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 uppercase font-black text-[9px] py-1 px-2">Manage</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* FULL 5-STAGE TIMELINE */}
        <Card id="timeline" className="overflow-hidden border border-slate-200 shadow-sm rounded-3xl scroll-mt-24">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-800">Application Timeline</CardTitle>
                <CardDescription className="font-medium text-slate-500">Track your progress from submission to financial distribution.</CardDescription>
              </div>
              <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                <Clock className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 px-8 pb-4">
            <div className="relative pl-6 border-l-2 border-slate-200 ml-3">
              {getTimelineSteps(currentApp, schedule, studentData.barangay).map((step) => (
                <div key={step.id} className={`mb-10 relative animate-fade-in ${step.state === "pending" ? "opacity-50 grayscale" : ""}`}>
                  <div className={`absolute -left-[35px] h-8 w-8 rounded-full flex items-center justify-center shadow-md border-4 border-white ${
                    step.state === "completed" ? "bg-emerald-500" : 
                    step.state === "current" ? (step.title === "Distribution Extended" ? "bg-purple-500 animate-pulse" : "bg-amber-400 animate-pulse") : 
                    step.state === "error" ? "bg-red-500" : "bg-slate-300"
                  }`}>
                    {step.state === "completed" ? <CheckCircle className="h-4 w-4 text-white" /> : 
                     step.state === "error" ? <XCircle className="h-4 w-4 text-white" /> : 
                     <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <div className="pb-1 pt-1">
                    <h3 className={`text-base font-black uppercase tracking-tight ${
                        step.state === "current" ? (step.title === "Distribution Extended" ? "text-purple-600" : "text-amber-600") : 
                        step.state === "error" ? "text-red-600" : "text-slate-800"
                    }`}>{step.title}</h3>
                    <p className="text-xs text-slate-500 font-bold tracking-widest uppercase mt-0.5">{step.date || "Pending"}</p>
                  </div>
                  <div className={`text-sm p-4 rounded-2xl border mt-3 font-medium ${
                      step.state === "current" ? (step.title === "Distribution Extended" ? "bg-purple-50 border-purple-100 text-purple-800 shadow-sm" : "bg-amber-50 border-amber-100 text-amber-800 shadow-sm") : 
                      step.state === "error" ? "bg-red-50 border-red-100 text-red-800 shadow-sm" :
                      "bg-slate-50 border-slate-100 text-slate-600"
                  }`}>{step.description}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </StudentLayout>
  )
}
