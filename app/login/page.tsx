"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { AlertCircle, Eye, EyeOff, GraduationCap, Shield, ArrowLeft } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

// Exact routing logic to their specific dashboards
const getRedirectPath = (userData: any) => {
  if (userData.role === "student") return "/student/dashboard"
  
  // Specific Admin Role Routing
  switch (userData.adminRole) {
    case "scanner_staff":
      return "/admin/scanner-dashboard" 
    case "verifier_staff":
      return "/admin/verifier-dashboard" 
    case "head_admin":
    default:
      return "/admin/dashboard" 
  }
}

export default function LoginPage() {
  const { user, login } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState({ email: "", password: "" })

  // Redirect if already logged in via session
  useEffect(() => {
    if (user) {
      const path = getRedirectPath(user)
      router.push(path)
    }
  }, [user, router])

  // Strictly >= 8 character validation
  const validateForm = () => {
    const newErrors = { email: "", password: "" }
    
    if (!email) {
      newErrors.email = "Email is required"
    }
    
    if (!password) {
      newErrors.password = "Password is required"
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long"
    }
    
    setErrors(newErrors)
    return !newErrors.email && !newErrors.password
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    setLoginError("")

    try {
      const loggedInUser = await login(email, password)

      if (!loggedInUser) {
        setLoginError("Invalid email or password. Please try again.")
        setIsLoading(false)
        return
      }

      toast({
        title: "Login successful",
        description: `Welcome back, ${loggedInUser.name}!`,
      })

      // Redirect based on specific admin role
      const dashboardPath = getRedirectPath(loggedInUser)
      router.push(dashboardPath)
      
    } catch (error) {
      setLoginError("An error occurred during login. Please try again.")
      setIsLoading(false)
    }
  }

  if (user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Branding Side (Green) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-emerald-600 to-emerald-700 relative overflow-hidden">
        
        {/* HIGH VISIBILITY Desktop Back Button */}
        <div className="absolute top-8 left-8 z-20">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition-all font-semibold shadow-sm border border-white/30 group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to landing page
          </Link>
        </div>

        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white w-full">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center border border-white/20">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">BTS Scholarship</h1>
                <p className="text-white/80 text-sm">Municipality of Carmona</p>
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-6 leading-tight">Empowering Students Through Education</h2>
            <p className="text-white/90 text-lg leading-relaxed max-w-md">Access your scholarship portal to manage applications and track your status.</p>
          </div>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center border border-white/20"><Shield className="w-6 h-6" /></div>
              <div><h3 className="font-semibold text-lg">Secure Access</h3><p className="text-white/80 text-sm">Industry-standard data protection</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* Login Side (White) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-slate-50 p-8 relative">
        
        {/* HIGH VISIBILITY Mobile Back Button */}
        <div className="absolute top-6 left-6 lg:hidden z-20">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-full transition-all font-semibold shadow-sm group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back
          </Link>
        </div>

        <div className="w-full max-w-md mt-8 lg:mt-0">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome Back</h2>
              <p className="text-slate-600">Sign in to your account</p>
            </div>

            {loginError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{loginError}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="h-12 rounded-xl" 
                  disabled={isLoading} 
                />
                {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Enter your password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="h-12 pr-12 rounded-xl [&::-ms-reveal]:hidden" 
                    disabled={isLoading} 
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" 
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5 text-slate-400" /> : <Eye className="h-5 w-5 text-slate-400" />}
                  </Button>
                </div>
                
                {/* 🔥 Connected to the new OTP Flow */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex-1">
                    {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
                  </div>
                  <Link 
                    href="/forgot-password"
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline shrink-0"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors mt-2">
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t text-center">
              <p className="text-slate-600">Don&apos;t have an account? <Link href="/register" className="text-emerald-600 font-semibold hover:underline">Create account</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}