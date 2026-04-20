import "server-only";

import type { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import {
  ANALYSIS_DOMAINS,
  AnalysisDomain,
  DEFAULT_ANALYSIS_DOMAIN,
  LegacySurfaceDomain,
  getDefaultDomains,
  mapCanonicalDomainToLegacy,
  mapLegacyDomainName,
} from "@/lib/domains/types";
import { getDomainUsageSignals } from "@/lib/domain-focus";
import { prisma } from "@/lib/prisma";

export type WorkspaceDomainConfig = {
  primaryDomain: AnalysisDomain | null;
  enabledDomains: AnalysisDomain[] | null;
  hasPersistedConfig: boolean;
};

export type NormalizedWorkspaceDomainConfig = {
  primaryDomain: AnalysisDomain | null;
  enabledDomains: AnalysisDomain[];
  hasPersistedConfig: boolean;
  hadInvalidEnabledValues: boolean;
  hadInvalidPrimaryValue: boolean;
  hadLegacyAliases: boolean;
  usedDefaultEnabledDomains: boolean;
  autoIncludedPrimaryDomain: boolean;
};

export type ResolvedWorkspaceDomainState = {
  primaryDomain: AnalysisDomain;
  enabledDomains: AnalysisDomain[];
  primarySurfaceDomain: LegacySurfaceDomain;
  enabledSurfaceDomains: LegacySurfaceDomain[];
  source: "config" | "fallback";
  config: NormalizedWorkspaceDomainConfig;
};

const DOMAIN_INDEX = new Map(
  ANALYSIS_DOMAINS.map((domain, index) => [domain, index]),
);
const DOMAIN_CONFIG_CACHE_SECONDS = 30;

export function getWorkspaceDomainConfigCacheTag(workspaceId: string) {
  return `workspace-domain-config:${workspaceId}`;
}

function sortDomainsCanonical(domains: AnalysisDomain[]) {
  const unique = Array.from(new Set(domains));
  return unique.sort(
    (a, b) => (DOMAIN_INDEX.get(a) ?? 999) - (DOMAIN_INDEX.get(b) ?? 999),
  );
}

function hasStoredConfigRaw(params: {
  primaryDomainRaw: string | null | undefined;
  enabledDomainsRaw: Prisma.JsonValue | null | undefined;
}) {
  const hasPrimary = String(params.primaryDomainRaw ?? "").trim().length > 0;
  return hasPrimary || params.enabledDomainsRaw !== null;
}

function toDomainInputList(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  const parsed: string[] = [];
  value.forEach((item) => {
    if (typeof item === "string") {
      parsed.push(item);
    }
  });
  return parsed;
}

type NormalizeWorkspaceDomainConfigParams = {
  enabledDomainInputs: string[];
  primaryDomainInput?: string | null | undefined;
  hasPersistedConfig?: boolean;
  rejectInvalidPrimary?: boolean;
  fallbackToDefaultEnabledDomains?: boolean;
};

export function normalizeWorkspaceDomainConfig({
  enabledDomainInputs,
  primaryDomainInput,
  hasPersistedConfig = false,
  rejectInvalidPrimary = false,
  fallbackToDefaultEnabledDomains = true,
}: NormalizeWorkspaceDomainConfigParams): NormalizedWorkspaceDomainConfig {
  const normalizedEnabled: AnalysisDomain[] = [];
  let hadInvalidEnabledValues = false;
  let hadInvalidPrimaryValue = false;
  let hadLegacyAliases = false;
  let usedDefaultEnabledDomains = false;
  let autoIncludedPrimaryDomain = false;

  enabledDomainInputs.forEach((rawValue) => {
    const normalizedRaw = String(rawValue ?? "")
      .trim()
      .toLowerCase();
    if (!normalizedRaw) {
      return;
    }

    const mapped = mapLegacyDomainName(normalizedRaw);
    if (!mapped) {
      hadInvalidEnabledValues = true;
      return;
    }

    if (mapped !== normalizedRaw) {
      hadLegacyAliases = true;
    }

    normalizedEnabled.push(mapped);
  });

  let enabledDomains = sortDomainsCanonical(normalizedEnabled);

  let primaryDomain: AnalysisDomain | null = null;
  const normalizedPrimaryRaw = String(primaryDomainInput ?? "")
    .trim()
    .toLowerCase();

  if (normalizedPrimaryRaw) {
    const mappedPrimary = mapLegacyDomainName(normalizedPrimaryRaw);
    if (!mappedPrimary) {
      hadInvalidPrimaryValue = true;
      if (rejectInvalidPrimary) {
        throw new Error("Primary domain must be a valid canonical domain");
      }
    } else {
      primaryDomain = mappedPrimary;
      if (mappedPrimary !== normalizedPrimaryRaw) {
        hadLegacyAliases = true;
      }
    }
  }

  if (enabledDomains.length === 0 && fallbackToDefaultEnabledDomains) {
    enabledDomains = getDefaultDomains();
    usedDefaultEnabledDomains = true;
  }

  // Safe reconciliation choice:
  // if a valid primary domain is provided but absent in enabled domains,
  // automatically include it to preserve operator intent.
  if (primaryDomain && !enabledDomains.includes(primaryDomain)) {
    enabledDomains = sortDomainsCanonical([...enabledDomains, primaryDomain]);
    autoIncludedPrimaryDomain = true;
  }

  if (enabledDomains.length === 0) {
    enabledDomains = getDefaultDomains();
    usedDefaultEnabledDomains = true;
  }

  return {
    primaryDomain,
    enabledDomains,
    hasPersistedConfig,
    hadInvalidEnabledValues,
    hadInvalidPrimaryValue,
    hadLegacyAliases,
    usedDefaultEnabledDomains,
    autoIncludedPrimaryDomain,
  };
}

export function normalizeWorkspaceDomainConfigForPersistence(params: {
  enabledDomainInputs: string[];
  primaryDomainInput?: string | null | undefined;
}) {
  const normalized = normalizeWorkspaceDomainConfig({
    enabledDomainInputs: params.enabledDomainInputs,
    primaryDomainInput: params.primaryDomainInput,
    hasPersistedConfig: true,
    rejectInvalidPrimary: true,
    fallbackToDefaultEnabledDomains: true,
  });

  return {
    ...normalized,
    primaryDomain:
      normalized.primaryDomain ??
      normalized.enabledDomains[0] ??
      DEFAULT_ANALYSIS_DOMAIN,
  };
}

const getWorkspaceDomainConfigRow = cache(async function getWorkspaceDomainConfigRow(
  workspaceId: string,
) {
  const cacheTag = getWorkspaceDomainConfigCacheTag(workspaceId);
  return unstable_cache(
    async () =>
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          primary_domain: true,
          enabled_domains: true,
        },
      }),
    [cacheTag],
    { revalidate: DOMAIN_CONFIG_CACHE_SECONDS, tags: [cacheTag] },
  )();
});

