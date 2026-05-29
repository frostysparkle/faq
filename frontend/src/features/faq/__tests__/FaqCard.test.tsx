// Locks Dashboard Spec into regression tests:
//  - students NEVER see raw helpful/unhelpful counts (Change Spec §7.3)
//  - students NEVER see viewCount (Dashboard Spec)
//  - moderators DO see all of them
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PublicFaq } from '@samagama/shared';
import { FaqCard } from '../FaqCard';

vi.mock('../api', () => ({
  faqApi: {
    recordView: vi.fn().mockResolvedValue(undefined),
    submitFeedback: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mirrors the role-aware projection: students get no counts on the wire.
const studentFaq: PublicFaq = {
  id: 'f1',
  title: 'How do I download my NOC?',
  answer: 'Go to Documents > NOC.',
  categories: [{ id: 'c1', name: 'NOC', slug: 'noc' }],
  tags: [{ id: 't1', name: 'noc', slug: 'noc' }],
  status: 'published',
  hasUserFeedback: false,
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

const moderatorFaq: PublicFaq = {
  ...studentFaq,
  viewCount: 42,
  helpfulCount: 91,
  unhelpfulCount: 9,
};

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('<FaqCard>', () => {
  it('hides raw helpful/unhelpful counts from students', () => {
    renderWithClient(<FaqCard faq={studentFaq} role="student" />);
    expect(screen.queryByText(/91 helpful/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/9 unhelpful/i)).not.toBeInTheDocument();
  });

  it('hides viewCount from students', () => {
    // Even if the server projection ever leaks viewCount on a student row, the UI must not
    // render it. Use a fixture WITH viewCount and confirm the number 42 is not on screen.
    renderWithClient(<FaqCard faq={{ ...studentFaq, viewCount: 42 }} role="student" />);
    // The "42" appearing in any text node would be a regression. Look for the eye icon's number.
    expect(screen.queryByText('42')).not.toBeInTheDocument();
  });

  it('shows raw counts to moderators', () => {
    renderWithClient(<FaqCard faq={moderatorFaq} role="moderator" />);
    expect(screen.getByText(/91 helpful/i)).toBeInTheDocument();
    expect(screen.getByText(/9 unhelpful/i)).toBeInTheDocument();
  });

  it('shows viewCount to moderators', () => {
    renderWithClient(<FaqCard faq={moderatorFaq} role="moderator" />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('reveals helpful/unhelpful buttons for students after expanding', () => {
    renderWithClient(<FaqCard faq={studentFaq} role="student" />);
    fireEvent.click(screen.getByRole('button', { name: /how do i download my noc/i }));
    expect(screen.getByRole('button', { name: /^helpful$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /not helpful/i })).toBeInTheDocument();
  });

  it('replaces feedback buttons with thanks message after a vote was already cast', () => {
    renderWithClient(<FaqCard faq={{ ...studentFaq, hasUserFeedback: true }} role="student" />);
    fireEvent.click(screen.getByRole('button', { name: /how do i download my noc/i }));
    expect(screen.getByText(/thanks for your feedback/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^helpful$/i })).not.toBeInTheDocument();
  });
});
