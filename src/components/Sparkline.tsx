import { ResponsiveContainer, LineChart, Line } from 'recharts';

export default function Sparkline({ data, color = '#2d6e7e' }: { data: number[]; color?: string }) {
  if (data.length < 2) {
    return <div style={{ width: 120, height: 36 }} className="flex items-center text-[10px] text-ink-soft font-mono">not enough data yet</div>;
  }
  const points = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ width: 120, height: 36 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.75} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
