import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BlogPage from '@/app/blog/page';

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe('BlogPage', () => {
  it('should render the page heading and description', () => {
    render(<BlogPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Blog' })).toBeInTheDocument();
    expect(
      screen.getByText(/Insights on session preparation, client management/)
    ).toBeInTheDocument();
  });

  it('should render all 5 blog post cards', () => {
    render(<BlogPage />);
    const titles = [
      'Why 2 Minutes of Session Prep Can Transform Your Client Relationships',
      'How AI Is Quietly Revolutionizing Service Professions',
      '5 Proven Strategies to Reduce Client No-Shows',
      'A Guide to HIPAA-Compliant Digital Note-Taking for Healthcare Providers',
      'Making the Switch: From Paper Notes to Digital Client Management',
    ];
    for (const title of titles) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it('should display the date for each post', () => {
    render(<BlogPage />);
    expect(screen.getByText('February 12, 2026')).toBeInTheDocument();
    expect(screen.getByText('February 5, 2026')).toBeInTheDocument();
    expect(screen.getByText('January 28, 2026')).toBeInTheDocument();
    expect(screen.getByText('January 20, 2026')).toBeInTheDocument();
    expect(screen.getByText('January 14, 2026')).toBeInTheDocument();
  });

  it('should display the category badge for each post', () => {
    render(<BlogPage />);
    // There may be multiple due to filter bar, use getAllByText
    expect(screen.getAllByText('Productivity').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('AI').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Compliance').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Practice Management').length).toBeGreaterThanOrEqual(2);
  });

  it('should display the reading time for each post', () => {
    render(<BlogPage />);
    expect(screen.getAllByText('6 min read').length).toBe(2); // Two posts with 6 min
    expect(screen.getByText('7 min read')).toBeInTheDocument();
    expect(screen.getByText('5 min read')).toBeInTheDocument();
    expect(screen.getByText('8 min read')).toBeInTheDocument();
  });

  it('should display the excerpt for each post', () => {
    render(<BlogPage />);
    expect(screen.getByText(/brief glance at context before a session/)).toBeInTheDocument();
    expect(screen.getByText(/AI is not just for software engineers/)).toBeInTheDocument();
    expect(screen.getByText(/No-shows cost service professionals/)).toBeInTheDocument();
    expect(screen.getByText(/Going digital with your clinical notes/)).toBeInTheDocument();
    expect(screen.getByText(/Still running your practice on paper/)).toBeInTheDocument();
  });

  it('should link each post card to the correct blog post URL', () => {
    render(<BlogPage />);
    const links = screen.getAllByRole('link');

    const expectedSlugs = [
      '/blog/why-session-prep-matters',
      '/blog/ai-for-service-professionals',
      '/blog/reducing-no-shows',
      '/blog/hipaa-compliant-note-taking',
      '/blog/from-paper-to-digital',
    ];

    for (const slug of expectedSlugs) {
      const matchingLink = links.find((link) => link.getAttribute('href') === slug);
      expect(matchingLink).toBeTruthy();
    }
  });

  it('should render all category filter buttons including All', () => {
    render(<BlogPage />);
    expect(screen.getByText('All')).toBeInTheDocument();
    // The 4 categories are also in the filter bar
    const productivityEls = screen.getAllByText('Productivity');
    expect(productivityEls.length).toBeGreaterThanOrEqual(2); // filter + post card(s)
  });

  it('should style the All filter as active (blue background)', () => {
    render(<BlogPage />);
    const allFilter = screen.getByText('All');
    expect(allFilter.className).toContain('bg-blue-600');
    expect(allFilter.className).toContain('text-white');
  });
});
