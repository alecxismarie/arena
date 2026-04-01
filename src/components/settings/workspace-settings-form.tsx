"use client";

import { updateWorkspaceAction } from "@/app/actions/workspace-actions";
import { BrandSelect } from "@/components/ui/brand-select";
import { useMemo, useState } from "react";

type Option = {
  value: string;
  label: string;
};

type WorkspaceSettingsFormProps = {
  defaultName: string;
  defaultTimezone: string;
  defaultCurrency: string;
  timezoneOptions: Option[];
  currencyOptions: Option[];
};

export function WorkspaceSettingsForm({
  defaultName,
  defaultTimezone,
  defaultCurrency,
  timezoneOptions,
  currencyOptions,
}: WorkspaceSettingsFormProps) {
  const [name, setName] = useState(defaultName);
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [currency, setCurrency] = useState(defaultCurrency);

  const isDirty = useMemo(() => {
    return (
      name.trim() !== defaultName.trim() ||
      timezone !== defaultTimezone ||
      currency !== defaultCurrency
    );
  }, [currency, defaultCurrency, defaultName, defaultTimezone, name, timezone]);

  return (
    <form action={updateWorkspaceAction} className="mt-4 space-y-4">
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium text-foreground">Workspace name</span>
        <input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          suppressHydrationWarning
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-foreground">Timezone</span>
          <BrandSelect
            name="timezone"
            value={timezone}
            onChange={setTimezone}
            options={timezoneOptions}
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-foreground">Currency</span>
          <BrandSelect
            name="currency"
            value={currency}
            onChange={setCurrency}
            options={currencyOptions}
            className="uppercase"
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
