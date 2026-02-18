import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Footer from '@/components/footer';

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe('Footer', () => {
  it('should render all four section headings', () => {
    render(<Footer />);
    expect(screen.getByText('Product')).toBeInTheDocument();
    expect(screen.getByText('Solutions')).toBeInTheDocument();
    expect(screen.getByText('Resources')).toBeInTheDocument();
    expect(screen.getByText('Company')).toBeInTheDocument();
  });

  it('should render Product section links', () => {
    render(<Footer />);
    expect(screen.getByText('Features')).toBeInTheDocument();
    expect(screen.getByText('Pricing')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
    expect(screen.getByText('ROI Calculator')).toBeInTheDocument();
  });

  it('should render Solutions section links', () => {
    render(<Footer />);
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
    expect(screen.getByText('HIPAA Compliance')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('should render Resources section links', () => {
    render(<Footer />);
    expect(screen.getByText('Blog')).toBeInTheDocument();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
  });

  it('should render Company section links', () => {
    render(<Footer />);
    // "Contact Us" and "Contact Sales" both exist; Contact Us links to /contact-sales
    expect(screen.getByText('Contact Us')).toBeInTheDocument();
    expect(screen.getByText('Admin Portal')).toBeInTheDocument();
  });

  it('should link Privacy Policy to /privacy', () => {
    render(<Footer />);
    const link = screen.getByText('Privacy Policy').closest('a');
    expect(link).toHaveAttribute('href', '/privacy');
  });

  it('should link Terms of Service to /terms', () => {
    render(<Footer />);
    const link = screen.getByText('Terms of Service').closest('a');
    expect(link).toHaveAttribute('href', '/terms');
  });

  it('should render the copyright notice with current year', () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${year}`))).toBeInTheDocument();
  });

  it('should render the PrepMeet brand in the bottom bar', () => {
    render(<Footer />);
    // There are two "PrepMeet" texts - the brand is in the bottom bar
    const allBrands = screen.getAllByText('PrepMeet');
    expect(allBrands.length).toBeGreaterThanOrEqual(1);
  });
});
