import { useState } from 'react';
import { CheckCircle, MessageCircle, Sparkles, Trophy } from 'lucide-react';
import { SPURTI_POINTS } from '@samagama/shared';
import { useAuth } from '../auth/AuthProvider';
import { useStudentHomeStats, useLeaderboard } from '../stats/queries';

type Range = 'week' | 'month' | 'all';

export function StudentAnalyticsPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<Range>('all');
  const { data: stats } = useStudentHomeStats();
  const { data: leaderboard, isLoading: lbLoading } = useLeaderboard(range);

  if (!user) return null;

  return (
    <div>
      {/* Welcome banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 60%, #4c1d95 100%)',
          borderRadius: 20,
          padding: '28px 32px',
          marginBottom: 24,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(124,58,237,0.22)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -30,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -50,
            right: 100,
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          }}
        />
        <div
          style={{
            fontSize: 11,
            opacity: 0.6,
            marginBottom: 4,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Analytics
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.02em' }}>
          {user.name}'s Performance ✨
        </div>
        <div style={{ fontSize: 12, opacity: 0.65 }}>
          Track your contributions, rank, and Spurti Points
        </div>
      </div>

      {/* Range chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['week', 'month', 'all'] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            style={{
              fontSize: 13,
              fontWeight: 700,
              padding: '7px 18px',
              borderRadius: 20,
              border: `1.5px solid ${range === r ? 'var(--color-purple)' : 'var(--color-border)'}`,
              background: range === r ? 'var(--color-purple)' : 'var(--color-card)',
              color: range === r ? 'white' : 'var(--color-text-muted)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            {rangeLabel(r)}
          </button>
        ))}
      </div>

      {/* Performance summary cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 28,
        }}
      >
        <PerfCard
          label="Questions Answered"
          value={stats?.questionsYouAnswered ?? 0}
          sub="Approved answers, all-time"
          icon={MessageCircle}
          color="var(--color-success)"
          cardClass="mod-card-green"
        />
        <PerfCard
          label="Spurti Points"
          value={stats?.spurtiPoints ?? 0}
          sub="Live balance"
          icon={Sparkles}
          color="var(--color-purple)"
          cardClass="mod-card-purple"
        />
        <PerfCard
          label={range === 'all' ? 'All-Time Points' : `${rangeLabel(range)} Points Earned`}
          value={
            range === 'all'
              ? (stats?.spurtiPoints ?? 0)
              : periodPoints(leaderboard?.entries.find((e) => e.isMe)?.approvedAnswers ?? 0)
          }
          sub={range === 'all' ? 'Cumulative balance' : `${rangeLabel(range)} window`}
          icon={CheckCircle}
          color="var(--color-primary)"
          cardClass="mod-card-blue"
        />
      </div>

      {/* Leaderboard heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'var(--color-card)',
            boxShadow: '0 2px 8px rgba(245,158,11,0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Trophy size={16} color="#f59e0b" />
        </div>
        <span
          style={{
            fontSize: 19,
            fontWeight: 800,
            color: 'var(--color-text)',
            letterSpacing: '-0.02em',
          }}
        >
          Peer Ranking — {rangeLabel(range)} Spurti Points
        </span>
      </div>

      {lbLoading && (
        <div
          className="mod-card"
          style={{
            padding: 32,
            fontSize: 13,
            color: 'var(--color-text-muted)',
            textAlign: 'center',
          }}
        >
          Loading leaderboard…
        </div>
      )}
      {leaderboard && (
        <KaggleLeaderboard
          entries={leaderboard.entries}
          myRank={leaderboard.myRank}
          currentUserId={user.id}
          currentUserName={user.name}
          range={range}
        />
      )}
    </div>
  );
}

function PerfCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  cardClass,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: typeof MessageCircle;
  color: string;
  cardClass: string;
}) {
  return (
    <div
      className={`mod-card ${cardClass}`}
      style={{ padding: '18px 16px', position: 'relative', overflow: 'hidden' }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          background: `${color}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <Icon size={20} color={color} />
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 900,
          color: 'var(--color-text)',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          marginBottom: 6,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 11, color, fontWeight: 600 }}>{sub}</div>
      <Icon
        size={64}
        color={color}
        style={{ position: 'absolute', bottom: -10, right: -10, opacity: 0.06 }}
      />
    </div>
  );
}

type Entry = {
  rank: number;
  userId: string;
  name: string;
  spurtiPoints: number;
  approvedAnswers: number;
  isMe?: boolean;
};

function KaggleLeaderboard({
  entries,
  myRank,
  currentUserId,
  currentUserName,
  range,
}: {
  entries: Entry[];
  myRank?: number;
  currentUserId: string;
  currentUserName: string;
  range: Range;
}) {
  const getScore = (e: Entry) =>
    range === 'all' ? e.spurtiPoints : e.approvedAnswers * SPURTI_POINTS.ANSWER_APPROVED_DEFAULT;
  const getSecondary = (e: Entry) =>
    range === 'all' ? `${e.approvedAnswers} approved` : `${e.spurtiPoints} pts total`;
  const scoreLabel = 'pts';
  const maxScore = Math.max(entries.length > 0 ? getScore(entries[0]) : 1, 1);

  const top3 = entries.slice(0, 3);
  // Podium order: 2nd (left), 1st (center/tallest), 3rd (right)
  const podiumSlots: Array<{ entry: Entry; podiumRank: number; height: number }> = [];
  if (top3[1]) podiumSlots.push({ entry: top3[1], podiumRank: 2, height: 110 });
  if (top3[0]) podiumSlots.push({ entry: top3[0], podiumRank: 1, height: 148 });
  if (top3[2]) podiumSlots.push({ entry: top3[2], podiumRank: 3, height: 88 });

  return (
    <div
      className="mod-card"
      style={{ overflow: 'hidden', border: '1.5px solid var(--color-border)' }}
    >
      {/* Podium — top 3 */}
      {podiumSlots.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(139,92,246,0.05) 0%, transparent 100%)',
            padding: '32px 24px 0',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 20 }}
          >
            {podiumSlots.map(({ entry: e, podiumRank, height }) => {
              const isCurrentUser = e.userId === currentUserId;
              const isFirst = podiumRank === 1;
              const avatarSize = isFirst ? 76 : 60;
              const podiumColor =
                podiumRank === 1
                  ? 'linear-gradient(180deg, #fde68a 0%, #f59e0b 100%)'
                  : podiumRank === 2
                    ? 'linear-gradient(180deg, #e2e8f0 0%, #94a3b8 100%)'
                    : 'linear-gradient(180deg, #fde7c4 0%, #b45309 100%)';

              return (
                <div
                  key={e.userId}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: 160,
                  }}
                >
                  {/* Crown for 1st */}
                  {isFirst && (
                    <div style={{ fontSize: 28, marginBottom: 2, lineHeight: 1 }}>👑</div>
                  )}

                  {/* Avatar circle */}
                  <div
                    style={{
                      width: avatarSize,
                      height: avatarSize,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: isCurrentUser
                        ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                        : rankAvatarBg(podiumRank),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: isFirst ? 28 : 22,
                      fontWeight: 900,
                      color: 'white',
                      boxShadow: isFirst
                        ? '0 8px 28px rgba(124,58,237,0.30)'
                        : '0 4px 12px rgba(0,0,0,0.12)',
                      border: isCurrentUser ? '3px solid var(--color-purple)' : 'none',
                      marginBottom: 10,
                    }}
                  >
                    {e.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name */}
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: isCurrentUser ? 'var(--color-purple)' : 'var(--color-text)',
                      textAlign: 'center',
                      marginBottom: 2,
                      maxWidth: 150,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isCurrentUser ? `${e.name} (You)` : e.name}
                  </div>

                  {/* Score */}
                  <div
                    style={{
                      fontSize: isFirst ? 18 : 15,
                      fontWeight: 900,
                      color: 'var(--color-text)',
                      marginBottom: 14,
                    }}
                  >
                    {getScore(e)}{' '}
                    <span
                      style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' }}
                    >
                      {scoreLabel}
                    </span>
                  </div>

                  {/* Podium block */}
                  <div
                    style={{
                      width: '100%',
                      height,
                      borderRadius: '10px 10px 0 0',
                      background: podiumColor,
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'center',
                      paddingTop: 14,
                      boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
                    }}
                  >
                    <span style={{ fontSize: isFirst ? 38 : 28, lineHeight: 1 }}>
                      {medalFor(podiumRank)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Column headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '52px 1fr 200px 90px',
          alignItems: 'center',
          padding: '10px 20px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-input)',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            textAlign: 'center',
          }}
        >
          Rank
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Participant
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Score
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            textAlign: 'right',
          }}
        >
          {range === 'all' ? 'Points' : 'Answers'}
        </div>
      </div>

      {/* Rows */}
      {entries.map((e) => {
        const isCurrentUser = e.userId === currentUserId;
        const score = getScore(e);
        const pct = maxScore > 0 ? Math.max((score / maxScore) * 100, 2) : 2;

        return (
          <div
            key={e.userId}
            style={{
              display: 'grid',
              gridTemplateColumns: '52px 1fr 200px 90px',
              alignItems: 'center',
              padding: '11px 20px',
              background: isCurrentUser ? 'rgba(139,92,246,0.06)' : 'transparent',
              borderBottom: '1px solid var(--color-border)',
              borderLeft: isCurrentUser ? '3px solid var(--color-purple)' : '3px solid transparent',
            }}
          >
            {/* Rank */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {e.rank <= 3 ? (
                <span style={{ fontSize: 20, lineHeight: 1 }}>{medalFor(e.rank)}</span>
              ) : (
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: 'var(--color-text-muted)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  #{e.rank}
                </span>
              )}
            </div>

            {/* Avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: isCurrentUser
                    ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                    : rankAvatarBg(e.rank),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 800,
                  color: 'white',
                }}
              >
                {e.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: isCurrentUser ? 700 : 500,
                    color: isCurrentUser ? 'var(--color-purple)' : 'var(--color-text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isCurrentUser ? `${e.name} (You)` : e.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>
                  {getSecondary(e)}
                </div>
              </div>
            </div>

            {/* Score bar */}
            <div style={{ paddingRight: 12 }}>
              <div
                style={{
                  height: 7,
                  borderRadius: 4,
                  background: 'var(--color-border)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    borderRadius: 4,
                    width: `${pct}%`,
                    background: isCurrentUser
                      ? 'linear-gradient(90deg, #8b5cf6, #6d28d9)'
                      : e.rank === 1
                        ? 'linear-gradient(90deg, #fbbf24, #d97706)'
                        : e.rank === 2
                          ? 'linear-gradient(90deg, #94a3b8, #64748b)'
                          : e.rank === 3
                            ? 'linear-gradient(90deg, #c97b3a, #92400e)'
                            : 'linear-gradient(90deg, var(--color-primary), #2563eb)',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>

            {/* Score value */}
            <div
              style={{
                textAlign: 'right',
                fontSize: 14,
                fontWeight: 800,
                color: isCurrentUser ? 'var(--color-purple)' : 'var(--color-text)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {score}{' '}
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                {scoreLabel}
              </span>
            </div>
          </div>
        );
      })}

      {/* Footer: user is outside top 20 */}
      {myRank && myRank > 20 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 20px',
            background: 'rgba(139,92,246,0.06)',
            borderTop: '2px dashed var(--color-border)',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 800,
              color: 'white',
              flexShrink: 0,
            }}
          >
            {currentUserName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-purple)' }}>
              {currentUserName} (You)
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              Your current rank: #{myRank}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function rankAvatarBg(rank: number): string {
  if (rank === 1) return 'linear-gradient(135deg, #fde68a, #f59e0b)';
  if (rank === 2) return 'linear-gradient(135deg, #e2e8f0, #94a3b8)';
  if (rank === 3) return 'linear-gradient(135deg, #fde7c4, #b45309)';
  return 'linear-gradient(135deg, #ddd6fe, #8b5cf6)';
}

function rangeLabel(r: Range): string {
  if (r === 'week') return 'Weekly';
  if (r === 'month') return 'Monthly';
  return 'Overall';
}

/** Converts an approved-answer count to an estimated Spurti Points figure for a time window. */
function periodPoints(approvedAnswers: number): number {
  return approvedAnswers * SPURTI_POINTS.ANSWER_APPROVED_DEFAULT;
}

function medalFor(rank: number): string {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
}
