import NextAuth, { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
// Import our Firestore lookup function from the merged storage utility
import { getUserByEmailDb } from "@/lib/storage"

// 🔥 FIX: Tell Next.js not to statically compile this API route during build
export const dynamic = "force-dynamic";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // 1. Fetch the user from Firestore
          const user = await getUserByEmailDb(credentials.email)

          // 2. Check if user exists and passwords match
          if (user && user.password === credentials.password) {
            // 3. Return the user object to NextAuth
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role, 
              adminRole: user.adminRole, 
            } as any // Bypass strict NextAuth types
          }
          
          // Passwords didn't match or user wasn't found
          return null
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      }
    })
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    // Append custom data to the JWT token
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.adminRole = (user as any).adminRole 
        token.id = user.id
      }
      return token
    },
    // Pass the token data into the active session so the client can read it
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).role = token.role;
        (session.user as any).adminRole = token.adminRole; 
        (session.user as any).id = token.id;
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET || "THIS_IS_A_DEVELOPMENT_SECRET_CHANGE_IT",
  debug: false,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
