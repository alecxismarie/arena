"use server";

import { prisma } from "@/lib/prisma";
import {
  WORKSPACE_DEFAULT_CURRENCY,
  WORKSPACE_DEFAULT_TIMEZONE,
  isAllowedWorkspaceCurrency,
  isAllowedWorkspaceTimezone,
} from "@/lib/workspace-options";
import { revalidatePath } from "next/cache";
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
  const existing = await prisma.workspace.findFirst({
    select: { id: true },
    orderBy: { created_at: "asc" },
  });

  if (existing) {
    redirect("/dashboard");
  }

  const name = parseWorkspaceName(formData.get("name"));
  const timezone = parseTimezone(formData.get("timezone"));
  const currency = parseCurrency(formData.get("currency"));

  await prisma.workspace.create({
    data: {
      name,
      timezone,
      currency,
    },
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  redirect("/dashboard");
}

export async function updateWorkspaceAction(formData: FormData) {
  const workspaceId = String(formData.get("workspace_id") ?? "");
  if (!workspaceId) {
    throw new Error("Workspace id is required");
  }

  const name = parseWorkspaceName(formData.get("name"));
  const timezone = parseTimezone(formData.get("timezone"));
  const currency = parseCurrency(formData.get("currency"));

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      name,
      timezone,
      currency,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/settings");
}
