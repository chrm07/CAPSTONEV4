"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"

// Simple hash function for QR code data
async function hashValue(value: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

interface QRCodeProps {
  size?: number
}

export function QRCode({ size = 512 }: QRCodeProps) {
  const { user } = useAuth()
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        setIsLoading(true)
        setError("")

        if (!user) {
          setError("User not found")
          setIsLoading(false)
          return
        }

        // Get the profile data with fallbacks
        const profileData = user.studentProfile || user.profileData || {}
        const studentId = profileData.studentId || user.id

        // Hash the student ID for security
        const hashedId = await hashValue(studentId)
        
        // Create QR data with hashed value prefixed with BTS:
        const qrValue = `BTS:${hashedId}`
        
        console.log("[v0] QR Code generating with hashed value:", qrValue)

        // Create QR code with simple data - much cleaner and easier to scan
        const encodedValue = encodeURIComponent(qrValue)
        // Use lower error correction (M) for cleaner QR code with less density
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedValue}&ecc=M&margin=4`

        setQrCodeUrl(qrUrl)
        setIsLoading(false)
      } catch (err) {
        console.error("QR Code generation error:", err)
        setError("Failed to generate QR code")
        setIsLoading(false)
      }
    }

    generateQRCode()
  }, [user, size])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg border">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
        <p className="text-sm text-gray-500">Generating QR code...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg border">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <p className="text-sm text-red-600 text-center">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border shadow-sm">
      <div className="bg-white p-4 rounded-lg">
        <img
          src={qrCodeUrl || "/placeholder.svg"}
          alt="Student QR Code"
          width={size}
          height={size}
          className="border-4 border-gray-200 rounded-lg"
          onError={(e) => {
            console.error("QR Code image failed to load")
            setError("Failed to load QR code image")
          }}
        />
      </div>
      {/* BTS branding below QR code */}
      <div className="mt-2 bg-green-600 rounded-full px-4 py-1">
        <span className="text-white font-bold text-sm">BTS Scholar</span>
      </div>
      <p className="mt-4 text-sm text-gray-600 text-center font-medium">Scan this QR code for verification</p>
      <p className="text-xs text-gray-400 text-center mt-1">BTS Scholarship System</p>
    </div>
  )
}
