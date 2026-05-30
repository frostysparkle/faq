// Shared FAQ Management — admins and moderators see exactly the same surface (Dashboard Spec).
// Tabs: FAQs (default) | Categories | Tags.
import { useState } from 'react';
import { useFaqStats, useModeratorStats, useVotesTrend } from '../faq/queries';
import { FaqsAdminTab } from './tabs/FaqsAdminTab';
import { CategoriesAdminTab } from './tabs/CategoriesAdminTab';
import { TagsAdminTab } from './tabs/TagsAdminTab';
import { SectionHeader } from '../../components/ui/SectionHeader';

type Tab = 'faqs' | 'categories' | 'tags';

export function FaqManagementPage() {
  const [tab, setTab] = useState<Tab>('faqs');
  const { data: stats } = useFaqStats();
  const { data: modStats, isLoading: modLoading } = useModeratorStats();

  const { data: trend } = useVotesTrend();
  const pct = (n: number | undefined) => (modLoading ? 0 : (n ?? 0));
  const sv  = (n: number | undefined) => (modLoading ? '…' : (n ?? 0));

  return (
    <div>
      <SectionHeader title="FAQ Management" sub="Shared knowledge base — admins and moderators." />

      {/* ── 3 summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>

        {/* Helpful FAQs */}
        <SummaryCard
          color="var(--color-success)"
          cardBg="var(--color-success-bg)"
          iconBg="var(--color-success-bg)"
          icon={<ThumbsUpIcon color="var(--color-success)" />}
          title="Helpful FAQs"
          subtitle="Making a positive impact"
          trend={<TrendBox color="var(--color-success)" points={trend?.map(d => d.helpful)} />}
        >
          <RateRow
            color="var(--color-success)"
            ringTrackColor="var(--color-success-bg)"
            percentage={pct(modStats?.helpfulFaqs.percentage)}
            label="Helpful rate"
            sub={`Across ${sv(modStats?.helpfulFaqs.publishedTotal)} published FAQs`}
            badge={trend ? `${trend[trend.length - 1]?.helpful ?? 0} votes today` : 'Last 7 days'}
          />
        </SummaryCard>

        {/* Unhelpful FAQs */}
        <SummaryCard
          color="var(--color-danger)"
          cardBg="var(--color-danger-bg)"
          iconBg="var(--color-danger-bg)"
          icon={<ThumbsDownIcon color="var(--color-danger)" />}
          title="Unhelpful FAQs"
          subtitle="Needs improvement"
          trend={<TrendBox color="var(--color-danger)" points={trend?.map(d => d.unhelpful)} />}
        >
          <RateRow
            color="var(--color-danger)"
            ringTrackColor="var(--color-danger-bg)"
            percentage={pct(modStats?.unhelpfulFaqs.percentage)}
            label="Unhelpful rate"
            sub={`Across ${sv(modStats?.unhelpfulFaqs.publishedTotal)} published FAQs`}
            badge={trend ? `${trend[trend.length - 1]?.unhelpful ?? 0} votes today` : 'Last 7 days'}
          />
        </SummaryCard>

        {/* Flagged FAQs */}
        <SummaryCard
          color="var(--color-warning)"
          cardBg="var(--color-warning-bg)"
          iconBg="var(--color-warning-bg)"
          icon={<FlagIcon color="var(--color-warning)" />}
          title="Flagged FAQs"
          subtitle="Requires attention"
          trend={<TrendBox color="var(--color-warning)" points={trend?.map(d => d.flagged)} />}
        >
          {/* Total flagged — full-width row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '4px 0 14px' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--color-danger-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
            }}>
              <AlertCircleIcon color="var(--color-danger)" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 2 }}>Total flagged</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.04em', lineHeight: 1 }}>{sv(modStats?.flaggedFaqs.total)}</div>
              <div style={{ fontSize: 11, color: 'var(--color-danger)', fontWeight: 600, marginTop: 3 }}>Open or under review flags</div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--color-border)', margin: '0 0 14px' }} />

          {/* Today + This week — 2-col */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FlaggedMini
              icon={<TriangleIcon color="var(--color-warning)" />}
              iconBg="var(--color-warning-bg)"
              label="Flagged today"
              value={sv(modStats?.flaggedFaqs.today)}
              sub="New flags since midnight"
              subColor="var(--color-warning)"
            />
            <FlaggedMini
              icon={<ClockIcon color="var(--color-warning)" />}
              iconBg="var(--color-warning-bg)"
              label="Flagged this week"
              value={sv(modStats?.flaggedFaqs.thisWeek)}
              sub="Flags in the last 7 days"
              subColor="var(--color-warning)"
            />
          </div>
        </SummaryCard>
      </div>

      {/* ── Tab bar ── */}
      <div role="tablist" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <TabButton active={tab === 'faqs'}       onClick={() => setTab('faqs')}>FAQs</TabButton>
        <TabButton active={tab === 'categories'} onClick={() => setTab('categories')}>Categories</TabButton>
        <TabButton active={tab === 'tags'}       onClick={() => setTab('tags')}>Tags</TabButton>
      </div>

      {tab === 'faqs'       && <FaqsAdminTab flaggedCount={stats?.flaggedCount ?? 0} />}
      {tab === 'categories' && <CategoriesAdminTab />}
      {tab === 'tags'       && <TagsAdminTab />}
    </div>
  );
}

// ─── SummaryCard shell ────────────────────────────────────────────────────────
// Matches Moderation Queue card style: 22px radius, simple shadow, 36px
// rounded-square icon (10px radius), tinted icon bg, colored stroke icon.

function SummaryCard({
  color, cardBg, iconBg, icon, title, subtitle, children, trend,
}: {
  color: string; cardBg: string; iconBg: string;
  icon: React.ReactNode; title: string; subtitle: string;
  children: React.ReactNode; trend: React.ReactNode;
}) {
  return (
    <div style={{
      borderRadius: 22,
      background: cardBg,
      padding: '18px 20px 16px',
      boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header — mirrors Moderation Queue CardHeader */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 18 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginRight: 10,
          border: `1px solid ${color}30`,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{subtitle}</div>
        </div>
        <button style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 4, color: 'var(--color-text-muted)', fontSize: 16, lineHeight: 1,
        }}>···</button>
      </div>

      {/* Content grows to fill — pushes trend to the bottom */}
      <div style={{ flex: 1 }}>{children}</div>
      {trend}
    </div>
  );
}

// ─── RateRow (donut ring + label + badge) ────────────────────────────────────

function RateRow({
  color, ringTrackColor, percentage, label, sub, badge,
}: {
  color: string; ringTrackColor: string;
  percentage: number; label: string; sub: string; badge: string;
}) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(percentage / 100, 1) * circ;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 16 }}>
      {/* Donut ring */}
      <div style={{ position: 'relative', width: 106, height: 106, flexShrink: 0 }}>
        <svg width="106" height="106" viewBox="0 0 106 106">
          <circle cx="53" cy="53" r={r} fill="none" stroke={ringTrackColor} strokeWidth="9" />
          <circle cx="53" cy="53" r={r} fill="none" stroke={color} strokeWidth="9"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            transform="rotate(-90 53 53)" />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.04em',
        }}>
          {percentage}%
        </div>
      </div>

      {/* Right side */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 12, color, fontWeight: 600, marginBottom: 10 }}>{sub}</div>
        {/* Trend badge — card bg with colored text + border */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'var(--color-card)',
          border: `1px solid var(--color-border)`,
          borderRadius: 8,
          padding: '4px 10px',
          fontSize: 11, fontWeight: 700, color,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
          {badge}
        </div>
      </div>
    </div>
  );
}

