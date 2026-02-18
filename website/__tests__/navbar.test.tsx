import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Navbar from '@/components/navbar';

// Mock next/link to render a plain anchor tag
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe('Navbar', () => {
  it('should render the PrepMeet brand name', () => {
    render(<Navbar />);
    expect(screen.getByText('PrepMeet')).toBeInTheDocument();
  });

  it('should render all navigation links', () => {
    render(<Navbar />);
    expect(screen.getByText('Features')).toBeInTheDocument();
    expect(screen.getByText('Pricing')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Blog')).toBeInTheDocument();
  });

  it('should render the Install Free CTA button', () => {
    render(<Navbar />);
    const cta = screen.getByText('Install Free');
    expect(cta).toBeInTheDocument();
    expect(cta.closest('a')).toHaveAttribute('href', '/download');
  });

  it('should link Features to /features', () => {
    render(<Navbar />);
    const link = screen.getByText('Features').closest('a');
    expect(link).toHaveAttribute('href', '/features');
  });

  it('should link Pricing to /pricing', () => {
    render(<Navbar />);
    const link = screen.getByText('Pricing').closest('a');
    expect(link).toHaveAttribute('href', '/pricing');
  });

  it('should link Enterprise to /enterprise', () => {
    render(<Navbar />);
    const link = screen.getByText('Enterprise').closest('a');
    expect(link).toHaveAttribute('href', '/enterprise');
  });

  it('should render the logo linking to home page', () => {
    render(<Navbar />);
    const brandLink = screen.getByText('PrepMeet').closest('a');
    expect(brandLink).toHaveAttribute('href', '/');
  });
});
