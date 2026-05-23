import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquarePlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button.jsx";
import { useSubmitAnswer } from "@/hooks/useCommunity.js";

const answerSchema = z.object({
  body: z.string().trim().min(20, "Answer must be at least 20 characters.")
});

export default function SubmitAnswerForm({ questionId }) {
  const [open, setOpen] = useState(false);
  const submitAnswer = useSubmitAnswer();
  const form = useForm({
    resolver: zodResolver(answerSchema),
    defaultValues: { body: "" }
  });

  const onSubmit = async (values) => {
    await submitAnswer.mutateAsync({ questionId, body: values.body });
    form.reset();
    setOpen(false);
  };

  return (
    <section className="premium-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accentBlue">Community Answer</p>
          <h2 className="mt-1 font-display text-2xl text-textPrimary">Submit an Answer</h2>
        </div>
        <Button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
          {open ? "Close" : "Answer"}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <div className="mt-5 space-y-3">
              <textarea
                {...form.register("body")}
                rows={6}
                aria-label="Answer body"
                className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-textPrimary outline-none focus:ring-2 focus:ring-accentBlue"
                placeholder="Share the answer clearly. Moderators will review before it becomes official."
              />
              {form.formState.errors.body && <p className="text-sm text-danger">{form.formState.errors.body.message}</p>}
              {submitAnswer.isError && <p className="text-sm text-danger">We could not submit this answer. Please try again.</p>}
              <div className="flex justify-end">
                <Button type="submit" disabled={submitAnswer.isPending}>
                  {submitAnswer.isPending ? "Submitting" : "Submit for review"}
                </Button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  );
}
