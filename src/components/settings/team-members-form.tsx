"use client";

import {
  addTeamMemberAction,
  removeTeamMemberAction,
  updateTeamMemberRoleAction,
} from "@/app/actions/workspace-actions";
import { BrandSelect } from "@/components/ui/brand-select";
import { useEffect, useState } from "react";

type TeamMember = {
  userId: string;
  name: string;
  email: string;
  role: "owner" | "editor";
  isCurrentUser: boolean;
};

export function TeamMembersForm({ members }: { members: TeamMember[] }) {
  const [showInviteNotice, setShowInviteNotice] = useState(false);

  useEffect(() => {
    if (!showInviteNotice) return;

    const timeoutId = window.setTimeout(() => {
      setShowInviteNotice(false);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [showInviteNotice]);

  return (
    <div className="mt-4 space-y-4">
      <form
        action={addTeamMemberAction}
        onSubmit={() => setShowInviteNotice(true)}
        className="rounded-2xl border border-border/60 bg-background/60 p-4"
      >
        <h3 className="text-sm font-semibold text-foreground">Add team member</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1.5fr_1fr_auto]">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-foreground">Name</span>
            <input
              name="name"
              type="text"
              placeholder="Member name"
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-foreground">Email</span>
            <input
              name="email"
              type="email"
              placeholder="member@company.com"
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-foreground">Role</span>
            <BrandSelect
              name="role"
              defaultValue="editor"
              options={[
                { value: "owner", label: "Owner" },
                { value: "editor", label: "Editor" },
              ]}
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="btn-primary w-full rounded-xl px-4 py-2.5 text-sm font-semibold md:w-auto"
            >
              Add member
            </button>
          </div>
        </div>
        {showInviteNotice ? (
          <p className="mt-3 rounded-lg border border-border/50 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
            They&apos;ll receive an invitation email with workspace access details and a secure accept link.
          </p>
        ) : null}
      </form>

      <div className="space-y-3">
        {members.length === 0 ? (
          <p className="rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
            No team members yet.
          </p>
        ) : (
          members.map((member) => (
            <article
              key={member.userId}
              className="rounded-2xl border border-border/60 bg-background/55 p-4"
            >
              <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {member.name || "Unnamed user"}
                    {member.isCurrentUser ? (
                      <span className="ml-2 rounded-full border border-border/70 bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        You
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{member.email}</p>
                </div>

                <form action={updateTeamMemberRoleAction} className="space-y-1.5">
                  <input type="hidden" name="user_id" value={member.userId} />
                  <span className="block text-sm font-medium text-foreground">Role</span>
                  <div className="flex items-center gap-2">
                    <BrandSelect
                      name="role"
                      defaultValue={member.role}
                      className="min-w-0 flex-1"
                      triggerClassName="h-11 py-0"
                      options={[
                        { value: "owner", label: "Owner" },
                        { value: "editor", label: "Editor" },
                      ]}
                    />
                    <button
                      type="submit"
                      className="btn-secondary h-11 shrink-0 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap"
                    >
                      Update
                    </button>
                    <button
                      type="submit"
                      formAction={removeTeamMemberAction}
                      disabled={member.isCurrentUser}
                      className="btn-secondary h-11 shrink-0 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                </form>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
