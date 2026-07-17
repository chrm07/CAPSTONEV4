"use client"

import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/storage"

export function ManualRedirectButton() {
  const handleManualRedirect = () => {
    const user = getCurrentUser()
    if (!user) {
      console.log("No user found, cannot redirect")
      return
    }

    console.log("Manual redirect for user role:", user.role)

    if (user.role === "admin") {
      window.location.href = "/admin/dashboard"
    } else {
      window.location.href = "/student/dashboard"
    }
  }

  return (
    <Button onClick={handleManualRedirect} variant="outline" className="mt-2 w-full">
      Click here if not redirected automatically
    </Button>
  )
}
