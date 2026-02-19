import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import PostHogProvider from '@/components/posthog-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PrepMeet — Pre-Appointment Context for Service Professionals',
  description:
    'Get 2-bullet context about your next client, 5 minutes before appointments. Built for therapists, lawyers, doctors, and advisors.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
