// ⚠️ DEV-ONLY — REMOVE BEFORE PRODUCTION RELEASE.
//
// Renders a panel of pre-seeded test accounts (admin / moderator / student) so the team
// can switch roles with one click during development. The whole file is gated behind
// `import.meta.env.DEV` at the call site, so Vite tree-shakes it out of production bundles.
//
// To remove cleanly:
//   1. Delete this file.
//   2. Delete the `<DevCredentials …/>` block in LoginPage.tsx (search for "DEV-ONLY").
//   3. Delete the matching seed entry in apps/server/src/scripts/seed-dev-users.ts.
//
// These credentials must match the seed script. Update both together.

import type { LoginInput } from '@samagama/shared';

export interface DevAccount {
  role: 'admin' | 'moderator' | 'student';
  label: string;
  email: string;
  password: string;
  description: string;
}

export const DEV_ACCOUNTS: readonly DevAccount[] = [
  {
    role: 'admin',
    label: 'Admin',
    email: 'admin@samagama.test',
    password: 'AdminDev!2024',
    description: 'Full system access',
  },
  {
    role: 'moderator',
    label: 'Moderator',
    email: 'moderator@samagama.test',
    password: 'ModDev!2024',
    description: 'Reviews answers and flags',
  },
  {
    role: 'student',
    label: 'Student',
    email: 'student@samagama.test',
    password: 'StudentDev!2024',
    description: 'Default student view',
  },
] as const;

interface DevCredentialsProps {
  onSelect: (creds: LoginInput) => void;
}

export function DevCredentials({ onSelect }: DevCredentialsProps) {
  return (
    <div
      data-testid="dev-credentials"
      style={{
        marginTop: 18,
        padding: 14,
        border: '1px dashed var(--color-warning)',
        borderRadius: 10,
        background: 'var(--color-warning-bg)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--color-warning)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: 6,
        }}
      >
        Dev-only · Test Accounts
      </div>
      <p
        style={{
          margin: '0 0 10px',
          fontSize: 12,
          color: 'var(--color-text-muted)',
          lineHeight: 1.5,
        }}
      >
        Click a role to auto-fill credentials. Visible only in development builds and removed before
        release.
      </p>

      <div style={{ display: 'grid', gap: 6 }}>
        {DEV_ACCOUNTS.map((account) => (
          <button
            key={account.role}
            type="button"
            onClick={() => onSelect({ email: account.email, password: account.password })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '8px 12px',
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              cursor: 'pointer',
              color: 'var(--color-text)',
              fontFamily: 'inherit',
              textAlign: 'left',
              transition: 'transform 0.1s ease, border-color 0.1s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{account.label}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                {account.email} · {account.description}
              </div>
            </div>
            <span
              aria-hidden="true"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--color-primary)',
                whiteSpace: 'nowrap',
              }}
            >
              Use →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
