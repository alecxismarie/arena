import "server-only";

import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "crypto";
import { promisify } from "util";
import {
  consumeRememberPreferenceCookie,
  setRememberPreferenceCookie,
  startWorkspaceSession,
} from "@/lib/auth";
import { sendVerificationMagicLinkEmail } from "@/lib/brevo";
import { prisma } from "@/lib/prisma";
import {
  WORKSPACE_DEFAULT_CURRENCY,
  WORKSPACE_DEFAULT_TIMEZONE,
} from "@/lib/workspace-options";

const TOKEN_TTL_MS = 15 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 60 * 1000;
const MAX_ACTIVE_TOKENS_PER_EMAIL = 5;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const PASSWORD_KEY_LENGTH = 64;
const scrypt = promisify(scryptCallback);

export type StartOnboardingResult =
  | { verificationSentTo: string }
  | { redirectTo: "/dashboard" };

function parseEmail(value: FormDataEntryValue | null) {
  const email = String(value ?? "").trim().toLowerCase();
  if (!email) {
    throw new Error("Email is required");
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    throw new Error("A valid email is required");
  }

  if (email.length > 254) {
    throw new Error("Email is too long");
  }

  return email;
}

function parseWorkspaceName(value: FormDataEntryValue | null) {
  const name = String(value ?? "").trim();
  if (!name) {
    throw new Error("Workspace name is required");
  }
  if (name.length > 80) {
    throw new Error("Workspace name must be 80 characters or less");
  }
  return name;
}

function parsePassword(value: FormDataEntryValue | null) {
  const password = String(value ?? "");
  if (!password) {
    throw new Error("Password is required");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`Password must be ${MAX_PASSWORD_LENGTH} characters or less`);
  }

  return password;
}

function parseRememberMe(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "on";
}

function deriveNameFromEmail(email: string) {
  const [localPart] = email.split("@");
  const cleaned = localPart.replace(/[._-]+/g, " ").trim();
  if (!cleaned) {
    return "Signals User";
  }

  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, passwordHash: string) {
  const [salt, hashHex] = passwordHash.split(":");
  if (!salt || !hashHex) {
    return false;
  }

  const expected = Buffer.from(hashHex, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}

function getBaseUrl() {
  const baseUrl = process.env.APP_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("APP_BASE_URL is not configured");
  }
  return baseUrl.replace(/\/+$/, "");
}

async function findWorkspaceForUser(userId: string) {
  const ownerMembership = await prisma.workspaceMembership.findFirst({
    where: { user_id: userId, role: "owner" },
    orderBy: { created_at: "asc" },
    select: { workspace_id: true },
  });

  if (ownerMembership) {
    return ownerMembership.workspace_id;
  }

  const membership = await prisma.workspaceMembership.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: "asc" },
    select: { workspace_id: true },
  });

  return membership?.workspace_id ?? null;
}

