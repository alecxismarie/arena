"use client";

import { logoutAction } from "@/app/actions/auth-actions";
import { cn } from "@/lib/utils";
import {
  Box,
  BarChart3,
  Boxes,
  CalendarDays,
  Cog,
  LayoutDashboard,
  Ticket,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useRef } from "react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/events", label: "Events", icon: Ticket },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/assets", label: "Assets", icon: Box },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Cog },
];

type DashboardLayoutProps = {
  children: React.ReactNode;
  canAccessSettings: boolean;
  canAccessCalendar: boolean;
  canAccessEvents: boolean;
  canAccessInventory: boolean;
  canAccessAssets: boolean;
};

export function DashboardLayout({
  children,
  canAccessSettings,
  canAccessCalendar,
  canAccessEvents,
  canAccessInventory,
  canAccessAssets,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const prefetchedRoutesRef = useRef<Set<string>>(new Set());

  const visibleNavItems = useMemo(
    () => {
      let items = navItems;
      if (!canAccessSettings) {
        items = items.filter((item) => item.href !== "/settings");
      }
      if (!canAccessCalendar) {
        items = items.filter((item) => item.href !== "/calendar");
      }
      if (!canAccessEvents) {
        items = items.filter((item) => item.href !== "/events");
      }
      if (!canAccessInventory) {
        items = items.filter((item) => item.href !== "/inventory");
      }
      if (!canAccessAssets) {
        items = items.filter((item) => item.href !== "/assets");
      }
      return items;
    },
    [
      canAccessSettings,
      canAccessCalendar,
      canAccessEvents,
      canAccessInventory,
      canAccessAssets,
    ],
  );

  const prefetchRoute = useCallback(
    (href: string) => {
      // Avoid eager prefetching every route on each navigation.
      // Prefetch on interaction keeps transitions quick with lower background load.
      if (prefetchedRoutesRef.current.has(href)) {
        return;
      }
      prefetchedRoutesRef.current.add(href);
      router.prefetch(href);
    },
    [router],
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,rgba(231,150,21,0.16),transparent_38%),radial-gradient(circle_at_100%_0%,rgba(80,56,39,0.09),transparent_36%),linear-gradient(180deg,var(--color-surface),var(--color-surface-soft))] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px]">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-border/70 bg-card/80 px-6 py-8 backdrop-blur-xl lg:flex">
          <div className="mb-10">
            <div className="relative -ml-1 h-12 w-40 overflow-hidden">
              <Image
                src="/signals-logo.png"
                alt="Signals"
                fill
                sizes="160px"
                priority
                className="object-cover object-center"
              />
            </div>
          </div>

          <nav className="flex-1 space-y-1.5">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => prefetchRoute(item.href)}
                  onFocus={() => prefetchRoute(item.href)}
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

          <form action={logoutAction} className="mt-4">
            <button
              type="submit"
              className="btn-primary w-full rounded-2xl px-3.5 py-2.5 text-sm font-medium"
            >
              Log out
            </button>
          </form>
        </aside>

        <main className="min-w-0 w-full px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
          <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-2 lg:hidden">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => prefetchRoute(item.href)}
                  onFocus={() => prefetchRoute(item.href)}
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
            <form action={logoutAction} className="ml-1 shrink-0">
              <button
                type="submit"
                className="btn-primary rounded-xl px-3 py-2 text-xs font-medium"
              >
                Log out
              </button>
            </form>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
