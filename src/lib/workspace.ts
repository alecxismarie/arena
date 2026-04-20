import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { cache } from "react";
import { unstable_cache } from "next/cache";

const WORKSPACE_LOOKUP_CACHE_SECONDS = 30;

export function getWorkspaceCacheTag(workspaceId: string) {
  return `workspace:${workspaceId}`;
}

export const getWorkspaceById = cache(async function getWorkspaceById(workspaceId: string) {
  const cacheTag = getWorkspaceCacheTag(workspaceId);
  return unstable_cache(
    async () =>
      prisma.workspace.findUnique({
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
      }),
    [cacheTag],
    { revalidate: WORKSPACE_LOOKUP_CACHE_SECONDS, tags: [cacheTag] },
  )();
});

export async function getCurrentWorkspace() {
  const context = await getAuthContext();
  if (!context) {
    return null;
  }

  return getWorkspaceById(context.workspaceId);
}
