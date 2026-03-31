const timezoneOptions = [
  ["UTC", "UTC"],
  ["America/New_York", "New York (ET)"],
  ["America/Chicago", "Chicago (CT)"],
  ["America/Denver", "Denver (MT)"],
  ["America/Los_Angeles", "Los Angeles (PT)"],
  ["Europe/London", "London"],
  ["Europe/Paris", "Paris"],
  ["Asia/Dubai", "Dubai"],
  ["Asia/Manila", "Manila (PHT)"],
  ["Asia/Singapore", "Singapore"],
  ["Asia/Tokyo", "Tokyo"],
  ["Australia/Sydney", "Sydney"],
] as const;

const currencyOptions = [
  ["USD", "USD - US Dollar"],
  ["EUR", "EUR - Euro"],
  ["GBP", "GBP - British Pound"],
  ["SGD", "SGD - Singapore Dollar"],
  ["AUD", "AUD - Australian Dollar"],
  ["CAD", "CAD - Canadian Dollar"],
  ["PHP", "PHP - Philippine Peso"],
  ["JPY", "JPY - Japanese Yen"],
] as const;

export const WORKSPACE_DEFAULT_TIMEZONE = "UTC";
export const WORKSPACE_DEFAULT_CURRENCY = "USD";

export const WORKSPACE_TIMEZONE_OPTIONS = timezoneOptions.map(
  ([value, label]) => ({
    value,
    label,
  }),
);

export const WORKSPACE_CURRENCY_OPTIONS = currencyOptions.map(
  ([value, label]) => ({
    value,
    label,
  }),
);

const timezoneSet = new Set<string>(
  WORKSPACE_TIMEZONE_OPTIONS.map((option) => option.value),
);
const currencySet = new Set<string>(
  WORKSPACE_CURRENCY_OPTIONS.map((option) => option.value),
);

function isValidTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function resolveWorkspaceTimezone(value: string | null | undefined) {
  const timezone = String(value ?? "").trim();
  if (timezoneSet.has(timezone) && isValidTimezone(timezone)) {
    return timezone;
  }
  if (isValidTimezone(timezone)) {
    return timezone;
  }
  return WORKSPACE_DEFAULT_TIMEZONE;
}

export function resolveWorkspaceCurrency(value: string | null | undefined) {
  const currency = String(value ?? "").trim().toUpperCase();
  if (currencySet.has(currency)) {
    return currency;
  }
  return WORKSPACE_DEFAULT_CURRENCY;
}

export function isAllowedWorkspaceTimezone(value: string) {
  return timezoneSet.has(value);
}

export function isAllowedWorkspaceCurrency(value: string) {
  return currencySet.has(value);
}
