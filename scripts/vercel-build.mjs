import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
}

const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase();
const isProduction = vercelEnv === "production";

console.log(`[vercel-build] VERCEL_ENV=${vercelEnv || "unset"}`);

if (isProduction) {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("[vercel-build] DATABASE_URL is required for production migrations.");
  }

  console.log("[vercel-build] Running prisma migrate deploy (production only).");
  run("npx", ["prisma", "migrate", "deploy"]);
} else {
  console.log("[vercel-build] Skipping prisma migrate deploy (non-production build).");
}

run("npm", ["run", "build:next"]);
