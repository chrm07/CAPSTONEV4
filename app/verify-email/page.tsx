"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"

const verificationSchema = z.object({
  code: z.string().min(6, { message: "Verification code must be at least 6 characters" }),
})

export default function VerifyEmailPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)

  const form = useForm<z.infer<typeof verificationSchema>>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      code: "",
    },
  })

  async function onSubmit(values: z.infer<typeof verificationSchema>) {
    setIsLoading(true)
    try {
      // Here you would typically make an API call to verify the code
      // For now, we'll just simulate a successful verification

      toast({
        title: "Email verified",
        description: "Your email has been verified successfully.",
      })

      // Redirect to login page
      router.push("/login")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: "Invalid verification code. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function resendVerificationCode() {
    setIsResending(true)
    try {
      // Here you would typically make an API call to resend the verification code
      // For now, we'll just simulate a successful resend

      toast({
        title: "Verification code sent",
        description: "A new verification code has been sent to your email.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to resend",
        description: "An error occurred while resending the verification code. Please try again.",
      })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Verify your email</h1>
          <p className="text-sm text-muted-foreground">We&apos;ve sent a verification code to your email</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Email Verification</CardTitle>
            <CardDescription>Enter the verification code sent to your email</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                        <Input placeholder="123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Verifying..." : "Verify Email"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center">
              Didn&apos;t receive a code?{" "}
              <Button variant="link" className="p-0 h-auto" onClick={resendVerificationCode} disabled={isResending}>
                {isResending ? "Sending..." : "Resend"}
              </Button>
            </div>
            <div className="text-sm text-center">
              <Link href="/login" className="text-primary underline underline-offset-4 hover:text-primary/90">
                Back to login
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
