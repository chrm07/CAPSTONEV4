"use client"

import React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { hasPermission } from "@/lib/storage"
import { useToast } from "@/components/ui/use-toast"

interface PermissionGuardProps {
  children: React.ReactNode
  permission: string
  fallbackUrl?: string
}

export function PermissionGuard({ 
  children, 
  permission, 
  fallbackUrl = "/admin/dashboard" 
}: PermissionGuardProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!isLoading && user && user.role === "admin") {
      if (!hasPermission(user, permission)) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You don't have permission to access this page.",
        })
        router.push(fallbackUrl)
      }
    }
  }, [user, isLoading, permission, router, toast, fallbackUrl])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (!user || user.role !== "admin" || !hasPermission(user, permission)) {
    return null
  }

  return <>{children}</>
}
