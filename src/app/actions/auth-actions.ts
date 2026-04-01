"use server";

import {
  clearIdentityCookie,
  clearSessionCookie,
  getAuthContext,
  startWorkspaceSession,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  WORKSPACE_DEFAULT_CURRENCY,
  WORKSPACE_DEFAULT_TIMEZONE,
} from "@/lib/workspace-options";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

export async function startOnboardingAction(formData: FormData) {
  const email = parseEmail(formData.get("email"));
  const workspaceName = parseWorkspaceName(formData.get("workspace_name"));

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: deriveNameFromEmail(email),
    },
    select: { id: true },
  });

  const workspaceId = await findWorkspaceForUser(user.id);
  if (workspaceId) {
    await startWorkspaceSession({
      userId: user.id,
      workspaceId,
    });

    revalidatePath("/");
    revalidatePath("/dashboard");
    redirect("/dashboard");
  }

  const workspace = await prisma.$transaction(async (tx) => {
    const createdWorkspace = await tx.workspace.create({
      data: {
        name: workspaceName,
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

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  redirect("/dashboard");
}

export async function logoutAction() {
  const context = await getAuthContext();

  if (context?.sessionId) {
    await prisma.session.deleteMany({
      where: {
        id: context.sessionId,
      },
    });
  }

  await clearSessionCookie();
  await clearIdentityCookie();

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/events");
  revalidatePath("/reports");
  revalidatePath("/settings");
  redirect("/");
}
