"use server";

import { Prisma, WorkspaceRole } from "@prisma/client";
import { assertOwner } from "@/lib/access-control";
import {
  requireAuthContext,
  requireIdentityContext,
  startWorkspaceSession,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createWorkspaceInvitation } from "@/lib/workspace-invitations";
import {
  WORKSPACE_DEFAULT_CURRENCY,
  WORKSPACE_DEFAULT_TIMEZONE,
  isAllowedWorkspaceCurrency,
  isAllowedWorkspaceTimezone,
} from "@/lib/workspace-options";
import {
  normalizeWorkspaceDomainConfigForPersistence,
  serializeEnabledDomainsForStorage,
  getWorkspaceDomainConfigCacheTag,
} from "@/lib/workspace-domain-config";
import { getDomainUsageCacheTag } from "@/lib/domain-focus";
import { getWorkspaceCacheTag } from "@/lib/workspace";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

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

function parseAccountName(value: FormDataEntryValue | null) {
  const name = String(value ?? "").trim();
  if (!name) {
    throw new Error("Name is required");
  }
  if (name.length > 80) {
    throw new Error("Name must be 80 characters or less");
  }
  return name;
}

function parseWorkspaceRole(value: FormDataEntryValue | null): WorkspaceRole {
  const role = String(value ?? "").trim().toLowerCase();
  if (role !== "owner" && role !== "editor") {
    throw new Error("Role must be owner or editor");
  }
  return role;
}

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

function parseMemberUserId(value: FormDataEntryValue | null) {
  const userId = String(value ?? "").trim();
  if (!userId) {
    throw new Error("Member is required");
  }
  return userId;
}

async function assertOwnerCountAfterDemotion(params: {
  tx: Prisma.TransactionClient;
  workspaceId: string;
}) {
  const ownerCount = await params.tx.workspaceMembership.count({
    where: {
      workspace_id: params.workspaceId,
      role: "owner",
    },
  });

  if (ownerCount <= 1) {
    throw new Error("At least one owner must remain in the workspace");
  }
}

function parseTimezone(value: FormDataEntryValue | null) {
  const timezone = String(value ?? "").trim();
  if (!timezone) return WORKSPACE_DEFAULT_TIMEZONE;
  if (!isAllowedWorkspaceTimezone(timezone)) {
    throw new Error("Timezone must be selected from the available options");
  }
  return timezone;
}

function parseCurrency(value: FormDataEntryValue | null) {
  const currency = String(value ?? "").trim().toUpperCase();
  if (!currency) return WORKSPACE_DEFAULT_CURRENCY;
  if (!isAllowedWorkspaceCurrency(currency)) {
    throw new Error("Currency must be selected from the available options");
  }
  return currency;
}

export async function createWorkspaceAction(formData: FormData) {
  const identity = await requireIdentityContext();

  const existingMembership = await prisma.workspaceMembership.findFirst({
    where: { user_id: identity.userId },
    orderBy: { created_at: "asc" },
    select: { workspace_id: true },
  });

  if (existingMembership) {
    await startWorkspaceSession({
      userId: identity.userId,
      workspaceId: existingMembership.workspace_id,
    });
    redirect("/dashboard");
  }

  const name = parseWorkspaceName(formData.get("name"));

  const workspace = await prisma.$transaction(async (tx) => {
    const createdWorkspace = await tx.workspace.create({
      data: {
        name,
        timezone: WORKSPACE_DEFAULT_TIMEZONE,
        currency: WORKSPACE_DEFAULT_CURRENCY,
      },
      select: { id: true },
    });

    await tx.workspaceMembership.create({
      data: {
        workspace_id: createdWorkspace.id,
        user_id: identity.userId,
        role: "owner",
      },
    });

    return createdWorkspace;
  });

  await startWorkspaceSession({
    userId: identity.userId,
    workspaceId: workspace.id,
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  redirect("/dashboard");
}

export async function updateWorkspaceAction(formData: FormData) {
  const context = await requireAuthContext();
  assertOwner(context);

  const name = parseWorkspaceName(formData.get("name"));
  const timezone = parseTimezone(formData.get("timezone"));
  const currency = parseCurrency(formData.get("currency"));

  await prisma.workspace.update({
    where: { id: context.workspaceId },
    data: {
      name,
      timezone,
      currency,
    },
  });

  revalidateTag(getWorkspaceCacheTag(context.workspaceId), "max");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
}

export async function updateWorkspaceDomainConfigAction(formData: FormData) {
  const context = await requireAuthContext();
  assertOwner(context);

  const normalized = normalizeWorkspaceDomainConfigForPersistence({
    enabledDomainInputs: formData
      .getAll("enabled_domains")
      .map((value) => String(value ?? "")),
    primaryDomainInput: String(formData.get("primary_domain") ?? ""),
  });

  await prisma.workspace.update({
    where: { id: context.workspaceId },
    data: {
      primary_domain: normalized.primaryDomain,
      enabled_domains: serializeEnabledDomainsForStorage(normalized.enabledDomains),
    },
  });

  revalidateTag(getWorkspaceDomainConfigCacheTag(context.workspaceId), "max");
  revalidateTag(getDomainUsageCacheTag(context.workspaceId), "max");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/settings");
}

export async function updateAccountAction(formData: FormData) {
  const context = await requireAuthContext();
  assertOwner(context);

  const name = parseAccountName(formData.get("name"));
  const role = parseWorkspaceRole(formData.get("role"));

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: context.userId },
      data: { name },
    });

    if (role !== context.role) {
      if (context.role === "owner" && role === "editor") {
        const ownerCount = await tx.workspaceMembership.count({
          where: {
            workspace_id: context.workspaceId,
            role: "owner",
          },
        });

        if (ownerCount <= 1) {
          throw new Error("At least one owner must remain in the workspace");
        }
      }

      await tx.workspaceMembership.update({
        where: {
          workspace_id_user_id: {
            workspace_id: context.workspaceId,
            user_id: context.userId,
          },
        },
        data: { role },
      });
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/settings");
}

