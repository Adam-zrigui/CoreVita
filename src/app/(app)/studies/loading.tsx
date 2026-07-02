export default function StudiesLoading() {
  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <div className="h-7 w-24 animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-white/[0.04]" />
      </div>
      <div className="space-y-6">
        <div className="h-10 w-full animate-pulse rounded-lg bg-white/[0.04]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 animate-pulse rounded-lg bg-white/[0.06]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-white/[0.06]" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.04]" />
                </div>
                <div className="h-5 w-16 animate-pulse rounded bg-white/[0.06]" />
              </div>
              <div className="mt-4 h-3 w-1/3 animate-pulse rounded bg-white/[0.04]" />
              <div className="mt-3 flex gap-4">
                <div className="h-3 w-12 animate-pulse rounded bg-white/[0.04]" />
                <div className="h-3 w-12 animate-pulse rounded bg-white/[0.04]" />
                <div className="h-3 w-16 animate-pulse rounded bg-white/[0.04]" />
              </div>
              <div className="mt-4 h-px bg-white/[0.04]" />
              <div className="mt-3 h-3 w-20 animate-pulse rounded bg-white/[0.04]" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
