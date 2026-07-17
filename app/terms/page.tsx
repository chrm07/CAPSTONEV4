import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Shield, Users, FileText, Lock, Scale, AlertTriangle } from "lucide-react"

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md shadow-sm">
        <div className="container flex h-16 items-center">
          <Link href="/">
            <Button variant="ghost" className="flex items-center space-x-2 text-green-700 hover:text-green-800">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Scale className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4 text-balance">Terms and Conditions</h1>
          <p className="text-xl text-gray-600 text-balance max-w-2xl mx-auto">
            Please read these terms carefully before using the BTS Scholarship Platform
          </p>
          <div className="mt-6 text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>

        {/* Terms Content */}
        <div className="space-y-8">
          {/* Section 1: Acceptance of Terms */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-600" />
                <span>1. Acceptance of Terms</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                By accessing and using the Bawat Tahanan May Scholar (BTS) scholarship platform ("Platform"), you accept
                and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the
                above, please do not use this service.
              </p>
              <p>
                These Terms and Conditions constitute a legally binding agreement between you ("User" or "you") and BTS
                ("we," "us," or "our") regarding your use of our scholarship application and management platform.
              </p>
            </CardContent>
          </Card>

          {/* Section 2: Eligibility */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span>2. User Eligibility</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>To be eligible to use this Platform, you must:</p>
              <ul>
                <li>Be at least 16 years of age or have parental/guardian consent</li>
                <li>Be a resident of the Philippines</li>
                <li>Provide accurate and truthful information during registration</li>
                <li>Meet the specific eligibility criteria for scholarship programs offered</li>
                <li>Have the legal capacity to enter into binding agreements</li>
              </ul>
              <p>
                We reserve the right to verify your eligibility at any time and may suspend or terminate accounts that
                do not meet these requirements.
              </p>
            </CardContent>
          </Card>

          {/* Section 3: Account Registration */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <span>3. Account Registration and Responsibilities</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>When creating an account, you agree to:</p>
              <ul>
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and promptly update your account information</li>
                <li>Keep your login credentials secure and confidential</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>
              <p>
                You are solely responsible for maintaining the confidentiality of your account and password. We are not
                liable for any loss or damage arising from your failure to comply with this security obligation.
              </p>
            </CardContent>
          </Card>

          {/* Section 4: Platform Use and Prohibited Activities */}
          <Card className="border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span>4. Platform Use and Prohibited Activities</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>You may use our Platform only for lawful purposes. You agree NOT to:</p>
              <ul>
                <li>Submit false, misleading, or fraudulent information</li>
                <li>Upload malicious software, viruses, or harmful code</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the Platform's functionality</li>
                <li>Use automated tools to access or interact with the Platform</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Share your account credentials with others</li>
              </ul>
              <p>
                Violation of these terms may result in immediate suspension or termination of your account and potential
                legal action.
              </p>
            </CardContent>
          </Card>

          {/* Section 5: Content Submission and Ownership */}
          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                <span>5. Content Submission and Ownership</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>Regarding content you submit to our Platform:</p>
              <ul>
                <li>You retain ownership of your personal documents and information</li>
                <li>
                  You grant us a limited license to use, store, and process your content for scholarship evaluation
                  purposes
                </li>
                <li>
                  You warrant that you have the right to submit all content and that it does not infringe on third-party
                  rights
                </li>
                <li>You are responsible for the accuracy and authenticity of all submitted documents</li>
                <li>We may retain your information for record-keeping and compliance purposes</li>
              </ul>
              <p>
                All submitted documents must be authentic and unaltered. Submission of fraudulent documents will result
                in immediate disqualification and account termination.
              </p>
            </CardContent>
          </Card>

          {/* Section 6: Data Privacy and Security */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5 text-green-600" />
                <span>6. Data Privacy and Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>We are committed to protecting your privacy and personal information:</p>
              <ul>
                <li>We collect only information necessary for scholarship evaluation and administration</li>
                <li>Your personal data is encrypted and stored securely</li>
                <li>We do not sell or share your personal information with third parties without consent</li>
                <li>You have the right to access, correct, or delete your personal information</li>
                <li>We comply with applicable data protection laws and regulations</li>
                <li>We implement industry-standard security measures to protect your data</li>
              </ul>
              <p>For detailed information about our data practices, please refer to our Privacy Policy.</p>
            </CardContent>
          </Card>

          {/* Section 7: Intellectual Property */}
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-orange-600" />
                <span>7. Intellectual Property Rights</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                The Platform and its original content, features, and functionality are owned by BTS and are protected by
                international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
              <ul>
                <li>You may not reproduce, distribute, or create derivative works without permission</li>
                <li>All trademarks and logos are property of their respective owners</li>
                <li>You may not use our intellectual property for commercial purposes</li>
                <li>Any feedback or suggestions you provide may be used by us without compensation</li>
              </ul>
            </CardContent>
          </Card>

          {/* Section 8: Limitation of Liability */}
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span>8. Limitation of Liability</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                To the fullest extent permitted by law, BTS shall not be liable for any indirect, incidental, special,
                consequential, or punitive damages, including but not limited to:
              </p>
              <ul>
                <li>Loss of profits, data, or other intangible losses</li>
                <li>Damages resulting from your use or inability to use the Platform</li>
                <li>Unauthorized access to or alteration of your transmissions or data</li>
                <li>Technical failures or interruptions of service</li>
              </ul>
              <p>
                Our total liability shall not exceed the amount of fees paid by you, if any, for using our Platform.
              </p>
            </CardContent>
          </Card>

          {/* Section 9: Account Termination */}
          <Card className="border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-red-600" />
                <span>9. Account Termination</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>We may terminate or suspend your account immediately, without prior notice, for:</p>
              <ul>
                <li>Violation of these Terms and Conditions</li>
                <li>Fraudulent or misleading information submission</li>
                <li>Abusive behavior towards other users or staff</li>
                <li>Technical abuse or security violations</li>
                <li>Inactivity for extended periods</li>
              </ul>
              <p>
                You may also terminate your account at any time by contacting our support team. Upon termination, your
                right to use the Platform will cease immediately.
              </p>
            </CardContent>
          </Card>

          {/* Section 10: Governing Law */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Scale className="h-5 w-5 text-blue-600" />
                <span>10. Governing Law and Dispute Resolution</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                These Terms and Conditions are governed by and construed in accordance with the laws of the Republic of
                the Philippines.
              </p>
              <p>Any disputes arising from these terms or your use of the Platform shall be resolved through:</p>
              <ul>
                <li>Good faith negotiations between the parties</li>
                <li>Mediation, if direct negotiation fails</li>
                <li>Binding arbitration under Philippine law, if mediation is unsuccessful</li>
                <li>Philippine courts shall have exclusive jurisdiction for any legal proceedings</li>
              </ul>
            </CardContent>
          </Card>

          {/* Section 11: Changes to Terms */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <span>11. Changes to Terms</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                We reserve the right to modify or replace these Terms and Conditions at any time. We will provide notice
                of significant changes by:
              </p>
              <ul>
                <li>Posting the updated terms on our Platform</li>
                <li>Sending email notifications to registered users</li>
                <li>Displaying prominent notices on the Platform</li>
              </ul>
              <p>
                Your continued use of the Platform after any changes constitutes acceptance of the new Terms and
                Conditions.
              </p>
            </CardContent>
          </Card>

          {/* Section 12: Contact Information */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-green-600" />
                <span>12. Contact Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>If you have any questions about these Terms and Conditions, please contact us:</p>
              <div className="bg-gray-50 p-4 rounded-lg mt-4">
                <p>
                  <strong>Bawat Tahanan May Scholar (BTS)</strong>
                </p>
                <p>Email: legal@bts-scholarship.ph</p>
                <p>Phone: +63 123 456 7890</p>
                <p>Address: 123 Education Street, Manila, Philippines</p>
                <p>Business Hours: Monday - Friday, 8:00 AM - 5:00 PM (PHT)</p>
              </div>
              <p className="mt-4">We will respond to your inquiries within 48 hours during business days.</p>
            </CardContent>
          </Card>
        </div>

        {/* Acknowledgment Section */}
        <Card className="mt-12 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Acknowledgment</h3>
            <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
              By using the BTS Scholarship Platform, you acknowledge that you have read, understood, and agree to be
              bound by these Terms and Conditions.
            </p>
            <Link href="/">
              <Button className="bg-green-600 hover:bg-green-700 text-white px-8 py-2">Return to Platform</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
