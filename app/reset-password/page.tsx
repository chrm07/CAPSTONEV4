"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle, XCircle, Loader2, Eye, EyeOff } from "lucide-react"

// 🔥 STRICT PASSWORD REGEX: Min 8 chars, 1 uppercase, 1 lowercase, 1 number
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const resetPasswordSchema = z.object({
  password: z.string().regex(passwordRegex, { message: "Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number." }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
})

function ResetPasswordForm() {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [isValidToken, setIsValidToken] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [email, setEmail] = useState('')
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange", // 🔥 Enables real-time validation as the user types
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setIsVerifying(false)
        return
      }

      try {
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, action: 'verify' }),
        })

        const data = await response.json()
        setIsValidToken(data.valid)
        if (data.email) setEmail(data.email)
      } catch {
        setIsValidToken(false)
      } finally {
        setIsVerifying(false)
      }
    }

    verifyToken()
  }, [token])

  async function onSubmit(values: z.infer<typeof resetPasswordSchema>) {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: values.password,
          action: 'reset',
        }),
      })

      const data = await response.json()

      if (data.success) {
        setIsSuccess(true)
        toast({
          title: "Password reset successful",
          description: "You can now log in with your new password.",
          className: "bg-emerald-600 text-white border-none"
        })
      } else {
        throw new Error(data.error || 'Failed to reset password')
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to reset password",
        description: error instanceof Error ? error.message : "An error occurred. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isVerifying) {
    return (
      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
            <p className="text-sm font-bold tracking-widest uppercase text-slate-400">Verifying link...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!token || !isValidToken) {
    return (
      <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden">
        <div className="h-2 bg-red-500 w-full" />
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-red-50 p-3 mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="font-black text-xl text-slate-800 tracking-tight mb-2">Invalid Link</h3>
            <p className="text-slate-500 font-medium text-center mb-6">
              This password reset link is invalid or has expired.
            </p>
            <Link href="/forgot-password" className="w-full">
              <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 font-black">
                Request New Link
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isSuccess) {
    return (
      <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden">
        <div className="h-2 bg-emerald-500 w-full" />
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-emerald-50 p-3 mb-4 border border-emerald-100 shadow-inner">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <h3 className="font-black text-xl text-slate-800 tracking-tight mb-2">Password Reset Complete</h3>
            <p className="text-slate-500 font-medium text-center mb-6">
              Your password has been successfully updated.
            </p>
            <Link href="/login" className="w-full">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 font-black shadow-md">
                Go to Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden">
      <div className="h-2 bg-emerald-500 w-full" />
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
        <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Set New Password</CardTitle>
        <CardDescription className="font-medium text-slate-500 mt-1">
          {email ? `Resetting password for ${email}` : "Enter your new password below."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Must be at least 8 characters" 
                        {...field} 
                        className={`h-12 rounded-xl pr-12 font-medium bg-slate-50 border-slate-200 focus-visible:ring-emerald-500 [&::-ms-reveal]:hidden [&::-webkit-contacts-auto-fill-button]:hidden ${form.formState.errors.password ? 'border-red-300 focus-visible:ring-red-500 bg-red-50/30' : ''}`}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors">
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs font-bold text-red-600 ml-1" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showConfirmPassword ? "text" : "password"} 
                        placeholder="Repeat your new password" 
                        {...field} 
                        className={`h-12 rounded-xl pr-12 font-medium bg-slate-50 border-slate-200 focus-visible:ring-emerald-500 [&::-ms-reveal]:hidden [&::-webkit-contacts-auto-fill-button]:hidden ${form.formState.errors.confirmPassword ? 'border-red-300 focus-visible:ring-red-500 bg-red-50/30' : ''}`}
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors">
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs font-bold text-red-600 ml-1" />
                </FormItem>
              )}
            />
            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 font-black shadow-md" 
                disabled={isLoading || !form.formState.isValid}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center border-t border-slate-100 p-4 bg-slate-50/50">
        <div className="text-sm font-bold text-slate-500">
          <Link href="/login" className="text-emerald-600 hover:text-emerald-700 transition-colors">
            Back to login
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 p-4">
      <div className="w-full max-w-[450px] space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
             <img src="/images/image.png" alt="Logo" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Account Recovery</h1>
          <p className="text-sm font-medium text-slate-500">Securely set a new password for your account.</p>
        </div>

        <Suspense fallback={
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
                <p className="text-sm font-bold tracking-widest uppercase text-slate-400">Loading module...</p>
              </div>
            </CardContent>
          </Card>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}