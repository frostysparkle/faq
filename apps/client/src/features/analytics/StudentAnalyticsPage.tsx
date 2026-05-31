import { useState } from 'react';
import { BarChart3, CheckCircle, MessageCircle, Sparkles, Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../auth/AuthProvider';
import { useStudentHomeStats, useLeaderboard } from '../stats/queries';

type Range = 'day' | 'week' | 'month' | 'all';

export function StudentAnalyticsPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<Range>('all');
  const { data: stats } = useStudentHomeStats();
  const { data: leaderboard, isLoading: lbLoading } = useLeaderboard(range);

  if (!user) return null;

  return (
    <div>
      {/* Welcome banner */}
      <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 60%, #4c1d95 100%)', borderRadius: 20, padding: '28px 32px', marginBottom: 24, color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 12px 40px rgba(124,58,237,0.22)' }}>
        <div style={{ position: 'absolute', top: -40, right: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -50, right: 100, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Analytics</div>
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.02em' }}>{user.name}'s Performance ✨</div>
        <div style={{ fontSize: 12, opacity: 0.65 }}>Track your contributions, rank, and Spurti Points</div>
      </div>

      {/* Range chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['day', 'week', 'month', 'all'] as Range[]).map((r) => (
          <button key={r} onClick={() => setRange(r)} style={{
            fontSize: 13, fontWeight: 700, padding: '7px 18px', borderRadius: 20,
            border: `1.5px solid ${range === r ? 'var(--color-purple)' : 'var(--color-border)'}`,
            background: range === r ? 'var(--color-purple)' : 'var(--color-card)',
            color: range === r ? 'white' : 'var(--color-text-muted)',
            cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize', transition: 'all 0.15s',
          }}>{rangeLabel(r)}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 16, alignItems: 'flex-start' }}>
        <div>
          {/* Section heading */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-card)', boxShadow: '0 2px 8px rgba(124,58,237,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={16} color="var(--color-purple)" />
            </div>
            <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>Community Q&A Performance</span>
          </div>

          {/* Perf cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            <PerfCard label="Questions Answered" value={stats?.questionsYouAnswered ?? 0} sub="Approved answers, all-time" icon={MessageCircle} color="var(--color-success)" cardClass="mod-card-green" />
            <PerfCard label="Spurti Points" value={stats?.spurtiPoints ?? 0} sub="Live balance" icon={Sparkles} color="var(--color-purple)" cardClass="mod-card-purple" />
            <PerfCard label="Approved in range" value={leaderboard?.entries.find((e) => e.isMe)?.approvedAnswers ?? 0} sub={`Window: ${rangeLabel(range)}`} icon={CheckCircle} color="var(--color-primary)" cardClass="mod-card-blue" />
          </div>

          {/* Points bar chart */}
          <div className="mod-card mod-card-purple">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 20px 0' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-purple-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart3 size={17} color="var(--color-purple)" />
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
                Top contributors — {range === 'all' ? 'All-Time Points' : `${rangeLabel(range)} Answers`}
              </span>
            </div>
            <div style={{ padding: '14px 20px 20px' }}>
              {lbLoading && <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading…</div>}
              {leaderboard && <PointsBars entries={leaderboard.entries} range={range} />}
            </div>
          </div>
        </div>

        {/* Leaderboard sidebar */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-card)', boxShadow: '0 2px 8px rgba(245,158,11,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={16} color="#f59e0b" />
            </div>
            <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>Peer Ranking</span>
          </div>
          {lbLoading && <div className="mod-card mod-card-purple" style={{ padding: 20, fontSize: 13, color: 'var(--color-text-muted)' }}>Loading…</div>}
          {leaderboard && <LeaderboardCard entries={leaderboard.entries} myRank={leaderboard.myRank} currentUserId={user.id} range={range} />}
        </div>
      </div>
    </div>
  );
}

function PerfCard({ label, value, sub, icon: Icon, color, cardClass }: {
  label: string; value: number | string; sub: string;
  icon: typeof MessageCircle; color: string; cardClass: string;
}) {
  return (
    <div className={`mod-card ${cardClass}`} style={{ padding: '18px 16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 11, color, fontWeight: 600 }}>{sub}</div>
      <Icon size={64} color={color} style={{ position: 'absolute', bottom: -10, right: -10, opacity: 0.06 }} />
    </div>
  );
}

function PointsBars({ entries, range }: { entries: { userId: string; name: string; spurtiPoints: number; approvedAnswers: number; isMe?: boolean }[], range: Range }) {
  const top = entries.slice(0, 8);
  const getValue = (e: typeof entries[0]) => range === 'all' ? e.spurtiPoints : e.approvedAnswers;
  
  const data = top.map(e => ({
    name: e.isMe ? 'You' : e.name,
    value: getValue(e),
    isMe: e.isMe,
  })).reverse(); // Reverse so rank 1 is at the top in the horizontal chart

  return (
    <div style={{ height: 300, width: '100%', marginTop: 10 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--color-border)" />
          <XAxis type="number" hide />
          <YAxis 
            dataKey="name" 
            type="category" 
            axisLine={false} 
            tickLine={false}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 12, fontWeight: 500 }}
            width={80}
          />
          <Tooltip 
            cursor={{ fill: 'var(--color-input)', opacity: 0.4 }}
            contentStyle={{ borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-card)', fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}
            itemStyle={{ color: 'var(--color-text)' }}
            formatter={(value) => [value, range === 'all' ? 'Points' : 'Answers']}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.isMe ? 'var(--color-purple)' : 'var(--color-primary)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LeaderboardCard({ entries, myRank, currentUserId, range }: {
  entries: { rank: number; userId: string; name: string; spurtiPoints: number; approvedAnswers: number; isMe?: boolean }[];
  myRank?: number; currentUserId: string; range: Range;
}) {
  return (
    <div className="mod-card mod-card-purple" style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px 0' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trophy size={17} color="#f59e0b" />
        </div>
        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
          {range === 'all' ? 'All-Time Points' : `${rangeLabel(range)} Answers`}
        </span>
      </div>
      <div style={{ padding: '12px 0 8px' }}>
        {entries.map((e) => (
          <div key={e.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', background: e.userId === currentUserId ? 'var(--color-purple-bg)' : 'transparent', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ width: 26, fontSize: 13, fontWeight: 800, color: rankColor(e.rank), textAlign: 'center' }}>
              {e.rank <= 3 ? medalFor(e.rank) : `#${e.rank}`}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: e.userId === currentUserId ? 700 : 500, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.userId === currentUserId ? `${e.name} (You)` : e.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                {range === 'all' ? `${e.approvedAnswers} approved` : `${e.spurtiPoints} all-time pts`}
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>
              {range === 'all' ? `${e.spurtiPoints} pts` : `${e.approvedAnswers} ans`}
            </div>
          </div>
        ))}
      </div>
      {myRank && myRank > 20 && (
        <div style={{ padding: '10px 20px 14px', fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>
          Your rank: #{myRank}
        </div>
      )}
    </div>
  );
}

function rangeLabel(r: Range): string {
  if (r === 'day') return 'Daily';
  if (r === 'week') return 'Weekly';
  if (r === 'month') return 'Monthly';
  return 'Overall';
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
