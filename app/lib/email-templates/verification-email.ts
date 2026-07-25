export interface VerificationEmailProps {
  name: string;
  url: string;
  appUrl?: string;
}

export function generateVerificationEmailHtml({
  name,
  url,
  appUrl,
}: VerificationEmailProps): string {
  const userName = name || "there";
  const resolvedAppUrl = appUrl || "http://localhost:3000";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email address - Vault</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #FAFAFA; color: #171717;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="min-width: 100%; background-color: #FAFAFA; padding: 48px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; border-bottom: 1px solid #F3F4F6;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <img src="${resolvedAppUrl}/logo.svg" width="36" height="36" alt="Vault" style="display: block; border: 0; border-radius: 10px;" />
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle;">
                    <span style="font-size: 16px; font-weight: 700; color: #171717; letter-spacing: 0.08em;">VAULT</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px 32px 32px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #171717; margin: 0 0 16px 0; tracking: -0.01em;">Verify your email address</h1>
              
              <p style="font-size: 14px; line-height: 24px; color: #525252; margin: 0 0 16px 0;">
                Hello <strong>${userName}</strong>,
              </p>
              
              <p style="font-size: 14px; line-height: 24px; color: #525252; margin: 0;">
                Thank you for creating an account with Vault. Please verify your email address to complete your registration and access your secure file storage.
              </p>
              
              <!-- Centered CTA Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="border-radius: 12px; background-color: #002FA7;">
                          <a href="${url}" target="_blank" style="font-size: 14px; font-weight: 600; color: #FFFFFF; text-decoration: none; padding: 13px 32px; border-radius: 12px; display: inline-block; background-color: #002FA7; letter-spacing: 0.01em;">
                            Verify Email Address
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Security Note -->
              <div style="border-top: 1px solid #F3F4F6; padding-top: 20px;">
                <p style="font-size: 12px; line-height: 18px; color: #A3A3A3; margin: 0;">
                  If you did not create a Vault account, no further action is required. You can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #FAFAFA; border-top: 1px solid #E5E7EB; text-align: center;">
              <p style="font-size: 11px; color: #A3A3A3; margin: 0;">
                © ${new Date().getFullYear()} Vault. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generateVerificationEmailText({
  name,
  url,
}: VerificationEmailProps): string {
  const userName = name || "there";
  return `Hello ${userName},

Thank you for creating an account with Vault. Please verify your email address by clicking the link below:

${url}

If you did not create a Vault account, no further action is required.

© ${new Date().getFullYear()} Vault. All rights reserved.`;
}
