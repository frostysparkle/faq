import { AlertTriangle, MessageSquarePlus, Search } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { existingAnswerCheckSchema } from "@samagama/shared";
import { Badge } from "../../components/ui/Badge";
import { FaqCard } from "../../components/ui/FaqCard";
import { Panel } from "../../components/ui/Panel";
import { communityQuestions, faqs } from "../../data/mockData";
import { PageHeader } from "../faq/FaqPages";

export function CommunityPage() {
  return (
    <>
      <div className="titleAction">
        <PageHeader
          title="Community Q&A"
          subtitle="Student questions answered by peers and verified by moderators."
        />
        <button className="primaryButton">Ask a Question</button>
      </div>
      <div className="filterLine">
        {["All", "Open", "Answered", "Resolved", "My Questions"].map((status, index) => (
          <button className={`chip ${index === 0 ? "selected" : ""}`} key={status}>
            {status}
          </button>
        ))}
      </div>
      <QuestionList />
    </>
  );
}

const askQuestionCheckSchema = existingAnswerCheckSchema.extend({
  categoryId: z.string().min(1)
});

export function AskQuestionPage() {
  const [checked, setChecked] = useState(false);
  const firstFaq = faqs[0];
  const { register, handleSubmit, formState } = useForm<z.infer<typeof askQuestionCheckSchema>>({
    resolver: zodResolver(askQuestionCheckSchema),
    defaultValues: { title: "", description: "", categoryId: "noc", tagIds: [] }
  });

  const onCheck = () => setChecked(true);
  const onSubmit = () => setChecked(true);

  return (
    <>
      <PageHeader
        title="Ask a Question"
        subtitle="Review existing answers before submitting a new community question."
      />
      <div className="notice info">
        Existing FAQ and resolved Q&A matches are checked before submission.
      </div>
      <Panel title="Question Details" icon={MessageSquarePlus}>
        <form className="formGrid" onSubmit={handleSubmit(onSubmit)}>
          <label>
            Question title
            <input
              {...register("title")}
              placeholder="How do I submit my NOC if my mentor is unavailable?"
            />
            {formState.errors.title ? (
              <small className="errorText">{formState.errors.title.message}</small>
            ) : null}
          </label>
          <label>
            Description
            <textarea
              {...register("description")}
              placeholder="Add context, steps tried, and error messages"
            />
            {formState.errors.description ? (
              <small className="errorText">{formState.errors.description.message}</small>
            ) : null}
          </label>
          <label>
            Category
            <select {...register("categoryId")}>
              <option value="noc">NOC</option>
              <option value="attendance">Attendance</option>
              <option value="certificates">Certificates</option>
            </select>
          </label>
          <button className="primaryButton" type="submit" onClick={onCheck}>
            <Search aria-hidden="true" />
            Check Existing Answers
          </button>
        </form>
      </Panel>
      {checked ? (
        <Panel title="Similar Answers Found" icon={AlertTriangle}>
          <div className="notice warn">3 similar FAQs found. Review them before submitting.</div>
          {firstFaq ? <FaqCard {...firstFaq} /> : null}
          <button className="primaryButton">None of these answer it. Submit my question.</button>
        </Panel>
      ) : null}
    </>
  );
}

export function MyQuestionsPage() {
  return (
    <>
      <PageHeader title="My Questions" subtitle="Track the status of questions you have asked." />
      <QuestionList mine />
    </>
  );
}

function QuestionList({ mine = false }: { mine?: boolean }) {
  return (
    <div className="cardList">
      {communityQuestions.map((question) => (
        <article className="questionCard" key={question.title}>
          <div>
            <strong>{question.title}</strong>
            <small>
              {mine ? "You" : question.author} · {question.updated}
            </small>
          </div>
          <Badge tone={question.status === "Resolved" ? "green" : "amber"}>{question.status}</Badge>
          <Badge tone="blue">{question.category}</Badge>
          <span>{question.answers} answers</span>
        </article>
      ))}
    </div>
  );
}
