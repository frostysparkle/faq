import { AlertTriangle, Copy, FilePlus2, Flag, ShieldCheck } from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Panel } from "../../components/ui/Panel";
import { StatCard } from "../../components/ui/StatCard";
import { communityQuestions, demoStats, moderationItems } from "../../data/mockData";
import { PageHeader } from "../faq/FaqPages";

export function ModerationDashboard() {
  return (
    <>
      <PageHeader
        title="Moderation Dashboard"
        subtitle="Pending moderation work across answers, flags, and duplicate candidates."
      />
      <div className="statsGrid">
        <StatCard
          label="Pending Answers"
          value={demoStats.pendingAnswers}
          note="+4 since yesterday"
          icon={ShieldCheck}
        />
        <StatCard
          label="Flagged FAQs"
          value={demoStats.flaggedFaqs}
          note="2 high priority"
          icon={Flag}
        />
        <StatCard label="Unresolved Qs" value="8" note="3 open over 48h" icon={AlertTriangle} />
        <StatCard
          label="Duplicate Alerts"
          value={demoStats.duplicateAlerts}
          note="Needs review"
          icon={Copy}
        />
      </div>
      <div className="twoColumn">
        <Panel title="Pending Answers" icon={ShieldCheck}>
          <ModerationCards />
        </Panel>
        <Panel title="Flagged FAQs" icon={Flag}>
          <FlagRows />
        </Panel>
      </div>
    </>
  );
}

export function PendingAnswersPage() {
  return (
    <>
      <PageHeader
        title="Pending Answers"
        subtitle="Answers awaiting approval, rejection, or change requests."
      />
      <ModerationCards actions />
    </>
  );
}

export function FlaggedFaqsPage() {
  return (
    <>
      <PageHeader
        title="Flagged FAQs"
        subtitle="Student reports for incorrect, outdated, duplicate, or unclear content."
      />
      <FlagRows detailed />
    </>
  );
}

export function UnresolvedQuestionsPage() {
  return (
    <>
      <PageHeader
        title="Unresolved Questions"
        subtitle="Community questions still awaiting a satisfactory approved answer."
      />
      <div className="cardList">
        {communityQuestions
          .filter((question) => question.status !== "Resolved")
          .map((question) => (
            <article className="questionCard" key={question.title}>
              <strong>{question.title}</strong>
              <Badge tone="amber">{question.status}</Badge>
              <Badge tone="blue">{question.category}</Badge>
              <span>{question.updated}</span>
            </article>
          ))}
      </div>
    </>
  );
}

export function DuplicateCandidatesPage() {
  return (
    <>
      <PageHeader
        title="Duplicate Candidates"
        subtitle="FAQ pairs with high semantic similarity detected by the system."
      />
      <article className="duplicateCard">
        <strong>87% similarity. Strong merge recommended.</strong>
        <div className="compareGrid">
          <span>FAQ #42: How do I submit my NOC through the portal?</span>
          <span>FAQ #67: NOC submission steps on Samagama platform</span>
        </div>
        <div className="buttonRow">
          <button className="dangerButton">Merge FAQ #67 into #42</button>
          <button>View both</button>
          <button>Override with justification</button>
        </div>
      </article>
    </>
  );
}

export function SuggestionsPage() {
  return (
    <>
      <PageHeader
        title="FAQ Suggestions"
        subtitle="Approved community answers recommended for official FAQ conversion."
      />
      <Panel title="Suggested Conversion" icon={FilePlus2}>
        <p>How long does the NOC stamping process take?</p>
        <div className="notice info">
          Source: Community Q&A #34 · Approved by moderator · 48 helpful votes
        </div>
        <button className="successButton">Create FAQ</button>
      </Panel>
    </>
  );
}

function ModerationCards({ actions = false }: { actions?: boolean }) {
  return (
    <div className="cardList">
      {moderationItems.map((item) => (
        <article className="moderationCard" key={item.question}>
          <div className="metaLine">
            <Badge tone="blue">{item.category}</Badge>
            <span>
              {item.author} · {item.age}
            </span>
          </div>
          <h3>{item.question}</h3>
          <p>{item.answer}</p>
          {actions ? (
            <div className="buttonRow">
              <button className="successButton">Approve</button>
              <button className="dangerButton">Reject</button>
              <button>Request changes</button>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function FlagRows({ detailed = false }: { detailed?: boolean }) {
  const rows = [
    ["FAQ #37 - Attendance marking steps", "Outdated", "4 flags"],
    ["FAQ #81 - Certificate timeline", "Incorrect", "2 flags"],
    ["FAQ #12 - Project submission format", "Unclear", "1 flag"]
  ];
  return (
    <div className="rowList">
      {rows.map(([title, reason, count]) => (
        <div className="rowItem" key={title}>
          <span>{title}</span>
          <Badge tone={reason === "Unclear" ? "amber" : "red"}>{reason}</Badge>
          <small>{count}</small>
          {detailed ? <button>Review</button> : null}
        </div>
      ))}
    </div>
  );
}
