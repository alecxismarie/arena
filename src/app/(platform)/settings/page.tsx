import { AccountSettingsForm } from "@/components/settings/account-settings-form";
import { TeamMembersForm } from "@/components/settings/team-members-form";
import { WorkspaceSettingsForm } from "@/components/settings/workspace-settings-form";
import { assertOwner } from "@/lib/access-control";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  WORKSPACE_CURRENCY_OPTIONS,
  WORKSPACE_TIMEZONE_OPTIONS,
  resolveWorkspaceCurrency,
  resolveWorkspaceTimezone,
} from "@/lib/workspace-options";
import { getCurrentWorkspace } from "@/lib/workspace";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/");
  }

  try {
    assertOwner(context);
  } catch {
    redirect("/dashboard");
  }

  const [workspace, account, memberships] = await Promise.all([
    getCurrentWorkspace(),
    prisma.user.findUnique({
      where: {
        id: context.userId,
      },
      select: {
        name: true,
        email: true,
      },
    }),
    prisma.workspaceMembership.findMany({
      where: {
        workspace_id: context.workspaceId,
      },
      orderBy: [
        {
          role: "asc",
        },
        {
          created_at: "asc",
        },
      ],
      select: {
        role: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
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
          <AccountSettingsForm
            defaultName={account.name}
            email={account.email}
            defaultRole={context.role}
          />
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
          <WorkspaceSettingsForm
            defaultName={workspace.name}
            defaultTimezone={selectedTimezone}
            defaultCurrency={selectedCurrency}
            timezoneOptions={WORKSPACE_TIMEZONE_OPTIONS}
            currencyOptions={WORKSPACE_CURRENCY_OPTIONS}
          />
        )}
      </section>

      <section className="rounded-3xl border border-border/60 bg-card/90 p-5">
        <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add members, set their role, and remove access when needed.
        </p>
        <TeamMembersForm
          members={memberships.map((membership) => ({
            userId: membership.user.id,
            name: membership.user.name,
            email: membership.user.email,
            role: membership.role,
            isCurrentUser: membership.user.id === context.userId,
          }))}
        />
      </section>
    </div>
  );
}
