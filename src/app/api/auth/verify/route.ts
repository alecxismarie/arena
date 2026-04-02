import { completeOnboardingFromVerificationToken } from "@/lib/onboarding-auth";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

function redirectToVerifyPage(
  request: NextRequest,
  status: "invalid" | "failed",
  message?: string,
) {
  const url = new URL("/auth/verify", request.url);
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
    return redirectToVerifyPage(request, "invalid");
  }

  try {
    const result = await completeOnboardingFromVerificationToken(token);
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/settings");

    const targetUrl = new URL(result.redirectTo, request.url);
    return NextResponse.redirect(targetUrl);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "This verification link is invalid or expired.";
    return redirectToVerifyPage(request, "failed", message);
  }
}
