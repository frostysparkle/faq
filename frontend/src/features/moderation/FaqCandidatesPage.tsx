// FAQ Candidates — approved answers eligible for promotion to FAQ.
import { BookOpen, ArrowRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useFaqCandidates, useConvertToFaq } from '../admin/queries';
import { useAuth } from '../auth/AuthProvider';

export function FaqCandidatesPage() {
  const { data, isLoading } = useFaqCandidates();
  const convert = useConvertToFaq();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div>
      <SectionHeader
        title="FAQ Candidates"
        sub="Approved answers eligible for knowledge base promotion."
      />

      {isLoading && <Card>Loading…</Card>}

      {!isLoading && (data?.length ?? 0) === 0 && (
        <Card style={{ textAlign: 'center', padding: 36 }}>
          <BookOpen size={32} color="var(--color-border)" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>No FAQ candidates yet</div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--color-text-muted)',
              marginTop: 4,
              maxWidth: 360,
              marginInline: 'auto',
            }}
          >
            When moderators mark approved answers as eligible for FAQ conversion, they'll appear here.
          </div>
        </Card>
      )}

      {data && data.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.map((candidate) => (
            <Card key={candidate.id}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>
                    Original Question
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{candidate.questionTitle}</div>
                </div>
                <Badge color="accent">{candidate.category}</Badge>
              </div>

              {/* Question description */}
              {candidate.questionDescription && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-muted)',
                    marginBottom: 10,
                    lineHeight: 1.5,
                  }}
                >
                  {candidate.questionDescription.length > 200
                    ? candidate.questionDescription.slice(0, 200) + '…'
                    : candidate.questionDescription}
                </div>
              )}

              {/* Answer body */}
              <div
                style={{
                  background: 'var(--color-input)',
                  border: '1px solid var(--color-border)',
                  borderLeft: '3px solid var(--color-success)',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  fontSize: 13,
                  color: 'var(--color-text)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {candidate.answerBody}
              </div>

              {/* Meta + actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  by {candidate.author.name}
                  {candidate.moderator && ` · approved by ${candidate.moderator.name}`}
                  {' · '}{timeAgo(candidate.approvedAt)}
                </div>
                {isAdmin && (
                  <Button
                    size="sm"
                    onClick={() => convert.mutate(candidate.id)}
                    disabled={convert.isPending}
                  >
                    <ArrowRight size={13} /> Convert to FAQ Draft
                  </Button>
                )}
              </div>

              {convert.isSuccess && convert.variables === candidate.id && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-success)', fontWeight: 500 }}>
                  ✓ Converted to FAQ draft — find it in FAQ Management.
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
