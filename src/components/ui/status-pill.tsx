import { cn } from "@/lib/utils";

export function StatusPill({ status }: { status: "upcoming" | "completed" | "cancelled" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
        status === "upcoming" && "border-blue-200 bg-blue-50 text-blue-700",
        status === "completed" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        status === "cancelled" && "border-rose-200 bg-rose-50 text-rose-700",
      )}
    >
      {status}
    </span>
  );
}