export async function addTeamMemberAction(formData: FormData) {
  const context = await requireAuthContext();
  assertOwner(context);

  const name = parseAccountName(formData.get("name"));
  const email = parseEmail(formData.get("email"));
  const role = parseWorkspaceRole(formData.get("role"));

  const existingMembership = await prisma.workspaceMembership.findFirst({
    where: {
      workspace_id: context.workspaceId,
      user: {
        email,
      },
    },
    select: {
      user_id: true,
      role: true,
    },
  });

  if (existingMembership) {
    await prisma.$transaction(async (tx) => {
      const currentMembership = await tx.workspaceMembership.findUnique({
        where: {
          workspace_id_user_id: {
            workspace_id: context.workspaceId,
            user_id: existingMembership.user_id,
          },
        },
        select: {
          role: true,
        },
      });

      if (!currentMembership || currentMembership.role === role) {
        return;
      }

      if (currentMembership.role === "owner" && role === "editor") {
        await assertOwnerCountAfterDemotion({
          tx,
          workspaceId: context.workspaceId,
        });
      }

      await tx.workspaceMembership.update({
        where: {
          workspace_id_user_id: {
            workspace_id: context.workspaceId,
            user_id: existingMembership.user_id,
          },
        },
        data: {
          role,
        },
      });
    });

    revalidatePath("/dashboard");
    revalidatePath("/settings");
    return;
  }

  const [workspace, inviter] = await Promise.all([
    prisma.workspace.findUnique({
      where: {
        id: context.workspaceId,
      },
      select: {
        name: true,
      },
    }),
    prisma.user.findUnique({
      where: {
        id: context.userId,
      },
      select: {
        name: true,
        email: true,
      },
    }),
  ]);

  if (!workspace) {
    throw new Error("Workspace not found");
  }
  if (!inviter) {
    throw new Error("Inviter account not found");
  }

  await createWorkspaceInvitation({
    workspaceId: context.workspaceId,
    workspaceName: workspace.name,
    invitedByUserId: context.userId,
    invitedByName: inviter.name,
    invitedByEmail: inviter.email,
    invitedEmail: email,
    invitedName: name,
    invitedRole: role,
  });

  revalidatePath("/dashboard");
  revalidatePath("/settings");
}

export async function updateTeamMemberRoleAction(formData: FormData) {
  const context = await requireAuthContext();
  assertOwner(context);

  const memberUserId = parseMemberUserId(formData.get("user_id"));
  const role = parseWorkspaceRole(formData.get("role"));

  await prisma.$transaction(async (tx) => {
    const membership = await tx.workspaceMembership.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: context.workspaceId,
          user_id: memberUserId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      throw new Error("Team member not found");
    }

    if (membership.role === role) {
      return;
    }

    if (membership.role === "owner" && role === "editor") {
      await assertOwnerCountAfterDemotion({
        tx,
        workspaceId: context.workspaceId,
      });
    }

    await tx.workspaceMembership.update({
      where: {
        workspace_id_user_id: {
          workspace_id: context.workspaceId,
          user_id: memberUserId,
        },
      },
      data: {
        role,
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/settings");
}

export async function removeTeamMemberAction(formData: FormData) {
  const context = await requireAuthContext();
  assertOwner(context);

  const memberUserId = parseMemberUserId(formData.get("user_id"));
  if (memberUserId === context.userId) {
    throw new Error("You cannot remove your own membership");
  }

  await prisma.$transaction(async (tx) => {
    const membership = await tx.workspaceMembership.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: context.workspaceId,
          user_id: memberUserId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      throw new Error("Team member not found");
    }

    if (membership.role === "owner") {
      await assertOwnerCountAfterDemotion({
        tx,
        workspaceId: context.workspaceId,
      });
    }

    await tx.workspaceMembership.delete({
      where: {
        workspace_id_user_id: {
          workspace_id: context.workspaceId,
          user_id: memberUserId,
        },
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/settings");
}
