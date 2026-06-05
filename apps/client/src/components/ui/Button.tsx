// Shared button primitive. Forwards all native <button> props and layers on a
// `variant` (color intent) and `size`. Styling uses theme CSS variables.
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'success' | 'warning';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
}

const SIZES: Record<Size, { fontSize: number; padding: string }> = {
  sm: { fontSize: 12, padding: '5px 12px' },
  md: { fontSize: 13, padding: '8px 16px' },
  lg: { fontSize: 14, padding: '10px 20px' },
};

const VARIANTS: Record<Variant, { background: string; color: string; border?: string }> = {
  primary: { background: 'var(--color-primary)', color: 'white' },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-border)',
  },
  danger: { background: 'var(--color-danger-bg)', color: 'var(--color-danger)' },
  success: { background: 'var(--color-success-bg)', color: 'var(--color-success)' },
  warning: { background: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 8,
        fontWeight: 500,
        border: v.border ?? 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: 'opacity 0.15s, transform 0.05s',
        fontFamily: 'inherit',
        ...v,
        ...s,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
