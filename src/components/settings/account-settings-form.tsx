"use client";

import { updateAccountAction } from "@/app/actions/workspace-actions";
import { BrandSelect } from "@/components/ui/brand-select";
import { useMemo, useState } from "react";

type AccountSettingsFormProps = {
  defaultName: string;
  email: string;
  defaultRole: "owner" | "editor";
};

export function AccountSettingsForm({
  defaultName,
  email,
  defaultRole,
}: AccountSettingsFormProps) {
  const [name, setName] = useState(defaultName);
  const [role, setRole] = useState<"owner" | "editor">(defaultRole);

  const isDirty = useMemo(() => {
    return name.trim() !== defaultName.trim() || role !== defaultRole;
  }, [defaultName, defaultRole, name, role]);

  return (
    <form action={updateAccountAction} className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-foreground">Username</span>
          <input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            suppressHydrationWarning
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
          />
        </label>

        <div className="space-y-1.5 text-sm">
          <span className="font-medium text-foreground">Email</span>
          <p className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5 text-foreground">
            {email}
          </p>
        </div>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-foreground">Role</span>
          <BrandSelect
            name="role"
            value={role}
            onChange={(next) => setRole(next as "owner" | "editor")}
            options={[
              { value: "owner", label: "Owner" },
              { value: "editor", label: "Editor" },
            ]}
            className="capitalize"
          />
        </label>
      </div>

      {isDirty ? (
        <button
          type="submit"
          className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          Save changes
        </button>
      ) : null}
    </form>
  );
}
