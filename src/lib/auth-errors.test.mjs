import assert from "node:assert/strict";
import {
  assertOnboardingRuntimeEnv,
  AuthFlowError,
  getMissingOnboardingEnvVars,
  getSafeAuthFlowError,
} from "./auth-errors.ts";

function test(name, run) {
  try {
    run();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

const completeEnv = {
  DATABASE_URL: "postgresql://user:pass@example.test/db",
  APP_BASE_URL: "https://signals.example.test",
  BREVO_API_KEY: "brevo-key",
  BREVO_SENDER_EMAIL: "no-reply@example.test",
};

test("detects missing onboarding environment variables by name only", () => {
  assert.deepEqual(getMissingOnboardingEnvVars({ DATABASE_URL: "set" }), [
    "APP_BASE_URL",
    "BREVO_API_KEY",
    "BREVO_SENDER_EMAIL",
  ]);
});

test("accepts complete onboarding environment variables", () => {
  assert.doesNotThrow(() => assertOnboardingRuntimeEnv(completeEnv));
});

test("turns missing environment variables into a safe configuration error", () => {
  assert.throws(
    () => assertOnboardingRuntimeEnv({ ...completeEnv, APP_BASE_URL: "" }),
    (error) =>
      error instanceof AuthFlowError &&
      error.code === "configuration" &&
      error.safeMessage ===
        "Signals onboarding is not fully configured. Please contact support.",
  );
});

test("preserves expected auth flow errors for the client", () => {
  assert.deepEqual(
    getSafeAuthFlowError(new AuthFlowError("validation", "Email is required")),
    {
      code: "validation",
      message: "Email is required",
    },
  );
});

test("maps Prisma initialization failures to a safe database error", () => {
  const error = new Error(
    "Authentication failed against database server, the provided database credentials are not valid.",
  );
  error.name = "PrismaClientInitializationError";

  assert.deepEqual(getSafeAuthFlowError(error), {
    code: "database",
    message: "We could not reach the Signals database. Please try again shortly.",
  });
});

test("maps Prisma schema mismatch errors to a safe database error", () => {
  const error = Object.assign(new Error("The table does not exist in the current database."), {
    code: "P2021",
  });

  assert.deepEqual(getSafeAuthFlowError(error), {
    code: "database",
    message: "We could not reach the Signals database. Please try again shortly.",
  });
});

test("maps invitation email failures to a safe invitation error", () => {
  assert.deepEqual(
    getSafeAuthFlowError(new Error("Unable to send workspace invitation email")),
    {
      code: "email_delivery",
      message: "We could not send the invitation email. Please try again.",
    },
  );
});

test("maps unknown failures to a generic onboarding error", () => {
  assert.deepEqual(getSafeAuthFlowError(new Error("unexpected detail")), {
    code: "unexpected",
    message: "We could not complete onboarding. Please try again.",
  });
});
