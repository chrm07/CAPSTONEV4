import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ClientProviders } from "@/components/client-providers"

const inter = Inter({ subsets: ["latin"] })

// 👇 UPDATED METADATA 👇
export const metadata: Metadata = {
  title: "BTS - Bawat Tahanan May Scholar",
  description: "Municipal scholarship program for deserving students",
  generator: 'v0.app',
  icons: {
    icon: '/favicon.png', // <-- Changed this line
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  )
}