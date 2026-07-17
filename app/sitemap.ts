import type { MetadataRoute } from "next"

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined) ||
  "https://btscarmona.com"

export default function sitemap(): MetadataRoute.Sitemap {
  const publicRoutes = [
    { path: "", priority: 1, changeFrequency: "monthly" as const },
    { path: "/login", priority: 0.5, changeFrequency: "yearly" as const },
    { path: "/register", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/forgot-password", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/reset-password", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/verify-email", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/privacy", priority: 0.4, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.4, changeFrequency: "yearly" as const },
  ]

  return publicRoutes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
