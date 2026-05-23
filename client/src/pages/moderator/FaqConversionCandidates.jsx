import { Suspense } from "react";
import { Link } from "react-router-dom";
import { FilePlus2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { useCurrentUser } from "@/hooks/useFaqs.js";
import { useFaqConversionCandidates } from "@/hooks/useModeration.js";

const CandidatesSkeleton = () => (
  <div className="mx-auto max-w-6xl space-y-4">
    <div className="h-20 rounded-xl bg-surface" />
    <div className="grid gap-4 md:grid-cols-2">
      <div className="h-72 rounded-xl bg-surface" />
      <div className="h-72 rounded-xl bg-surface" />
    </div>
  </div>
);

function FaqConversionCandidatesContent() {
  const { data: user } = useCurrentUser();
  const { data: candidates } = useFaqConversionCandidates();
  const isAdmin = user.role === "admin";

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accentBlue">Knowledge Promotion</p>
        <h1 className="mt-2 font-display text-4xl text-textPrimary md:text-5xl">FAQ Conversion Candidates</h1>
      </div>

      {candidates.length === 0 ? (
        <div className="premium-card grid min-h-80 place-items-center p-8 text-center">
          <div>
            <ShieldCheck className="mx-auto h-12 w-12 text-success" aria-hidden="true" />
            <h2 className="mt-4 font-display text-3xl text-textPrimary">No conversion candidates right now.</h2>
            <p className="mt-2 text-sm text-textMuted">Approved community answers will appear here when moderators flag them.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {candidates.map((candidate) => (
            <article key={candidate.id} className="premium-card p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-semibold text-success">Approved answer</span>
                <span className="text-xs text-textMuted">{candidate.approvedAt ? new Date(candidate.approvedAt).toLocaleDateString() : "Pending metadata"}</span>
              </div>
              <h2 className="mt-4 font-display text-2xl leading-tight text-textPrimary">{candidate.question?.title}</h2>
              <p className="mt-3 line-clamp-4 text-sm leading-6 text-textMuted">{candidate.answer.body}</p>
              <div className="mt-4 text-xs text-textMuted">
                Answered by {candidate.answer.answeredBy?.name ?? "Community"} · Approved by {candidate.moderator?.name ?? "Moderator"}
              </div>
              {isAdmin && (
                <Button asChild className="mt-5">
                  <Link
                    to={`/admin/faqs/new?sourceQuestionId=${candidate.question?._id}&answerId=${candidate.answer._id}`}
                    state={{
                      prefill: {
                        title: candidate.question?.title ?? "",
                        summary: candidate.answer.body.slice(0, 280),
                        answer: candidate.answer.body,
                        categories: candidate.question?.categoryId?._id ? [candidate.question.categoryId._id] : [],
                        tags: candidate.question?.tags?.map((tag) => tag._id) ?? []
                      }
                    }}
                  >
                    <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                    Convert to FAQ
                  </Link>
                </Button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FaqConversionCandidates() {
  return (
    <Suspense fallback={<CandidatesSkeleton />}>
      <FaqConversionCandidatesContent />
    </Suspense>
  );
}
