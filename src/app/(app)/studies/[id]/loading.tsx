export default function StudyDetailLoading() {
  return (
    <main className="mx-auto max-w-[1400px] px-6 py-8 animate-fade-in">
      <div className="mb-6 h-4 w-24 animate-pulse rounded bg-white/[0.04]" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
            <div className="h-7 w-48 animate-pulse rounded bg-white/[0.06]" />
            <div className="mt-3 flex gap-6">
              <div className="h-4 w-28 animate-pulse rounded bg-white/[0.04]" />
              <div className="h-4 w-20 animate-pulse rounded bg-white/[0.04]" />
              <div className="h-4 w-24 animate-pulse rounded bg-white/[0.04]" />
            </div>
            <div className="mt-3 flex gap-4">
              <div className="h-4 w-16 animate-pulse rounded bg-white/[0.04]" />
              <div className="h-4 w-16 animate-pulse rounded bg-white/[0.04]" />
              <div className="h-4 w-20 animate-pulse rounded bg-white/[0.04]" />
            </div>
            <div className="mt-5 flex gap-3">
              <div className="h-10 w-28 animate-pulse rounded-lg bg-white/[0.06]" />
              <div className="h-10 w-20 animate-pulse rounded-lg bg-white/[0.04]" />
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
            <div className="h-5 w-24 animate-pulse rounded bg-white/[0.06]" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-white/[0.03]" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
            <div className="h-5 w-24 animate-pulse rounded bg-white/[0.06]" />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-white/[0.03]" />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
            <div className="h-5 w-20 animate-pulse rounded bg-white/[0.06]" />
            <div className="mt-3 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-3 w-16 animate-pulse rounded bg-white/[0.04]" />
                  <div className="h-3 w-32 animate-pulse rounded bg-white/[0.04]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
