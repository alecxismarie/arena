import "server-only";

import { createHash, randomBytes } from "crypto";
import { startWorkspaceSession } from "@/lib/auth";
import { sendVerificationMagicLinkEmail } from "@/lib/brevo";
import { prisma } from "@/lib/prisma";
import {
  WORKSPACE_DEFAULT_CURRENCY,
  WORKSPACE_DEFAULT_TIMEZONE,
} from "@/lib/workspace-options";

const TOKEN_TTL_MS = 15 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 60 * 1000;
const MAX_ACTIVE_TOKENS_PER_EMAIL = 5;

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

export async function requestOnboardingVerification(formData: FormData) {
  const email = parseEmail(formData.get("email"));
  const workspaceName = parseWorkspaceName(formData.get("workspace_name"));
  const now = new Date();

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

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

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
    };
  });
}

export async function completeOnboardingFromVerificationToken(token: string) {
  const consumed = await consumeVerificationToken(token);

  const user = await prisma.user.upsert({
    where: { email: consumed.email },
    update: {},
    create: {
      email: consumed.email,
      name: deriveNameFromEmail(consumed.email),
    },
    select: { id: true },
  });

  const workspaceId = await findWorkspaceForUser(user.id);
  if (workspaceId) {
    await startWorkspaceSession({
      userId: user.id,
      workspaceId,
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
  });

  return {
    redirectTo: "/dashboard" as const,
  };
}
