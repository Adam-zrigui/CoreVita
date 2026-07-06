export default function UploadLoading() {
  return (
    <main className="mx-auto max-w-[1400px] px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <div className="h-7 w-20 animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-white/[0.04]" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-white/[0.08] bg-white/[0.02]">
          <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-white/[0.06]" />
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="h-4 w-24 animate-pulse rounded bg-white/[0.06]" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-white/[0.04]" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
