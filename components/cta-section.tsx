"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function CtaSection() {
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-br from-green-800 via-green-700 to-green-600 pt-28 pb-16">
      
      {/* Top white wave cutting into the green background */}
      <div className="absolute top-0 left-0 right-0 transform rotate-180 leading-none z-10">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full block" preserveAspectRatio="none">
          <path fill="#ffffff" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,202.7C672,203,768,181,864,181.3C960,181,1056,203,1152,197.3C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      {/* Background ambient elements */}
      <div className="absolute inset-0 z-0">
        <div className="animate-pulse-slow absolute -top-24 -right-24 h-96 w-96 rounded-full bg-gradient-to-br from-green-500 to-emerald-400 opacity-20 blur-3xl"></div>
        <div className="animate-pulse-slow absolute top-1/2 -left-24 h-64 w-64 rounded-full bg-gradient-to-tr from-teal-500 to-green-400 opacity-20 blur-3xl"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNmMtMy4zMTQgMC02IDIuNjg2LTYgNnMyLjY4NiA2IDYgNnptMCAzMGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNmMtMy4zMTQgMC02IDIuNjg2LTYgNnMyLjY4NiA2IDYgNnptLTMwLTE4YzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02Yy0zLjMxNCAwLTYgMi42ODYtNiA2czIuNjg2IDYgNiA2em0wIDMwYzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02Yy0zLjMxNCAwLTYgMi42ODYtNiA2czIuNjg2IDYgNiA2eiIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-15"></div>
      </div>

      <div className="container relative z-20 px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-8 text-center pt-8">
          <div className="h-1.5 w-20 rounded-full bg-gradient-to-r from-green-300 to-emerald-200"></div>

          <div className="space-y-4">
            <h2 className="text-3xl font-black tracking-tighter text-white drop-shadow-sm sm:text-4xl md:text-5xl">
              Ready to Start Your{" "}
              <span className="bg-gradient-to-r from-green-200 to-emerald-100 bg-clip-text text-transparent">
                Journey?
              </span>
            </h2>
            <p className="max-w-[600px] text-green-100 font-medium md:text-lg">
              Apply now and take the first step towards a brighter future. Our team is ready to support you every step
              of the way.
            </p>
          </div>

          <div className="flex flex-col gap-3 min-[400px]:flex-row mt-4">
            {/* 🔥 FIX: Changed href to /register and text to Apply Now */}
            <Link href="/register">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white/30 bg-white/10 text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:border-white/50 hover:-translate-y-1 rounded-full px-8 font-bold"
              >
                Apply Now
              </Button>
            </Link>
          </div>

          {/* Floating elements */}
          <div className="absolute top-10 left-10 hidden rotate-12 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm p-3 shadow-lg transform md:block">
            <div className="flex items-center space-x-2">
              <div className="bg-emerald-500/30 p-1.5 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-white">Quick App</span>
            </div>
          </div>

          <div className="absolute bottom-10 right-10 hidden -rotate-6 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm p-3 shadow-lg transform md:block">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-500/30 p-1.5 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-white">Secure</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Flat bottom transition to footer (No bottom wave) */}
    </section>
  )
}
