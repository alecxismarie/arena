import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type InvitePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const params = await searchParams;
  const tokenParam = params.token;
  const statusParam = params.status;
  const messageParam = params.message;
  const token =
    typeof tokenParam === "string"
      ? tokenParam
      : Array.isArray(tokenParam)
        ? tokenParam[0] ?? ""
        : "";
  const status =
    typeof statusParam === "string"
      ? statusParam
      : Array.isArray(statusParam)
        ? statusParam[0] ?? ""
        : "";
  const message =
    typeof messageParam === "string"
      ? messageParam
      : Array.isArray(messageParam)
        ? messageParam[0] ?? ""
        : "";

  if (token) {
    redirect(`/api/auth/invite/accept?token=${encodeURIComponent(token)}`);
  }

  if (!status) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5">
        <section className="w-full max-w-md rounded-2xl border border-border/70 bg-card/90 p-6 text-center">
          <h1 className="text-xl font-semibold text-foreground">Invalid link</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This invitation link is missing required details.
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

  const heading = status === "invalid" ? "Invalid link" : "Invitation failed";
  const fallbackMessage =
    status === "invalid"
      ? "This invitation link is missing required details."
      : "This invitation link is invalid or expired.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <section className="w-full max-w-md rounded-2xl border border-border/70 bg-card/90 p-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">{heading}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {message || fallbackMessage}
        </p>
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
