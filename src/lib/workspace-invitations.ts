import "server-only";

import { WorkspaceRole } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { startWorkspaceSession } from "@/lib/auth";
import { sendWorkspaceInvitationEmail } from "@/lib/brevo";
import { prisma } from "@/lib/prisma";

const INVITATION_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

export async function createWorkspaceInvitation(params: {
  workspaceId: string;
  workspaceName: string;
  invitedByUserId: string;
  invitedByName: string;
  invitedByEmail: string;
  invitedEmail: string;
  invitedName: string;
  invitedRole: WorkspaceRole;
}) {
  const now = new Date();
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(now.getTime() + INVITATION_TOKEN_TTL_MS);

  await prisma.$transaction(async (tx) => {
    await tx.workspaceInvitationToken.deleteMany({
      where: {
        workspace_id: params.workspaceId,
        invited_email: params.invitedEmail,
      },
    });

    await tx.workspaceInvitationToken.create({
      data: {
        workspace_id: params.workspaceId,
        invited_by_user_id: params.invitedByUserId,
        invited_email: params.invitedEmail,
        invited_name: params.invitedName,
        invited_role: params.invitedRole,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });
  });

  const acceptUrl = `${getBaseUrl()}/api/auth/invite/accept?token=${encodeURIComponent(token)}`;
  try {
    await sendWorkspaceInvitationEmail({
      toEmail: params.invitedEmail,
      workspaceName: params.workspaceName,
      invitedByName: params.invitedByName,
      invitedByEmail: params.invitedByEmail,
      invitedRole: params.invitedRole,
      acceptUrl,
      expiresAt,
    });
  } catch (error) {
    await prisma.workspaceInvitationToken.deleteMany({
      where: {
        token_hash: tokenHash,
      },
    });
    throw error;
  }
}

type ConsumedWorkspaceInvitation = {
  workspaceId: string;
  invitedEmail: string;
  invitedName: string;
  invitedRole: WorkspaceRole;
};

async function consumeWorkspaceInvitationToken(token: string): Promise<ConsumedWorkspaceInvitation> {
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    throw new Error("Invalid invitation link");
  }

  const now = new Date();
  const tokenHash = hashToken(normalizedToken);

  return prisma.$transaction(async (tx) => {
    const record = await tx.workspaceInvitationToken.findUnique({
      where: {
        token_hash: tokenHash,
      },
      select: {
        id: true,
        workspace_id: true,
        invited_email: true,
        invited_name: true,
        invited_role: true,
        expires_at: true,
        consumed_at: true,
      },
    });

    if (!record) {
      throw new Error("Invalid invitation link");
    }
    if (record.consumed_at) {
      throw new Error("This invitation link has already been used");
    }
    if (record.expires_at <= now) {
      throw new Error("This invitation link has expired");
    }

    const consumed = await tx.workspaceInvitationToken.updateMany({
      where: {
        id: record.id,
        consumed_at: null,
      },
      data: {
        consumed_at: now,
      },
    });

    if (consumed.count === 0) {
      throw new Error("This invitation link has already been used");
    }

    return {
      workspaceId: record.workspace_id,
      invitedEmail: record.invited_email,
      invitedName: record.invited_name,
      invitedRole: record.invited_role,
    };
  });
}

export async function completeWorkspaceInvitationFromToken(token: string) {
  const consumed = await consumeWorkspaceInvitationToken(token);

  const user = await prisma.user.upsert({
    where: {
      email: consumed.invitedEmail,
    },
    update: {},
    create: {
      email: consumed.invitedEmail,
      name: consumed.invitedName || deriveNameFromEmail(consumed.invitedEmail),
    },
    select: {
      id: true,
    },
  });

  await prisma.workspaceMembership.upsert({
    where: {
      workspace_id_user_id: {
        workspace_id: consumed.workspaceId,
        user_id: user.id,
      },
    },
    update: {},
    create: {
      workspace_id: consumed.workspaceId,
      user_id: user.id,
      role: consumed.invitedRole,
    },
  });

  await startWorkspaceSession({
    userId: user.id,
    workspaceId: consumed.workspaceId,
  });

  return {
    redirectTo: "/dashboard" as const,
  };
}
