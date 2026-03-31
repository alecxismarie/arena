import { createWorkspaceAction } from "@/app/actions/workspace-actions";
import {
  WORKSPACE_CURRENCY_OPTIONS,
  WORKSPACE_DEFAULT_CURRENCY,
  WORKSPACE_DEFAULT_TIMEZONE,
  WORKSPACE_TIMEZONE_OPTIONS,
} from "@/lib/workspace-options";
import { getCurrentWorkspace } from "@/lib/workspace";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const workspace = await getCurrentWorkspace();
  if (workspace) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-5 py-10 sm:px-8">
      <section className="grid w-full gap-6 rounded-3xl border border-border/70 bg-card/90 p-6 shadow-[0_10px_32px_-24px_rgba(15,23,42,0.7)] lg:grid-cols-2 lg:p-8">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Signals</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Understand how your events actually perform.
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            Track turnout, compare expected vs actual, and surface insights from
            past events.
          </p>
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
            Authentication is not configured in this environment yet.
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/70 p-5">
          <h2 className="text-lg font-semibold text-foreground">Create workspace</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up your workspace to enter the product.
          </p>

          <form action={createWorkspaceAction} className="mt-4 space-y-4">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Workspace name</span>
              <input
                name="name"
                placeholder="Signals Operations"
                required
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Timezone</span>
                <select
                  name="timezone"
                  defaultValue={WORKSPACE_DEFAULT_TIMEZONE}
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
                  defaultValue={WORKSPACE_DEFAULT_CURRENCY}
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
              className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
            >
              Create workspace
            </button>

            <button
              type="button"
              disabled
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground"
            >
              Log in
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
