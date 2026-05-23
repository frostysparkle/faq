import { Suspense } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, CheckCircle2, Clock3, TrendingUp } from "lucide-react";
import { useModerationAnalytics } from "@/hooks/useModeration.js";

const AnalyticsSkeleton = () => (
  <div className="mx-auto max-w-7xl space-y-5">
    <div className="h-20 rounded-xl bg-surface" />
    <div className="grid gap-4 md:grid-cols-3">
      <div className="h-32 rounded-xl bg-surface" />
      <div className="h-32 rounded-xl bg-surface" />
      <div className="h-32 rounded-xl bg-surface" />
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="h-96 rounded-xl bg-surface" />
      <div className="h-96 rounded-xl bg-surface" />
    </div>
  </div>
);

const metricCards = (analytics) => [
  { label: "My Approvals Today", value: analytics.approvalsToday, icon: CheckCircle2 },
  { label: "My Approvals This Week", value: analytics.approvalsThisWeek, icon: TrendingUp },
  { label: "Average Response Time", value: `${analytics.averageResponseHours}h`, icon: Clock3 }
];

function ModerationAnalyticsContent() {
  const { data: analytics } = useModerationAnalytics();

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accentBlue">Moderator Analytics</p>
        <h1 className="mt-2 font-display text-4xl text-textPrimary md:text-5xl">Operational Tempo</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metricCards(analytics).map((metric) => {
          const Icon = metric.icon;

          return (
            <section key={metric.label} className="premium-card p-5">
              <Icon className="h-5 w-5 text-accentBlue" aria-hidden="true" />
              <p className="mt-4 text-sm text-textMuted">{metric.label}</p>
              <p className="mt-1 font-display text-4xl text-textPrimary">{metric.value}</p>
            </section>
          );
        })}
      </div>

      <div className="rounded-xl border border-warning/20 bg-warning/10 p-4 text-sm text-warning">
        <Activity className="mr-2 inline h-4 w-4" aria-hidden="true" />
        {analytics.insight}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="premium-card p-5">
          <h2 className="font-display text-2xl text-textPrimary">Queue Depth Trend</h2>
          <p className="mt-1 text-sm text-textMuted">Shows whether incoming review work is outpacing moderation action.</p>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.queueDepthTrend}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip contentStyle={{ background: "#1a1d27", border: "1px solid rgba(255,255,255,0.08)", color: "#f0f2f8" }} />
                <Line type="monotone" dataKey="depth" stroke="#4f8ef7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="premium-card p-5">
          <h2 className="font-display text-2xl text-textPrimary">Categories With Most Pending Items</h2>
          <p className="mt-1 text-sm text-textMuted">Use this to decide where a moderator should focus first.</p>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.pendingByCategory}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="category" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip contentStyle={{ background: "#1a1d27", border: "1px solid rgba(255,255,255,0.08)", color: "#f0f2f8" }} />
                <Bar dataKey="count" fill="#4f8ef7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function ModerationAnalytics() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <ModerationAnalyticsContent />
    </Suspense>
  );
}
