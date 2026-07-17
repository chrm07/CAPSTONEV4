import { type NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// Lazy initialization - only create Resend instance when API key is available
let resendInstance: Resend | null = null
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY)
  }
  return resendInstance
}

type EmailTemplate = 'welcome' | 'application_submitted' | 'application_approved' | 'application_rejected' | 'password_reset' | 'verification_schedule' | 'financial_distribution'

interface SendEmailRequest {
  to: string
  template: EmailTemplate
  data: Record<string, string>
}

const emailTemplates: Record<EmailTemplate, { subject: string; getBody: (data: Record<string, string>) => string }> = {
  welcome: {
    subject: 'Welcome to BTS Scholarship Program',
    getBody: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">BTS Scholarship</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Municipality of Carmona</p>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Welcome, ${data.name}!</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Your account has been successfully created for the Barangay Tertiary Scholarship (BTS) Program.
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            You can now submit your scholarship application and upload the required documents through your student dashboard.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.loginUrl}" style="background: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Municipality of Carmona - BTS Scholarship Program</p>
        </div>
      </div>
    `,
  },
  application_submitted: {
    subject: 'Application Received - BTS Scholarship',
    getBody: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">BTS Scholarship</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Application Received</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Dear ${data.name},
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            We have received your scholarship application. Your application is now under review.
          </p>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; color: #6b7280;"><strong>Application ID:</strong> ${data.applicationId}</p>
            <p style="margin: 10px 0 0; color: #6b7280;"><strong>Submitted:</strong> ${data.submittedDate}</p>
            <p style="margin: 10px 0 0; color: #6b7280;"><strong>Status:</strong> <span style="color: #f59e0b;">Pending Review</span></p>
          </div>
          <p style="color: #4b5563; line-height: 1.6;">
            You will be notified once your application has been reviewed. Please ensure all your documents are uploaded.
          </p>
        </div>
      </div>
    `,
  },
  application_approved: {
    subject: 'Congratulations! Application Approved - BTS Scholarship',
    getBody: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">BTS Scholarship</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="background: #dcfce7; border-radius: 50%; width: 60px; height: 60px; display: inline-flex; align-items: center; justify-content: center;">
              <span style="font-size: 30px;">✓</span>
            </div>
          </div>
          <h2 style="color: #16a34a; text-align: center;">Application Approved!</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Dear ${data.name},
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            Congratulations! Your scholarship application has been approved. You are now an official BTS Scholar.
          </p>
          <div style="background: #dcfce7; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; color: #166534; font-weight: bold;">Next Steps:</p>
            <ul style="color: #166534; margin: 10px 0 0; padding-left: 20px;">
              <li>Check the verification schedule for your barangay</li>
              <li>Prepare your QR code for verification</li>
              <li>Wait for the financial distribution schedule</li>
            </ul>
          </div>
        </div>
      </div>
    `,
  },
  application_rejected: {
    subject: 'Application Update - BTS Scholarship',
    getBody: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">BTS Scholarship</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Application Update</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Dear ${data.name},
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            We regret to inform you that your scholarship application could not be approved at this time.
          </p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b; font-weight: bold;">Reason:</p>
            <p style="margin: 10px 0 0; color: #991b1b;">${data.reason}</p>
          </div>
          <p style="color: #4b5563; line-height: 1.6;">
            You may reapply in the next application period after addressing the issues mentioned above.
          </p>
        </div>
      </div>
    `,
  },
  password_reset: {
    subject: 'Password Reset Request - BTS Scholarship',
    getBody: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">BTS Scholarship</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Password Reset</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            You requested to reset your password. Click the button below to create a new password.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.resetUrl}" style="background: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            This link will expire in 1 hour. If you didn't request this, please ignore this email.
          </p>
        </div>
      </div>
    `,
  },
  verification_schedule: {
    subject: 'Verification Schedule Announced - BTS Scholarship',
    getBody: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">BTS Scholarship</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Verification Schedule</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Dear ${data.name},
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            A verification schedule has been announced for your barangay.
          </p>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; color: #6b7280;"><strong>Barangay:</strong> ${data.barangay}</p>
            <p style="margin: 10px 0 0; color: #6b7280;"><strong>Date:</strong> ${data.startDate} - ${data.endDate}</p>
          </div>
          <p style="color: #4b5563; line-height: 1.6;">
            Please bring your valid ID and QR code for verification.
          </p>
        </div>
      </div>
    `,
  },
  financial_distribution: {
    subject: 'Financial Aid Distribution Schedule - BTS Scholarship',
    getBody: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">BTS Scholarship</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Financial Aid Distribution</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Dear ${data.name},
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            The financial aid distribution schedule for your barangay has been announced.
          </p>
          <div style="background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; color: #166534;"><strong>Barangay:</strong> ${data.barangay}</p>
            <p style="margin: 10px 0 0; color: #166534;"><strong>Date:</strong> ${data.date}</p>
            <p style="margin: 10px 0 0; color: #166534;"><strong>Time:</strong> ${data.time}</p>
            <p style="margin: 10px 0 0; color: #166534;"><strong>Amount:</strong> ₱${data.amount}</p>
          </div>
          <p style="color: #4b5563; line-height: 1.6;">
            Please bring your valid ID and QR code to claim your financial aid.
          </p>
        </div>
      </div>
    `,
  },
}

export async function POST(request: NextRequest) {
  try {
    const body: SendEmailRequest = await request.json()
    const { to, template, data } = body

    if (!to || !template) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const emailTemplate = emailTemplates[template]
    if (!emailTemplate) {
      return NextResponse.json({ error: 'Invalid template' }, { status: 400 })
    }

    // Check if Resend API key is configured
    const resend = getResend()
    if (!resend) {
      // Console-based testing mode
      console.log('\n========================================')
      console.log('EMAIL NOTIFICATION (Console Mode)')
      console.log('========================================')
      console.log('To:', to)
      console.log('Subject:', emailTemplate.subject)
      console.log('Template:', template)
      console.log('Data:', JSON.stringify(data, null, 2))
      console.log('========================================\n')
      
      return NextResponse.json({ 
        success: true, 
        mode: 'console',
        message: 'Email logged to console (Resend not configured)' 
      })
    }

    // Send real email via Resend
    const { data: emailData, error } = await resend.emails.send({
      from: 'BTS Scholarship <noreply@resend.dev>',
      to: [to],
      subject: emailTemplate.subject,
      html: emailTemplate.getBody(data),
    })

    if (error) {
      console.error('Email send error:', error)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: emailData?.id })
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
