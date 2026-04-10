import { spawnSync } from "node:child_process";

function run(command, args, options = {}) {
  const { capture = false } = options;
  const result = spawnSync(command, args, {
    stdio: capture ? "pipe" : "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  if (result.error) {
    throw result.error;
  }

  if (capture) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
  }

  return result;
}

function assertSuccess(result) {
  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase();
const isProduction = vercelEnv === "production";
const migrationStrict =
  process.env.VERCEL_MIGRATE_STRICT?.trim().toLowerCase() === "true";
const migrationRetryCount = Math.max(
  0,
  Number.parseInt(process.env.VERCEL_MIGRATE_RETRIES ?? "2", 10) || 0,
);

console.log(`[vercel-build] VERCEL_ENV=${vercelEnv || "unset"}`);

if (isProduction) {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("[vercel-build] DATABASE_URL is required for production migrations.");
  }

  console.log("[vercel-build] Running prisma migrate deploy (production only).");
  console.log(
    `[vercel-build] Migration strict mode: ${migrationStrict ? "enabled" : "disabled"}.`,
  );

  let migrationSucceeded = false;
  let lastResult = null;
  let lastOutput = "";
  const totalAttempts = migrationRetryCount + 1;

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    console.log(
      `[vercel-build] Migration attempt ${attempt}/${totalAttempts}.`,
    );
    const result = run("npx", ["prisma", "migrate", "deploy"], {
      capture: true,
    });
    lastResult = result;
    const stdout = result.stdout?.toString() ?? "";
    const stderr = result.stderr?.toString() ?? "";
    lastOutput = `${stdout}\n${stderr}`;

    if (result.status === 0) {
      migrationSucceeded = true;
      break;
    }

    const isP1001 = lastOutput.includes("P1001");
    if (!isP1001 || attempt >= totalAttempts) {
      break;
    }

    console.warn(
      "[vercel-build] prisma migrate deploy hit P1001 (database unreachable). Retrying...",
    );
    sleep(1500);
  }

  if (!migrationSucceeded) {
    const isP1001 = lastOutput.includes("P1001");
    if (isP1001 && !migrationStrict) {
      console.warn(
        "[vercel-build] Continuing build after P1001 because strict mode is disabled. Set VERCEL_MIGRATE_STRICT=true to fail deploys when migration cannot connect.",
      );
    } else if (lastResult) {
      assertSuccess(lastResult);
    } else {
      process.exit(1);
    }
  }
} else {
  console.log("[vercel-build] Skipping prisma migrate deploy (non-production build).");
}

console.log("[vercel-build] Generating Prisma Client.");
assertSuccess(run("npx", ["prisma", "generate"]));

assertSuccess(run("npm", ["run", "build:next"]));
