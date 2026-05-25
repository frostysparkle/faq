import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  sub?: string;
  action?: ReactNode;
}

export function SectionHeader({ title, sub, action }: SectionHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 16,
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>{title}</div>
        {sub && (
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{sub}</div>
        )}
      </div>
      {action}
    </div>
  );
}
