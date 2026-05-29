import type { CSSProperties, ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
  as?: 'div' | 'button' | 'article';
}

export function Card({ children, style, onClick, as: Tag = 'div' }: CardProps) {
  return (
    <Tag
      onClick={onClick}
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: '18px 20px',
        boxShadow: 'var(--shadow-card)',
        textAlign: 'left',
        width: '100%',
        cursor: onClick ? 'pointer' : 'default',
        font: 'inherit',
        color: 'inherit',
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
