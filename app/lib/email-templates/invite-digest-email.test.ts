import { describe, expect, test } from "bun:test";
import {
  generateInviteDigestEmailHtml,
  generateInviteDigestEmailText,
} from "./invite-digest-email";

const inviterName = "Tirth";
const signUpUrl = "https://vault.app/sign-up?email=a@x.com";

describe("invite-digest-email template", () => {
  test("US3-SC2/FR-002/FR-005: digest wording is count-agnostic with no file names or counts", () => {
    const html = generateInviteDigestEmailHtml({ inviterName, signUpUrl });
    const text = generateInviteDigestEmailText({ inviterName, signUpUrl });

    expect(html).toContain("Tirth shared files with you on Vault.");
    expect(text).toContain("Tirth shared files with you on Vault.");
    expect(html).toContain("Join Vault");
    expect(text).toContain("Join Vault");
    expect(html).toContain(signUpUrl);
    expect(text).toContain(signUpUrl);

    expect(html).not.toContain("file-");
    expect(text).not.toContain("file-");
    expect(html).not.toContain("1 file");
    expect(text).not.toContain("1 file");
    expect(html).not.toContain("500");
    expect(text).not.toContain("500");

    const htmlAgain = generateInviteDigestEmailHtml({ inviterName, signUpUrl });
    const textAgain = generateInviteDigestEmailText({ inviterName, signUpUrl });
    expect(htmlAgain).toBe(html);
    expect(textAgain).toBe(text);
  });

  test("FR-005: expiry line appears when expiresAt is set and is absent otherwise", () => {
    const expiresAt = new Date(2026, 11, 25);
    const html = generateInviteDigestEmailHtml({
      inviterName,
      signUpUrl,
      expiresAt,
    });
    const text = generateInviteDigestEmailText({
      inviterName,
      signUpUrl,
      expiresAt,
    });

    expect(html).toContain("This invitation expires on");
    expect(text).toContain("This invitation expires on");
    expect(html).toContain("Dec 25, 2026");
    expect(text).toContain("Dec 25, 2026");

    const htmlNoExpiry = generateInviteDigestEmailHtml({
      inviterName,
      signUpUrl,
    });
    const textNoExpiry = generateInviteDigestEmailText({
      inviterName,
      signUpUrl,
    });
    expect(htmlNoExpiry).not.toContain("This invitation expires on");
    expect(textNoExpiry).not.toContain("This invitation expires on");
  });
});
