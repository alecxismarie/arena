export default function PlatformLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-28 animate-pulse rounded-3xl border border-border/60 bg-card/80" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="h-28 animate-pulse rounded-2xl border border-border/60 bg-card/70" />
        <div className="h-28 animate-pulse rounded-2xl border border-border/60 bg-card/70" />
        <div className="h-28 animate-pulse rounded-2xl border border-border/60 bg-card/70" />
        <div className="h-28 animate-pulse rounded-2xl border border-border/60 bg-card/70" />
      </div>
      <div className="h-72 animate-pulse rounded-3xl border border-border/60 bg-card/75" />
    </div>
  );
}
