"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Mail, Lock, ArrowLeft, Loader2, KeyRound, CheckCircle2, Eye, EyeOff } from "lucide-react"

// Firebase & EmailJS
import { collection, query, where, getDocs, doc, setDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import emailjs from '@emailjs/browser'

// 🔥 STRICT PASSWORD VALIDATOR
const validatePassword = (pass: string) => {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pass);
}

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  // Flow State
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [isLoading, setIsLoading] = useState(false)
  
  // Data State
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  // Real-time Validation State
  const [newPasswordError, setNewPasswordError] = useState("")
  const [confirmPasswordError, setConfirmPasswordError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Timer State
  const [countdown, setCountdown] = useState(0)

  // Handle Resend Cooldown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!email.trim()) return toast({ title: "Error", description: "Please enter your email.", variant: "destructive" })

    setIsLoading(true)
    try {
      const q = query(collection(db, "users"), where("email", "==", email.trim()))
      const snapshot = await getDocs(q)
      
      if (snapshot.empty) {
        toast({ title: "Error", description: "No account found with this email address.", variant: "destructive" })
        setIsLoading(false)
        return
      }

      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 5 * 60000)

      await setDoc(doc(db, "passwordResets", email.trim()), {
        otp: generatedOtp,
        expiresAt: expiresAt
      })

      await emailjs.send(
        "service_1zswz32", 
        "template_5k6w4fg", 
        { 
          to_email: email.trim(), 
          otp: generatedOtp 
        }, 
        "OvM52aClzpDmpMTeb"
      )

      toast({ title: "Code Sent!", description: "Please check your email for the 6-digit code.", className: "bg-emerald-600 text-white" })
      setStep(2)
      setCountdown(30)
    } catch (error) {
      console.error("OTP Error:", error)
      toast({ title: "Error", description: "Failed to send code. Please try again.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) return toast({ title: "Error", description: "Please enter a valid 6-digit code.", variant: "destructive" })

    setIsLoading(true)
    try {
      const docRef = doc(db, "passwordResets", email.trim())
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        toast({ title: "Error", description: "No reset request found. Please try again.", variant: "destructive" })
        setStep(1)
        return
      }

      const data = docSnap.data()
      const now = new Date()

      if (now > data.expiresAt.toDate()) {
        toast({ title: "Expired", description: "This code has expired. Please request a new one.", variant: "destructive" })
        return
      }

      if (data.otp !== otp) {
        toast({ title: "Invalid Code", description: "The code you entered is incorrect.", variant: "destructive" })
        return
      }

      toast({ title: "Verified", description: "Code verified successfully.", className: "bg-emerald-600 text-white" })
      setStep(3)
    } catch (error) {
      toast({ title: "Error", description: "Verification failed. Please try again.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Final strict check
    if (!validatePassword(newPassword)) {
      return toast({ title: "Error", description: "Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number.", variant: "destructive" })
    }
    if (newPassword !== confirmPassword) {
      return toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" })
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), newPassword }),
      })

      const result = await response.json()

      if (!response.ok) throw new Error(result.error)

      toast({ title: "Success!", description: "Your password has been reset. You can now log in.", className: "bg-emerald-600 text-white" })
      router.push("/login")
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update password.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50/50 p-4">
      <div className="w-full max-w-md relative z-10">
        
        <div className="mb-6 flex justify-center">
          <div className="h-16 w-16 bg-emerald-600 rounded-2xl shadow-lg flex items-center justify-center">
             <KeyRound className="h-8 w-8 text-white" />
          </div>
        </div>

        <Card className="rounded-3xl border-slate-200 shadow-xl bg-white overflow-hidden">
          <div className="h-2 bg-emerald-600" />
          
          {step === 1 && (
            <>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl font-black">Forgot Password</CardTitle>
                <CardDescription>Enter your email to receive a 6-digit verification code.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input 
                        type="email" 
                        placeholder="student@cvsu.edu.ph"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-12 h-12 rounded-xl"
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white font-bold">
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                    Send Code
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl font-black">Enter Code</CardTitle>
                <CardDescription>We sent a 6-digit code to <span className="font-bold text-slate-700">{email}</span></CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2 text-center">
                    <Input 
                      type="text" 
                      placeholder="••••••"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      className="h-16 text-center text-3xl font-black tracking-[0.5em] rounded-xl"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={isLoading || otp.length !== 6} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white font-bold">
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                    Verify Code
                  </Button>
                  <div className="text-center mt-4">
                    <button 
                      type="button" 
                      onClick={() => handleSendOtp()}
                      disabled={countdown > 0 || isLoading}
                      className="text-sm font-bold text-emerald-600 disabled:text-slate-400 hover:underline"
                    >
                      {countdown > 0 ? `Resend code in ${countdown}s` : "Resend Code"}
                    </button>
                  </div>
                </form>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl font-black">New Password</CardTitle>
                <CardDescription>Create a new, strong password for your account.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Must be at least 8 characters"
                        value={newPassword}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewPassword(val);
                          if (val.length > 0 && !validatePassword(val)) {
                            setNewPasswordError("Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number.");
                          } else {
                            setNewPasswordError("");
                          }
                          if (confirmPassword && val !== confirmPassword) {
                            setConfirmPasswordError("Passwords do not match.");
                          } else {
                            setConfirmPasswordError("");
                          }
                        }}
                        className={`pl-12 pr-12 h-12 rounded-xl font-medium bg-slate-50 border-slate-200 focus-visible:ring-emerald-500 [&::-ms-reveal]:hidden [&::-webkit-contacts-auto-fill-button]:hidden ${newPasswordError ? 'border-red-300 focus-visible:ring-red-500 bg-red-50/30' : ''}`}
                        disabled={isLoading}
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors">
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {newPasswordError && <p className="text-xs text-red-600 font-medium leading-tight ml-1">{newPasswordError}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Confirm Password</Label>
                    <div className="relative">
                      <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input 
                        type={showConfirmPassword ? "text" : "password"} 
                        placeholder="Repeat your new password"
                        value={confirmPassword}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfirmPassword(val);
                          if (val.length > 0 && val !== newPassword) {
                            setConfirmPasswordError("Passwords do not match.");
                          } else {
                            setConfirmPasswordError("");
                          }
                        }}
                        className={`pl-12 pr-12 h-12 rounded-xl font-medium bg-slate-50 border-slate-200 focus-visible:ring-emerald-500 [&::-ms-reveal]:hidden [&::-webkit-contacts-auto-fill-button]:hidden ${confirmPasswordError ? 'border-red-300 focus-visible:ring-red-500 bg-red-50/30' : ''}`}
                        disabled={isLoading}
                        required
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors">
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {confirmPasswordError && <p className="text-xs text-red-600 font-medium leading-tight ml-1">{confirmPasswordError}</p>}
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading || !!newPasswordError || !!confirmPasswordError || !newPassword || !confirmPassword} 
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white font-bold mt-2 shadow-md"
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                    Update Password
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          <CardFooter className="justify-center border-t border-slate-100 bg-slate-50/50 p-4">
            <Link href="/login" className="flex items-center text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Login
            </Link>
          </CardFooter>
        </Card>

      </div>
    </div>
  )
}