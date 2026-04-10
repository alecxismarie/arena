import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { cache } from "react";

export const getWorkspaceById = cache(async function getWorkspaceById(workspaceId: string) {
  return prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      timezone: true,
      currency: true,
      primary_domain: true,
      enabled_domains: true,
      created_at: true,
      updated_at: true,
    },
  });
});

export async function getCurrentWorkspace() {
  const context = await getAuthContext();
  if (!context) {
    return null;
  }

  return getWorkspaceById(context.workspaceId);
}
