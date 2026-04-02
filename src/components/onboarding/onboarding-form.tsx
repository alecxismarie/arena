"use client";

import { startOnboardingClientAction } from "@/app/actions/auth-actions";
import { Eye, EyeOff } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

const STAGES = [
  "Validating your details...",
  "Checking your account...",
  "Confirming workspace access...",
  "Preparing your dashboard...",
  "Finalizing...",
] as const;

const MILESTONES = [
  { delayMs: 220, target: 24, stageIndex: 0 },
  { delayMs: 950, target: 45, stageIndex: 1 },
  { delayMs: 1650, target: 65, stageIndex: 2 },
  { delayMs: 2450, target: 85, stageIndex: 3 },
  { delayMs: 3400, target: 93, stageIndex: 4 },
] as const;

const COMPLETION_VISIBILITY_MS = 220;
const REMEMBER_STORAGE_KEY = "signals_onboarding_remember_v1";

type RememberedOnboardingState = {
  email: string;
  workspaceName: string;
  rememberMe: boolean;
};

function getRememberedOnboardingState(): RememberedOnboardingState {
  if (typeof window === "undefined") {
    return {
      email: "",
      workspaceName: "",
      rememberMe: true,
    };
  }

  try {
    const raw = window.localStorage.getItem(REMEMBER_STORAGE_KEY);
    if (!raw) {
      return {
        email: "",
        workspaceName: "",
        rememberMe: true,
      };
    }

    const parsed = JSON.parse(raw) as {
      email?: string;
      workspaceName?: string;
      rememberMe?: boolean;
    };

    return {
      email: parsed.email ?? "",
      workspaceName: parsed.workspaceName ?? "",
      rememberMe: parsed.rememberMe !== false,
    };
  } catch {
    window.localStorage.removeItem(REMEMBER_STORAGE_KEY);
    return {
      email: "",
      workspaceName: "",
      rememberMe: true,
    };
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "We could not send your verification email. Please try again.";
}

export function OnboardingForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [remembered] = useState<RememberedOnboardingState>(
    getRememberedOnboardingState,
  );
  const [email, setEmail] = useState(remembered.email);
  const [workspaceName, setWorkspaceName] = useState(remembered.workspaceName);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(remembered.rememberMe);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actualProgress, setActualProgress] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationSentTo, setVerificationSentTo] = useState<string | null>(null);

  const milestoneTimersRef = useRef<number[]>([]);

  const clearMilestoneTimers = () => {
    milestoneTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    milestoneTimersRef.current = [];
  };

  useEffect(() => {
    if (!isSubmitting) {
      return;
    }

    const timer = window.setInterval(() => {
      setDisplayProgress((current) => {
        const delta = actualProgress - current;

        if (Math.abs(delta) < 0.2) {
          return delta > 0 ? actualProgress : current;
        }

        const step = Math.max(0.35, Math.min(2.3, Math.abs(delta) * 0.18));
        const next = delta > 0 ? current + step : current - step;

        return delta > 0
          ? Math.min(next, actualProgress)
          : Math.max(next, actualProgress);
      });
    }, 34);

    return () => window.clearInterval(timer);
  }, [actualProgress, isSubmitting]);

  useEffect(() => {
    return () => clearMilestoneTimers();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const form = event.currentTarget;
    if (!form.reportValidity()) {
      return;
    }

    const formData = new FormData(form);
    setErrorMessage(null);
    setVerificationSentTo(null);
    setIsSubmitting(true);
    setActualProgress(6);
    setDisplayProgress(6);
    setStageIndex(0);

    clearMilestoneTimers();
    MILESTONES.forEach((milestone) => {
      const timer = window.setTimeout(() => {
        setActualProgress((current) => Math.max(current, milestone.target));
        setStageIndex((current) => Math.max(current, milestone.stageIndex));
      }, milestone.delayMs);
      milestoneTimersRef.current.push(timer);
    });

    try {
      const result = await startOnboardingClientAction(formData);
      clearMilestoneTimers();
      setStageIndex(4);
      setActualProgress(100);
      await new Promise((resolve) =>
        window.setTimeout(resolve, COMPLETION_VISIBILITY_MS),
      );
      if (rememberMe) {
        window.localStorage.setItem(
          REMEMBER_STORAGE_KEY,
          JSON.stringify({
            email: email.trim(),
            workspaceName: workspaceName.trim(),
            rememberMe: true,
          }),
        );
      } else {
        window.localStorage.removeItem(REMEMBER_STORAGE_KEY);
      }

      if ("redirectTo" in result) {
        setIsSubmitting(false);
        window.location.assign(result.redirectTo);
        return;
      }

      setIsSubmitting(false);
      setVerificationSentTo(result.verificationSentTo);
    } catch (error) {
      clearMilestoneTimers();
      setIsSubmitting(false);
      setActualProgress(0);
      setDisplayProgress(0);
      setStageIndex(0);
      setErrorMessage(getErrorMessage(error));
    }
  };

  return (
    <div className="mt-5" aria-busy={isSubmitting}>
      {isSubmitting ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-border/70 bg-card/90 p-4"
        >
          <p className="text-base font-semibold text-foreground">
            Setting up your workspace
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{STAGES[stageIndex]}</p>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted/85">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200 ease-out"
              style={{ width: `${displayProgress.toFixed(1)}%` }}
            />
          </div>

          <p className="mt-2 text-xs font-medium tabular-nums text-muted-foreground">
            {Math.round(displayProgress)}%
          </p>
        </div>
      ) : verificationSentTo ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-border/70 bg-card/90 p-4"
        >
          <p className="text-base font-semibold text-foreground">
            Check your email
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            We sent a secure verification link to{" "}
            <span className="font-medium text-foreground">{verificationSentTo}</span>.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            The link expires in 15 minutes and can only be used once.
          </p>
          <button
            type="button"
            className="btn-secondary mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
            onClick={() => {
              setVerificationSentTo(null);
              setErrorMessage(null);
              setActualProgress(0);
              setDisplayProgress(0);
              setStageIndex(0);
            }}
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-foreground">Email</span>
            <input
              type="email"
              name="email"
              placeholder="you@company.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-accent/70 focus:ring-2 focus:ring-accent/20 sm:text-sm"
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-foreground">Workspace name</span>
            <input
              name="workspace_name"
              placeholder="Enter workspace name"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              required
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-accent/70 focus:ring-2 focus:ring-accent/20 sm:text-sm"
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-foreground">Password</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 pr-11 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-accent/70 focus:ring-2 focus:ring-accent/20 sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-accent transition hover:bg-accent/10"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>
          </label>

          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="remember_me"
              value="1"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            <span className="font-medium text-foreground">Remember me</span>
          </label>

          {errorMessage ? (
            <p className="rounded-xl border border-red-200/70 bg-red-50/85 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            className="btn-primary w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            Continue
          </button>
        </form>
      )}
    </div>
  );
}
