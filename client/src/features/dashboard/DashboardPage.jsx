import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";

const trendData = [
  { month: "Jan", answered: 42, reviewed: 31 },
  { month: "Feb", answered: 56, reviewed: 44 },
  { month: "Mar", answered: 61, reviewed: 52 },
  { month: "Apr", answered: 72, reviewed: 63 },
  { month: "May", answered: 88, reviewed: 79 }
];

const metrics = [
  { label: "Published FAQs", value: "418", tone: "accent" },
  { label: "Open Questions", value: "37", tone: "secondary" },
  { label: "Review SLA", value: "91%", tone: "default" }
];

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Decision Workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">Operational view across FAQs, review queues, and evidence flow.</p>
        </div>
        <Badge variant="accent">Live institutional pulse</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader>
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-3xl">{metric.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Answer Throughput</CardTitle>
          <CardDescription>Monthly answered and reviewed institutional questions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ left: 4, right: 12 }}>
                <defs>
                  <linearGradient id="answered" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="reviewed" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="answered" stroke="hsl(var(--primary))" fill="url(#answered)" />
                <Area type="monotone" dataKey="reviewed" stroke="hsl(var(--secondary))" fill="url(#reviewed)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