function mapHeuristicPrimaryDomainToCanonical(
  value: LegacySurfaceDomain,
): AnalysisDomain {
  const mapped = mapLegacyDomainName(value);
  return mapped ?? DEFAULT_ANALYSIS_DOMAIN;
}

export const resolveWorkspaceDomainState = cache(
  async function resolveWorkspaceDomainState(
    workspaceId: string,
  ): Promise<ResolvedWorkspaceDomainState> {
    const row = await getWorkspaceDomainConfigRow(workspaceId);
    const hasPersistedConfig = hasStoredConfigRaw({
      primaryDomainRaw: row?.primary_domain,
      enabledDomainsRaw: row?.enabled_domains,
    });

    const normalizedConfig = normalizeWorkspaceDomainConfig({
      enabledDomainInputs: toDomainInputList(row?.enabled_domains),
      primaryDomainInput: row?.primary_domain,
      hasPersistedConfig,
      rejectInvalidPrimary: false,
      fallbackToDefaultEnabledDomains: true,
    });

    let source: ResolvedWorkspaceDomainState["source"] = "config";
    let enabledDomains = normalizedConfig.enabledDomains;
    let primaryDomain =
      normalizedConfig.primaryDomain ??
      enabledDomains[0] ??
      DEFAULT_ANALYSIS_DOMAIN;

    if (!normalizedConfig.hasPersistedConfig) {
      source = "fallback";
      enabledDomains = getDefaultDomains();
      const usage = await getDomainUsageSignals(workspaceId);
      const heuristicPrimary = mapHeuristicPrimaryDomainToCanonical(
        usage.primaryDomain,
      );
      primaryDomain = enabledDomains.includes(heuristicPrimary)
        ? heuristicPrimary
        : enabledDomains[0] ?? DEFAULT_ANALYSIS_DOMAIN;
    }

    if (!enabledDomains.includes(primaryDomain)) {
      enabledDomains = sortDomainsCanonical([...enabledDomains, primaryDomain]);
    }

    const enabledSurfaceDomains = Array.from(
      new Set(enabledDomains.map(mapCanonicalDomainToLegacy)),
    );
    const primarySurfaceDomain = mapCanonicalDomainToLegacy(primaryDomain);

    return {
      primaryDomain,
      enabledDomains,
      primarySurfaceDomain,
      enabledSurfaceDomains,
      source,
      config: normalizedConfig,
    };
  },
);

export async function getWorkspaceDomainConfig(
  workspaceId: string,
): Promise<WorkspaceDomainConfig> {
  const state = await resolveWorkspaceDomainState(workspaceId);
  if (!state.config.hasPersistedConfig) {
    return {
      primaryDomain: null,
      enabledDomains: null,
      hasPersistedConfig: false,
    };
  }

  return {
    primaryDomain: state.config.primaryDomain,
    enabledDomains: state.config.enabledDomains,
    hasPersistedConfig: true,
  };
}

export async function resolveWorkspaceEnabledDomains(workspaceId: string) {
  const state = await resolveWorkspaceDomainState(workspaceId);
  return state.enabledDomains;
}

export async function resolveWorkspacePrimaryDomain(workspaceId: string) {
  const state = await resolveWorkspaceDomainState(workspaceId);
  return state.primaryDomain;
}

export async function resolveWorkspaceEnabledSurfaceDomains(
  workspaceId: string,
) {
  const state = await resolveWorkspaceDomainState(workspaceId);
  return state.enabledSurfaceDomains;
}

export async function resolveWorkspacePrimarySurfaceDomain(
  workspaceId: string,
) {
  const state = await resolveWorkspaceDomainState(workspaceId);
  return state.primarySurfaceDomain;
}

export function serializeEnabledDomainsForStorage(
  enabledDomains: AnalysisDomain[],
): Prisma.JsonArray {
  return sortDomainsCanonical(enabledDomains) as unknown as Prisma.JsonArray;
}

export function sanitizeDomainSelectionInput(values: string[]) {
  return normalizeWorkspaceDomainConfig({
    enabledDomainInputs: values,
    hasPersistedConfig: true,
    fallbackToDefaultEnabledDomains: false,
  }).enabledDomains;
}

export function sanitizePrimaryDomainInput(value: string) {
  return normalizeWorkspaceDomainConfig({
    enabledDomainInputs: [],
    primaryDomainInput: value,
    hasPersistedConfig: true,
    fallbackToDefaultEnabledDomains: false,
  }).primaryDomain;
}
