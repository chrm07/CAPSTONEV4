import Link from "next/link"
import { GraduationCap, MapPin, Phone, Mail, Facebook, Globe, ChevronRight } from "lucide-react"

export function EnhancedFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 mb-12">
          
          {/* Column 1: Branding & Description */}
          <div className="md:col-span-5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2.5 rounded-xl">
                <GraduationCap className="h-7 w-7 text-green-700" />
              </div>
              <span className="text-2xl font-bold text-slate-900 tracking-tight">BTS Scholarship</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 max-w-sm mt-2">
              The Bawat Tahanan May Scholar (BTS) Program is an official educational assistance initiative by the Municipality of Carmona, empowering students to achieve their academic dreams.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <a 
                href="https://www.facebook.com/groups/426596700233927/?ref=share&rdid=KydyxffRCJWp0JSf&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1BF1nQCrJM#" 
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-green-100 hover:text-green-700 transition-colors shadow-sm"
              >
                <Facebook className="h-5 w-5" />
                <span className="sr-only">Facebook Group</span>
              </a>
              <a 
                href="https://carmonagov.net/portal/" 
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-green-100 hover:text-green-700 transition-colors shadow-sm"
              >
                <Globe className="h-5 w-5" />
                <span className="sr-only">Official Website</span>
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="md:col-span-3">
            <h4 className="text-slate-900 font-bold mb-6 text-lg">Quick Links</h4>
            <ul className="space-y-3 text-sm font-medium">
              <li>
                <Link href="/login" className="text-slate-600 hover:text-green-700 transition-colors flex items-center gap-2 group">
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-green-600 transition-colors" />
                  Portal Login
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-slate-600 hover:text-green-700 transition-colors flex items-center gap-2 group">
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-green-600 transition-colors" />
                  Apply for Scholarship
                </Link>
              </li>
              <li>
                <Link href="#faq" className="text-slate-600 hover:text-green-700 transition-colors flex items-center gap-2 group">
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-green-600 transition-colors" />
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact Information */}
          <div className="md:col-span-4">
            <h4 className="text-slate-900 font-bold mb-6 text-lg">Contact Us</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3 text-slate-600">
                <div className="mt-0.5 bg-green-50 p-1.5 rounded-md text-green-600 border border-green-100 shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <span className="leading-relaxed font-medium">
                  Municipal Hall, City of Carmona<br/>
                  Cavite, Philippines
                </span>
              </li>
              <li className="flex items-center gap-3 text-slate-600">
                <div className="bg-green-50 p-1.5 rounded-md text-green-600 border border-green-100 shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <span className="font-medium">(046) 430-2820</span>
              </li>
              <li className="flex items-center gap-3 text-slate-600">
                <div className="bg-green-50 p-1.5 rounded-md text-green-600 border border-green-100 shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <span className="font-medium">scholarship@carmona.gov.ph</span>
              </li>
            </ul>
          </div>

        </div>
        
        {/* Bottom Copyright Area */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left pt-8 border-t border-slate-100">
          <p className="text-sm text-slate-500 font-medium">
            &copy; {currentYear} Municipality of Carmona. All rights reserved.
          </p>
          <p className="text-sm font-medium flex items-center gap-2 text-slate-500">
            Developed for the <span className="text-green-700 font-bold tracking-tight">BTS Program</span>
          </p>
        </div>
      </div>
    </footer>
  )
}