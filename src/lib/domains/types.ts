export const ANALYSIS_DOMAINS = [
  "event_performance",
  "inventory_performance",
  "asset_utilization",
] as const;

export type AnalysisDomain = (typeof ANALYSIS_DOMAINS)[number];
export type LegacySurfaceDomain = "events" | "inventory" | "assets";

export type DomainMetadata = {
  id: AnalysisDomain;
  label: string;
  description: string;
  routeSegment: LegacySurfaceDomain;
  enabledByDefault: boolean;
};

export const DEFAULT_ANALYSIS_DOMAIN: AnalysisDomain = "event_performance";

const DOMAIN_METADATA: Record<AnalysisDomain, DomainMetadata> = {
  event_performance: {
    id: "event_performance",
    label: "Event Performance",
    description:
      "Track event turnout, ticket sales, attendance variance, and event-level outcomes.",
    routeSegment: "events",
    enabledByDefault: true,
  },
  inventory_performance: {
    id: "inventory_performance",
    label: "Inventory Performance",
    description:
      "Track daily inventory movement, units sold, margin, waste, and product health.",
    routeSegment: "inventory",
    enabledByDefault: true,
  },
  asset_utilization: {
    id: "asset_utilization",
    label: "Asset Utilization",
    description:
      "Track booked-vs-idle utilization, capacity efficiency, and asset productivity.",
    routeSegment: "assets",
    enabledByDefault: true,
  },
};

const LEGACY_TO_CANONICAL_DOMAIN: Record<string, AnalysisDomain> = {
  events: "event_performance",
  event: "event_performance",
  event_performance: "event_performance",
  inventory: "inventory_performance",
  inventory_performance: "inventory_performance",
  assets: "asset_utilization",
  asset: "asset_utilization",
  asset_utilization: "asset_utilization",
};

const CANONICAL_TO_LEGACY_DOMAIN: Record<AnalysisDomain, LegacySurfaceDomain> = {
  event_performance: "events",
  inventory_performance: "inventory",
  asset_utilization: "assets",
};

export function isAnalysisDomain(value: string): value is AnalysisDomain {
  return ANALYSIS_DOMAINS.includes(value as AnalysisDomain);
}

export const isValidDomain = isAnalysisDomain;

export function getDomainMetadata(domain: AnalysisDomain): DomainMetadata {
  return DOMAIN_METADATA[domain];
}

export function getAllDomainMetadata() {
  return ANALYSIS_DOMAINS.map((domain) => DOMAIN_METADATA[domain]);
}

export function getDefaultDomains() {
  return ANALYSIS_DOMAINS.filter(
    (domain) => DOMAIN_METADATA[domain].enabledByDefault,
  );
}

export function mapLegacyDomainName(
  value: string | null | undefined,
): AnalysisDomain | null {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return null;

  if (isAnalysisDomain(normalized)) {
    return normalized;
  }

  return LEGACY_TO_CANONICAL_DOMAIN[normalized] ?? null;
}

export function mapCanonicalDomainToLegacy(
  domain: AnalysisDomain,
): LegacySurfaceDomain {
  return CANONICAL_TO_LEGACY_DOMAIN[domain];
}
