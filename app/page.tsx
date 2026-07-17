import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HeroSection } from "@/components/hero-section"
import { MainNav } from "@/components/main-nav"
import { FeaturesSection } from "@/components/features-section"
import { TestimonialsSection } from "@/components/testimonials-section"
import { FaqSection } from "@/components/faq-section"
import { CtaSection } from "@/components/cta-section"
import { EnhancedFooter } from "@/components/enhanced-footer"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50">
      <header className="sticky top-0 z-50 w-full border-b bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 backdrop-blur-md shadow-lg">
        <div className="container mx-auto px-4 md:px-6 flex h-16 items-center">
          <MainNav />
          <div className="ml-auto flex items-center space-x-3 sm:space-x-4">
            <Button
              asChild
              variant="ghost"
              className="text-white hover:text-white bg-green-900/30 hover:bg-green-800 transition-all duration-300 font-medium border border-transparent hover:border-green-400"
            >
              <Link href="/login">Log in</Link>
            </Button>
            
            <Button 
              asChild
              className="bg-white text-green-700 hover:bg-slate-50 hover:text-green-800 rounded-full px-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold"
            >
              <Link href="/register">Register</Link>
            </Button>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <TestimonialsSection />
        <FaqSection />
        <CtaSection />
      </main>
      
      <EnhancedFooter />
    </div>
  )
}