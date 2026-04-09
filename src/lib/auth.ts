import "server-only";

import { WorkspaceRole } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "signals_session";
const IDENTITY_COOKIE_NAME = "signals_identity";
const REMEMBER_PREFERENCE_COOKIE_NAME = "signals_remember_me";
const SESSION_PERSISTENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const SESSION_NON_PERSISTENT_MAX_AGE_SECONDS = 60 * 60 * 24;
const REMEMBER_PREFERENCE_MAX_AGE_SECONDS = 60 * 15;

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export type AuthContext = {
  sessionId: string;
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
};

export type IdentityContext = {
  userId: string;
  email: string;
};

async function getSessionIdFromRequest() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value?.trim();
  return sessionId || null;
}

async function getIdentityUserIdFromRequest() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(IDENTITY_COOKIE_NAME)?.value?.trim();
  return userId || null;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const sessionId = await getSessionIdFromRequest();
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      user_id: true,
      workspace_id: true,
      expires_at: true,
    },
  });

  if (!session) return null;
  if (session.expires_at <= new Date()) return null;

  const membership = await prisma.workspaceMembership.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: session.workspace_id,
        user_id: session.user_id,
      },
    },
    select: {
      role: true,
    },
  });

  if (!membership) return null;

  return {
    sessionId: session.id,
    userId: session.user_id,
    workspaceId: session.workspace_id,
    role: membership.role,
  };
}

export async function requireAuthContext() {
  const context = await getAuthContext();
  if (!context) {
    throw new Error("Unauthorized");
  }
  return context;
}

export async function getIdentityContext(): Promise<IdentityContext | null> {
  const auth = await getAuthContext();
  const userId = auth?.userId ?? (await getIdentityUserIdFromRequest());
  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
  };
}

export async function requireIdentityContext() {
  const context = await getIdentityContext();
  if (!context) {
    throw new Error("Unauthorized");
  }
  return context;
}

export async function setIdentityCookie(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(IDENTITY_COOKIE_NAME, userId, {
    ...cookieOptions,
    maxAge: SESSION_PERSISTENT_MAX_AGE_SECONDS,
  });
}

export async function clearIdentityCookie() {
  const cookieStore = await cookies();
  cookieStore.set(IDENTITY_COOKIE_NAME, "", {
    ...cookieOptions,
    maxAge: 0,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...cookieOptions,
    maxAge: 0,
  });
}

export async function setRememberPreferenceCookie(rememberMe: boolean) {
  const cookieStore = await cookies();
  cookieStore.set(REMEMBER_PREFERENCE_COOKIE_NAME, rememberMe ? "1" : "0", {
    ...cookieOptions,
    maxAge: REMEMBER_PREFERENCE_MAX_AGE_SECONDS,
  });
}

export async function consumeRememberPreferenceCookie() {
  const cookieStore = await cookies();
  const rawValue = cookieStore.get(REMEMBER_PREFERENCE_COOKIE_NAME)?.value?.trim();

  cookieStore.set(REMEMBER_PREFERENCE_COOKIE_NAME, "", {
    ...cookieOptions,
    maxAge: 0,
  });

  if (rawValue === "1") return true;
  if (rawValue === "0") return false;
  return true;
}

export async function startWorkspaceSession(params: {
  userId: string;
  workspaceId: string;
  rememberMe?: boolean;
}) {
  const rememberMe = params.rememberMe ?? true;
  const sessionMaxAgeSeconds = rememberMe
    ? SESSION_PERSISTENT_MAX_AGE_SECONDS
    : SESSION_NON_PERSISTENT_MAX_AGE_SECONDS;
  const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds * 1000);

  const session = await prisma.session.create({
    data: {
      user_id: params.userId,
      workspace_id: params.workspaceId,
      expires_at: expiresAt,
    },
    select: { id: true },
  });

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    session.id,
    rememberMe
      ? {
          ...cookieOptions,
          maxAge: sessionMaxAgeSeconds,
        }
      : cookieOptions,
  );
  cookieStore.set(IDENTITY_COOKIE_NAME, "", {
    ...cookieOptions,
    maxAge: 0,
  });
}