// ─── FlaggedMini ──────────────────────────────────────────────────────────────

function FlaggedMini({ icon, iconBg, label, value, sub, subColor }: {
  icon: React.ReactNode; iconBg: string;
  label: string; value: number | string; sub: string; subColor: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{
        width: 34, height: 34, borderRadius: 9,
        background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: subColor, fontWeight: 600, marginTop: 3 }}>{sub}</div>
      </div>
    </div>
  );
}

// ─── TrendBox + Sparkline ─────────────────────────────────────────────────────

function TrendBox({ color, points }: { color: string; points?: number[] }) {
  return (
    <div style={{
      borderRadius: 12,
      background: 'var(--color-card)',
      border: '1px solid var(--color-border)',
      padding: '10px 14px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500, marginBottom: 8 }}>
        Trend (last 7 days)
      </div>
      <Sparkline color={color} points={points} />
    </div>
  );
}

function Sparkline({ color, points }: { color: string; points?: number[] }) {
  const W = 340, H = 50;

  // Use real data if available; fall back to a flat zero line.
  const rawValues = points && points.length > 0 ? points : [0, 0, 0, 0, 0, 0, 0];
  const vals = rawValues.slice(-7); // Ensure at most 7 points.
  while (vals.length < 7) vals.unshift(0);

  const maxVal = Math.max(...vals, 1); // Avoid division by zero.
  // Map values to Y coords: higher value → lower Y (top of SVG).
  const ys = vals.map(v => H * 0.9 - (v / maxVal) * (H * 0.8));
  const xs = vals.map((_, i) => i * (W / (vals.length - 1)));

  const path = ys.reduce((acc, y, i) => {
    const x = xs[i];
    if (i === 0) return `M ${x} ${y}`;
    const px = xs[i - 1], py = ys[i - 1];
    const cx = px + (x - px) / 2;
    return `${acc} C ${cx} ${py} ${cx} ${y} ${x} ${y}`;
  }, '');

  // Day labels: Mon–Sun abbreviations for the last 7 days.
  const dayLabels = vals.map((_, i) => {
    const d = new Date(Date.now() - (vals.length - 1 - i) * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  });

  return (
    <div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {/* Gradient fill under the line */}
        <defs>
          <linearGradient id={`grad-${color.replace(/[^a-z]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${path} L ${xs[xs.length - 1]} ${H} L ${xs[0]} ${H} Z`}
          fill={`url(#grad-${color.replace(/[^a-z]/gi, '')})`}
        />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {ys.map((y, i) => (
          <circle key={i} cx={xs[i]} cy={y} r={i === ys.length - 1 ? 4.5 : 3} fill={color} />
        ))}
      </svg>
      {/* Day labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {dayLabels.map((label, i) => (
          <span key={i} style={{ fontSize: 9, color: 'var(--color-text-muted)', minWidth: 0 }}>{label}</span>
        ))}
      </div>
      {/* Value labels on hover tooltip substitute — show min/max */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 9, color, fontWeight: 600 }}>Min: {Math.min(...vals)}</span>
        <span style={{ fontSize: 9, color, fontWeight: 600 }}>Max: {Math.max(...vals)}</span>
      </div>
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        fontSize: 13, fontWeight: 500, padding: '6px 16px', borderRadius: 8,
        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: active ? 'var(--color-primary)' : 'var(--color-card)',
        color: active ? 'white' : 'var(--color-text-muted)',
        cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

// ─── SVG icon components ──────────────────────────────────────────────────────

function ThumbsUpIcon({ color = 'var(--color-success)' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function ThumbsDownIcon({ color = 'var(--color-danger)' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
      <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
    </svg>
  );
}

function FlagIcon({ color = 'var(--color-warning)' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function AlertCircleIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function TriangleIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ClockIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
