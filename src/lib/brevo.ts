import "server-only";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

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
