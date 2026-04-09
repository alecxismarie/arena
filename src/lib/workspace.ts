import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";

export async function getWorkspaceById(workspaceId: string) {
  return prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      timezone: true,
      currency: true,
      created_at: true,
      updated_at: true,
    },
  });
}

export async function getCurrentWorkspace() {
  const context = await getAuthContext();
  if (!context) {
    return null;
  }

  return getWorkspaceById(context.workspaceId);
}
