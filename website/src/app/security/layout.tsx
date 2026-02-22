import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Security — How PrepMeet Protects Your Data',
  description:
    'PrepMeet uses AES-256 encryption, TLS 1.3, row-level security, and SOC 2 Type II compliance to protect sensitive client data. GDPR compliant with HIPAA-eligible deployment.',
  alternates: {
    canonical: 'https://prepmeet.com/security',
  },
  openGraph: {
    title: 'Security — How PrepMeet Protects Your Data',
    description:
      'AES-256 encryption, TLS 1.3, row-level security, SOC 2 Type II compliance, and HIPAA-eligible deployment.',
    url: 'https://prepmeet.com/security',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PrepMeet Security — Enterprise-Grade Data Protection',
    description:
      'AES-256 encryption, SOC 2 Type II, GDPR, and HIPAA-eligible deployment for service professionals.',
  },
};

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
