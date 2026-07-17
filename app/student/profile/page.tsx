"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { StudentLayout } from "@/components/student-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  GraduationCap, 
  Mail,
  ClipboardList,
  ShieldCheck,
  Loader2,
  Lock,
  Camera,
  AlertCircle,
  X,
  Eye,
  EyeOff
} from "lucide-react"

// Cropper Imports
import Cropper from "react-easy-crop"
import { getCroppedImg } from "@/lib/imageUtils"

// Firebase imports
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { updateUserPassword } from "@/lib/storage"

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" }
]

const PROGRAM_OPTIONS = [
  "BS Information Technology",
  "BS Computer Science",
  "BS Business Administration",
  "BS Accountancy",
  "BS Hospitality Management",
  "BS Tourism Management",
  "Bachelor of Elementary Education",
  "Bachelor of Secondary Education",
  "BS Civil Engineering",
  "BS Electrical Engineering",
  "BS Mechanical Engineering",
  "BS Computer Engineering",
  "BS Architecture",
  "BS Nursing",
  "BS Psychology",
  "BS Criminology",
  "BA Communication",
  "BA Political Science",
  "Other"
].map(c => ({ value: c, label: c }))

const YEAR_OPTIONS = [
  "1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"
].map(y => ({ value: y, label: y }))

const SEMESTER_OPTIONS = [
  "1st Semester", "2nd Semester", "Summer"
].map(s => ({ value: s, label: s }))

