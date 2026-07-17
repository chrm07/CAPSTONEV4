"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Maximize, Minimize } from "lucide-react"

interface QrScannerProps {
  onResult: (result: string) => void
}

export function QrScanner({ onResult }: QrScannerProps) {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scannerContainerRef = useRef<HTMLDivElement | null>(null)
  
  const onResultRef = useRef(onResult)
  const hasScannedRef = useRef(false)

  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  const initializeScanner = async () => {
    if (!containerRef.current) return

    const qrScannerId = "qr-scanner"
    setError(null)
    setIsLoading(true)
    hasScannedRef.current = false

    try {
      // 1. Force the browser to request camera permissions and fetch devices first
      const devices = await Html5Qrcode.getCameras()
      if (!devices || devices.length === 0) {
        throw new Error("NotFoundError")
      }

      if (scannerContainerRef.current && containerRef.current?.contains(scannerContainerRef.current)) {
        containerRef.current.removeChild(scannerContainerRef.current)
        scannerContainerRef.current = null
      }

      const scannerContainer = document.createElement("div")
      scannerContainer.id = qrScannerId
      scannerContainer.style.width = "100%" 
      scannerContainer.style.height = "100%"
      
      scannerContainerRef.current = scannerContainer
      containerRef.current.appendChild(scannerContainer)

      scannerRef.current = new Html5Qrcode(qrScannerId)

      const config = {
        fps: 15, 
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdgePercentage = isFullscreen ? 0.5 : 0.6
          const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight)
          const calculatedSize = Math.floor(minEdgeSize * minEdgePercentage)
          return {
            width: Math.max(calculatedSize, 200), 
            height: Math.max(calculatedSize, 200),
          }
        },
        disableFlip: false, 
      }

      const onSuccess = (decodedText: string) => {
        if (!hasScannedRef.current) {
          hasScannedRef.current = true
          console.log("[v0] QR Scanner SUCCESS - Decoded:", decodedText)
          
          if (scannerRef.current) {
             scannerRef.current.pause(true)
          }
          
          onResultRef.current(decodedText)
        }
      }

      // 2. Robust Fallback Logic
      try {
        // Try requesting the rear camera natively first
        await scannerRef.current.start({ facingMode: "environment" }, config, onSuccess, () => {})
      } catch (err) {
        console.warn("Rear camera request failed, falling back to specific device ID.", err)
        // Fall back to the first available authorized camera (resolves desktop/laptop issues)
        await scannerRef.current.start(devices[0].id, config, onSuccess, () => {})
      }
      
      setIsLoading(false)
    } catch (err) {
      console.error("[v0] Scanner initialization failed:", err)
      let errorMessage = "Camera access failed. "
      
      // 3. User-Friendly Error Mapping
      if (err instanceof Error || typeof err === "string") {
        const msg = String(err).toLowerCase()
        if (msg.includes("notallowederror") || msg.includes("permission denied") || msg.includes("not allowed")) {
          errorMessage = "Camera permission denied. Please allow access in your browser settings and refresh."
        } else if (msg.includes("notfounderror")) {
          errorMessage = "No camera hardware detected on this device."
        } else if (msg.includes("notreadableerror") || msg.includes("is in use")) {
          errorMessage = "Camera is currently in use by another app or browser tab."
        } else {
          errorMessage += err instanceof Error ? err.message : msg
        }
      }
      
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  useEffect(() => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().then(() => {
         initializeScanner()
      }).catch(console.error)
    }
  }, [isFullscreen])

  useEffect(() => {
    initializeScanner()

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear()
        }).catch(console.error)
      }
    }
  }, []) 

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex justify-between items-center p-4 bg-black/80 text-white">
          <h3 className="text-lg font-semibold">QR Code Scanner</h3>
          <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="text-white hover:bg-white/20">
            <Minimize className="h-4 w-4" />
          </Button>
        </div>
        <div ref={containerRef} className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p>Initializing camera...</p>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white p-4 text-center z-10">
              <p className="mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={initializeScanner} className="text-black">
                Retry Camera Access
              </Button>
            </div>
          )}
        </div>
        <div className="p-4 bg-black/80 text-center text-white">
          <p className="text-sm mb-1">Hold QR code steady within the scanning area</p>
          <p className="text-xs text-gray-300">Ensure good lighting and keep the code flat for faster detection</p>
        </div>
      </div>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex justify-between items-center p-3 border-b">
        <h3 className="text-sm font-medium">QR Scanner</h3>
        <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="h-8 w-8 p-0">
          <Maximize className="h-4 w-4" />
        </Button>
      </div>
      <div ref={containerRef} className="relative w-full h-[400px] bg-gray-100 flex items-center justify-center overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p>Initializing camera...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white p-4 text-center z-10">
            <p className="mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={initializeScanner} className="text-black">
              Retry Camera Access
            </Button>
          </div>
        )}
      </div>
      <div className="p-3 text-center border-t bg-slate-50">
        <p className="text-sm font-medium text-slate-700 mb-1">Hold QR code steady within the box</p>
        <p className="text-xs text-slate-500">
          Tip: Lower the phone screen brightness slightly to reduce glare.
        </p>
      </div>
    </Card>
  )
}
