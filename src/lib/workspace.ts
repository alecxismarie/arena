import { prisma } from "@/lib/prisma";

export async function getCurrentWorkspace() {
  return prisma.workspace.findFirst({
    orderBy: { created_at: "asc" },
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
