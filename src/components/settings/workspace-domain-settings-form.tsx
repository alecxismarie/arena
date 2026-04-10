"use client";

import { updateWorkspaceDomainConfigAction } from "@/app/actions/workspace-actions";
import { BrandSelect } from "@/components/ui/brand-select";
import {
  ANALYSIS_DOMAINS,
  AnalysisDomain,
  getDomainMetadata,
} from "@/lib/domains/types";
import { useMemo, useState } from "react";

type WorkspaceDomainSettingsFormProps = {
  defaultPrimaryDomain: AnalysisDomain;
  defaultEnabledDomains: AnalysisDomain[];
  hasPersistedConfig: boolean;
};

const allDomainMetadata = ANALYSIS_DOMAINS.map((domain) => getDomainMetadata(domain));

function sortDomainList(domains: AnalysisDomain[]) {
  return domains.slice().sort((a, b) => a.localeCompare(b));
}

export function WorkspaceDomainSettingsForm({
  defaultPrimaryDomain,
  defaultEnabledDomains,
  hasPersistedConfig,
}: WorkspaceDomainSettingsFormProps) {
  const [primaryDomain, setPrimaryDomain] =
    useState<AnalysisDomain>(defaultPrimaryDomain);
  const [enabledDomains, setEnabledDomains] = useState<AnalysisDomain[]>(
    defaultEnabledDomains,
  );

  const normalizedDefaults = useMemo(
    () => sortDomainList(defaultEnabledDomains),
    [defaultEnabledDomains],
  );
  const normalizedCurrent = useMemo(
    () => sortDomainList(enabledDomains),
    [enabledDomains],
  );

  const isDirty = useMemo(() => {
    if (primaryDomain !== defaultPrimaryDomain) {
      return true;
    }
    if (normalizedDefaults.length !== normalizedCurrent.length) {
      return true;
    }
    return normalizedDefaults.some((value, index) => value !== normalizedCurrent[index]);
  }, [defaultPrimaryDomain, normalizedCurrent, normalizedDefaults, primaryDomain]);

  const primaryOptions = useMemo(
    () =>
      allDomainMetadata
        .filter((domain) => enabledDomains.includes(domain.id))
        .map((domain) => ({
          value: domain.id,
          label: domain.label,
        })),
    [enabledDomains],
  );

  function toggleDomain(domainId: AnalysisDomain, checked: boolean) {
    setEnabledDomains((current) => {
      if (checked) {
        if (current.includes(domainId)) return current;
        return [...current, domainId];
      }

      if (current.length <= 1) {
        return current;
      }

      const next = current.filter((value) => value !== domainId);
      if (!next.includes(primaryDomain)) {
        setPrimaryDomain(next[0] ?? primaryDomain);
      }
      return next;
    });
  }

  return (
    <form action={updateWorkspaceDomainConfigAction} className="mt-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        {hasPersistedConfig
          ? "Workspace domain preferences are currently persisted and actively used."
          : "No persisted domain configuration yet. Current behavior still uses legacy fallback defaults until you save."}
      </p>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Enabled domains</p>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {allDomainMetadata.map((domain) => {
            const checked = enabledDomains.includes(domain.id);
            return (
              <label
                key={domain.id}
                className="rounded-xl border border-border/70 bg-background/70 px-3 py-2"
              >
                <input
                  type="checkbox"
                  name="enabled_domains"
                  value={domain.id}
                  checked={checked}
                  onChange={(event) => toggleDomain(domain.id, event.target.checked)}
                  className="mr-2 h-4 w-4 align-middle accent-accent"
                />
                <span className="text-sm font-medium text-foreground">{domain.label}</span>
                <p className="mt-1 text-xs text-muted-foreground">{domain.description}</p>
              </label>
            );
          })}
        </div>
      </div>

      <label className="block space-y-1.5 text-sm">
        <span className="font-medium text-foreground">Primary domain</span>
        <BrandSelect
          name="primary_domain"
          value={primaryDomain}
          onChange={(value) => setPrimaryDomain(value as AnalysisDomain)}
          options={primaryOptions}
        />
      </label>

      {enabledDomains.length === 0 ? (
        <p className="rounded-xl border border-red-200/70 bg-red-50/85 px-3 py-2 text-sm text-red-700">
          At least one domain must remain enabled.
        </p>
      ) : null}

      {isDirty ? (
        <button
          type="submit"
          className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          Save domain configuration
        </button>
      ) : null}
    </form>
  );
}
