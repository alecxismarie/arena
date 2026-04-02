"use server";

import {
  clearIdentityCookie,
  clearSessionCookie,
  getAuthContext,
} from "@/lib/auth";
import {
  requestOnboardingVerification,
} from "@/lib/onboarding-auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function startOnboardingAction(formData: FormData) {
  await requestOnboardingVerification(formData);
  revalidatePath("/");
  redirect("/");
}

export async function startOnboardingClientAction(formData: FormData) {
  return requestOnboardingVerification(formData);
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
