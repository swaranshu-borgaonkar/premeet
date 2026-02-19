import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RoiCalculatorPage from '@/app/roi-calculator/page';

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe('RoiCalculatorPage', () => {
  it('should render the page heading', () => {
    render(<RoiCalculatorPage />);
    expect(screen.getByText('Calculate your time savings')).toBeInTheDocument();
  });

  it('should render the ROI Calculator badge', () => {
    render(<RoiCalculatorPage />);
    expect(screen.getAllByText('ROI Calculator').length).toBeGreaterThanOrEqual(1);
  });

  it('should render all four input sliders', () => {
    render(<RoiCalculatorPage />);
    expect(screen.getByText('Number of professionals')).toBeInTheDocument();
    expect(screen.getByText('Average hourly rate')).toBeInTheDocument();
    expect(screen.getByText('Meetings per week (per person)')).toBeInTheDocument();
    expect(screen.getByText('Minutes saved per meeting')).toBeInTheDocument();
  });

  it('should display default values for the sliders', () => {
    render(<RoiCalculatorPage />);
    // Default: 10 professionals, $150 rate, 20 meetings, 5 min saved
    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(4);
    expect(sliders[0]).toHaveValue('10');
    expect(sliders[1]).toHaveValue('150');
    expect(sliders[2]).toHaveValue('20');
    expect(sliders[3]).toHaveValue('5');
  });

  it('should calculate correct default savings values', () => {
    render(<RoiCalculatorPage />);
    // Default: 10 pros * 20 meetings * 5 min = 1000 min/week
    expect(screen.getByText('1000 minutes')).toBeInTheDocument();
    // 1000/60 = 16.7 hrs
    expect(screen.getByText('16.7 hrs')).toBeInTheDocument();
  });

  it('should update calculations when the professionals slider changes', () => {
    render(<RoiCalculatorPage />);
    const sliders = screen.getAllByRole('slider');
    const profSlider = sliders[0];

    // Change from 10 to 20 professionals
    fireEvent.change(profSlider, { target: { value: '20' } });

    // 20 * 20 * 5 = 2000 min/week
    expect(screen.getByText('2000 minutes')).toBeInTheDocument();
  });

  it('should update weekly hours saved when minutes saved changes', () => {
    render(<RoiCalculatorPage />);
    const sliders = screen.getAllByRole('slider');
    const minutesSlider = sliders[3];

    // Change from 5 to 10 minutes saved
    fireEvent.change(minutesSlider, { target: { value: '10' } });

    // 10 pros * 20 meetings * 10 min = 2000 min = 33.3 hrs
    expect(screen.getByText('2000 minutes')).toBeInTheDocument();
    expect(screen.getByText('33.3 hrs')).toBeInTheDocument();
  });

  it('should show the weekly prep time comparison section', () => {
    render(<RoiCalculatorPage />);
    expect(screen.getByText('Weekly prep time comparison')).toBeInTheDocument();
    expect(screen.getByText('Without PrepMeet')).toBeInTheDocument();
    expect(screen.getByText('With PrepMeet')).toBeInTheDocument();
    expect(screen.getAllByText('Time saved').length).toBeGreaterThanOrEqual(1);
  });

  it('should render the annual impact summary section', () => {
    render(<RoiCalculatorPage />);
    expect(screen.getByText('Annual impact summary')).toBeInTheDocument();
    expect(screen.getByText('hours saved per year')).toBeInTheDocument();
    expect(screen.getByText('gross annual savings')).toBeInTheDocument();
    expect(screen.getByText('annual PrepMeet cost')).toBeInTheDocument();
    expect(screen.getByText('net annual savings')).toBeInTheDocument();
  });

  it('should render the how we calculate section with 4 steps', () => {
    render(<RoiCalculatorPage />);
    expect(screen.getByText('How we calculate')).toBeInTheDocument();
    // The text is split across elements with <strong> tags, use custom matcher with exact element check
    const steps = document.querySelectorAll('.bg-gray-50.rounded-lg p');
    const stepTexts = Array.from(steps).map((el) => el.textContent);
    expect(stepTexts.some((t) => t?.includes('Professionals') && t?.includes('Meetings/week'))).toBe(true);
    expect(stepTexts.some((t) => t?.includes('Dollar savings') && t?.includes('hourly rate'))).toBe(true);
    expect(stepTexts.some((t) => t?.includes('ROI') && t?.includes('Annual savings'))).toBe(true);
    expect(stepTexts.some((t) => t?.includes('PrepMeet cost') && t?.includes('$9/mo'))).toBe(true);
  });

  it('should use $9/mo pricing for a single professional', () => {
    render(<RoiCalculatorPage />);
    const sliders = screen.getAllByRole('slider');

    // Set to 1 professional
    fireEvent.change(sliders[0], { target: { value: '1' } });

    // Monthly cost should be $9 for individual
    expect(screen.getByText(/PrepMeet cost: \$9\/mo/)).toBeInTheDocument();
  });

  it('should use $29/seat/mo pricing for teams', () => {
    render(<RoiCalculatorPage />);
    // Default is 10 professionals => $290/mo
    expect(screen.getByText(/PrepMeet cost: \$290\/mo/)).toBeInTheDocument();
  });

  it('should render the CTA section with Start Free Trial link', () => {
    render(<RoiCalculatorPage />);
    const trialLink = screen.getByText('Start Free Trial');
    expect(trialLink.closest('a')).toHaveAttribute('href', '/download');
  });

  it('should render the Contact Sales link in CTA section', () => {
    render(<RoiCalculatorPage />);
    const links = screen.getAllByText('Contact Sales');
    const mailtoLink = links.find((el) => el.closest('a')?.getAttribute('href')?.includes('mailto:'));
    expect(mailtoLink).toBeTruthy();
  });

  it('should calculate annual ROI correctly for default values', () => {
    render(<RoiCalculatorPage />);
    // Default: 10 pros, $150/hr, 20 meetings, 5 min saved
    // Weekly savings = (10*20*5/60) * 150 = 16.667 * 150 = $2500
    // Annual savings = 2500 * 52 = $130,000
    // Annual cost = 10 * 29 * 12 = $3,480
    // ROI = (130000 - 3480) / 3480 * 100 = 3636%
    // The page rounds: Math.round(annualROI)
    expect(screen.getByText('3636%')).toBeInTheDocument();
  });
});
