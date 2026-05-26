// Single card showing how many open community questions fall into each idle bucket.
// Three buckets are stacked vertically with dividers, each row is clickable.
// Reused on Student Home (inline with stat cards), Moderator Overview, and Admin Overview.
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, Flame } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { useCommunityIdleBuckets } from './queries';
import type { IdleBucket } from './api';

export function IdleBucketCards({ style }: { style?: React.CSSProperties }) {
  const { data, isLoading } = useCommunityIdleBuckets();
  const navigate = useNavigate();

  const goToBucket = (bucket: IdleBucket) => navigate(`/community?idle=${bucket}`);

  const buckets = [
    {
      label: 'Active in last 24h',
      sub: 'Open Q&A with recent activity',
      value: data?.last24h ?? (isLoading ? '…' : 0),
      icon: Flame,
      color: 'var(--color-success)',
      bucket: 'last24h' as IdleBucket,
    },
    {
      label: 'Idle > 3 days',
      sub: 'Needs a nudge',
      value: data?.over3days ?? (isLoading ? '…' : 0),
      icon: Clock,
      color: 'var(--color-warning)',
      bucket: 'over3days' as IdleBucket,
    },
    {
      label: 'Idle > 1 week',
      sub: 'Stalled — review or close',
      value: data?.over1week ?? (isLoading ? '…' : 0),
      icon: AlertTriangle,
      color: 'var(--color-danger)',
      bucket: 'over1week' as IdleBucket,
    },
  ];

  return (
    <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 24, ...style }}>
      {buckets.map(({ label, sub, value, icon: Icon, color, bucket }, i) => (
        <button
          key={bucket}
          onClick={() => goToBucket(bucket)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: `${color}22`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={17} color={color} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>
                {value}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </div>
            <div style={{ fontSize: 11, color, marginTop: 1 }}>{sub}</div>
          </div>
        </button>
      ))}
    </Card>
  );
}
