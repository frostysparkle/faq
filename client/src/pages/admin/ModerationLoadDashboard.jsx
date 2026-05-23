import { Suspense } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ResolutionFunnel from "@/components/charts/ResolutionFunnel.jsx";
import { useModerationLoad } from "@/hooks/useAdminAnalytics.js";

const LoadSkeleton = () => (
  <div className="mx-auto max-w-7xl space-y-5">
    <div className="h-24 rounded-xl bg-surface" />
    <div className="grid gap-4 xl:grid-cols-2">
      {[0, 1, 2, 3].map((item) => <div key={item} className="h-80 rounded-xl bg-surface" />)}
    </div>
  </div>
);

const chartTooltip = { background: "#1a1d27", border: "1px solid rgba(255,255,255,0.08)", color: "#f0f2f8" };

function ModerationLoadDashboardContent() {
  const { data } = useModerationLoad(14);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accentBlue">Moderator Capacity</p>
        <h1 className="mt-2 font-display text-4xl text-textPrimary md:text-5xl">Load Dashboard</h1>
      </header>

      <section className="rounded-xl border border-warning/20 bg-warning/10 p-4 text-sm leading-6 text-warning">
        {data.narrative}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="premium-card p-5">
          <h2 className="font-display text-2xl text-textPrimary">Pending Queue Depth</h2>
          <p className="mt-1 text-sm text-textMuted">Shows whether pending answers are accumulating faster than reviews close.</p>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.queueDepthTrend}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip contentStyle={chartTooltip} />
                <Line dataKey="depth" type="monotone" stroke="#4f8ef7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="premium-card p-5">
          <h2 className="font-display text-2xl text-textPrimary">Categories Consuming Review Time</h2>
          <p className="mt-1 text-sm text-textMuted">Assign moderators where category-specific backlog is strongest.</p>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.categoryBreakdown} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis dataKey="category" type="category" stroke="#6b7280" fontSize={12} width={120} />
                <Tooltip contentStyle={chartTooltip} />
                <Bar dataKey="count" fill="#4f8ef7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="premium-card p-5">
          <h2 className="font-display text-2xl text-textPrimary">Moderator Performance</h2>
          <p className="mt-1 text-sm text-textMuted">Compare throughput and response time before changing assignments.</p>
          <div className="mt-5 divide-y divide-white/5">
            {data.moderatorBreakdown.map((moderator) => (
              <div key={moderator.moderatorId} className="grid grid-cols-[1fr_80px_80px_100px] gap-3 py-3 text-sm">
                <span className="font-semibold text-textPrimary">{moderator.name}</span>
                <span className="text-success">{moderator.approved} approved</span>
                <span className="text-danger">{moderator.rejected} rejected</span>
                <span className="text-textMuted">{moderator.avgTime ?? 0}h avg</span>
              </div>
            ))}
          </div>
        </section>

        <section className="premium-card p-5">
          <h2 className="font-display text-2xl text-textPrimary">Resolution Funnel</h2>
          <p className="mt-1 text-sm text-textMuted">Identifies where students leave the knowledge path and require human intervention.</p>
          <div className="mt-5 h-72">
            <ResolutionFunnel data={data.resolutionFunnel} />
          </div>
        </section>
      </div>
    </div>
  );
}

export default function ModerationLoadDashboard() {
  return (
    <Suspense fallback={<LoadSkeleton />}>
      <ModerationLoadDashboardContent />
    </Suspense>
  );
}
