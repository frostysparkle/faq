import { Funnel, FunnelChart, LabelList, ResponsiveContainer, Tooltip } from "recharts";

export default function ResolutionFunnel({ data = [] }) {
  const normalized = data.map((item, index) => {
    const previous = index === 0 ? item.value : data[index - 1]?.value || 0;
    const dropOff = previous > 0 ? Math.max(0, Math.round(((previous - item.value) / previous) * 100)) : 0;
    return { ...item, dropOffLabel: index === 0 ? "Entry point" : `${dropOff}% drop-off` };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <FunnelChart>
        {/* Anti-pattern guard: funnel labels include absolute volume and drop-off so it explains a decision path. */}
        <Tooltip
          contentStyle={{ background: "#1a1d27", border: "1px solid rgba(255,255,255,0.08)", color: "#f0f2f8" }}
          formatter={(value, _name, item) => [`${value} events - ${item.payload.dropOffLabel}`, item.payload.name]}
        />
        <Funnel dataKey="value" data={normalized} isAnimationActive fill="#4f8ef7" stroke="rgba(255,255,255,0.18)">
          <LabelList dataKey="name" fill="#f0f2f8" position="right" />
          <LabelList dataKey="dropOffLabel" fill="#6b7280" position="inside" />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );
}
