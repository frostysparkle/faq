// Verifies the dev-only credentials panel:
//   - is rendered in dev mode
//   - exposes one button per role with auto-fill behavior
// The build-time `import.meta.env.DEV` guard is exercised implicitly because
// vitest runs in test mode where DEV === true. Production tree-shaking is a Vite
// build behavior outside this unit test's scope.
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../LoginPage';
import { DEV_ACCOUNTS } from '../DevCredentials';

const loginMock = vi.fn().mockResolvedValue(undefined);
vi.mock('../AuthProvider', () => ({
  useAuth: () => ({ user: null, isLoading: false, login: loginMock, logout: vi.fn() }),
}));

const renderLogin = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );

describe('<LoginPage> dev credentials panel', () => {
  it('renders in development mode', () => {
    renderLogin();
    expect(screen.getByTestId('dev-credentials')).toBeInTheDocument();
  });

  it('exposes a button for every dev role', () => {
    renderLogin();
    for (const account of DEV_ACCOUNTS) {
      expect(
        screen.getByRole('button', { name: new RegExp(account.label, 'i') }),
      ).toBeInTheDocument();
    }
  });

  it('auto-fills and submits the login form when a role is clicked', async () => {
    loginMock.mockClear();
    renderLogin();

    const studentBtn = screen.getByRole('button', { name: /student/i });
    await act(async () => {
      studentBtn.click();
    });

    expect(loginMock).toHaveBeenCalledTimes(1);
    expect(loginMock).toHaveBeenCalledWith({
      email: 'student@samagama.test',
      password: 'StudentDev!2024',
    });
  });
});
