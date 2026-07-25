import { Logger } from "./logger";
import {
  generateVerificationEmailHtml,
  generateVerificationEmailText,
} from "./email-templates/verification-email";
import { APP_URL } from "./config";

const logger = Logger.withContext("EmailService");

export interface SendVerificationEmailOptions {
  to: string;
  url: string;
  user: {
    name?: string | null;
  };
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

/**
 * Sends a secure email verification link to a user via Brevo Transactional Email API.
 */
export async function sendVerificationEmailService({
  to,
  url,
  user,
}: SendVerificationEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY;

  const rawFrom =
    process.env.EMAIL_FROM || "Vault FileStorage <vaultfilestorage@gmail.com>";
  const sender = parseSender(rawFrom);
  const userName = user?.name || "User";

  logger.info(`Initiating email verification dispatch to [${to}] via Brevo`);

  if (!apiKey) {
    logger.error(
      `Failed to send verification email to [${to}]: BREVO_API_KEY missing.`,
    );
    return {
      success: false,
      error: "Email service not configured (BREVO_API_KEY missing)",
    };
  }

  try {
    const htmlContent = generateVerificationEmailHtml({
      name: userName,
      url,
      appUrl: APP_URL,
    });
    const textContent = generateVerificationEmailText({
      name: userName,
      url,
    });

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender,
        to: [
          {
            email: to,
            name: userName,
          },
        ],
        subject: "Verify your email address - Vault",
        htmlContent,
        textContent,
        tags: ["email_verification"],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        data.message ||
        data.error ||
        `Brevo API returned status ${response.status}`;
      logger.error(
        `Brevo API returned an error while sending verification email to [${to}]: ${errorMessage}`,
        data,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }

    logger.info(
      `Verification email sent successfully via Brevo to [${to}]. Message ID: ${data.messageId}`,
    );

    return {
      success: true,
      id: data.messageId,
    };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    logger.error(
      `Unexpected failure while sending verification email to [${to}] via Brevo: ${errorMessage}`,
      err,
    );
    return {
      success: false,
      error: errorMessage,
    };
  }
}
