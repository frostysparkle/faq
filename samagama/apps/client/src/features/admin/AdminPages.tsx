import { BarChart3, Bot, FileText, Flag, Settings, ShieldCheck } from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Panel } from "../../components/ui/Panel";
import { StatCard } from "../../components/ui/StatCard";
import { demoStats, faqs } from "../../data/mockData";
import { PageHeader } from "../faq/FaqPages";

export function AdminDashboard() {
  return (
    <>
      <PageHeader
        title="Admin Overview"
        subtitle="Operational health snapshot of FAQs, Q&A, moderation, and chatbot feedback."
      />
      <div className="statsGrid">
        <StatCard
          label="Total FAQs"
          value={demoStats.totalFaqs}
          note="143 published · 15 draft"
          icon={FileText}
        />
        <StatCard label="Community Qs" value="47" note="8 open · 39 resolved" icon={ShieldCheck} />
        <StatCard label="Mod Queue" value="17" note="12 answers · 5 flags" icon={Flag} />
        <StatCard
          label="Bot Helpfulness"
          value={demoStats.botHelpfulness}
          note="Up 6% this week"
          icon={Bot}
        />
      </div>
      <div className="twoColumn">
        <Panel title="FAQs by Category" icon={BarChart3}>
          <div className="barChart">
            {["NOC", "Tech", "Login", "Cert", "Attend", "Stipend", "Dead"].map((label, index) => (
              <div key={label}>
                <span style={{ height: `${34 + index * 7}px` }} />
                <small>{label}</small>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Most Flagged FAQs" icon={Flag}>
          {faqs
            .filter((faq) => faq.status === "Outdated")
            .map((faq) => (
              <div className="rowItem" key={faq.id}>
                <span>{faq.title}</span>
                <Badge tone="red">Outdated</Badge>
                <small>4 flags</small>
              </div>
            ))}
        </Panel>
      </div>
    </>
  );
}

export function AnalyticsPage() {
  return (
    <>
      <PageHeader title="Analytics" subtitle="Portal usage metrics and trend analysis." />
      <div className="statsGrid">
        <StatCard label="Page Views" value="2,847" note="Up 12%" icon={BarChart3} />
        <StatCard label="FAQ Searches" value="1,204" note="Up 8%" icon={FileText} />
        <StatCard label="Questions Asked" value="47" note="Down 3%" icon={ShieldCheck} />
        <StatCard label="Bot Sessions" value="312" note="Up 21%" icon={Bot} />
      </div>
      <Panel title="Top Searched Terms">
        <table>
          <tbody>
            {[
              "NOC submission",
              "certificate download",
              "stipend not received",
              "attendance correction"
            ].map((query) => (
              <tr key={query}>
                <td>{query}</td>
                <td>
                  <Badge tone={query.includes("attendance") ? "red" : "green"}>
                    {query.includes("attendance") ? "No result" : "Found"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

export function ManagementPage({ kind }: { kind: "FAQ" | "Category" | "Tag" | "User" }) {
  return (
    <>
      <div className="titleAction">
        <PageHeader
          title={`${kind} Management`}
          subtitle={`Manage ${kind.toLowerCase()} records and operational status.`}
        />
        {kind !== "User" ? <button className="primaryButton">Add {kind}</button> : null}
      </div>
      <Panel title={`${kind} Records`}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {faqs.map((faq) => (
              <tr key={faq.id}>
                <td>{kind === "FAQ" ? faq.title : `${kind} ${faq.id}`}</td>
                <td>
                  <Badge tone={faq.status === "Outdated" ? "amber" : "green"}>
                    {kind === "FAQ" ? faq.status : "Active"}
                  </Badge>
                </td>
                <td>{faq.updated}</td>
                <td>
                  <button>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

export function BotFeedbackPage() {
  return (
    <>
      <PageHeader
        title="Chatbot Feedback"
        subtitle="Review helpful and incorrect Yaksha chatbot responses."
      />
      <Panel title="Recent Incorrect Feedback" icon={Bot}>
        <div className="rowList">
          {[
            "Attendance if I am sick",
            "NOC after internship ends",
            "Certificate for part-time intern"
          ].map((query) => (
            <div className="rowItem" key={query}>
              <span>{query}</span>
              <Badge tone="red">Incorrect</Badge>
              <button>Review</button>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

export function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Configure duplicate thresholds, model providers, and moderation rules."
      />
      <div className="twoColumn">
        <Panel title="Chatbot & AI" icon={Bot}>
          <Setting label="LLM Provider" value="Mock provider for local demo" />
          <Setting label="RAG top-K results" value="6 sources" />
          <Setting label="Fallback when no source" value="Enabled" />
        </Panel>
        <Panel title="Duplicate Detection" icon={Settings}>
          <Setting label="Warning threshold" value="60%" />
          <Setting label="Strong merge threshold" value="80%" />
          <Setting label="Admin override allowed" value="Enabled with justification" />
        </Panel>
      </div>
    </>
  );
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div className="settingRow">
      <span>{label}</span>
      <Badge tone="blue">{value}</Badge>
    </div>
  );
}
