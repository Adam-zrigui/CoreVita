export default function ViewerLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-8 w-8 animate-spin items-center justify-center rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="text-sm text-slate-500">Loading study...</p>
      </div>
    </div>
  );
}
