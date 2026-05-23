import { Suspense } from "react";
import { CheckCircle2, GitBranch, MessageCircleWarning, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import AnswerCard from "@/components/community/AnswerCard.jsx";
import FaqCard from "@/components/faq/FaqCard.jsx";
import StatusTimeline from "@/components/community/StatusTimeline.jsx";
import SubmitAnswerForm from "@/components/community/SubmitAnswerForm.jsx";
import { Button } from "@/components/ui/button.jsx";
import { useAnswers, useQuestion } from "@/hooks/useCommunity.js";
import { useCurrentUser, useFaqSearch } from "@/hooks/useFaqs.js";
import { cn } from "@/lib/utils.js";

const DetailSkeleton = () => (
  <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_320px]">
    <div className="space-y-5">
      <div className="h-56 rounded-xl bg-surface" />
      <div className="h-32 rounded-xl bg-surface" />
      <div className="h-80 rounded-xl bg-surface" />
    </div>
    <div className="h-96 rounded-xl bg-surface" />
  </div>
);

const statusTone = {
  open: "border-accentBlue/20 bg-accentBlue/10 text-accentBlue",
  answered: "border-warning/20 bg-warning/10 text-warning",
  resolved: "border-success/20 bg-success/10 text-success",
  duplicate: "border-white/10 bg-white/5 text-textMuted"
};

function QuestionDetailContent() {
  const { id } = useParams();
  const { data: user } = useCurrentUser();
  const { data: question } = useQuestion(id);
  const { data: answers } = useAnswers(id);
  const categoryId = question.categoryId?._id;
  const { data: relatedFaqs } = useFaqSearch({ categoryId, limit: 4 });
  const approvedAnswers = answers.filter((answer) => answer.status === "approved");
  const duplicateId = question.duplicateOf?._id ?? question.duplicateOf;
  const resolutionAnswer = approvedAnswers[0];

  return (
    <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_320px]">
      <main className="space-y-6">
        <section className="premium-card p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            {question.categoryId?.name && (
              <span className="rounded-full border border-accentBlue/20 bg-accentBlue/10 px-3 py-1 text-xs font-semibold text-accentBlue">
                {question.categoryId.name}
              </span>
            )}
            <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold capitalize", statusTone[question.status] ?? statusTone.open)}>
              {question.status}
            </span>
          </div>
          <h1 className="mt-5 font-display text-4xl leading-tight text-textPrimary md:text-6xl">{question.title}</h1>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-textMuted">{question.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {question.tags?.map((tag) => (
              <span key={tag._id} className="rounded-full bg-white/5 px-3 py-1.5 text-sm text-textMuted">{tag.name}</span>
            ))}
          </div>
          <p className="mt-5 text-sm text-textMuted">Asked by {question.askedBy?.name ?? "Student"} on {new Date(question.createdAt).toLocaleDateString()}</p>
        </section>

        <StatusTimeline question={question} />

        {question.status === "duplicate" && duplicateId && (
          <div className="premium-card p-5">
            <div className="flex items-center gap-3">
              <GitBranch className="h-5 w-5 text-accentBlue" aria-hidden="true" />
              <p className="text-sm text-textPrimary">This question has been answered here.</p>
            </div>
            <Button asChild className="mt-4">
              <Link to={`/community/questions/${duplicateId}`}>View original answer</Link>
            </Button>
          </div>
        )}

        {question.status === "resolved" && (
          <div className="premium-card border-success/20 bg-success/10 p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
              <h2 className="font-display text-2xl text-textPrimary">Resolution Summary</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-textPrimary">{resolutionAnswer?.body ?? "This question has been resolved by the community moderation team."}</p>
          </div>
        )}

        <section className="space-y-4">
          <h2 className="font-display text-3xl text-textPrimary">Answers</h2>
          {answers.length === 0 ? (
            <div className="premium-card p-6 text-center">
              <MessageCircleWarning className="mx-auto h-10 w-10 text-accentBlue" aria-hidden="true" />
              <p className="mt-3 text-sm text-textMuted">No reviewed answers yet.</p>
            </div>
          ) : (
            answers.map((answer) => <AnswerCard key={answer._id} answer={answer} currentUserId={user.id} />)
          )}
        </section>

        {question.status === "open" && <SubmitAnswerForm questionId={question._id} />}
      </main>

      <aside className="space-y-5 lg:sticky lg:top-20 lg:h-fit">
        <section className="premium-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accentBlue">Related FAQs</p>
          <div className="mt-4 space-y-3">
            {relatedFaqs.pages.flatMap((page) => page.faqs).slice(0, 3).map((faq) => (
              <FaqCard key={faq._id} faq={faq} compact />
            ))}
          </div>
        </section>
        <section className="premium-card p-5">
          <ShieldCheck className="h-6 w-6 text-accentBlue" aria-hidden="true" />
          <h2 className="mt-3 font-display text-2xl text-textPrimary">Not satisfied?</h2>
          <p className="mt-2 text-sm leading-6 text-textMuted">A moderator can help route unresolved institutional questions.</p>
          <Button asChild variant="outline" className="mt-4 w-full border-white/10 bg-white/5">
            <Link to="/contact-moderator">Contact a moderator</Link>
          </Button>
        </section>
      </aside>
    </div>
  );
}

export default function QuestionDetail() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <QuestionDetailContent />
    </Suspense>
  );
}
