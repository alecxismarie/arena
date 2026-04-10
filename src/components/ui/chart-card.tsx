import { cn } from "@/lib/utils";

type ChartCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
};

export function ChartCard({
  title,
  subtitle,
  children,
  className,
  actions,
}: ChartCardProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-gradient-to-b from-card to-card/92 p-5 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.85)]",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
      />
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-[1.02rem] font-semibold text-foreground">{title}</h3>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}
