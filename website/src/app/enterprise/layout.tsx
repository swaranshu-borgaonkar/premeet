import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Enterprise — SSO, SCIM, HIPAA & Custom Deployment',
  description:
    'PrepMeet Enterprise includes SSO/SAML, SCIM provisioning, HIPAA-eligible deployment, custom AI prompts, dedicated support, and advanced analytics for large teams.',
  alternates: {
    canonical: 'https://prepmeet.com/enterprise',
  },
  openGraph: {
    title: 'Enterprise — SSO, SCIM, HIPAA & Custom Deployment',
    description:
      'SSO/SAML, SCIM provisioning, HIPAA-eligible deployment, custom AI prompts, and dedicated support for large organizations.',
    url: 'https://prepmeet.com/enterprise',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PrepMeet Enterprise',
    description:
      'SSO, SCIM, HIPAA compliance, custom AI prompts, and dedicated support for organizations.',
  },
};

export default function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
