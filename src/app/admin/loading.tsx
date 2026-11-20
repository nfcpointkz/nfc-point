export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-64 animate-pulse rounded-xl bg-line" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-line" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-line" />
    </div>
  );
}
