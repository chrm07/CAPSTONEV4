"use client"

import React, { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Cropper from "react-easy-crop" 
import { getCroppedImg } from "@/lib/imageUtils" 
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, ArrowRight, CheckCircle, User, School, Lock, Mail, Eye, EyeOff, AlertTriangle, X, Upload, Loader2 } from "lucide-react"

import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

// --- TYPES & CONSTANTS ---
type FormData = {
  email: string
  studentPhoto: string 
  firstName: string
  middleName: string
  lastName: string
  address: string
  contactNumber: string
  age: string
  gender: string
  otherGender: string
  barangay: string
  school: string
  program: string
  otherProgram: string
  yearLevel: string
  semester: string 
  password: string
  confirmPassword: string
  isPWD: boolean
  acceptTerms: boolean 
}

const TOTAL_STEPS = 4;
const validatePassword = (pass: string) => {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pass);
}

// 🚨 Replace these with your Cloudinary details
const CLOUDINARY_CLOUD_NAME = "dwi1qb8we"; 
const CLOUDINARY_UPLOAD_PRESET = "bts_portal_docs"; 

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [emailValidated, setEmailValidated] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  
  const [barangaysList, setBarangaysList] = useState<string[]>([]);

  const [formData, setFormData] = useState<FormData>({
    email: "", studentPhoto: "", firstName: "", middleName: "", lastName: "",
    address: "", contactNumber: "", age: "", gender: "", otherGender: "",
    barangay: "", school: "", program: "", otherProgram: "", yearLevel: "",
    semester: "", password: "", confirmPassword: "", isPWD: false, acceptTerms: false, 
  });

  useEffect(() => {
    const docRef = doc(db, "settings", "barangays");
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().list) {
        const rawList = docSnap.data().list;
        const namesList: string[] = rawList.map((item: any) => {
          if (typeof item === "string") return item;
          if (item && typeof item.name === "string") return item.name;
          return String(item);
        });
        namesList.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        setBarangaysList(namesList);
      } else {
        setBarangaysList(["Barangay 1", "Barangay 2", "Barangay 3"]);
      }
    });

    return () => unsubscribe();
  }, []);

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const uploadToCloudinary = async (base64Image: string): Promise<string> => {
    if (!base64Image.startsWith("data:image")) return base64Image;

    const data = new FormData();
    data.append("file", base64Image);
    data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: data,
    });
    
    if (!res.ok) throw new Error("Failed to upload image to Cloudinary.");
    const json = await res.json();
    return json.secure_url; 
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
        toast({ title: "File too large", description: "Please upload an image smaller than 5MB", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const saveCroppedImage = async () => {
    try {
      if (imageToCrop && croppedAreaPixels) {
        const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
        updateField("studentPhoto", croppedImage);
        setImageToCrop(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const validateEmail = async () => {
    const cleanEmail = formData.email.trim().toLowerCase();
    
    if (!cleanEmail) {
      setErrors({ email: "Please enter your email address" });
      toast({ variant: "destructive", title: "Email required", description: "Please enter your email address" });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrors({ email: "Please enter a valid email address" });
      toast({ variant: "destructive", title: "Invalid email", description: "Please enter a valid email address" });
      return false;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_email", email: cleanEmail }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        let errorMessage = data.error || "Verification failed";
        if (errorMessage.toLowerCase().includes("already")) errorMessage = "Email already registered";
        else if (errorMessage.toLowerCase().includes("authorized") || errorMessage.toLowerCase().includes("approved")) errorMessage = "Your email is not approved";

        setErrors({ email: errorMessage });
        toast({ variant: "destructive", title: "Verification Failed", description: errorMessage });
        setIsLoading(false);
        return false;
      }
      
      setEmailValidated(true);
      setErrors({ email: "" });
      setIsLoading(false);
      return true;
      
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to verify email with the server." });
      setIsLoading(false);
      return false;
    }
  };

  const validateCurrentStep = async () => {
    if (step === 0) return await validateEmail();

    const newErrors: Partial<FormData> = {};
    let isValid = true;

    if (step === 1) {
      const requiredFields: (keyof FormData)[] = ["studentPhoto", "firstName", "lastName", "address", "contactNumber", "age", "gender", "barangay"];
      requiredFields.forEach((field) => {
        if (!formData[field] || String(formData[field]).trim() === "") {
          newErrors[field] = "This field is required";
          isValid = false;
        }
      });
      
      if (formData.contactNumber) {
        if (formData.contactNumber.length !== 10) {
          newErrors.contactNumber = "Mobile number must be exactly 10 digits";
          isValid = false;
        } else if (!formData.contactNumber.startsWith("9")) {
          newErrors.contactNumber = "Mobile number must start with 9";
          isValid = false;
        }
      }

      if (formData.gender === "Others" && (!formData.otherGender || formData.otherGender.trim() === "")) {
        newErrors.otherGender = "Please specify your gender";
        isValid = false;
      }
    }

    if (step === 2) {
      const requiredFields: (keyof FormData)[] = ["school", "program", "yearLevel", "semester"];
      requiredFields.forEach((field) => {
        if (!formData[field] || String(formData[field]).trim() === "") {
          newErrors[field] = "This field is required";
          isValid = false;
        }
      });
      if (formData.program === "Other" && (!formData.otherProgram || formData.otherProgram.trim() === "")) {
        newErrors.otherProgram = "Please specify your program";
        isValid = false;
      }
    }

    if (step === 3) {
      if (!formData.password || !validatePassword(formData.password)) {
        newErrors.password = "Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number.";
        isValid = false;
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
        isValid = false;
      }
      if (!formData.acceptTerms) {
        toast({ variant: "destructive", title: "Terms and Conditions required", description: "You must agree to the Terms of Service and Privacy Policy to create an account." });
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) { 
      handleNext(); 
      return; 
    }
    
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    setIsLoading(true);
    try {
      // 1. Upload Base64 image to Cloudinary to get a short URL
      const photoUrl = await uploadToCloudinary(formData.studentPhoto);

      // 2. Submit clean payload to API
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentPhoto: photoUrl, 
          firstName: formData.firstName,
          middleName: formData.middleName,
          lastName: formData.lastName,
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          address: formData.address,
          contactNumber: formData.contactNumber ? `+63${formData.contactNumber}` : "", 
          age: formData.age,
          gender: formData.gender === "Others" ? formData.otherGender : formData.gender,
          barangay: formData.barangay,
          schoolName: formData.school,
          program: formData.program === "Other" ? formData.otherProgram : formData.program,
          yearLevel: formData.yearLevel,
          semester: formData.semester, 
          isPWD: formData.isPWD, 
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Registration failed");

      toast({ title: "Registration successful", description: "Your account has been created. Please login.", variant: "success" });
      setTimeout(() => router.push("/login"), 2000);
      
    } catch (error: any) {
      const errorMsg = error.message?.toLowerCase() || "";
      const isDuplicate = errorMsg.includes("already");
      const isUnapproved = errorMsg.includes("authorized") || errorMsg.includes("approved");
      
      if (isDuplicate || isUnapproved) {
        setStep(0);
        setEmailValidated(false);
      }
      
      let finalMessage = error.message || "An error occurred during registration. Please try again.";
      if (isDuplicate) finalMessage = "Email already registered";
      else if (isUnapproved) finalMessage = "Your email is not approved";

      toast({ variant: "destructive", title: "Registration failed", description: finalMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const progressPercentage = (step / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      
      {imageToCrop && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-800">Crop Profile Photo</h3>
              <button onClick={() => setImageToCrop(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
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
                <Button variant="outline" className="flex-1 bg-white hover:bg-slate-100" onClick={() => setImageToCrop(null)}>Cancel</Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={saveCroppedImage}>Apply Photo</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="w-full bg-green-600 shadow-xl">
        <div className="container flex h-16 items-center px-4 md:px-8">
          <Link href="/" className="flex items-center space-x-2 text-white hover:text-green-100 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-medium">Back to Home</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 md:p-6 lg:p-8">
        <div className="w-full max-w-5xl">
          <div className="bg-white rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
            
            <div className="h-3 bg-slate-200">
              <div className="h-full bg-green-500 transition-all duration-700" style={{ width: `${progressPercentage}%` }} />
            </div>

            <div className="px-8 py-8 text-center bg-green-600 text-white">
              <div className="flex items-center justify-center gap-6">
                <div className="flex items-center gap-3">
                  <img src="/images/image.png" alt="City of Carmona Logo" className="h-12 w-12 rounded-full object-contain" />
                </div>
                <div className="hidden sm:inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full">
                  {step === 0 && <Mail className="w-8 h-8 text-white" />}
                  {step === 1 && <User className="w-8 h-8 text-white" />}
                  {step === 2 && <School className="w-8 h-8 text-white" />}
                  {step === 3 && <Lock className="w-8 h-8 text-white" />}
                </div>
                <div className="text-left">
                  <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-white">Join Our Program</h1>
                  <p className="text-white/90 text-sm sm:text-base">Create your scholarship account</p>
                </div>
                <div className="hidden sm:flex items-center space-x-2">
                  <span className="text-lg font-semibold text-white">Step {step + 1}</span>
                  <span className="text-white/80">/</span>
                  <span className="text-white/80">{TOTAL_STEPS}</span>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <Card className="border-0 shadow-none bg-transparent">
                
                {step > 0 && (
                  <CardHeader className="pb-6 px-0">
                    <CardTitle className="text-xl text-center text-slate-800">
                      {step === 1 && "Personal Information"}
                      {step === 2 && "Educational Information"}
                      {step === 3 && "Account Credentials"}
                    </CardTitle>
                    <CardDescription className="text-center text-slate-600">
                      {step === 1 && "Enter your personal details below."}
                      {step === 2 && "Tell us about your current education status."}
                      {step === 3 && "Secure your account with a password."}
                    </CardDescription>
                  </CardHeader>
                )}

                <CardContent className="px-0">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {step === 0 && (
                      <div className="space-y-2 max-w-md mx-auto pt-6">
                        <Label htmlFor="email" className="flex items-center gap-1">
                          Email Address
                          {emailValidated && <CheckCircle className="h-4 w-4 text-green-500" />}
                        </Label>
                        <Input id="email" type="email" placeholder="name@example.com" value={formData.email} onChange={(e) => updateField("email", e.target.value)} className="h-12 rounded-xl" />
                        <p className="text-sm text-slate-600">Only pre-approved emails can register for the scholarship program.</p>
                        {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                      </div>
                    )}

                    {step === 1 && (
                      <div className="space-y-6">
                        {emailValidated && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-700">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">Email entered: {formData.email}</span>
                          </div>
                        )}

                        <div className="flex flex-col lg:flex-row gap-8 items-start">
                          <div className="w-full lg:w-1/3 shrink-0 flex flex-col gap-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center shadow-sm">
                              <h3 className="text-sm font-semibold text-slate-700 mb-4">Profile Picture</h3>
                              
                              <div className="relative w-32 h-32 rounded-full border-4 border-green-500 bg-white overflow-hidden flex items-center justify-center mb-5 shadow-md group cursor-pointer">
                                {formData.studentPhoto ? (
                                  <img src={formData.studentPhoto} className="w-full h-full object-cover" alt="Student profile" />
                                ) : (
                                  <User className="h-12 w-12 text-slate-300" />
                                )}
                                <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
                                  <Upload className="text-white h-6 w-6 mb-1" />
                                  <span className="text-white text-[10px] font-semibold">Upload</span>
                                  <input id="photo-upload-overlay" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                                </label>
                              </div>
                              
                              <Label htmlFor="photo-upload-btn" className="cursor-pointer bg-green-600 text-white px-4 py-2.5 rounded-full hover:bg-green-700 transition-colors text-xs font-semibold shadow-sm w-full text-center">
                                {formData.studentPhoto ? "Change Photo" : "Upload Photo"}
                              </Label>
                              <input id="photo-upload-btn" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                              
                              {errors.studentPhoto && <p className="text-sm text-red-600 font-medium mt-3 text-center">{errors.studentPhoto}</p>}
                            </div>

                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-sm">
                              <div className="flex items-center gap-2 mb-2 text-amber-600">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span className="text-sm font-bold">Mandatory</span>
                              </div>
                              <p className="text-xs text-amber-800 leading-relaxed">
                                Use your own face. We verify this during QR scanning for financial distribution. Incorrect photos may affect your assistance.
                              </p>
                            </div>
                          </div>

                          <div className="w-full lg:w-2/3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              
                              <div className="space-y-2 md:col-span-2">
                                <Label>Full Name</Label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="space-y-1">
                                    <Input placeholder="First Name" value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} className="h-11 rounded-xl" />
                                    {errors.firstName && <p className="text-xs text-red-600">{errors.firstName}</p>}
                                  </div>
                                  <div className="space-y-1">
                                    <Input placeholder="Middle Name (Optional)" value={formData.middleName} onChange={(e) => updateField("middleName", e.target.value)} className="h-11 rounded-xl" />
                                  </div>
                                  <div className="space-y-1">
                                    <Input placeholder="Last Name" value={formData.lastName} onChange={(e) => updateField("lastName", e.target.value)} className="h-11 rounded-xl" />
                                    {errors.lastName && <p className="text-xs text-red-600">{errors.lastName}</p>}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="contactNumber">Contact Number</Label>
                                <div className="relative flex items-center">
                                  <span className="absolute left-4 text-slate-500 font-bold text-sm pointer-events-none">+63</span>
                                  <Input 
                                    id="contactNumber" 
                                    type="tel" 
                                    placeholder="9123456789" 
                                    value={formData.contactNumber} 
                                    onChange={(e) => {
                                      let val = e.target.value.replace(/[^0-9]/g, ""); 
                                      if (val.startsWith("0") && val.length > 1) {
                                        val = val.substring(1);
                                      }
                                      updateField("contactNumber", val.slice(0, 10)); 
                                    }} 
                                    className="pl-12 h-11 rounded-xl font-medium" 
                                  />
                                </div>
                                {errors.contactNumber && <p className="text-sm text-red-600 font-medium">{errors.contactNumber}</p>}
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="age">Age</Label>
                                <Input id="age" type="number" placeholder="18" value={formData.age} onChange={(e) => updateField("age", e.target.value)} className="h-11 rounded-xl" min="16" max="30" />
                                {errors.age && <p className="text-sm text-red-600">{errors.age}</p>}
                              </div>

                              <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="address">Address</Label>
                                <Input id="address" placeholder="123 Main St, City" value={formData.address} onChange={(e) => updateField("address", e.target.value)} className="h-11 rounded-xl" />
                                {errors.address && <p className="text-sm text-red-600">{errors.address}</p>}
                              </div>

                              <div className="space-y-2">
                                <Label>Gender</Label>
                                <Select value={formData.gender} onValueChange={(value) => updateField("gender", value)}>
                                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select gender" /></SelectTrigger>
                                  <SelectContent position="popper">
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Others">Others</SelectItem>
                                  </SelectContent>
                                </Select>
                                {errors.gender && <p className="text-sm text-red-600">{errors.gender}</p>}
                              </div>

                              {formData.gender === "Others" && (
                                <div className="space-y-2 md:col-span-2">
                                  <Label htmlFor="otherGender">Specify your Gender</Label>
                                  <Input id="otherGender" placeholder="Please type your gender" value={formData.otherGender} onChange={(e) => updateField("otherGender", e.target.value)} className="h-11 rounded-xl" />
                                  {errors.otherGender && <p className="text-sm text-red-600">{errors.otherGender}</p>}
                                </div>
                              )}

                              <div className="space-y-2">
                                <Label>Barangay</Label>
                                <Select value={formData.barangay} onValueChange={(value) => updateField("barangay", value)}>
                                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select barangay" /></SelectTrigger>
                                  <SelectContent position="popper" className="max-h-[250px] overflow-y-auto">
                                    {barangaysList.map((b) => (
                                      <SelectItem key={String(b)} value={String(b)}>{String(b)}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {errors.barangay && <p className="text-sm text-red-600">{errors.barangay}</p>}
                              </div>

                              <div className="space-y-2 md:col-span-2 mt-2">
                                <Label>Disability Status</Label>
                                <div className="flex items-center gap-3 h-12 px-4 border rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => updateField("isPWD", !formData.isPWD)}>
                                  <input type="checkbox" id="isPWD" checked={formData.isPWD} onChange={(e) => updateField("isPWD", e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-600 pointer-events-none" />
                                  <Label htmlFor="isPWD" className="text-sm font-normal cursor-pointer w-full pointer-events-none">Yes, I am a Person with Disability (PWD)</Label>
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="school">School Name</Label>
                          <Input id="school" placeholder="University of Example" value={formData.school} onChange={(e) => updateField("school", e.target.value)} className="h-12 rounded-xl" />
                          {errors.school && <p className="text-sm text-red-600">{errors.school}</p>}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label>Program</Label>
                          <Select value={formData.program} onValueChange={(value) => updateField("program", value)}>
                            <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select your program" /></SelectTrigger>
                            <SelectContent position="popper" className="max-h-[250px] overflow-y-auto">
                              <SelectItem value="BS Information Technology">BS Information Technology</SelectItem>
                              <SelectItem value="BS Computer Science">BS Computer Science</SelectItem>
                              <SelectItem value="BS Business Administration">BS Business Administration</SelectItem>
                              <SelectItem value="BS Accountancy">BS Accountancy</SelectItem>
                              <SelectItem value="BS Hospitality Management">BS Hospitality Management</SelectItem>
                              <SelectItem value="BS Tourism Management">BS Tourism Management</SelectItem>
                              <SelectItem value="Bachelor of Elementary Education">Bachelor of Elementary Education</SelectItem>
                              <SelectItem value="Bachelor of Secondary Education">Bachelor of Secondary Education</SelectItem>
                              <SelectItem value="BS Civil Engineering">BS Civil Engineering</SelectItem>
                              <SelectItem value="BS Electrical Engineering">BS Electrical Engineering</SelectItem>
                              <SelectItem value="BS Mechanical Engineering">BS Mechanical Engineering</SelectItem>
                              <SelectItem value="BS Computer Engineering">BS Computer Engineering</SelectItem>
                              <SelectItem value="BS Architecture">BS Architecture</SelectItem>
                              <SelectItem value="BS Nursing">BS Nursing</SelectItem>
                              <SelectItem value="BS Psychology">BS Psychology</SelectItem>
                              <SelectItem value="BS Criminology">BS Criminology</SelectItem>
                              <SelectItem value="BA Communication">BA Communication</SelectItem>
                              <SelectItem value="BA Political Science">BA Political Science</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.program && <p className="text-sm text-red-600">{errors.program}</p>}
                        </div>

                        {formData.program === "Other" && (
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="otherProgram">Specify your Program</Label>
                            <Input id="otherProgram" placeholder="Please type your full program name" value={formData.otherProgram} onChange={(e) => updateField("otherProgram", e.target.value)} className="h-12 rounded-xl" />
                            {errors.otherProgram && <p className="text-sm text-red-600">{errors.otherProgram}</p>}
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>Year Level</Label>
                          <Select value={formData.yearLevel} onValueChange={(value) => updateField("yearLevel", value)}>
                            <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select year" /></SelectTrigger>
                            <SelectContent position="popper">
                              <SelectItem value="1st Year">1st Year</SelectItem>
                              <SelectItem value="2nd Year">2nd Year</SelectItem>
                              <SelectItem value="3rd Year">3rd Year</SelectItem>
                              <SelectItem value="4th Year">4th Year</SelectItem>
                              <SelectItem value="5th Year">5th Year</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.yearLevel && <p className="text-sm text-red-600">{errors.yearLevel}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label>Semester</Label>
                          <Select value={formData.semester} onValueChange={(value) => updateField("semester", value)}>
                            <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select semester" /></SelectTrigger>
                            <SelectContent position="popper">
                              <SelectItem value="1st Semester">1st Semester</SelectItem>
                              <SelectItem value="2nd Semester">2nd Semester</SelectItem>
                              <SelectItem value="Summer">Summer</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.semester && <p className="text-sm text-red-600">{errors.semester}</p>}
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="space-y-6 max-w-2xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                              <Input 
                                id="password" 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Create your password" 
                                value={formData.password} 
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateField("password", val);
                                  if (val.length > 0 && !validatePassword(val)) {
                                    setErrors(prev => ({ ...prev, password: "Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number." }));
                                  } else {
                                    setErrors(prev => ({ ...prev, password: "" }));
                                  }
                                }} 
                                className={`h-12 rounded-xl pr-12 [&::-ms-reveal]:hidden [&::-webkit-contacts-auto-fill-button]:hidden ${errors.password ? 'border-red-300 focus-visible:ring-red-500' : ''}`} 
                              />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-600 transition-colors">
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                              </button>
                            </div>
                            {errors.password && <p className="text-xs text-red-600 font-medium leading-tight">{errors.password}</p>}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <div className="relative">
                              <Input 
                                id="confirmPassword" 
                                type={showConfirmPassword ? "text" : "password"} 
                                placeholder="Confirm your password" 
                                value={formData.confirmPassword} 
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateField("confirmPassword", val);
                                  if (val.length > 0 && val !== formData.password) {
                                    setErrors(prev => ({ ...prev, confirmPassword: "Passwords do not match." }));
                                  } else {
                                    setErrors(prev => ({ ...prev, confirmPassword: "" }));
                                  }
                                }} 
                                className={`h-12 rounded-xl pr-12 [&::-ms-reveal]:hidden [&::-webkit-contacts-auto-fill-button]:hidden ${errors.confirmPassword ? 'border-red-300 focus-visible:ring-red-500' : ''}`} 
                              />
                              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-600 transition-colors">
                                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                              </button>
                            </div>
                            {errors.confirmPassword && <p className="text-xs text-red-600 font-medium leading-tight">{errors.confirmPassword}</p>}
                          </div>
                        </div>

                        <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-xl border border-green-100">
                          <Checkbox id="acceptTerms" checked={formData.acceptTerms} onCheckedChange={(checked) => updateField("acceptTerms", checked as boolean)} className="mt-1 border-green-600 data-[state=checked]:bg-green-600" />
                          <div className="space-y-1">
                            <Label htmlFor="acceptTerms" className="text-sm font-medium leading-relaxed cursor-pointer text-slate-700">
                              I agree to the <Link href="/terms" target="_blank" className="text-green-600 hover:text-green-700 underline font-semibold">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="text-green-600 hover:text-green-700 underline font-semibold">Privacy Policy</Link>.
                            </Label>
                            <p className="text-xs text-slate-500">By checking this box, you acknowledge that you have read and understood our terms and privacy policy.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="w-full pt-8 border-t border-slate-100 mt-8">
                      {step > 0 ? (
                        <Button type="button" variant="outline" onClick={handlePrevious} className="flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-transparent border-slate-300 text-slate-600 hover:bg-slate-50">
                          <ArrowLeft className="h-4 w-4" /> Previous
                        </Button>
                      ) : (
                        <div aria-hidden="true" style={{ width: '120px' }}></div>
                      )}

                      {step < 3 ? (
                        <Button type="button" onClick={handleNext} disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 h-12 px-8 rounded-xl shadow-md transition-all hover:shadow-lg">
                          {isLoading && step === 0 ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                          {isLoading && step === 0 ? "Verifying..." : step === 0 ? "Verify Email" : "Next"}
                          {!isLoading && <ArrowRight className="h-4 w-4" />}
                        </Button>
                      ) : (
                        <Button type="submit" disabled={isLoading || !!errors.password || !!errors.confirmPassword} className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 h-12 px-8 rounded-xl shadow-md transition-all hover:shadow-lg">
                          {isLoading ? (
                            <>
                              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                              Creating Account...
                            </>
                          ) : (
                            <>Create Account <ArrowRight className="h-4 w-4" /></>
                          )}
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>

                <CardFooter className="flex flex-col items-center space-y-4 pt-8 px-0">
                  <div className="text-sm text-center text-slate-500">
                    Already have an account? <Link href="/login" className="text-green-600 hover:text-green-700 font-semibold transition-colors ml-1">Sign in here</Link>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
