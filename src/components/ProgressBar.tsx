export default function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="w-full h-1.5 bg-paper-dim rounded-full overflow-hidden">
      <div
        className="h-full bg-harbor rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