export async function requestOnboardingVerification(
  formData: FormData,
): Promise<StartOnboardingResult> {
  const email = parseEmail(formData.get("email"));
  const workspaceName = parseWorkspaceName(formData.get("workspace_name"));
  const password = parsePassword(formData.get("password"));
  const rememberMe = parseRememberMe(formData.get("remember_me"));
  const now = new Date();

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      password_hash: true,
    },
  });

  if (existingUser?.password_hash) {
    const isPasswordValid = await verifyPassword(password, existingUser.password_hash);
    if (!isPasswordValid) {
      throw new Error("Invalid email, workspace, or password");
    }

    const membership = await prisma.workspaceMembership.findFirst({
      where: {
        user_id: existingUser.id,
        workspace: {
          name: {
            equals: workspaceName,
            mode: "insensitive",
          },
        },
      },
      select: {
        workspace_id: true,
      },
    });

    if (!membership) {
      throw new Error("Invalid email, workspace, or password");
    }

    await startWorkspaceSession({
      userId: existingUser.id,
      workspaceId: membership.workspace_id,
      rememberMe,
    });

    return {
      redirectTo: "/dashboard",
    };
  }

  const passwordHash = await hashPassword(password);
  await setRememberPreferenceCookie(rememberMe);

  const [recentRequest, activeTokenCount] = await Promise.all([
    prisma.emailVerificationToken.findFirst({
      where: {
        email,
        created_at: {
          gte: new Date(now.getTime() - REQUEST_COOLDOWN_MS),
        },
      },
      select: { id: true },
    }),
    prisma.emailVerificationToken.count({
      where: {
        email,
        consumed_at: null,
        expires_at: {
          gt: now,
        },
      },
    }),
  ]);

  if (recentRequest) {
    throw new Error("Please wait a minute before requesting another email.");
  }

  if (activeTokenCount >= MAX_ACTIVE_TOKENS_PER_EMAIL) {
    throw new Error("Too many verification requests. Please try again later.");
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);

  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.deleteMany({
      where: {
        email,
        OR: [{ expires_at: { lte: now } }, { consumed_at: { not: null } }],
      },
    });

    await tx.emailVerificationToken.create({
      data: {
        email,
        workspace_name: workspaceName,
        password_hash: passwordHash,
        token_hash: tokenHash,
        expires_at: expiresAt,
        user_id: existingUser?.id ?? null,
      },
    });
  });

  const verifyUrl = `${getBaseUrl()}/api/auth/verify?token=${encodeURIComponent(token)}`;
  try {
    await sendVerificationMagicLinkEmail({
      toEmail: email,
      verifyUrl,
    });
  } catch (error) {
    await prisma.emailVerificationToken.deleteMany({
      where: {
        token_hash: tokenHash,
      },
    });
    throw error;
  }

  return {
    verificationSentTo: email,
  };
}

type ConsumeTokenResult = {
  email: string;
  workspaceName: string;
  passwordHash: string | null;
};

async function consumeVerificationToken(token: string): Promise<ConsumeTokenResult> {
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    throw new Error("Invalid verification link");
  }

  const now = new Date();
  const tokenHash = hashToken(normalizedToken);

  return prisma.$transaction(async (tx) => {
    const record = await tx.emailVerificationToken.findUnique({
      where: { token_hash: tokenHash },
      select: {
        id: true,
        email: true,
        workspace_name: true,
        password_hash: true,
        expires_at: true,
        consumed_at: true,
      },
    });

    if (!record) {
      throw new Error("Invalid verification link");
    }
    if (record.consumed_at) {
      throw new Error("This verification link has already been used");
    }
    if (record.expires_at <= now) {
      throw new Error("This verification link has expired");
    }

    const consumed = await tx.emailVerificationToken.updateMany({
      where: {
        id: record.id,
        consumed_at: null,
      },
      data: {
        consumed_at: now,
      },
    });

    if (consumed.count === 0) {
      throw new Error("This verification link has already been used");
    }

    return {
      email: record.email,
      workspaceName: record.workspace_name,
      passwordHash: record.password_hash,
    };
  });
}

export async function completeOnboardingFromVerificationToken(token: string) {
  const consumed = await consumeVerificationToken(token);
  const rememberMe = await consumeRememberPreferenceCookie();

  const user = await prisma.user.upsert({
    where: { email: consumed.email },
    update: consumed.passwordHash ? { password_hash: consumed.passwordHash } : {},
    create: {
      email: consumed.email,
      name: deriveNameFromEmail(consumed.email),
      password_hash: consumed.passwordHash,
    },
    select: { id: true },
  });

  const workspaceId = await findWorkspaceForUser(user.id);
  if (workspaceId) {
    await startWorkspaceSession({
      userId: user.id,
      workspaceId,
      rememberMe,
    });

    return {
      redirectTo: "/dashboard" as const,
    };
  }

  const workspace = await prisma.$transaction(async (tx) => {
    const createdWorkspace = await tx.workspace.create({
      data: {
        name: consumed.workspaceName,
        timezone: WORKSPACE_DEFAULT_TIMEZONE,
        currency: WORKSPACE_DEFAULT_CURRENCY,
      },
      select: { id: true },
    });

    await tx.workspaceMembership.create({
      data: {
        workspace_id: createdWorkspace.id,
        user_id: user.id,
        role: "owner",
      },
    });

    return createdWorkspace;
  });

  await startWorkspaceSession({
    userId: user.id,
    workspaceId: workspace.id,
    rememberMe,
  });

  return {
    redirectTo: "/dashboard" as const,
  };
}
