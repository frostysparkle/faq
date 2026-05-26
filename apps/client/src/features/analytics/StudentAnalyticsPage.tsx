// Student Analytics — performance, peer ranking, Spurti Points leaderboard.
//
// Layout: a 2-column grid on wide screens (main content + sidebar leaderboard).
// Filters: weekly / monthly / overall (server-side range param).
import { useState } from 'react';
import { Sparkles, Trophy, MessageCircle, CheckCircle, BarChart3 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useAuth } from '../auth/AuthProvider';
import { useStudentHomeStats } from '../stats/queries';
import { useLeaderboard } from '../stats/queries';

type Range = 'day' | 'week' | 'month' | 'all';

export function StudentAnalyticsPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<Range>('all');
  const { data: stats } = useStudentHomeStats();
  const { data: leaderboard, isLoading: lbLoading } = useLeaderboard(range);

  if (!user) return null;

  return (
    <div>
      <SectionHeader
        title="Your Analytics"
        sub="Track your contributions, rank, and Spurti Points."
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <RangeChip active={range === 'day'} onClick={() => setRange('day')}>
          Daily
        </RangeChip>
        <RangeChip active={range === 'week'} onClick={() => setRange('week')}>
          Weekly
        </RangeChip>
        <RangeChip active={range === 'month'} onClick={() => setRange('month')}>
          Monthly
        </RangeChip>
        <RangeChip active={range === 'all'} onClick={() => setRange('all')}>
          Overall
        </RangeChip>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
          gap: 16,
          alignItems: 'flex-start',
        }}
      >
        <main>
          <SectionHeader title="Community Q&A Performance" />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <PerfCard
              label="Questions Answered"
              value={stats?.questionsYouAnswered ?? 0}
              sub="Approved answers, all-time"
              icon={MessageCircle}
              color="var(--color-success)"
            />
            <PerfCard
              label="Spurti Points"
              value={stats?.spurtiPoints ?? 0}
              sub="Live balance"
              icon={Sparkles}
              color="#7c3aed"
            />
            <PerfCard
              label="Approved in range"
              value={leaderboard?.entries.find((e) => e.isMe)?.approvedAnswers ?? 0}
              sub={`Window: ${rangeLabel(range)}`}
              icon={CheckCircle}
              color="var(--color-primary)"
            />
          </div>

          <Card>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <BarChart3 size={16} color="var(--color-primary)" />
              Top contributors — Spurti Points
            </div>
            {lbLoading && (
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading…</div>
            )}
            {leaderboard && <PointsBars entries={leaderboard.entries} />}
          </Card>
        </main>

        <aside>
          <SectionHeader title="Peer Ranking" />
          {lbLoading && <Card>Loading…</Card>}
          {leaderboard && (
            <LeaderboardCard
              entries={leaderboard.entries}
              myRank={leaderboard.myRank}
              currentUserId={user.id}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function PerfCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: typeof MessageCircle;
  color: string;
}) {
  return (
    <Card style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: `${color}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={20} color={color} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)' }}>{value}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{label}</div>
          <div style={{ fontSize: 11, color, marginTop: 1 }}>{sub}</div>
        </div>
      </div>
    </Card>
  );
}

function PointsBars({
  entries,
}: {
  entries: { userId: string; name: string; spurtiPoints: number; isMe?: boolean }[];
}) {
  const top = entries.slice(0, 8);
  const max = Math.max(1, ...top.map((e) => e.spurtiPoints));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {top.map((e) => (
        <div key={e.userId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              fontSize: 12,
              color: e.isMe ? 'var(--color-primary)' : 'var(--color-text-muted)',
              width: 90,
              fontWeight: e.isMe ? 700 : 500,
              flexShrink: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {e.isMe ? 'You' : e.name}
          </div>
          <div
            style={{
              flex: 1,
              height: 8,
              background: 'var(--color-input)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${(e.spurtiPoints / max) * 100}%`,
                background: e.isMe ? 'var(--color-primary)' : 'var(--color-primary-text)',
                borderRadius: 4,
              }}
            />
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, width: 36, textAlign: 'right' }}>
            {e.spurtiPoints}
          </div>
        </div>
      ))}
    </div>
  );
}

function LeaderboardCard({
  entries,
  myRank,
  currentUserId,
}: {
  entries: {
    rank: number;
    userId: string;
    name: string;
    spurtiPoints: number;
    approvedAnswers: number;
    isMe?: boolean;
  }[];
  myRank?: number;
  currentUserId: string;
}) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 16px',
          background: 'var(--color-input)',
          borderBottom: '1px solid var(--color-border)',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        <Trophy size={14} color="#f59e0b" />
        Spurti Points Leaderboard
      </div>
      <div>
        {entries.map((e) => (
          <div
            key={e.userId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              borderBottom: '1px solid var(--color-border)',
              background: e.userId === currentUserId ? 'var(--color-primary-bg)' : 'transparent',
            }}
          >
            <div
              style={{
                width: 26,
                fontSize: 12,
                fontWeight: 700,
                color: rankColor(e.rank),
                textAlign: 'center',
              }}
            >
              {e.rank <= 3 ? medalFor(e.rank) : `#${e.rank}`}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: e.userId === currentUserId ? 700 : 500,
                  color: 'var(--color-text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {e.userId === currentUserId ? `${e.name} (You)` : e.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                {e.approvedAnswers} approved answer{e.approvedAnswers === 1 ? '' : 's'}
              </div>
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--color-text)',
                whiteSpace: 'nowrap',
              }}
            >
              {e.spurtiPoints} pts
            </div>
          </div>
        ))}
      </div>
      {myRank && myRank > 20 && (
        <div
          style={{
            padding: '10px 16px',
            fontSize: 12,
            color: 'var(--color-text-muted)',
            textAlign: 'center',
          }}
        >
          Your rank: #{myRank}
        </div>
      )}
    </Card>
  );
}

function RangeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12,
        padding: '6px 14px',
        borderRadius: 20,
        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: active ? 'var(--color-primary)' : 'var(--color-card)',
        color: active ? 'white' : 'var(--color-text-muted)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontWeight: 500,
      }}
    >
      {children}
    </button>
  );
}

function rangeLabel(r: Range): string {
  if (r === 'day') return 'today';
  if (r === 'week') return 'last 7 days';
  if (r === 'month') return 'last 30 days';
  return 'all-time';
}

function rankColor(rank: number): string {
  if (rank === 1) return '#f59e0b';
  if (rank === 2) return '#94a3b8';
  if (rank === 3) return '#b45309';
  return 'var(--color-text-muted)';
}

function medalFor(rank: number): string {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
}
