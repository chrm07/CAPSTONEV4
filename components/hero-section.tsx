"use client"

import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import Image from "next/image"

export function HeroSection() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isTrackLoading, setIsTrackLoading] = useState(false)
  const [isApplyLoading, setIsApplyLoading] = useState(false) // 🔥 Added state for Apply button
  const router = useRouter()

  useEffect(() => {
    // Trigger animations after component mounts
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  const handleTrackClick = () => {
    setIsTrackLoading(true)
    // Simulate loading delay for smooth transition
    setTimeout(() => {
      router.push("/login")
    }, 600)
  }

  const handleApplyClick = () => {
    setIsApplyLoading(true)
    // Redirect to register page
    setTimeout(() => {
      router.push("/register")
    }, 600)
  }

  return (
    <section className="relative w-full bg-gradient-to-br from-emerald-50 via-green-100 to-teal-50 pt-4 sm:pt-6 md:pt-8 lg:pt-10 pb-16 overflow-hidden min-h-screen flex flex-col items-center justify-start">
      
      {/* Clean background with static vibrant colors (Animations removed) */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Vibrant gradient overlays */}
        <div
          className={`absolute top-0 left-1/2 transform -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-br from-green-300/40 via-emerald-200/30 to-teal-200/20 rounded-full blur-3xl transition-all duration-1000 ${
            isLoaded ? "scale-100 opacity-80" : "scale-75 opacity-0"
          }`}
          style={{ animationDelay: "0.2s" }}
        ></div>
        <div
          className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-emerald-400/30 via-green-300/20 to-teal-300/20 rounded-full blur-2xl transition-all duration-1000 ${
            isLoaded ? "scale-100 opacity-60" : "scale-75 opacity-0"
          }`}
          style={{ animationDelay: "0.4s" }}
        ></div>

        {/* Additional colorful depth layers */}
        <div
          className={`absolute top-20 left-1/4 w-96 h-96 bg-gradient-to-br from-green-200/50 to-emerald-300/40 rounded-full blur-3xl transition-all duration-1200 ${
            isLoaded ? "scale-100 opacity-50" : "scale-50 opacity-0"
          }`}
          style={{ animationDelay: "0.6s" }}
        ></div>
        <div
          className={`absolute bottom-20 right-1/4 w-80 h-80 bg-gradient-to-tl from-teal-200/60 to-green-200/40 rounded-full blur-3xl transition-all duration-1200 ${
            isLoaded ? "scale-100 opacity-40" : "scale-50 opacity-0"
          }`}
          style={{ animationDelay: "0.8s" }}
        ></div>
      </div>

      <div className="container relative z-10 px-4 md:px-6 w-full">
        {/* Container that holds all the hero content */}
        <div className="flex flex-col items-center justify-center text-center space-y-6 md:space-y-8 max-w-6xl mx-auto">
          
          {/* Status indicator with entrance animation */}
          <div
            className={`flex items-center justify-center space-x-2 transition-all duration-700 ease-out ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ animationDelay: "0.3s" }}
          >
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-emerald-200/50 shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-widest">
                Now accepting applications for {new Date().getFullYear()}
              </span>
            </div>
          </div>

          {/* BTS Logo Picture */}
          <div className="space-y-6 md:space-y-8 w-full flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center w-full">
              <div
                className={`transition-all duration-1000 ease-out w-full max-w-[700px] ${
                  isLoaded ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"
                }`}
                style={{ animationDelay: "0.5s" }}
              >
                <Image
                  src="/images/bts-logo.jpg"
                  alt="Bawat Tahanan May Scholar - BTS Logo"
                  width={700}
                  height={350}
                  className="mx-auto rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 max-w-full h-auto relative z-10"
                  priority
                />
              </div>
            </div>
            
            <div className="w-full flex justify-center">
              <p
                className={`text-base sm:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed text-center transition-all duration-800 ease-out ${
                  isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                }`}
                style={{ animationDelay: "0.7s" }}
              >
                Empowering communities through education. Your journey to academic success starts here.
              </p>
            </div>
          </div>

          {/* Enhanced CTA buttons */}
          <div
            className={`flex flex-col sm:flex-row gap-4 sm:gap-6 pt-4 w-full justify-center items-center transition-all duration-800 ease-out ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ animationDelay: "0.9s" }}
          >
            {/* 🔥 NEW: Apply Now Button */}
            <Button
              size="lg"
              onClick={handleApplyClick}
              disabled={isApplyLoading || isTrackLoading}
              className="relative text-white bg-green-600 hover:bg-green-700 px-12 py-6 text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 rounded-full disabled:opacity-80 disabled:cursor-not-allowed disabled:transform-none min-w-[200px] font-bold"
            >
              {isApplyLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Loading...</span>
                </>
              ) : (
                "Apply Now"
              )}
            </Button>

            {/* Existing: Track Application Button */}
            <Button
              variant="ghost"
              size="lg"
              onClick={handleTrackClick}
              disabled={isTrackLoading || isApplyLoading}
              className="relative text-green-700 hover:text-green-800 hover:bg-green-50 px-12 py-6 text-lg transition-all duration-300 border-2 border-green-200/50 hover:border-green-300 shadow-lg hover:shadow-xl transform hover:scale-105 rounded-full disabled:opacity-80 disabled:cursor-not-allowed disabled:transform-none min-w-[200px] font-bold bg-white/50 backdrop-blur-sm"
            >
              {isTrackLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Loading...</span>
                </>
              ) : (
                "Track Application"
              )}
            </Button>
          </div>

          {/* Achievement badges */}
          <div
            className={`flex flex-wrap justify-center items-center gap-4 pt-4 w-full transition-all duration-800 ease-out ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
            style={{ animationDelay: "1.3s" }}
          >
            {["✓ Verified Program", "✓ Government Approved", "✓ Community Focused"].map((text, index) => (
              <div
                key={index}
                className={`bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-green-100 transform hover:scale-105 transition-all duration-300 ${
                  isLoaded ? "scale-100 opacity-100" : "scale-90 opacity-0"
                }`}
                style={{ animationDelay: `${1.4 + index * 0.1}s` }}
              >
                <span className="text-sm font-bold text-green-700 tracking-wide">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom CSS for additional animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        .animate-fade-in-up { animation: fadeInUp 0.6s ease-out forwards; }
        .animate-scale-in { animation: scaleIn 0.5s ease-out forwards; }
      `}</style>
    </section>
  )
}
