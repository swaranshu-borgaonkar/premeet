import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactSalesPage from '@/app/contact-sales/page';

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// Mock useSearchParams
const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

describe('ContactSalesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset search params
    mockSearchParams.delete('plan');
    globalThis.fetch = vi.fn();
  });

  it('should render the page heading', () => {
    render(<ContactSalesPage />);
    expect(screen.getByText('Talk to our sales team')).toBeInTheDocument();
  });

  it('should render all required form fields', () => {
    render(<ContactSalesPage />);
    expect(screen.getByLabelText('First name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Last name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Work email *')).toBeInTheDocument();
    expect(screen.getByLabelText('Company / Practice name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Team size *')).toBeInTheDocument();
  });

  it('should render optional form fields', () => {
    render(<ContactSalesPage />);
    expect(screen.getByLabelText('Job title')).toBeInTheDocument();
    expect(screen.getByLabelText('Interested in')).toBeInTheDocument();
    expect(screen.getByLabelText('Anything else we should know?')).toBeInTheDocument();
  });

  it('should render the submit button with correct text', () => {
    render(<ContactSalesPage />);
    expect(screen.getByRole('button', { name: 'Get in Touch' })).toBeInTheDocument();
  });

  it('should render the plan selector with team and enterprise options', () => {
    render(<ContactSalesPage />);
    const planSelect = screen.getByLabelText('Interested in') as HTMLSelectElement;
    const options = Array.from(planSelect.querySelectorAll('option'));
    expect(options).toHaveLength(2);
    expect(options[0].value).toBe('team');
    expect(options[1].value).toBe('enterprise');
  });

  it('should render the team size dropdown with all options', () => {
    render(<ContactSalesPage />);
    const teamSizeSelect = screen.getByLabelText('Team size *') as HTMLSelectElement;
    const options = Array.from(teamSizeSelect.querySelectorAll('option'));
    const values = options.map((o) => o.value);
    expect(values).toContain('3-5');
    expect(values).toContain('6-10');
    expect(values).toContain('100+');
  });

  it('should display success message after successful form submission', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    render(<ContactSalesPage />);

    await userEvent.type(screen.getByLabelText('First name *'), 'Jane');
    await userEvent.type(screen.getByLabelText('Last name *'), 'Doe');
    await userEvent.type(screen.getByLabelText('Work email *'), 'jane@acme.com');
    await userEvent.type(screen.getByLabelText('Company / Practice name *'), 'Acme Inc');

    // Select team size
    fireEvent.change(screen.getByLabelText('Team size *'), { target: { value: '6-10' } });

    fireEvent.click(screen.getByRole('button', { name: 'Get in Touch' }));

    await waitFor(() => {
      expect(screen.getByText('Thanks for reaching out!')).toBeInTheDocument();
    });
  });

  it('should call the API endpoint with form data on submit', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    render(<ContactSalesPage />);

    await userEvent.type(screen.getByLabelText('First name *'), 'John');
    await userEvent.type(screen.getByLabelText('Last name *'), 'Smith');
    await userEvent.type(screen.getByLabelText('Work email *'), 'john@corp.com');
    await userEvent.type(screen.getByLabelText('Company / Practice name *'), 'Corp LLC');

    fireEvent.change(screen.getByLabelText('Team size *'), { target: { value: '11-25' } });

    fireEvent.click(screen.getByRole('button', { name: 'Get in Touch' }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('contact-sales'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('john@corp.com'),
        })
      );
    });
  });

  it('should show alert on submission failure', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});

    render(<ContactSalesPage />);

    await userEvent.type(screen.getByLabelText('First name *'), 'Jane');
    await userEvent.type(screen.getByLabelText('Last name *'), 'Doe');
    await userEvent.type(screen.getByLabelText('Work email *'), 'jane@fail.com');
    await userEvent.type(screen.getByLabelText('Company / Practice name *'), 'Fail Inc');

    fireEvent.change(screen.getByLabelText('Team size *'), { target: { value: '3-5' } });

    fireEvent.click(screen.getByRole('button', { name: 'Get in Touch' }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Something went wrong'));
    });

    alertSpy.mockRestore();
  });

  it('should render value propositions (Quick response, Personalized demo, etc.)', () => {
    render(<ContactSalesPage />);
    expect(screen.getByText('Quick response')).toBeInTheDocument();
    expect(screen.getByText('Personalized demo')).toBeInTheDocument();
    expect(screen.getByText('Security review')).toBeInTheDocument();
    expect(screen.getByText('Volume pricing')).toBeInTheDocument();
  });

  it('should include a privacy policy link in the form', () => {
    render(<ContactSalesPage />);
    const privacyLinks = screen.getAllByText('Privacy Policy');
    const formPrivacyLink = privacyLinks.find(
      (el) => el.closest('a')?.getAttribute('href') === '/privacy'
    );
    expect(formPrivacyLink).toBeTruthy();
  });

  it('should show Back to home link after successful submission', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    render(<ContactSalesPage />);

    await userEvent.type(screen.getByLabelText('First name *'), 'Jane');
    await userEvent.type(screen.getByLabelText('Last name *'), 'Doe');
    await userEvent.type(screen.getByLabelText('Work email *'), 'j@e.com');
    await userEvent.type(screen.getByLabelText('Company / Practice name *'), 'X');

    fireEvent.change(screen.getByLabelText('Team size *'), { target: { value: '3-5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Get in Touch' }));

    await waitFor(() => {
      const backLink = screen.getByText('Back to home');
      expect(backLink.closest('a')).toHaveAttribute('href', '/');
    });
  });
});
