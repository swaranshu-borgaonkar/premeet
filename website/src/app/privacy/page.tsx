import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — PrepMeet',
};

export default function PrivacyPage() {
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
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: February 2026</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <h2 className="text-2xl font-semibold mt-8">1. Information We Collect</h2>
          <p className="text-gray-600">
            PrepMeet collects the following information to provide our service:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li><strong>Account information:</strong> Email address, name, and profession when you create an account.</li>
            <li><strong>Calendar data:</strong> Event titles, times, and attendee information from your connected calendar (Google or Microsoft). We only read calendar data; we never modify your calendar.</li>
            <li><strong>Session notes:</strong> Notes you create about your appointments, including summaries, detailed notes, and voice transcripts.</li>
            <li><strong>Usage data:</strong> How you interact with the extension (popup views, feature usage) to improve the product.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>To provide pre-appointment context and AI-generated prep bullets.</li>
            <li>To send email summaries on your behalf (only when you initiate them).</li>
            <li>To sync your data across devices and provide offline access.</li>
            <li>To improve our AI prompts and product experience.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8">3. Data Storage & Security</h2>
          <p className="text-gray-600">
            Your data is stored in Supabase (PostgreSQL) with row-level security policies.
            OAuth tokens are encrypted using AES-GCM-256 encryption. Data is cached locally
            in your browser&apos;s IndexedDB for offline access and is automatically purged after 90 days.
          </p>

          <h2 className="text-2xl font-semibold mt-8">4. Data Sharing</h2>
          <p className="text-gray-600">
            We do not sell your data. Your session notes may be sent to AI providers
            (OpenAI, Anthropic) solely to generate prep bullets. No data is used for AI training.
            We use Sentry for error tracking (anonymized, 10% sampling).
          </p>

          <h2 className="text-2xl font-semibold mt-8">5. Your Rights (GDPR)</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li><strong>Access:</strong> Request a full export of your data at any time.</li>
            <li><strong>Deletion:</strong> Request account deletion with a 30-day grace period.</li>
            <li><strong>Portability:</strong> Export your data in JSON format.</li>
            <li><strong>Correction:</strong> Update your information through the extension settings.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8">6. Data Retention</h2>
          <p className="text-gray-600">
            Active accounts: Data retained as long as account is active.
            Deleted accounts: Data permanently removed after 30-day grace period
            (unless under legal hold). Local cache: Auto-purged after 90 days.
          </p>

          <h2 className="text-2xl font-semibold mt-8">7. Contact</h2>
          <p className="text-gray-600">
            For privacy-related questions, contact us at privacy@prepmeet.com.
          </p>
        </div>
      </div>
    </div>
  );
}
