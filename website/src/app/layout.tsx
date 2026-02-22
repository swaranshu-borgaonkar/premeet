import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import PostHogProvider from '@/components/posthog-provider';

const inter = Inter({ subsets: ['latin'] });

const SITE_URL = 'https://prepmeet.com';
const SITE_NAME = 'PrepMeet';
const DEFAULT_DESCRIPTION =
  'Get 2-bullet context about your next client, 5 minutes before appointments. Built for therapists, lawyers, doctors, and advisors.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'PrepMeet — Pre-Appointment Context for Service Professionals',
    template: '%s — PrepMeet',
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    'pre-appointment context',
    'session preparation',
    'client notes',
    'therapist tools',
    'lawyer tools',
    'doctor tools',
    'AI meeting prep',
    'Chrome extension',
    'appointment reminders',
    'client management',
    'HIPAA compliant notes',
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'PrepMeet — Pre-Appointment Context for Service Professionals',
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/opengraph-image.svg`,
        width: 1200,
        height: 630,
        alt: 'PrepMeet — Pre-appointment context for service professionals',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PrepMeet — Pre-Appointment Context for Service Professionals',
    description: DEFAULT_DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image.svg`],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-icon.svg', type: 'image/svg+xml' },
    ],
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  description: DEFAULT_DESCRIPTION,
  sameAs: [],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'sales',
    url: `${SITE_URL}/contact-sales`,
  },
};

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Chrome',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  description: DEFAULT_DESCRIPTION,
  url: SITE_URL,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareJsonLd),
          }}
        />
      </head>
      <body className={inter.className}>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
