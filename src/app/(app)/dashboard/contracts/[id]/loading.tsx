export default function Loading() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[70vh]">
      <div className="bg-ink-850 border border-ink-700 rounded-xl skeleton h-full" />
      <div className="bg-ink-850 border border-ink-700 rounded-xl skeleton h-full" />
    </div>
  );
}
