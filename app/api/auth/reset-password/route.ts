import { type NextRequest, NextResponse } from 'next/server'
// Notice the new imports here!
import { 
  getUserByEmailDb, 
  updateUser, 
  createResetTokenDb, 
  getResetTokenDb, 
  deleteResetTokenDb 
} from '@/lib/storage'

function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

/**
 * Handles generating a reset link and sending the email
 */
async function handleRequestReset(email: string) {
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const user = await getUserByEmailDb(email)
  if (!user) {
    // Don't reveal if email exists or not for security
    return NextResponse.json({ 
      success: true, 
      message: 'If an account with that email exists, a reset link has been sent.' 
    })
  }

  // Generate reset token (1 hour expiration)
  const resetToken = generateToken()
  const expires = Date.now() + 60 * 60 * 1000 
  
  // 🔥 CHANGED: Save to Firebase instead of local memory
  await createResetTokenDb(resetToken, email, expires)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`

  // Send email
  try {
    await fetch(`${baseUrl}/api/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        template: 'password_reset',
        data: { resetUrl },
      }),
    })
  } catch (emailError) {
    console.error('Failed to send reset email:', emailError)
  }

  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {
    console.log('\n========================================')
    console.log('PASSWORD RESET LINK (Console Mode)')
    console.log('Email:', email)
    console.log('Reset URL:', resetUrl)
    console.log('Expires:', new Date(expires).toLocaleString())
    console.log('========================================\n')
  }

  return NextResponse.json({ 
    success: true, 
    message: 'If an account with that email exists, a reset link has been sent.',
    devResetUrl: isDev ? resetUrl : undefined,
  })
}

/**
 * Handles actually updating the user's password in the database
 */
async function handleResetPassword(token: string, newPassword: string) {
  if (!token || !newPassword) {
    return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 })
  }

  // 🔥 CHANGED: Fetch from Firebase
  const tokenData = await getResetTokenDb(token)
  
  if (!tokenData) {
    return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
  }

  if (Date.now() > tokenData.expires) {
    // 🔥 CHANGED: Delete from Firebase
    await deleteResetTokenDb(token)
    return NextResponse.json({ error: 'Reset token has expired' }, { status: 400 })
  }

  const user = await getUserByEmailDb(tokenData.email)
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 400 })
  }

  // Update password in DB
  await updateUser(user.id, { password: newPassword })

  // 🔥 CHANGED: Delete used token from Firebase to prevent reuse
  await deleteResetTokenDb(token)

  return NextResponse.json({ success: true, message: 'Password has been reset successfully' })
}

/**
 * Handles checking if a token is still valid before showing the reset form
 */
async function handleVerifyToken(token: string) {
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 })
  }

  // 🔥 CHANGED: Fetch from Firebase
  const tokenData = await getResetTokenDb(token)
  
  if (!tokenData || Date.now() > tokenData.expires) {
    return NextResponse.json({ valid: false })
  }

  return NextResponse.json({ valid: true, email: tokenData.email })
}

/**
 * Main API Route Handler
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, email, token, newPassword } = body

    switch (action) {
      case 'request':
        return await handleRequestReset(email)
      case 'reset':
        return await handleResetPassword(token, newPassword)
      case 'verify':
        return await handleVerifyToken(token)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
