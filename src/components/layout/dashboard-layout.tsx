"use client";

import { cn } from "@/lib/utils";
import {
  BarChart3,
  CalendarDays,
  Cog,
  LayoutDashboard,
  RadioTower,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/events", label: "Events", icon: Ticket },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Cog },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,rgba(29,78,216,0.07),transparent_38%),radial-gradient(circle_at_100%_0%,rgba(6,182,212,0.1),transparent_36%),linear-gradient(180deg,var(--color-surface),var(--color-surface-soft))] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px]">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-border/70 bg-card/80 px-6 py-8 backdrop-blur-xl lg:block">
          <div className="mb-10 flex items-center gap-3">
            <span className="rounded-2xl border border-border bg-accent/10 p-2 text-accent">
              <RadioTower className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Signals</p>
              <p className="text-xs text-muted-foreground">Event Intelligence</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-sm transition-all",
                    active
                      ? "border-accent/30 bg-accent/10 text-foreground shadow-sm"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-transform duration-200 group-hover:scale-105",
                      active ? "text-accent" : "text-muted-foreground",
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="w-full px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
          <div className="mb-5 flex gap-2 overflow-x-auto pb-2 lg:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium",
                    active
                      ? "border-accent/30 bg-accent/10 text-foreground"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
