import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HIPAA Compliance — Secure Clinical Note-Taking',
  description:
    'PrepMeet offers HIPAA-eligible deployment with BAA, AES-256 encryption, audit trails, and access controls. Purpose-built for healthcare providers who need compliant digital tools.',
  alternates: {
    canonical: 'https://prepmeet.com/hipaa',
  },
  openGraph: {
    title: 'HIPAA Compliance — Secure Clinical Note-Taking',
    description:
      'HIPAA-eligible deployment with BAA, AES-256 encryption, audit trails, and access controls for healthcare providers.',
    url: 'https://prepmeet.com/hipaa',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PrepMeet HIPAA Compliance',
    description:
      'HIPAA-eligible deployment with BAA, encryption, audit trails, and access controls for healthcare providers.',
  },
};

export default function HipaaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
