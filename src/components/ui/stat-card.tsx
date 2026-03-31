import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: number;
  change: number;
  trend: "up" | "down" | "neutral";
  icon: LucideIcon;
  format?: "number" | "currency";
  currency?: string;
};

export function StatCard({
  label,
  value,
  change,
  trend,
  icon: Icon,
  format = "number",
  currency,
}: StatCardProps) {
  const TrendIcon =
    trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : ArrowRight;

  const formattedValue =
    format === "currency" ? formatCurrency(value, currency) : formatNumber(value);

  return (
    <article className="group rounded-3xl border border-border/60 bg-card/90 p-5 shadow-[0_8px_28px_-22px_rgba(15,23,42,0.8)] transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-[0_14px_30px_-24px_rgba(15,23,42,0.65)]">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="rounded-xl border border-border/70 bg-muted/70 p-2 text-accent transition-colors group-hover:bg-accent/10">
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p className="text-3xl font-semibold tracking-tight text-foreground">{formattedValue}</p>

      <p className="mt-3 flex items-center gap-1.5 text-xs">
        <span
          className={
            trend === "up"
              ? "text-emerald-600"
              : trend === "down"
                ? "text-rose-600"
                : "text-muted-foreground"
          }
        >
          <TrendIcon className="mr-0.5 inline h-3.5 w-3.5" />
          {formatPercent(change)}
        </span>
        <span className="text-muted-foreground">week over week</span>
      </p>
    </article>
  );
}
