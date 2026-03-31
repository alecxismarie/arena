import { updateWorkspaceAction } from "@/app/actions/workspace-actions";
import { prisma } from "@/lib/prisma";
import {
  WORKSPACE_CURRENCY_OPTIONS,
  WORKSPACE_DEFAULT_CURRENCY,
  WORKSPACE_DEFAULT_TIMEZONE,
  WORKSPACE_TIMEZONE_OPTIONS,
  resolveWorkspaceCurrency,
  resolveWorkspaceTimezone,
} from "@/lib/workspace-options";
import { getCurrentWorkspace } from "@/lib/workspace";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [workspace, account] = await Promise.all([
    getCurrentWorkspace(),
    prisma.user.findFirst({
      select: {
        name: true,
        email: true,
        role: true,
      },
      orderBy: { created_at: "asc" },
    }),
  ]);
  const selectedTimezone = resolveWorkspaceTimezone(workspace?.timezone);
  const selectedCurrency = resolveWorkspaceCurrency(workspace?.currency);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.8)]">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage account and workspace details for Signals.
        </p>
      </header>

      <section className="rounded-3xl border border-border/60 bg-card/90 p-5">
        <h2 className="text-lg font-semibold text-foreground">Account</h2>
        {account ? (
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Name</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{account.name}</dd>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Email</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{account.email}</dd>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Role</dt>
              <dd className="mt-1 text-sm font-medium capitalize text-foreground">{account.role}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No account record is configured yet.
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-border/60 bg-card/90 p-5">
        <h2 className="text-lg font-semibold text-foreground">Workspace</h2>
        {!workspace ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No workspace found.{" "}
            <Link href="/" className="font-medium text-accent hover:underline">
              Create one now
            </Link>
            .
          </p>
        ) : (
          <form action={updateWorkspaceAction} className="mt-4 space-y-4">
            <input type="hidden" name="workspace_id" value={workspace.id} />

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Workspace name</span>
              <input
                name="name"
                defaultValue={workspace.name}
                required
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Timezone</span>
                <select
                  name="timezone"
                  defaultValue={selectedTimezone || WORKSPACE_DEFAULT_TIMEZONE}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
                >
                  {WORKSPACE_TIMEZONE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Currency</span>
                <select
                  name="currency"
                  defaultValue={selectedCurrency || WORKSPACE_DEFAULT_CURRENCY}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 uppercase outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
                >
                  {WORKSPACE_CURRENCY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="submit"
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
            >
              Save workspace
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
