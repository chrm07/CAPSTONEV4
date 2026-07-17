import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Log the request path for debugging
  console.log("Middleware running for path:", request.nextUrl.pathname)

  // Always allow navigation - we'll handle auth in the components
  return NextResponse.next()
}

// Limit middleware to only run on these paths
export const config = {
  matcher: ["/student/:path*", "/admin/:path*"],
}
