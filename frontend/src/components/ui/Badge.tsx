import type { ReactNode } from 'react';

export type BadgeColor = 'default' | 'accent' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  children: ReactNode;
  color?: BadgeColor;
}

const COLOR_VARS: Record<BadgeColor, { bg: string; text: string }> = {
  default: { bg: 'var(--color-pill)', text: 'var(--color-pill-text)' },
  accent: { bg: 'var(--color-primary-bg)', text: 'var(--color-primary-text)' },
  success: { bg: 'var(--color-success-bg)', text: 'var(--color-success)' },
  warning: { bg: 'var(--color-warning-bg)', text: 'var(--color-warning)' },
  danger: { bg: 'var(--color-danger-bg)', text: 'var(--color-danger)' },
};

export function Badge({ children, color = 'default' }: BadgeProps) {
  const c = COLOR_VARS[color];
  return (
    <span
      style={{
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 20,
        background: c.bg,
        color: c.text,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {children}
    </span>
  );
}
