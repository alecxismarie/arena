import { completeWorkspaceInvitationFromToken } from "@/lib/workspace-invitations";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

function redirectToInvitePage(
  request: NextRequest,
  status: "invalid" | "failed",
  message?: string,
) {
  const url = new URL("/auth/invite", request.url);
  url.searchParams.set("status", status);
  if (message) {
    url.searchParams.set("message", message);
  }
  return NextResponse.redirect(url);
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return redirectToInvitePage(request, "invalid");
  }

  try {
    const result = await completeWorkspaceInvitationFromToken(token);
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/settings");

    const targetUrl = new URL(result.redirectTo, request.url);
    return NextResponse.redirect(targetUrl);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "This invitation link is invalid or expired.";
    return redirectToInvitePage(request, "failed", message);
  }
}
