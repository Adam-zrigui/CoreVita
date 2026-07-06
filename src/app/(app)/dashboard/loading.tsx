export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-[1400px] px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <div className="h-7 w-32 animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-2 h-4 w-56 animate-pulse rounded bg-white/[0.04]" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="h-4 w-20 animate-pulse rounded bg-white/[0.06]" />
            <div className="mt-3 h-8 w-16 animate-pulse rounded bg-white/[0.06]" />
            <div className="mt-2 h-3 w-24 animate-pulse rounded bg-white/[0.04]" />
          </div>
        ))}
      </div>
      <div className="mt-6 h-64 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
    </main>
  );
}
