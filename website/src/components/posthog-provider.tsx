'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initPostHog, posthog } from '@/lib/posthog';

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      posthog.capture('$pageview', { $current_url: window.location.href });
    }
  }, [pathname]);

  return <>{children}</>;
}
