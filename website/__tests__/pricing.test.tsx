import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PricingPage from '@/app/pricing/page';

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe('PricingPage', () => {
  it('should render the page heading', () => {
    render(<PricingPage />);
    expect(screen.getByText('Simple, transparent pricing')).toBeInTheDocument();
  });

  it('should render all 4 tier names', () => {
    render(<PricingPage />);
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Individual')).toBeInTheDocument();
    // Team and Enterprise appear in nav/footer too, so use getAllByText
    expect(screen.getAllByText('Team').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Enterprise').length).toBeGreaterThanOrEqual(1);
  });

  it('should display correct prices', () => {
    render(<PricingPage />);
    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('$9')).toBeInTheDocument();
    expect(screen.getByText('$29')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('should display the correct CTA labels', () => {
    render(<PricingPage />);
    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.getByText('Start 14-Day Trial')).toBeInTheDocument();
    expect(screen.getByText('Start Team Trial')).toBeInTheDocument();
    // "Contact Sales" appears in nav/footer too
    expect(screen.getAllByText('Contact Sales').length).toBeGreaterThanOrEqual(1);
  });

  it('should link Get Started to /download', () => {
    render(<PricingPage />);
    const link = screen.getByText('Get Started').closest('a');
    expect(link).toHaveAttribute('href', '/download');
  });

  it('should link Start 14-Day Trial to /download', () => {
    render(<PricingPage />);
    const link = screen.getByText('Start 14-Day Trial').closest('a');
    expect(link).toHaveAttribute('href', '/download');
  });

  it('should link Start Team Trial to /contact-sales?plan=team', () => {
    render(<PricingPage />);
    const link = screen.getByText('Start Team Trial').closest('a');
    expect(link).toHaveAttribute('href', '/contact-sales?plan=team');
  });

  it('should link Contact Sales to /contact-sales?plan=enterprise', () => {
    render(<PricingPage />);
    // There may be multiple "Contact Sales" - get the one in the pricing card
    const links = screen.getAllByText('Contact Sales');
    const enterpriseLink = links.find(
      (el) => el.closest('a')?.getAttribute('href') === '/contact-sales?plan=enterprise'
    );
    expect(enterpriseLink).toBeTruthy();
  });

  it('should highlight the Individual plan as Most Popular', () => {
    render(<PricingPage />);
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
  });

  it('should show annual pricing for Individual and Team', () => {
    render(<PricingPage />);
    expect(screen.getByText('$89/year (save 18%)')).toBeInTheDocument();
    expect(screen.getByText('$290/seat/year (save 17%)')).toBeInTheDocument();
  });

  it('should show the 3 seat minimum for Team tier', () => {
    render(<PricingPage />);
    expect(screen.getByText('3 seat minimum')).toBeInTheDocument();
  });
});
