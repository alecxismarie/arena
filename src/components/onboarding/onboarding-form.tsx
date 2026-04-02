"use client";

import { startOnboardingClientAction } from "@/app/actions/auth-actions";
import { FormEvent, useEffect, useRef, useState } from "react";

const STAGES = [
  "Validating your details...",
  "Preparing secure verification...",
  "Generating your sign-in link...",
  "Sending to your inbox...",
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "We could not send your verification email. Please try again.";
}

export function OnboardingForm() {
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
              required
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-accent/70 focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-foreground">Workspace name</span>
            <input
              name="workspace_name"
              placeholder="Enter workspace name"
              required
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-accent/70 focus:ring-2 focus:ring-accent/20"
            />
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
