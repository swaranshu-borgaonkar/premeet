import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';

export const metadata: Metadata = {
  title: 'Download PrepMeet for Chrome — Free Browser Extension',
  description:
    'Install the PrepMeet Chrome extension to get pre-appointment context about your next client, 5 minutes before meetings. Free for therapists, lawyers, doctors, and advisors.',
  alternates: {
    canonical: 'https://prepmeet.com/download',
  },
  openGraph: {
    title: 'Download PrepMeet for Chrome — Free Browser Extension',
    description:
      'Install the PrepMeet Chrome extension and get pre-appointment context about your next client, 5 minutes before meetings.',
    url: 'https://prepmeet.com/download',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Download PrepMeet — Free Chrome Extension',
    description:
      'Get pre-appointment context about your next client, 5 minutes before meetings. Free for therapists, lawyers, doctors, and advisors.',
  },
};

const CHROME_STORE_URL =
  'https://chromewebstore.google.com/detail/prepmeet/prepmeet-extension-id';

const steps = [
  {
    number: '1',
    title: 'Install the Extension',
    description:
      'Click "Add to Chrome" and confirm the installation. PrepMeet will appear in your browser toolbar.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
  {
    number: '2',
    title: 'Connect Your Calendar',
    description:
      'Sign in and connect your Google Calendar so PrepMeet can see your upcoming appointments.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    number: '3',
    title: 'Get Prepped',
    description:
      '5 minutes before each appointment, PrepMeet delivers a 2-bullet summary of your client context.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const faqs = [
  {
    question: 'Is it free?',
    answer:
      'Yes! PrepMeet is free to use for individual professionals. We offer paid team plans with additional features like shared workspaces and audit logs.',
  },
  {
    question: 'Which browsers are supported?',
    answer:
      'PrepMeet works on all Chromium-based browsers including Google Chrome, Microsoft Edge, Brave, Vivaldi, and Opera.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Absolutely. All data is encrypted in transit and at rest. We never share your client information with third parties. PrepMeet is designed with privacy-first principles for regulated industries like healthcare and legal.',
  },
];

export default function DownloadPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Chrome Extension
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Install PrepMeet for Chrome
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            Get 2-bullet context about your next client, delivered 5 minutes before every
            appointment. Built for therapists, lawyers, doctors, and advisors who want to
            walk into every meeting prepared.
          </p>
          <a
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            Add to Chrome — It&apos;s Free
          </a>
          <p className="text-sm text-gray-500 mt-4">
            Also works on Edge, Brave, and other Chromium browsers
          </p>
        </div>
      </section>

      {/* 3-Step Setup Guide */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-12">
            Get started in 3 simple steps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div
                key={step.number}
                className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:shadow-md transition"
              >
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-5">
                  {step.icon}
                </div>
                <div className="inline-flex items-center justify-center w-7 h-7 bg-blue-600 text-white rounded-full text-sm font-bold mb-3">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-12">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="bg-white rounded-xl border border-gray-200 p-6"
              >
                <h3 className="text-base font-semibold text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to prep smarter?</h2>
          <p className="text-gray-600 mb-8">
            Join service professionals who never walk into a meeting unprepared.
          </p>
          <a
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
          >
            Add to Chrome — It&apos;s Free
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
