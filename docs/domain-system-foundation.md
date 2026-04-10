# Domain System Foundation

## Canonical domain identifiers

- `event_performance`
- `inventory_performance`
- `asset_utilization`

Source of truth lives in `src/lib/domains/types.ts`.

## Workspace domain configuration

Persisted per workspace:

- `Workspace.primary_domain`
- `Workspace.enabled_domains`

Access helpers:

- `getWorkspaceDomainConfig(workspaceId)`
- `resolveWorkspaceDomainState(workspaceId)` (canonical read entrypoint)
- `resolveWorkspacePrimaryDomain(workspaceId)`
- `resolveWorkspaceEnabledDomains(workspaceId)`
- `resolveWorkspacePrimarySurfaceDomain(workspaceId)`
- `resolveWorkspaceEnabledSurfaceDomains(workspaceId)`

Normalization rules:

- accepts canonical ids and legacy aliases (`events`, `inventory`, `assets`)
- normalizes everything to canonical ids before persistence/use
- removes duplicates
- keeps stable canonical order
- if enabled domains collapse to empty, defaults are restored
- if a valid primary domain is outside enabled domains, it is auto-included

Fallback behavior:

- If persisted config is absent, legacy heuristic/default behavior remains active.

## Inventory canonical source

Canonical runtime inventory reporting source:

- `DailyProductReport`

Deprecated legacy table retained for backward compatibility:

- `InventoryRecord`
- Do not extend new runtime reporting logic on top of `InventoryRecord`.

## Standardized metrics contract (Phase 2A/2B/2C)

Canonical domain metrics contract lives in:

- `src/lib/domains/metrics-contract.ts`

Initial engine-layer adoption status:

- `event_performance`: implemented via `src/lib/domains/event-performance-metrics.ts`
- `inventory_performance`: implemented via `src/lib/domains/inventory-performance-metrics.ts`
- `asset_utilization`: implemented via `src/lib/domains/asset-utilization-metrics.ts`

Compatibility note:

- Existing dashboard and reports pages still consume legacy view models.
- `src/lib/analytics.ts` now maps standardized event metrics back into those legacy
  shapes to avoid breaking routes and UI while Phase 2 rolls out incrementally.
- `src/lib/inventory.ts` now maps standardized inventory metrics back into the
  existing inventory assessment shape while exposing additive `domainMetrics`.
- `src/lib/asset.ts` now maps standardized asset metrics back into the
  existing asset assessment shape while exposing additive `domainMetrics`.

## Phase 4A UI migration (transitional)

Low-risk read-only surfaces now consume standardized `domainMetrics` directly
with legacy fallback behavior preserved:

- `src/app/(platform)/dashboard/page.tsx` (event stat/attendance summaries)
- `src/app/(platform)/reports/page.tsx` (event/inventory/asset summary sections)
- `src/app/(platform)/assets/page.tsx` (asset summary cards and insights)

Shared selector utilities for UI-facing reads:

- `src/lib/domains/metrics-selectors.ts`

Deferred for later phases:

- forms and create/edit flows
- export contracts
- deeper chart redesigns and broader UI restructuring

## Phase 4A.1 controlled migration pass

Additional high-value read-only surfaces now consume `domainMetrics` via selectors
with legacy fallback preserved:

- `src/app/(platform)/dashboard/page.tsx`
  - event chart data prep (`weekly_revenue`, `monthly_revenue`, `daily_tickets`,
    `attendance_by_event`, `ticket_distribution`)
- `src/app/(platform)/reports/page.tsx`
  - remaining report chart-prep paths aligned to selector-driven trend/ranking reads
- `src/app/(platform)/events/[id]/page.tsx`
  - read-only event summary KPI blocks and event performance chart series
  - top intelligence summary message sourced from standardized insights with fallback

Still intentionally legacy-coupled for safety:

- deeper event intelligence detail blocks (averages, turnout range, trend table)
- mutation/form flows and export payload contracts

## Phase 4B premium UI transformation (presentational only)

Read-heavy surfaces received a visual hierarchy upgrade without changing routes,
permissions, empty-state behavior, or domain/business calculations:

- `src/app/(platform)/dashboard/page.tsx`
- `src/app/(platform)/reports/page.tsx`
- `src/app/(platform)/assets/page.tsx`
- `src/app/(platform)/events/[id]/page.tsx` (safe read-only sections only)

Shared presentation primitives were upgraded for consistency:

- `src/components/ui/stat-card.tsx`
- `src/components/ui/chart-card.tsx`
- `src/components/reports/report-table.tsx`

Boundary notes:

- Redesign is layered on top of existing `domainMetrics` + selector-driven reads.
- Mutation-heavy flows, settings/onboarding, exports, and broader IA remain deferred.
