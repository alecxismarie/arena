"use server";

import {
  clearIdentityCookie,
  clearSessionCookie,
  getAuthContext,
} from "@/lib/auth";
import {
  getSafeAuthFlowError,
  logAuthFlowError,
  type SafeAuthFlowError,
} from "@/lib/auth-errors";
import {
  requestOnboardingVerification,
  type StartOnboardingResult,
} from "@/lib/onboarding-auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type StartOnboardingClientActionResult =
  | StartOnboardingResult
  | { error: SafeAuthFlowError };

export async function startOnboardingAction(formData: FormData) {
  let result: StartOnboardingResult;
  try {
    result = await requestOnboardingVerification(formData);
  } catch (error) {
    logAuthFlowError(error, {
      flow: "onboarding",
      step: "start_action",
    });
    redirect("/");
  }

  revalidatePath("/");

  if ("redirectTo" in result) {
    revalidatePath("/dashboard");
    redirect(result.redirectTo);
  }

  redirect("/");
}

export async function startOnboardingClientAction(
  formData: FormData,
): Promise<StartOnboardingClientActionResult> {
  try {
    const result = await requestOnboardingVerification(formData);
    revalidatePath("/");
    if ("redirectTo" in result) {
      revalidatePath("/dashboard");
    }
    return result;
  } catch (error) {
    logAuthFlowError(error, {
      flow: "onboarding",
      step: "start_client_action",
    });
    return {
      error: getSafeAuthFlowError(error),
    };
  }
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
