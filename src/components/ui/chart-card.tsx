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
        "rounded-3xl border border-border/60 bg-card/90 p-5 shadow-[0_8px_28px_-22px_rgba(15,23,42,0.75)]",
        className,
      )}
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}
