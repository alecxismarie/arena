import "server-only";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export async function sendVerificationMagicLinkEmail(params: {
  toEmail: string;
  verifyUrl: string;
}) {
  const apiKey = requireEnv("BREVO_API_KEY");
  const senderEmail = requireEnv("BREVO_SENDER_EMAIL");
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "Signals";

  const response = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: {
        email: senderEmail,
        name: senderName,
      },
      to: [{ email: params.toEmail }],
      subject: "Verify your Signals email",
      htmlContent: `
        <p>Verify your email to continue setting up Signals.</p>
        <p><a href="${params.verifyUrl}">Verify email and continue</a></p>
        <p>This link expires in 15 minutes and can only be used once.</p>
      `,
      textContent: `Verify your email to continue setting up Signals.\n\n${params.verifyUrl}\n\nThis link expires in 15 minutes and can only be used once.`,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to send verification email");
  }
}

export async function sendWorkspaceInvitationEmail(params: {
  toEmail: string;
  workspaceName: string;
  invitedByName: string;
  invitedByEmail: string;
  invitedRole: "owner" | "editor";
  acceptUrl: string;
  expiresAt: Date;
}) {
  const apiKey = requireEnv("BREVO_API_KEY");
  const senderEmail = requireEnv("BREVO_SENDER_EMAIL");
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "Signals";
  const safeWorkspaceName = escapeHtml(params.workspaceName);
  const safeInvitedByName = escapeHtml(params.invitedByName);
  const safeInvitedByEmail = escapeHtml(params.invitedByEmail);
  const safeAcceptUrl = escapeHtml(params.acceptUrl);
  const roleLabel = params.invitedRole === "owner" ? "Owner" : "Editor";
  const expiresOn = params.expiresAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });

  const response = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: {
        email: senderEmail,
        name: senderName,
      },
      to: [{ email: params.toEmail }],
      subject: `You were invited to ${params.workspaceName} on Signals`,
      htmlContent: `
        <p>${safeInvitedByName} (${safeInvitedByEmail}) invited you to join <strong>${safeWorkspaceName}</strong> on Signals.</p>
        <p>Invited role: <strong>${roleLabel}</strong></p>
        <p><a href="${safeAcceptUrl}">Accept invitation</a></p>
        <p>This link expires on ${expiresOn} UTC and can only be used once.</p>
      `,
      textContent:
        `${params.invitedByName} (${params.invitedByEmail}) invited you to join ${params.workspaceName} on Signals.\n` +
        `Invited role: ${roleLabel}\n\n` +
        `Accept invitation: ${params.acceptUrl}\n\n` +
        `This link expires on ${expiresOn} UTC and can only be used once.`,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to send workspace invitation email");
  }
}
