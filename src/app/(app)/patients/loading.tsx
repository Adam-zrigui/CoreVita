export default function PatientsLoading() {
  return (
    <main className="mx-auto max-w-[1400px] px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <div className="h-7 w-28 animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-2 h-4 w-52 animate-pulse rounded bg-white/[0.04]" />
      </div>
      <div className="h-96 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
    </main>
  );
}
