import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Shield, Eye, Lock, Database, Users, FileText } from "lucide-react"

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md shadow-sm">
        <div className="container flex h-16 items-center">
          <Link href="/">
            <Button variant="ghost" className="flex items-center space-x-2 text-blue-700 hover:text-blue-800">
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
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4 text-balance">Privacy Policy</h1>
          <p className="text-xl text-gray-600 text-balance max-w-2xl mx-auto">
            Your privacy is important to us. Learn how we collect, use, and protect your personal information.
          </p>
          <div className="mt-6 text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>

        {/* Privacy Policy Content */}
        <div className="space-y-8">
          {/* Section 1: Information We Collect */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-600" />
                <span>1. Information We Collect</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>We collect information you provide directly to us, including:</p>
              <ul>
                <li>
                  <strong>Personal Information:</strong> Name, email address, phone number, address, age
                </li>
                <li>
                  <strong>Educational Information:</strong> School name, course, year level, academic records
                </li>
                <li>
                  <strong>Application Documents:</strong> Transcripts, certificates, identification documents
                </li>
                <li>
                  <strong>Account Information:</strong> Username, password (encrypted), profile preferences
                </li>
                <li>
                  <strong>Communication Data:</strong> Messages, support requests, feedback
                </li>
              </ul>
              <p>We also automatically collect certain information when you use our platform:</p>
              <ul>
                <li>Device information (browser type, operating system)</li>
                <li>Usage data (pages visited, time spent, features used)</li>
                <li>Log data (IP address, access times, error logs)</li>
              </ul>
            </CardContent>
          </Card>

          {/* Section 2: How We Use Your Information */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-green-600" />
                <span>2. How We Use Your Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>We use the information we collect to:</p>
              <ul>
                <li>Process and evaluate scholarship applications</li>
                <li>Verify your identity and eligibility</li>
                <li>Communicate with you about your application status</li>
                <li>Provide customer support and respond to inquiries</li>
                <li>Improve our platform and services</li>
                <li>Comply with legal obligations and requirements</li>
                <li>Prevent fraud and ensure platform security</li>
                <li>Send important updates and notifications</li>
              </ul>
              <p>We do not use your personal information for marketing purposes without your explicit consent.</p>
            </CardContent>
          </Card>

          {/* Section 3: Information Sharing */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-600" />
                <span>3. Information Sharing and Disclosure</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>We may share your information in the following circumstances:</p>
              <ul>
                <li>
                  <strong>Scholarship Evaluation:</strong> With authorized evaluators and committee members
                </li>
                <li>
                  <strong>Educational Institutions:</strong> With schools for verification purposes
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by law or legal process
                </li>
                <li>
                  <strong>Service Providers:</strong> With trusted third parties who assist in platform operations
                </li>
                <li>
                  <strong>Safety and Security:</strong> To protect rights, property, or safety of users
                </li>
              </ul>
              <p>We never sell, rent, or trade your personal information to third parties for commercial purposes.</p>
            </CardContent>
          </Card>

          {/* Section 4: Data Security */}
          <Card className="border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5 text-red-600" />
                <span>4. Data Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>We implement comprehensive security measures to protect your information:</p>
              <ul>
                <li>Encryption of sensitive data in transit and at rest</li>
                <li>Secure servers with regular security updates</li>
                <li>Access controls and authentication requirements</li>
                <li>Regular security audits and monitoring</li>
                <li>Employee training on data protection practices</li>
                <li>Incident response procedures for security breaches</li>
              </ul>
              <p>
                While we strive to protect your information, no method of transmission over the internet is 100% secure.
              </p>
            </CardContent>
          </Card>

          {/* Section 5: Your Rights */}
          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                <span>5. Your Privacy Rights</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>You have the following rights regarding your personal information:</p>
              <ul>
                <li>
                  <strong>Access:</strong> Request a copy of your personal information
                </li>
                <li>
                  <strong>Correction:</strong> Update or correct inaccurate information
                </li>
                <li>
                  <strong>Deletion:</strong> Request deletion of your personal information
                </li>
                <li>
                  <strong>Portability:</strong> Receive your data in a structured format
                </li>
                <li>
                  <strong>Restriction:</strong> Limit how we process your information
                </li>
                <li>
                  <strong>Objection:</strong> Object to certain types of processing
                </li>
              </ul>
              <p>To exercise these rights, please contact us using the information provided below.</p>
            </CardContent>
          </Card>

          {/* Section 6: Data Retention */}
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-orange-600" />
                <span>6. Data Retention</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>We retain your personal information for different periods depending on the purpose:</p>
              <ul>
                <li>
                  <strong>Active Applications:</strong> Throughout the application and evaluation process
                </li>
                <li>
                  <strong>Successful Applicants:</strong> For the duration of the scholarship program
                </li>
                <li>
                  <strong>Unsuccessful Applications:</strong> Up to 2 years for record-keeping
                </li>
                <li>
                  <strong>Account Information:</strong> Until account deletion is requested
                </li>
                <li>
                  <strong>Legal Requirements:</strong> As required by applicable laws
                </li>
              </ul>
              <p>After the retention period, we securely delete or anonymize your information.</p>
            </CardContent>
          </Card>

          {/* Section 7: Cookies and Tracking */}
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-yellow-600" />
                <span>7. Cookies and Tracking Technologies</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>We use cookies and similar technologies to:</p>
              <ul>
                <li>Remember your login status and preferences</li>
                <li>Analyze platform usage and performance</li>
                <li>Provide personalized user experience</li>
                <li>Ensure platform security and prevent fraud</li>
              </ul>
              <p>
                You can control cookie settings through your browser preferences. Disabling cookies may affect platform
                functionality.
              </p>
            </CardContent>
          </Card>

          {/* Section 8: Third-Party Services */}
          <Card className="border-l-4 border-l-teal-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-teal-600" />
                <span>8. Third-Party Services</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>Our platform may integrate with third-party services for:</p>
              <ul>
                <li>Email delivery and communication</li>
                <li>Document storage and processing</li>
                <li>Analytics and performance monitoring</li>
                <li>Payment processing (if applicable)</li>
              </ul>
              <p>These services have their own privacy policies, and we encourage you to review them.</p>
            </CardContent>
          </Card>

          {/* Section 9: International Transfers */}
          <Card className="border-l-4 border-l-pink-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-pink-600" />
                <span>9. International Data Transfers</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                Your information may be transferred to and processed in countries other than the Philippines. When we do
                this:
              </p>
              <ul>
                <li>We ensure adequate protection through appropriate safeguards</li>
                <li>We comply with applicable data protection laws</li>
                <li>We use standard contractual clauses or other approved mechanisms</li>
                <li>We maintain the same level of protection as required in the Philippines</li>
              </ul>
            </CardContent>
          </Card>

          {/* Section 10: Changes to Privacy Policy */}
          <Card className="border-l-4 border-l-gray-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-gray-600" />
                <span>10. Changes to This Privacy Policy</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>We may update this Privacy Policy from time to time. When we do:</p>
              <ul>
                <li>We will post the updated policy on our platform</li>
                <li>We will notify you of significant changes via email</li>
                <li>We will update the "Last updated" date at the top</li>
                <li>Your continued use constitutes acceptance of the changes</li>
              </ul>
              <p>We encourage you to review this policy periodically for any updates.</p>
            </CardContent>
          </Card>

          {/* Section 11: Contact Information */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span>11. Contact Us</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>If you have questions about this Privacy Policy or our data practices, please contact us:</p>
              <div className="bg-gray-50 p-4 rounded-lg mt-4">
                <p>
                  <strong>Privacy Officer</strong>
                </p>
                <p>Bawat Tahanan May Scholar (BTS)</p>
                <p>Email: privacy@bts-scholarship.ph</p>
                <p>Phone: +63 123 456 7890</p>
                <p>Address: 123 Education Street, Manila, Philippines</p>
                <p>Business Hours: Monday - Friday, 8:00 AM - 5:00 PM (PHT)</p>
              </div>
              <p className="mt-4">We will respond to privacy-related inquiries within 30 days.</p>
            </CardContent>
          </Card>
        </div>

        {/* Acknowledgment Section */}
        <Card className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Privacy Matters</h3>
            <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
              We are committed to protecting your privacy and handling your personal information responsibly. If you
              have any concerns, please don't hesitate to contact us.
            </p>
            <Link href="/">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2">Return to Platform</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
