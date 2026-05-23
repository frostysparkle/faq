import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";

export default function QualitySparkline({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <Tooltip
          cursor={false}
          contentStyle={{ background: "#1a1d27", border: "1px solid rgba(255,255,255,0.08)", color: "#f0f2f8" }}
        />
        <Line type="monotone" dataKey="score" stroke="#4f8ef7" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
