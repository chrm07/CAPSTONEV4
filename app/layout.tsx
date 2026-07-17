import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ClientProviders } from "@/components/client-providers"

const inter = Inter({ subsets: ["latin"] })

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://btscarmona.com"

export const metadata: Metadata = {
  title: {
    default: "BTS Carmona | Bawat Tahanan May Scholar",
    template: "%s | BTS Carmona",
  },
  description:
    "Official scholarship management portal of the Municipality of Carmona. Apply online for the Bawat Tahanan May Scholar (BTS) Scholarship Program, submit requirements, track applications, and receive scholarship updates.",
  keywords: [
    "BTS Carmona",
    "Bawat Tahanan May Scholar",
    "Carmona Scholarship",
    "Scholarship Portal",
    "Municipality of Carmona",
    "Scholarship Application",
    "Student Financial Assistance",
    "Education Assistance",
    "Scholarship Philippines",
    "Carmona Education Program",
  ],
  authors: [{ name: "Municipality of Carmona" }],
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "BTS Carmona",
    title: "BTS Carmona | Bawat Tahanan May Scholar",
    description: "Official online scholarship portal of the Municipality of Carmona.",
    url: siteUrl,
    images: [
      {
        url: "/images/bts-logo.jpg",
        width: 1200,
        height: 630,
        alt: "BTS Carmona - Bawat Tahanan May Scholar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BTS Carmona | Bawat Tahanan May Scholar",
    description: "Official online scholarship portal of the Municipality of Carmona.",
    images: ["/images/bts-logo.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-icon.png",
  },
  alternates: {
    canonical: siteUrl,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "BTS Carmona",
    description: "Official scholarship management portal of the Municipality of Carmona.",
    url: siteUrl,
    logo: `${siteUrl}/images/bts-logo.jpg`,
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <body className={inter.className} suppressHydrationWarning>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  )
}
