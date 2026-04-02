import { completeOnboardingFromVerificationToken } from "@/lib/onboarding-auth";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type VerifyPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const params = await searchParams;
  const tokenParam = params.token;
  const token =
    typeof tokenParam === "string"
      ? tokenParam
      : Array.isArray(tokenParam)
        ? tokenParam[0] ?? ""
        : "";

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5">
        <section className="w-full max-w-md rounded-2xl border border-border/70 bg-card/90 p-6 text-center">
          <h1 className="text-xl font-semibold text-foreground">Invalid link</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This verification link is missing required details.
          </p>
          <Link
            href="/"
            className="btn-secondary mt-4 inline-flex rounded-xl px-4 py-2 text-sm font-semibold"
          >
            Back to Sign in
          </Link>
        </section>
      </main>
    );
  }

  try {
    const result = await completeOnboardingFromVerificationToken(token);
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/settings");
    redirect(result.redirectTo);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "This verification link is invalid or expired.";

    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5">
        <section className="w-full max-w-md rounded-2xl border border-border/70 bg-card/90 p-6 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            Verification failed
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          <Link
            href="/"
            className="btn-secondary mt-4 inline-flex rounded-xl px-4 py-2 text-sm font-semibold"
          >
            Request a new link
          </Link>
        </section>
      </main>
    );
  }
}
