import "server-only";

import { WorkspaceRole } from "@prisma/client";
import type { AuthContext } from "@/lib/auth";

export function canOperateEvents(role: WorkspaceRole) {
  return role === "owner" || role === "editor";
}

export function canViewFinancial(role: WorkspaceRole) {
  return role === "owner";
}

export function canOperateInventory(role: WorkspaceRole) {
  return role === "owner" || role === "editor";
}

export function canOperateAssets(role: WorkspaceRole) {
  return role === "owner" || role === "editor";
}

export function assertCanOperateEvents(context: AuthContext) {
  if (!canOperateEvents(context.role)) {
    throw new Error("Forbidden");
  }
}

export function assertCanOperateInventory(context: AuthContext) {
  if (!canOperateInventory(context.role)) {
    throw new Error("Forbidden");
  }
}

export function assertCanOperateAssets(context: AuthContext) {
  if (!canOperateAssets(context.role)) {
    throw new Error("Forbidden");
  }
}

export function assertOwner(context: AuthContext) {
  if (context.role !== "owner") {
    throw new Error("Forbidden");
  }
}
