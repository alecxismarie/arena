export type AuthFlowErrorCode =
  | "validation"
  | "invalid_credentials"
  | "rate_limited"
  | "invalid_token"
  | "expired_token"
  | "configuration"
  | "database"
  | "email_delivery"
  | "unexpected";

export type SafeAuthFlowError = {
  code: AuthFlowErrorCode;
  message: string;
};

type EnvSource = Record<string, string | undefined>;

export const REQUIRED_ONBOARDING_ENV_VARS = [
  "DATABASE_URL",
  "APP_BASE_URL",
  "BREVO_API_KEY",
  "BREVO_SENDER_EMAIL",
] as const;

const CONFIGURATION_MESSAGE =
  "Signals onboarding is not fully configured. Please contact support.";
const DATABASE_MESSAGE =
  "We could not reach the Signals database. Please try again shortly.";
const EMAIL_MESSAGE =
  "We could not send your verification email. Please try again.";
const INVITE_EMAIL_MESSAGE =
  "We could not send the invitation email. Please try again.";
const UNEXPECTED_MESSAGE =
  "We could not complete onboarding. Please try again.";

export class AuthFlowError extends Error {
  readonly code: AuthFlowErrorCode;
  readonly safeMessage: string;
  readonly logMessage: string | null;

  constructor(
    code: AuthFlowErrorCode,
    safeMessage: string,
    options?: {
      logMessage?: string;
    },
  ) {
    super(safeMessage);
    this.name = "AuthFlowError";
    this.code = code;
    this.safeMessage = safeMessage;
    this.logMessage = options?.logMessage ?? null;
  }
}

export function getMissingOnboardingEnvVars(
  env: EnvSource = process.env,
) {
  return REQUIRED_ONBOARDING_ENV_VARS.filter(
    (name) => !env[name]?.trim(),
  );
}

export function createAuthConfigurationError(missing: readonly string[]) {
  return new AuthFlowError("configuration", CONFIGURATION_MESSAGE, {
    logMessage: `Missing required auth environment variable(s): ${missing.join(", ")}`,
  });
}

export function assertOnboardingRuntimeEnv(env: EnvSource = process.env) {
  const missing = getMissingOnboardingEnvVars(env);
  if (missing.length > 0) {
    throw createAuthConfigurationError(missing);
  }
}

function readErrorField(error: unknown, key: "name" | "code" | "message") {
  if (!error || typeof error !== "object" || !(key in error)) {
    return "";
  }

  const value = (error as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function sanitizeLogMessage(message: string) {
  return message.replace(/postgresql:\/\/\S+/g, "[redacted database url]");
}

function isConfigurationError(error: unknown) {
  const message = readErrorField(error, "message");
  return (
    message.endsWith(" is not configured") ||
    message.includes("Missing required auth environment variable")
  );
}

function isPrismaOperationalError(error: unknown) {
  const name = readErrorField(error, "name");
  const code = readErrorField(error, "code");
  const message = readErrorField(error, "message");

  return (
    name.startsWith("PrismaClient") ||
    [
      "P1000",
      "P1001",
      "P1002",
      "P1017",
      "P2021",
      "P2022",
      "P2024",
    ].includes(code) ||
    message.includes("Authentication failed against database server") ||
    message.includes("Can't reach database server") ||
    message.includes("Timed out fetching a new connection") ||
    message.includes("does not exist in the current database")
  );
}

function isEmailDeliveryError(error: unknown) {
  const message = readErrorField(error, "message");
  return message === "Unable to send verification email";
}

function isInvitationEmailDeliveryError(error: unknown) {
  const message = readErrorField(error, "message");
  return message === "Unable to send workspace invitation email";
}

export function getSafeAuthFlowError(error: unknown): SafeAuthFlowError {
  if (error instanceof AuthFlowError) {
    return {
      code: error.code,
      message: error.safeMessage,
    };
  }

  if (isPrismaOperationalError(error)) {
    return {
      code: "database",
      message: DATABASE_MESSAGE,
    };
  }

  if (isConfigurationError(error)) {
    return {
      code: "configuration",
      message: CONFIGURATION_MESSAGE,
    };
  }

  if (isEmailDeliveryError(error)) {
    return {
      code: "email_delivery",
      message: EMAIL_MESSAGE,
    };
  }

  if (isInvitationEmailDeliveryError(error)) {
    return {
      code: "email_delivery",
      message: INVITE_EMAIL_MESSAGE,
    };
  }

  return {
    code: "unexpected",
    message: UNEXPECTED_MESSAGE,
  };
}

export function logAuthFlowError(
  error: unknown,
  context: {
    flow: string;
    step: string;
  },
) {
  const safe = getSafeAuthFlowError(error);
  if (
    safe.code === "validation" ||
    safe.code === "invalid_credentials" ||
    safe.code === "rate_limited" ||
    safe.code === "invalid_token" ||
    safe.code === "expired_token"
  ) {
    return;
  }

  const name = readErrorField(error, "name") || "Error";
  const code = readErrorField(error, "code") || safe.code;
  const message =
    error instanceof AuthFlowError && error.logMessage
      ? error.logMessage
      : readErrorField(error, "message") || safe.message;

  console.error("[auth]", {
    flow: context.flow,
    step: context.step,
    code,
    name,
    message: sanitizeLogMessage(message),
  });
}