// 🔥 STRICT PASSWORD VALIDATOR
const validatePassword = (pass: string) => {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pass);
}

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("info")
  
  const [isFetchingProfile, setIsFetchingProfile] = useState(true)
  const [isFetchingBarangays, setIsFetchingBarangays] = useState(true)
  
  const [isUpdating, setIsUpdating] = useState(false)
  const [isSavingInfo, setIsSavingInfo] = useState(false)
  const [isSavingAcad, setIsSavingAcad] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [newPasswordError, setNewPasswordError] = useState("")
  const [confirmPasswordError, setConfirmPasswordError] = useState("")

  const [barangayOptions, setBarangayOptions] = useState<{label: string, value: string}[]>([])

  const [personalInfo, setPersonalInfo] = useState({
    fullName: "",
    email: "",
    contactNumber: "",
    address: "",
    barangay: "",
    age: "",
    gender: "",
    customGender: "",
    studentPhoto: "",
  })

  const [educationInfo, setEducationInfo] = useState({
    schoolName: "",
    program: "",
    customProgram: "",
    yearLevel: "",
    semester: "",
  })

  const [passwords, setPasswords] = useState({ 
    current: "", 
    new: "", 
    confirm: "" 
  })

  useEffect(() => {
    let unsubscribeUser: () => void;
    let unsubscribeBarangays: () => void;

    if (user?.id) {
      const userRef = doc(db, "users", user.id);
      unsubscribeUser = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          const p = userData.profileData || {};
          
          const searchData = { ...userData, ...p };
          let rawProgram = "";
          let rawYear = "";
          let rawSemester = "";
          let rawGender = "";

          for (const key in searchData) {
            const lowerKey = key.toLowerCase();
            const val = typeof searchData[key] === 'string' ? searchData[key].trim() : "";
            
            if (!val) continue;

            if (lowerKey === 'program' || lowerKey === 'course') {
              if (!rawProgram) rawProgram = val; 
            } else if (lowerKey === 'yearlevel') {
              rawYear = val;
            } else if (lowerKey === 'semester') {
              rawSemester = val;
            } else if (lowerKey === 'gender') {
              rawGender = val;
            }
          }

          setPersonalInfo({
            fullName: p.fullName || "",
            email: p.email || userData.email || "",
            contactNumber: p.contactNumber || "",
            address: p.address || "",
            barangay: (p.barangay || "").trim(),
            age: p.age || "",
            gender: rawGender,
            customGender: p.customGender || "",
            studentPhoto: p.studentPhoto || p.profilePicture || "", 
          });

          setEducationInfo({
            schoolName: p.schoolName || "",
            program: rawProgram,
            customProgram: p.customProgram || p.customCourse || "", 
            yearLevel: rawYear,
            semester: rawSemester,
          });
        }
        setIsFetchingProfile(false);
      });

      const barangaysRef = doc(db, "settings", "barangays");
      unsubscribeBarangays = onSnapshot(barangaysRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().list) {
          const rawList = docSnap.data().list;
          const mapped = rawList.map((b: any) => {
            const name = typeof b === "string" ? b : b.name;
            return { label: name, value: name };
          });
          mapped.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' }));
          setBarangayOptions(mapped);
        }
        setIsFetchingBarangays(false);
      });
    } else {
      setIsFetchingProfile(false);
      setIsFetchingBarangays(false);
    }

    return () => {
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeBarangays) unsubscribeBarangays();
    }
  }, [user])

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
        toast({ title: "File too large", description: "Max image size is 5MB.", variant: "destructive" })
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setImageToCrop(reader.result as string) 
      }
      reader.readAsDataURL(file)
    }
    e.target.value = "" 
  }

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const uploadCroppedImage = async () => {
    if (!imageToCrop || !croppedAreaPixels || !user) return;
    setIsUploadingPhoto(true);

    try {
      const croppedImageBase64 = await getCroppedImg(imageToCrop, croppedAreaPixels);

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
      const formData = new FormData()
      formData.append("file", croppedImageBase64) 
      formData.append("upload_preset", uploadPreset || "")
      formData.append("folder", `bts_portal/profiles/${user.id}`)

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body: formData })
      const data = await res.json()

      if (data.secure_url) {
         const userRef = doc(db, "users", user.id)
         const userSnap = await getDoc(userRef)
         const existingProfile = userSnap.exists() ? userSnap.data().profileData || {} : {}

         await updateDoc(userRef, {
           profileData: { ...existingProfile, studentPhoto: data.secure_url, profilePicture: data.secure_url }
         })

         setPersonalInfo(prev => ({...prev, studentPhoto: data.secure_url}))
         toast({ title: "Success", description: "Profile picture updated successfully.", className: "bg-emerald-600 text-white border-none" })
      }
      setImageToCrop(null);
    } catch (error) {
       toast({ title: "Upload Failed", description: "Could not upload image. Please try again.", variant: "destructive" })
    } finally {
       setIsUploadingPhoto(false)
    }
  }

  const handleSaveInfo = async () => {
    if (!user) return
    setIsSavingInfo(true)
    try {
      const userRef = doc(db, "users", user.id)
      const userSnap = await getDoc(userRef)
      const existingProfile = userSnap.exists() ? userSnap.data().profileData || {} : {}

      const finalGender = personalInfo.gender === "Other" ? personalInfo.customGender : personalInfo.gender;

      await updateDoc(userRef, {
        profileData: { ...existingProfile, ...personalInfo, gender: finalGender }
      })
      toast({ title: "Profile Updated", description: "Your personal information has been saved.", className: "bg-emerald-600 text-white border-none" })
    } catch(e) {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" })
    } finally {
      setIsSavingInfo(false)
    }
  }

  const handleSaveAcademics = async () => {
    if (!user) return
    setIsSavingAcad(true)
    try {
      const userRef = doc(db, "users", user.id)
      const userSnap = await getDoc(userRef)
      const existingProfile = userSnap.exists() ? userSnap.data().profileData || {} : {}

      const finalProgram = educationInfo.program === "Other" ? educationInfo.customProgram : educationInfo.program;

      await updateDoc(userRef, {
        "profileData.program": finalProgram,
        "profileData.course": finalProgram,
        "profileData.customProgram": educationInfo.customProgram,
        "profileData.schoolName": educationInfo.schoolName,
        "profileData.yearLevel": educationInfo.yearLevel,
        "profileData.semester": educationInfo.semester
      })
      
      toast({ title: "Academics Updated", description: "Your academic profile has been saved.", className: "bg-emerald-600 text-white border-none" })
    } catch(e) {
      toast({ title: "Error", description: "Failed to update academics.", variant: "destructive" })
    } finally {
      setIsSavingAcad(false)
    }
  }

  const handlePasswordUpdate = async () => {
    if (!user) return
    
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      toast({ title: "Error", description: "Fill in all fields.", variant: "destructive" })
      return
    }
    
    if (!validatePassword(passwords.new)) {
      toast({ title: "Error", description: "Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number.", variant: "destructive" })
      return
    }

    if (passwords.new !== passwords.confirm) {
      toast({ title: "Error", description: "New passwords do not match.", variant: "destructive" })
      return
    }
    
    setIsUpdating(true)
    try {
      const result = await updateUserPassword(user.id, passwords.current, passwords.new)
      if (result.success) {
        toast({ title: "Success", description: "Password updated successfully.", className: "bg-emerald-600 text-white border-none" })
        setPasswords({ current: "", new: "", confirm: "" })
        setNewPasswordError("")
        setConfirmPasswordError("")
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" })
      }
    } finally {
      setIsUpdating(false)
    }
  }

  if (authLoading || isFetchingProfile || isFetchingBarangays) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!user) return null

  return (
    <StudentLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20 relative">
        
        {imageToCrop && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                <h3 className="font-semibold text-slate-800">Crop Profile Photo</h3>
                <button onClick={() => setImageToCrop(null)} className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50" disabled={isUploadingPhoto}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="relative w-full h-[300px] md:h-[400px] bg-slate-100">
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
              
              <div className="p-4 bg-slate-50 border-t flex flex-col gap-4">
                <p className="text-slate-500 text-xs text-center font-medium">Drag to move • Scroll to zoom</p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 bg-white hover:bg-slate-100" onClick={() => setImageToCrop(null)} disabled={isUploadingPhoto}>Cancel</Button>
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={uploadCroppedImage} disabled={isUploadingPhoto}>
                    {isUploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
                    {isUploadingPhoto ? "Uploading..." : "Apply & Upload"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-8 shadow-sm mt-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400 rounded-full filter blur-[100px] opacity-10 -mr-20 -mt-20"></div>
          
          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-8">
            
            <div className="flex flex-col items-center gap-4 shrink-0">
              <div 
                className="relative group cursor-pointer" 
                onClick={() => document.getElementById('photo-upload')?.click()}
              >
                <Avatar className="h-32 w-32 border-4 border-white shadow-lg ring-1 ring-slate-100">
                  <AvatarImage src={personalInfo.studentPhoto || undefined} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-5xl font-bold">
                    {personalInfo.fullName?.charAt(0) || "S"}
                  </AvatarFallback>
                </Avatar>
                
                <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Camera className="text-white h-8 w-8 mb-1" />
                  <span className="text-white text-[10px] font-black uppercase tracking-widest">Change</span>
                </div>
                
                {isUploadingPhoto && !imageToCrop && (
                   <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm">
                     <Loader2 className="text-emerald-400 h-8 w-8 animate-spin" />
                   </div>
                )}
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full text-xs font-bold shadow-sm h-8 px-4 border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50"
                onClick={() => document.getElementById('photo-upload')?.click()}
                disabled={isUploadingPhoto}
              >
                <Camera className="h-3 w-3 mr-2" /> Change Picture
              </Button>
              
              <input type="file" id="photo-upload" className="hidden" accept="image/*" onChange={handlePhotoSelect} disabled={isUploadingPhoto} />
            </div>

            <div className="flex-1 text-center sm:text-left pt-1">
              <h1 className="text-4xl font-black tracking-tight text-slate-900">
                {personalInfo.fullName || user.name || "Student Profile"}
              </h1>
              <p className="text-slate-500 font-medium flex items-center justify-center sm:justify-start gap-2 mt-2 text-lg">
                <Mail className="h-5 w-5 text-emerald-500" /> {personalInfo.email}
              </p>
              
              <div className="mt-4 inline-flex bg-amber-50 border border-amber-200 p-3 rounded-2xl items-start gap-3 shadow-sm max-w-lg text-left">
                 <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                 <p className="text-xs text-amber-800 font-bold leading-relaxed">
                   <span className="uppercase tracking-wider font-black mr-1">Photo Requirement:</span>
                   Use your own face. We verify this during QR scanning for financial distribution. Incorrect photos may affect your assistance.
                 </p>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          
          {/* FIX: Replaced scrolling with flex-1 and text wrapping so they fit on one line */}
          <TabsList className="flex w-full bg-transparent border-b border-slate-200 rounded-none h-auto p-0 gap-1 sm:gap-4">
            <TabsTrigger 
              value="info" 
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 px-1 py-3 text-[11px] leading-tight sm:text-base font-bold text-slate-500 transition-all mb-[-1px] whitespace-normal break-words text-center h-full"
            >
              Information
            </TabsTrigger>
            <TabsTrigger 
              value="academics" 
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 px-1 py-3 text-[11px] leading-tight sm:text-base font-bold text-slate-500 transition-all mb-[-1px] whitespace-normal break-words text-center h-full"
            >
              Academic Profile
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 px-1 py-3 text-[11px] leading-tight sm:text-base font-bold text-slate-500 transition-all mb-[-1px] whitespace-normal break-words text-center h-full"
            >
              Change Password
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="focus:outline-none">
            <Card className="border-slate-200 shadow-sm rounded-3xl bg-white overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
              <CardHeader className="pb-6 pt-8 px-6 md:px-8 border-b border-slate-100 bg-slate-50/30">
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                  <div className="p-2.5 bg-emerald-100 rounded-xl shrink-0">
                    <ClipboardList className="h-6 w-6 text-emerald-600" />
                  </div>
                  Personal Information
                </CardTitle>
                <CardDescription className="text-slate-500 font-medium text-base mt-2 md:ml-14">
                  Update your contact and residential details below.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  <EditableField label="Full Name" value={personalInfo.fullName} readOnly={true} />
                  <EditableField label="Email Address" value={personalInfo.email} readOnly={true} />
                  
                  <EditableField label="Mobile Number" value={personalInfo.contactNumber} onChange={(v) => setPersonalInfo({...personalInfo, contactNumber: v})} />
                  <EditableField label="Age" value={personalInfo.age} onChange={(v) => setPersonalInfo({...personalInfo, age: v})} />
                  
                  <EditableSelectField 
                    label="Gender" 
                    value={personalInfo.gender || ""} 
                    onChange={(v) => setPersonalInfo({...personalInfo, gender: v})}
                    options={GENDER_OPTIONS}
                  />

                  {personalInfo.gender === "Other" && (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                      <EditableField 
                        label="Please specify gender" 
                        value={personalInfo.customGender} 
                        onChange={(v) => setPersonalInfo({...personalInfo, customGender: v})} 
                      />
                    </div>
                  )}
                  
                  <EditableSelectField 
                    label="Assigned Barangay" 
                    value={personalInfo.barangay || ""} 
                    onChange={(v) => setPersonalInfo({...personalInfo, barangay: v})}
                    options={barangayOptions}
                  />
                  
                  <div className="md:col-span-2">
                    <EditableField label="Residential Address" value={personalInfo.address} onChange={(v) => setPersonalInfo({...personalInfo, address: v})} />
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100 mt-8 flex justify-end">
                  <Button 
                    onClick={handleSaveInfo} 
                    disabled={isSavingInfo} 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 px-8 font-black uppercase tracking-widest text-xs shadow-md w-full sm:w-auto"
                  >
                    {isSavingInfo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save Information
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="academics" className="focus:outline-none">
            <Card className="border-slate-200 shadow-sm rounded-3xl bg-white overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
              <CardHeader className="pb-6 pt-8 px-6 md:px-8 border-b border-slate-100 bg-slate-50/30">
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                  <div className="p-2.5 bg-emerald-100 rounded-xl shrink-0">
                    <GraduationCap className="h-6 w-6 text-emerald-600" />
                  </div>
                  Academic Profile
                </CardTitle>
                <CardDescription className="text-slate-500 font-medium text-base mt-2 md:ml-14">
                  Keep your educational background up to date.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  <EditableField 
                    label="School / University" 
                    value={educationInfo.schoolName} 
                    onChange={(v) => setEducationInfo({...educationInfo, schoolName: v})} 
                  />
                  
                  <EditableSelectField 
                    label="Program" 
                    value={educationInfo.program || ""} 
                    onChange={(v) => setEducationInfo({...educationInfo, program: v})} 
                    options={PROGRAM_OPTIONS}
                  />

                  {educationInfo.program === "Other" && (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                      <EditableField 
                        label="Please specify program" 
                        value={educationInfo.customProgram} 
                        onChange={(v) => setEducationInfo({...educationInfo, customProgram: v})} 
                      />
                    </div>
                  )}
                  
                  <EditableSelectField 
                    label="Current Year Level" 
                    value={educationInfo.yearLevel || ""} 
                    onChange={(v) => setEducationInfo({...educationInfo, yearLevel: v})} 
                    options={YEAR_OPTIONS}
                  />
                  
                  <EditableSelectField 
                    label="Current Semester" 
                    value={educationInfo.semester || ""} 
                    onChange={(v) => setEducationInfo({...educationInfo, semester: v})} 
                    options={SEMESTER_OPTIONS}
                  />
                </div>

                <div className="pt-8 border-t border-slate-100 mt-8 flex justify-end">
                  <Button 
                    onClick={handleSaveAcademics} 
                    disabled={isSavingAcad} 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 px-8 font-black uppercase tracking-widest text-xs shadow-md w-full sm:w-auto"
                  >
                    {isSavingAcad ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save Academics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="focus:outline-none">
            <Card className="border-slate-200 shadow-sm rounded-3xl bg-white overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
              <CardHeader className="pb-6 pt-8 px-6 md:px-8 border-b border-slate-100 bg-slate-50/30">
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                  <div className="p-2.5 bg-emerald-100 rounded-xl shrink-0">
                    <ShieldCheck className="h-6 w-6 text-emerald-600" />
                  </div>
                  Account Security
                </CardTitle>
                <CardDescription className="text-slate-500 font-medium text-base mt-2 md:ml-14">
                  Update your portal password. Ensure it is at least 8 characters long and includes an uppercase letter, lowercase letter, and a number.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <div className="max-w-3xl space-y-8">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    <div className="space-y-3">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Current Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input 
                          type={showCurrentPassword ? "text" : "password"} 
                          placeholder="Type your current password"
                          value={passwords.current} 
                          onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                          className="rounded-2xl h-14 border-slate-200 text-base focus-visible:ring-emerald-500 pl-12 pr-12 shadow-sm bg-white placeholder:text-slate-400 [&::-ms-reveal]:hidden"
                        />
                        <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors">
                          {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 pt-6 border-t border-slate-100">
                    <div className="space-y-3">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input 
                          type={showNewPassword ? "text" : "password"} 
                          placeholder="Create new password"
                          value={passwords.new} 
                          onChange={(e) => {
                            const val = e.target.value;
                            setPasswords({...passwords, new: val});
                            if (val.length > 0 && !validatePassword(val)) {
                              setNewPasswordError("Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number.");
                            } else {
                              setNewPasswordError("");
                            }
                            if (passwords.confirm && val !== passwords.confirm) {
                              setConfirmPasswordError("Passwords do not match.");
                            } else {
                              setConfirmPasswordError("");
                            }
                          }}
                          className={`rounded-2xl h-14 border-slate-200 text-base focus-visible:ring-emerald-500 pl-12 pr-12 shadow-sm bg-white placeholder:text-slate-400 [&::-ms-reveal]:hidden ${newPasswordError ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                        />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors">
                          {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {newPasswordError && <p className="text-xs text-red-600 font-medium leading-tight">{newPasswordError}</p>}
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input 
                          type={showConfirmPassword ? "text" : "password"} 
                          placeholder="Repeat your new password"
                          value={passwords.confirm} 
                          onChange={(e) => {
                            const val = e.target.value;
                            setPasswords({...passwords, confirm: val});
                            if (val.length > 0 && val !== passwords.new) {
                              setConfirmPasswordError("Passwords do not match.");
                            } else {
                              setConfirmPasswordError("");
                            }
                          }}
                          className={`rounded-2xl h-14 border-slate-200 text-base focus-visible:ring-emerald-500 pl-12 pr-12 shadow-sm bg-white placeholder:text-slate-400 [&::-ms-reveal]:hidden ${confirmPasswordError ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors">
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {confirmPasswordError && <p className="text-xs text-red-600 font-medium leading-tight">{confirmPasswordError}</p>}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 mt-2 flex justify-end">
                    <Button 
                      onClick={handlePasswordUpdate} 
                      disabled={isUpdating || !!newPasswordError || !!confirmPasswordError || !passwords.new || !passwords.confirm}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 px-8 font-black uppercase tracking-widest text-xs shadow-md w-full sm:w-auto"
                    >
                      {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Update Password
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </StudentLayout>
  )
}

function EditableField({ 
  label, 
  value, 
  onChange, 
  readOnly = false, 
  type = "text" 
}: { 
  label: string, 
  value: string, 
  onChange?: (val: string) => void, 
  readOnly?: boolean, 
  type?: string 
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1 flex items-center justify-between">
        {label}
        {readOnly && <Lock className="h-3 w-3 text-slate-300 mr-1" />}
      </Label>
      <Input 
        type={type}
        readOnly={readOnly}
        value={value || ""}
        onChange={(e) => onChange && onChange(e.target.value)}
        className={`rounded-2xl h-14 border-slate-200 text-base shadow-sm focus-visible:ring-offset-0 transition-colors ${
          readOnly 
            ? "bg-slate-50/70 cursor-not-allowed text-slate-500 font-medium focus-visible:ring-0" 
            : "bg-white text-slate-900 font-semibold focus-visible:ring-emerald-500 hover:border-emerald-300"
        }`}
      />
    </div>
  )
}

function EditableSelectField({ 
  label, 
  value, 
  onChange, 
  options 
}: { 
  label: string, 
  value: string, 
  onChange: (val: string) => void, 
  options: {label: string, value: string}[] 
}) {
  
  const safeValue = value && value.trim() !== "" ? value : undefined;
  const dynamicOptions = [...options];

  if (safeValue) {
    const isOptionExists = dynamicOptions.some(opt => opt.value === safeValue);
    if (!isOptionExists) {
      dynamicOptions.push({ label: safeValue, value: safeValue });
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1 flex items-center justify-between">
        {label}
      </Label>
      <Select value={safeValue} onValueChange={onChange}>
        <SelectTrigger className="rounded-2xl h-14 border-slate-200 text-base shadow-sm focus:ring-emerald-500 hover:border-emerald-300 bg-white text-slate-900 font-semibold data-[placeholder]:text-slate-500 transition-colors">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-slate-200 shadow-lg max-h-60">
          {dynamicOptions.map(opt => (
            <SelectItem 
              key={opt.value} 
              value={opt.value} 
              className="font-medium cursor-pointer focus:bg-emerald-50 focus:text-emerald-900 rounded-lg mx-1 my-1"
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
