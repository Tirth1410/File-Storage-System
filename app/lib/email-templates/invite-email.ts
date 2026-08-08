export interface InviteEmailProps {
  inviterName: string;
  resourceLabel: string;
  signUpUrl: string;
  appUrl?: string;
  expiresAt?: Date;
}

function formatExpiry(expiresAt?: Date): string {
  if (!expiresAt) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(expiresAt);
}

export function generateInviteEmailHtml({
  inviterName,
  resourceLabel,
  signUpUrl,
  appUrl,
  expiresAt,
}: InviteEmailProps): string {
  const resolvedAppUrl = appUrl || "http://localhost:3000";
  const expiry = formatExpiry(expiresAt);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited to Vault</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #FAFAFA; color: #171717;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="min-width: 100%; background-color: #FAFAFA; padding: 48px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
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
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #171717;">You've been invited</h1>
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #525252;">
                ${inviterName} invited you to ${resourceLabel} on Vault.
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #525252;">
                Create a free account to accept and start accessing your shared files securely.
              </p>
              <a href="${signUpUrl}" style="display: inline-block; background-color: #002FA7; color: #FFFFFF; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 12px;">Join Vault</a>
              <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #737373;">
                This invitation${expiry ? ` expires on ${expiry}` : ""}. If the button doesn't work, copy this link into your browser:<br>
                <span style="color: #002FA7;">${signUpUrl}</span>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin: 24px 0 0; font-size: 12px; color: #A3A3A3;">Vault FileStorage &middot; ${resolvedAppUrl}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generateInviteEmailText({
  inviterName,
  resourceLabel,
  signUpUrl,
  expiresAt,
}: InviteEmailProps): string {
  const expiry = formatExpiry(expiresAt);
  const expiryLine = expiry ? ` This invitation expires on ${expiry}.` : "";
  return `${inviterName} invited you to ${resourceLabel} on Vault.

Create a free account to accept and start accessing your shared files securely.

Join Vault: ${signUpUrl}

If the link doesn't work, copy and paste it into your browser.${expiryLine}`;
}
