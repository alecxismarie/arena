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
    <article className="group relative overflow-hidden rounded-[1.6rem] border border-border/70 bg-gradient-to-b from-card to-card/90 p-5 shadow-[0_14px_36px_-28px_rgba(15,23,42,0.9)] transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-[0_20px_40px_-30px_rgba(15,23,42,0.8)]">
      <span
        aria-hidden
        className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-accent/45 to-transparent"
      />
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <span className="rounded-xl border border-border/70 bg-muted/65 p-2 text-accent transition-colors group-hover:bg-accent/10">
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p className="text-3xl font-semibold tracking-tight text-foreground">{formattedValue}</p>

      <div className="mt-3 border-t border-border/55 pt-3 text-xs">
        <p className="flex items-center gap-1.5">
          <span
            className={
              trend === "up"
                ? "inline-flex items-center text-emerald-700"
                : trend === "down"
                  ? "inline-flex items-center text-rose-700"
                  : "inline-flex items-center text-muted-foreground"
            }
          >
            <TrendIcon className="mr-0.5 inline h-3.5 w-3.5" />
            {formatPercent(change)}
          </span>
          <span className="text-muted-foreground">week over week</span>
        </p>
      </div>
    </article>
  );
}
