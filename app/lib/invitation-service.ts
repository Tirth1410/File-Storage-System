import crypto from "crypto";
import prisma from "@/app/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { auditService } from "@/app/lib/audit-service";
import { shareService } from "@/app/lib/share-service";
import { sendInviteEmailService } from "@/app/lib/email-service";
import { APP_URL, INVITE_EXPIRATION_DAYS } from "@/app/lib/config";

export type Invitation = Prisma.InvitationGetPayload<Prisma.InvitationDefaultArgs>;

export type FileInviteResult =
  | {
      granted: true;
      permission: Awaited<ReturnType<typeof shareService.addFilePermission>>;
    }
  | { granted: false; pending: true; emailSent: boolean; invite: Invitation };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function computeExpiry(): Date {
  const date = new Date();
  date.setDate(date.getDate() + INVITE_EXPIRATION_DAYS);
  return date;
}

async function getInviterName(userId: string): Promise<string> {
  const inviter = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  return inviter?.name ?? "Someone";
}

async function isInvitingSelf(email: string, userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return user?.email.toLowerCase() === normalizeEmail(email);
}

async function findPendingInvite(input: {
  email: string;
  resourceType: string;
  fileId: string | null;
  groupId: string | null;
}): Promise<Invitation | null> {
  return prisma.invitation.findFirst({
    where: {
      email: input.email,
      resourceType: input.resourceType,
      fileId: input.fileId,
      groupId: input.groupId,
      status: "PENDING",
    },
  });
}

async function upsertInvite(input: {
  email: string;
  resourceType: string;
  fileId: string | null;
  groupId: string | null;
  permission: string;
  invitedByUserId: string;
}): Promise<Invitation> {
  const existing = await findPendingInvite(input);
  if (existing) {
    return prisma.invitation.update({
      where: { id: existing.id },
      data: { permission: input.permission, expiresAt: computeExpiry() },
    });
  }
  return prisma.invitation.create({
    data: {
      email: input.email,
      resourceType: input.resourceType,
      fileId: input.fileId,
      groupId: input.groupId,
      permission: input.permission,
      token: generateToken(),
      status: "PENDING",
      invitedByUserId: input.invitedByUserId,
      expiresAt: computeExpiry(),
    },
  });
}

async function deliverInviteEmail(input: {
  invite: Invitation;
  inviterName: string;
  resourceLabel: string;
}): Promise<boolean> {
  const signUpUrl = `${APP_URL}/sign-up?email=${encodeURIComponent(input.invite.email)}`;
  const result = await sendInviteEmailService({
    to: input.invite.email,
    inviterName: input.inviterName,
    resourceLabel: input.resourceLabel,
    signUpUrl,
    expiresAt: input.invite.expiresAt,
  });
  return result.success;
}

export const invitationService = {
  async createFileInvite({
    fileId,
    email,
    permission = "read",
    invitedByUserId,
  }: {
    fileId: string;
    email: string;
    permission?: "read" | "write";
    invitedByUserId: string;
  }): Promise<FileInviteResult> {
    const normalized = normalizeEmail(email);

    if (await isInvitingSelf(normalized, invitedByUserId)) {
      throw new Error("You cannot share with yourself");
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalized },
    });
    if (existingUser) {
      const safePermission: "read" | "write" =
        permission === "write" ? "write" : "read";
      const permissionRow = await shareService.addFilePermission(
        fileId,
        normalized,
        safePermission,
      );
      return { granted: true, permission: permissionRow };
    }

    const file = await prisma.file.findUnique({ where: { id: fileId } });
    const resourceLabel = file?.originalName ?? "a file";

    const invite = await upsertInvite({
      email: normalized,
      resourceType: "FILE",
      fileId,
      groupId: null,
      permission: permission === "write" ? "write" : "read",
      invitedByUserId,
    });

    const emailSent = await deliverInviteEmail({
      invite,
      inviterName: await getInviterName(invitedByUserId),
      resourceLabel,
    });

    await auditService.log({
      userId: invitedByUserId,
      action: "invite_sent",
      fileId,
      details: `Sent file-share invite to ${normalized} for ${resourceLabel}`,
    });

    return { granted: false, pending: true, emailSent, invite };
  },
};
