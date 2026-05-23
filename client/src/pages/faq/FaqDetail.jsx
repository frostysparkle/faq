import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, LockKeyhole, MessageSquareText, ShieldCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { Link, useParams } from "react-router-dom";
import FaqCard from "@/components/faq/FaqCard.jsx";
import HelpfulnessControls from "@/components/faq/HelpfulnessControls.jsx";
import { Button } from "@/components/ui/button.jsx";
import { useFaq } from "@/hooks/useFaqs.js";
import { cn } from "@/lib/utils.js";

const RECENT_FAQS_KEY = "samagama.recentFaqViews";

const readRecentFaqs = () => {
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_FAQS_KEY) ?? "[]");
  } catch {
    return [];
  }
};

const rememberFaq = (faq) => {
  const next = [
    {
      _id: faq._id,
      title: faq.title,
      summary: faq.summary,
      updatedAt: faq.updatedAt,
      categories: faq.categories,
      tags: faq.tags,
      helpfulCount: faq.helpfulCount,
      notHelpfulCount: faq.notHelpfulCount
    },
    ...readRecentFaqs().filter((item) => item._id !== faq._id)
  ].slice(0, 4);

  window.localStorage.setItem(RECENT_FAQS_KEY, JSON.stringify(next));
  return next;
};

const FaqDetailSkeleton = () => (
  <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_320px]">
    <div className="space-y-5">
      <div className="h-5 w-72 rounded bg-surface" />
      <div className="h-20 rounded-xl bg-surface" />
      <div className="h-[480px] rounded-xl bg-surface" />
    </div>
    <div className="h-80 rounded-xl bg-surface" />
  </div>
);

const statusTone = {
  published: "border-success/20 bg-success/10 text-success",
  needs_review: "border-warning/20 bg-warning/10 text-warning",
  draft: "border-white/10 bg-white/5 text-textMuted",
  archived: "border-danger/20 bg-danger/10 text-danger"
};

function NextActionPanel() {
  return (
    <aside className="premium-card h-fit p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accentBlue">Decision Layer</p>
      <h2 className="mt-2 font-display text-2xl text-textPrimary">Still confused?</h2>
      <div className="mt-5 space-y-3">
        <Button asChild className="w-full justify-start">
          <Link to="/community/ask">
            <MessageSquareText className="h-4 w-4" aria-hidden="true" />
            Ask the Community
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start border-white/10 bg-white/5">
          <Link to="/community">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            View Similar Questions
          </Link>
        </Button>
        <Button asChild variant="ghost" className="w-full justify-start">
          <Link to="/contact-moderator">Contact Moderator</Link>
        </Button>
      </div>
    </aside>
  );
}

function FaqDetailContent() {
  const { id } = useParams();
  const { data } = useFaq(id);
  const { faq, relatedFaqs } = data;
  const [recentFaqs, setRecentFaqs] = useState([]);
  const primaryCategory = faq.categories?.[0];

  useEffect(() => {
    setRecentFaqs(rememberFaq(faq));
  }, [faq]);

  return (
    <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_320px]">
      <main className="min-w-0 space-y-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-textMuted">
          <Link to="/" className="hover:text-textPrimary">Home</Link>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
          {primaryCategory ? (
            <Link to={`/faqs?categoryId=${primaryCategory._id}`} className="hover:text-textPrimary">
              {primaryCategory.name}
            </Link>
          ) : (
            <span>Knowledge</span>
          )}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
          <span className="max-w-[320px] truncate text-textPrimary">{faq.title}</span>
        </nav>

        <section className="premium-card p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold capitalize", statusTone[faq.status] ?? statusTone.draft)}>
              {faq.status?.replace("_", " ")}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
              Official source
            </span>
          </div>
          <h1 className="mt-5 font-display text-4xl leading-tight text-textPrimary md:text-6xl">{faq.title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-textMuted">{faq.summary}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {faq.tags?.map((tag) => (
              <span key={tag._id} className="rounded-full bg-white/5 px-3 py-1.5 text-sm text-textMuted">
                {tag.name}
              </span>
            ))}
          </div>
        </section>

        <article className="premium-card p-6 md:p-8">
          <ReactMarkdown className="faq-prose" rehypePlugins={[rehypeRaw, rehypeSanitize]}>
            {faq.answer}
          </ReactMarkdown>
        </article>

        <HelpfulnessControls faqId={faq._id} helpfulCount={faq.helpfulCount} notHelpfulCount={faq.notHelpfulCount} />

        {relatedFaqs?.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-3xl text-textPrimary">Related FAQs</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {relatedFaqs.map((related) => (
                <FaqCard key={related._id} faq={related} compact />
              ))}
            </div>
          </section>
        )}

        {recentFaqs.filter((item) => item._id !== faq._id).length > 0 && (
          <section className="space-y-4 pb-4">
            <h2 className="font-display text-3xl text-textPrimary">Recently Viewed</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {recentFaqs
                .filter((item) => item._id !== faq._id)
                .map((recent) => (
                  <FaqCard key={recent._id} faq={recent} compact />
                ))}
            </div>
          </section>
        )}
      </main>

      <motion.div layout className="lg:sticky lg:top-20 lg:h-fit">
        <NextActionPanel />
      </motion.div>
    </div>
  );
}

export default function FaqDetail() {
  return (
    <Suspense fallback={<FaqDetailSkeleton />}>
      <FaqDetailContent />
    </Suspense>
  );
}
