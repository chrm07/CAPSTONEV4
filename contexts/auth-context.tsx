"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession, signIn, signOut, SessionProvider } from "next-auth/react"
import { getUserByEmailDb, type User } from "@/lib/storage"

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<User | null>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  
  const [fullUser, setFullUser] = useState<User | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [dbFetchAttempted, setDbFetchAttempted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function loadFullUserData() {
      if (session?.user?.email) {
        setIsFetching(true)
        try {
          const dbUser = await getUserByEmailDb(session.user.email)
          setFullUser(dbUser)
        } catch (error) {
          console.error("Failed to load full user data:", error)
          setFullUser(null)
        } finally {
          setDbFetchAttempted(true)
          setIsFetching(false)
        }
      } else {
        setFullUser(null)
        setDbFetchAttempted(true)
        setIsFetching(false)
      }
    }

    if (status === "authenticated") {
      loadFullUserData()
    } else if (status === "unauthenticated") {
      setFullUser(null)
      setDbFetchAttempted(true)
      setIsFetching(false)
    }
  }, [session, status])

  const isLoading = 
    status === "loading" || 
    !mounted || 
    isFetching || 
    (status === "authenticated" && !dbFetchAttempted)

  const login = async (email: string, password: string): Promise<User | null> => {
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      })

      if (result?.error) {
        return null
      }

      setIsFetching(true)
      const dbUser = await getUserByEmailDb(email)
      setFullUser(dbUser)
      setDbFetchAttempted(true)
      setIsFetching(false)
      
      return dbUser
    } catch (error) {
      console.error("Login error:", error)
      setIsFetching(false)
      return null
    }
  }

  const logout = async () => {
    try {
      setFullUser(null)
      setDbFetchAttempted(false)
      await signOut({ redirect: false })
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    }
  }

  if (!mounted || status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user: fullUser, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    // 🔥 THE FIX: Disabled refetchOnWindowFocus prevents the alt-tab flashing
    <SessionProvider refetchOnWindowFocus={false}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}