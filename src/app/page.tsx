import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { getAuthContext } from "@/lib/auth";
import Image from "next/image";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const authContext = await getAuthContext();

  if (authContext) {
    redirect("/dashboard");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="ambient-onboarding-bg pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="ambient-yellow-drift pointer-events-none absolute left-[-30vw] top-[-20vh] h-[86vh] w-[86vh] max-h-[900px] max-w-[900px] rounded-full"
      />
      <div
        aria-hidden
        className="ambient-yellow-drift ambient-yellow-drift-secondary pointer-events-none absolute right-[-30vw] top-[32%] h-[78vh] w-[78vh] max-h-[840px] max-w-[840px] rounded-full"
      />
      <div
        aria-hidden
        className="ambient-blob ambient-blob-warm pointer-events-none absolute left-[12%] top-[18%] h-72 w-72 rounded-full bg-amber-400/25 blur-[120px]"
      />
      <div
        aria-hidden
        className="ambient-blob ambient-blob-soft pointer-events-none absolute right-[9%] top-[16%] h-80 w-80 rounded-full bg-orange-500/15 blur-[140px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.1] [background-image:linear-gradient(rgba(112,78,52,0.52)_1px,transparent_1px),linear-gradient(90deg,rgba(112,78,52,0.52)_1px,transparent_1px)] [background-size:34px_34px]"
      />

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-5 py-10 sm:px-8">
        <div className="grid w-full gap-6 rounded-[2rem] border border-border/80 bg-surface/92 p-6 shadow-[0_30px_80px_-50px_rgba(84,45,14,0.35)] backdrop-blur-xl lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
          <div className="space-y-5 rounded-3xl border border-border/70 bg-surface/90 p-5 sm:p-6">
            <div className="relative -ml-1 h-14 w-44 overflow-hidden">
              <Image
                src="/signals-logo.png"
                alt="Signals"
                fill
                sizes="176px"
                priority
                className="object-cover object-center"
              />
            </div>
            <h1 className="max-w-[18ch] text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Understand how operations perform across events, inventory, and assets.
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-lg">
              Track event turnout, inventory movement, and asset utilization with
              deterministic performance metrics.
            </p>
          </div>

          <div className="h-full rounded-3xl border border-border/70 bg-surface/90 p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-foreground">Get started</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use your work email, workspace name, and password to continue.
            </p>

            <OnboardingForm />
          </div>
        </div>
      </section>
    </main>
  );
}
