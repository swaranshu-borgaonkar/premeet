import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ROI Calculator — See How Much Time PrepMeet Saves',
  description:
    'Calculate the return on investment from using PrepMeet. See how much time and money your team saves with automated pre-appointment preparation.',
  alternates: {
    canonical: 'https://prepmeet.com/roi-calculator',
  },
  openGraph: {
    title: 'ROI Calculator — See How Much Time PrepMeet Saves',
    description:
      'Calculate the return on investment from using PrepMeet. See how much time and money your team saves.',
    url: 'https://prepmeet.com/roi-calculator',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PrepMeet ROI Calculator',
    description:
      'Calculate how much time and money your team saves with automated pre-appointment preparation.',
  },
};

export default function RoiCalculatorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
