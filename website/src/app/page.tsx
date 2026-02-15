import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              P
            </div>
            <span className="font-bold text-xl">PrepMeet</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/features" className="text-gray-600 hover:text-gray-900">
              Features
            </Link>
            <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
              Pricing
            </Link>
            <Link href="/blog" className="text-gray-600 hover:text-gray-900">
              Blog
            </Link>
            <Link
              href="/download"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Install Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
          Your professional memory, automated
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Never lose context
          <br />
          <span className="text-blue-600">between meetings</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          PrepMeet creates an unbroken thread of context across every client
          interaction. 2-bullet summaries, 5 minutes before every appointment.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/download"
            className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-700 transition"
          >
            Add to Chrome — Free
          </Link>
          <Link
            href="/features"
            className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-50 transition"
          >
            See How It Works
          </Link>
        </div>
      </section>

      {/* 3-Step Value Prop */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16">
            The continuum — every meeting builds on the last
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">Connect your calendar</h3>
              <p className="text-gray-600">
                Link Google or Microsoft Calendar. We detect your upcoming
                appointments automatically.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">Jot quick notes after</h3>
              <p className="text-gray-600">
                After each session, capture a quick summary. Type or use voice
                input — it takes 30 seconds.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">Get prepped automatically</h3>
              <p className="text-gray-600">
                5 minutes before your next meeting, get 2 AI-generated bullet
                points with the context you need.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Built For */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16">
            Built for professionals who never have enough time
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: 'Therapists',
                desc: 'Remember key themes and treatment progress between sessions',
              },
              {
                title: 'Lawyers',
                desc: 'Track case status, deadlines, and client concerns',
              },
              {
                title: 'Doctors',
                desc: 'Recall ongoing concerns and follow-up items at a glance',
              },
              {
                title: 'Advisors',
                desc: 'Stay on top of client goals, action items, and relationship context',
              },
            ].map((prof) => (
              <div
                key={prof.title}
                className="p-6 rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-sm transition"
              >
                <h3 className="font-semibold text-lg mb-2">{prof.title}</h3>
                <p className="text-gray-600 text-sm">{prof.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Start your 14-day free trial
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            No credit card required. Full access to all features.
          </p>
          <Link
            href="/download"
            className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-50 transition"
          >
            Add to Chrome — Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">
              P
            </div>
            <span className="font-semibold">PrepMeet</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-600">
            <Link href="/privacy" className="hover:text-gray-900">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-gray-900">
              Terms of Service
            </Link>
            <Link href="/security" className="hover:text-gray-900">
              Security
            </Link>
          </div>
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} PrepMeet. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
