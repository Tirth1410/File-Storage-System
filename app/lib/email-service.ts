import { Logger } from "./logger";
import {
  generateVerificationEmailHtml,
  generateVerificationEmailText,
} from "./email-templates/verification-email";
import {
  generateInviteEmailHtml,
  generateInviteEmailText,
} from "./email-templates/invite-email";
import { APP_URL } from "./config";

const logger = Logger.withContext("EmailService");

export interface SendVerificationEmailOptions {
  to: string;
  url: string;
  user: {
    name?: string | null;
  };
}

export interface SendInviteEmailOptions {
  to: string;
  inviterName: string;
  resourceLabel: string;
  signUpUrl: string;
  expiresAt?: Date;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

function parseSender(senderString: string): { name: string; email: string } {
  const match = senderString.match(
    /^(?:(?:"?([^"<]+)"?\s*)?<([^>]+)>|([^@]+@[^@]+))$/,
  );
  if (match) {
    const name = (match[1] || "").trim();
    const email = (match[2] || match[3] || "").trim();
    if (email) {
      return { name: name || "Vault FileStorage", email };
    }
  }
  return { name: "Vault FileStorage", email: senderString.trim() };
}

interface BrevoSendInput {
  to: string;
  name?: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  tags: string[];
}

async function sendBrevoEmail({
  to,
  name,
  subject,
  htmlContent,
  textContent,
  tags,
}: BrevoSendInput): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    logger.error(`Failed to send email to [${to}]: BREVO_API_KEY missing.`);
    return {
      success: false,
      error: "Email service not configured (BREVO_API_KEY missing)",
    };
  }

  try {
    const rawFrom =
      process.env.EMAIL_FROM || "Vault FileStorage <vaultfilestorage@gmail.com>";
    const sender = parseSender(rawFrom);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender,
        to: name ? [{ email: to, name }] : [{ email: to }],
        subject,
        htmlContent,
        textContent,
        tags,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        data.message ||
        data.error ||
        `Brevo API returned status ${response.status}`;
      logger.error(
        `Brevo API returned an error while sending email to [${to}]: ${errorMessage}`,
        data,
      );
      return { success: false, error: errorMessage };
    }

    logger.info(
      `Email sent successfully via Brevo to [${to}]. Message ID: ${data.messageId}`,
    );
    return { success: true, id: data.messageId };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    logger.error(
      `Unexpected failure while sending email to [${to}] via Brevo: ${errorMessage}`,
      err,
    );
    return { success: false, error: errorMessage };
  }
}

/**
 * Sends a secure email verification link to a user via Brevo Transactional Email API.
 */
export async function sendVerificationEmailService({
  to,
  url,
  user,
}: SendVerificationEmailOptions): Promise<SendEmailResult> {
  const userName = user?.name || "User";
  logger.info(`Initiating email verification dispatch to [${to}] via Brevo`);

  const htmlContent = generateVerificationEmailHtml({
    name: userName,
    url,
    appUrl: APP_URL,
  });
  const textContent = generateVerificationEmailText({ name: userName, url });

  return sendBrevoEmail({
    to,
    name: userName,
    subject: "Verify your email address - Vault",
    htmlContent,
    textContent,
    tags: ["email_verification"],
  });
}

/**
 * Sends an email invitation to a non-registered user via Brevo Transactional Email API.
 */
export async function sendInviteEmailService({
  to,
  inviterName,
  resourceLabel,
  signUpUrl,
  expiresAt,
}: SendInviteEmailOptions): Promise<SendEmailResult> {
  logger.info(`Initiating invite dispatch to [${to}] via Brevo`);

  const htmlContent = generateInviteEmailHtml({
    inviterName,
    resourceLabel,
    signUpUrl,
    appUrl: APP_URL,
    expiresAt,
  });
  const textContent = generateInviteEmailText({
    inviterName,
    resourceLabel,
    signUpUrl,
    expiresAt,
  });

  return sendBrevoEmail({
    to,
    subject: `${inviterName} invited you to ${resourceLabel} on Vault`,
    htmlContent,
    textContent,
    tags: ["invite"],
  });
}
