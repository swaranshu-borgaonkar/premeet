import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — PrepMeet',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              P
            </div>
            <span className="font-bold text-xl">PrepMeet</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: February 2026</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <h2 className="text-2xl font-semibold mt-8">1. Acceptance of Terms</h2>
          <p className="text-gray-600">
            By installing or using PrepMeet, you agree to these Terms of Service.
            If you do not agree, do not use the service.
          </p>

          <h2 className="text-2xl font-semibold mt-8">2. Description of Service</h2>
          <p className="text-gray-600">
            PrepMeet is a Chrome extension that provides pre-appointment context
            for service professionals. It connects to your calendar, stores
            session notes, and generates AI-powered prep summaries.
          </p>

          <h2 className="text-2xl font-semibold mt-8">3. Account & Security</h2>
          <p className="text-gray-600">
            You are responsible for maintaining the security of your account.
            You must not share your credentials or allow unauthorized access.
            PrepMeet is not a medical records system and should not be used as
            a primary electronic health record (EHR).
          </p>

          <h2 className="text-2xl font-semibold mt-8">4. Subscription & Billing</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>Free tier: Limited features, no payment required.</li>
            <li>Individual ($9/mo or $89/yr): Full features for solo practitioners.</li>
            <li>Team ($29/seat/mo or $290/seat/yr): Shared workspaces, minimum 3 seats.</li>
            <li>Enterprise: Custom pricing, contact sales.</li>
            <li>14-day free trial included with Individual and Team plans.</li>
            <li>Cancel anytime. Access continues until end of billing period.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8">5. AI-Generated Content</h2>
          <p className="text-gray-600">
            PrepMeet uses AI to generate prep summaries. These are assistive
            tools and should not replace professional judgment. AI outputs may
            not always be accurate. You are responsible for verifying
            information before relying on it in professional settings.
          </p>

          <h2 className="text-2xl font-semibold mt-8">6. Data Ownership</h2>
          <p className="text-gray-600">
            You retain ownership of all content you create in PrepMeet,
            including session notes and contact information. We do not claim
            ownership over your data. You grant us a limited license to process
            your data solely to provide the service.
          </p>

          <h2 className="text-2xl font-semibold mt-8">7. Prohibited Use</h2>
          <p className="text-gray-600">
            You may not use PrepMeet to store protected health information (PHI)
            without an appropriate Business Associate Agreement (BAA). Contact
            us for HIPAA-compliant deployment options.
          </p>

          <h2 className="text-2xl font-semibold mt-8">8. Limitation of Liability</h2>
          <p className="text-gray-600">
            PrepMeet is provided &quot;as is&quot; without warranties. We are not liable
            for any damages arising from your use of the service, including but
            not limited to lost data, missed appointments, or inaccurate AI
            outputs.
          </p>

          <h2 className="text-2xl font-semibold mt-8">9. Contact</h2>
          <p className="text-gray-600">
            For questions about these terms, contact us at legal@prepmeet.com.
          </p>
        </div>
      </div>
    </div>
  );
}
