import crypto from "crypto";
import prisma from "@/app/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { auditService } from "@/app/lib/audit-service";
import { logger } from "@/app/lib/logger";
import { shareService } from "@/app/lib/share-service";
import { groupService } from "@/app/lib/group-service";
import {
  sendInviteEmailService,
  sendInviteDigestEmailService,
} from "@/app/lib/email-service";
import { APP_URL, INVITE_EXPIRATION_DAYS } from "@/app/lib/config";
import { validateItemCount } from "@/app/lib/bulk";

export type Invitation =
  Prisma.InvitationGetPayload<Prisma.InvitationDefaultArgs>;

export type FileInviteResult =
  | {
      granted: true;
      permission: Awaited<ReturnType<typeof shareService.addFilePermission>>;
    }
  | { granted: false; pending: true; emailSent: boolean; invite: Invitation };

export type GroupInviteResult =
  | {
      granted: true;
      member: Awaited<ReturnType<typeof groupService.addMember>>;
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

async function deliverInviteDigestEmail(input: {
  email: string;
  inviterName: string;
  expiresAt: Date;
}): Promise<boolean> {
  const signUpUrl = `${APP_URL}/sign-up?email=${encodeURIComponent(input.email)}`;
  const result = await sendInviteDigestEmailService({
    to: input.email,
    inviterName: input.inviterName,
    signUpUrl,
    expiresAt: input.expiresAt,
  });
  return result.success;
}

async function getResourceLabel(invite: Invitation): Promise<string> {
  if (invite.resourceType === "FILE" && invite.fileId) {
    const file = await prisma.file.findUnique({
      where: { id: invite.fileId },
      select: { originalName: true },
    });
    return file?.originalName ?? "a file";
  }
  if (invite.resourceType === "GROUP" && invite.groupId) {
    const group = await prisma.group.findUnique({
      where: { id: invite.groupId },
      select: { name: true },
    });
    return group?.name ?? "a group";
  }
  return "shared content";
}

async function authorizeInvite(
  invite: Invitation,
  userId: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (invite.invitedByUserId !== userId && user?.role !== "admin") {
    throw new Error("Forbidden");
  }
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

  async createBulkFileInvites({
    fileIds,
    email,
    permission = "read",
    invitedByUserId,
  }: {
    fileIds: string[];
    email: string;
    permission?: "read" | "write";
    invitedByUserId: string;
  }): Promise<{
    invited: {
      fileId: string;
      emailSent: boolean;
      inviteId: string;
    }[];
  }> {
    const normalized = normalizeEmail(email);

    if (await isInvitingSelf(normalized, invitedByUserId)) {
      throw new Error("You cannot share with yourself");
    }

    const ids = Array.from(new Set(fileIds.filter(Boolean)));
    validateItemCount(ids.length, "share");
    const safePermission: "read" | "write" =
      permission === "write" ? "write" : "read";
    const inviterName = await getInviterName(invitedByUserId);
    const files = await prisma.file.findMany({
      where: { id: { in: ids } },
      select: { id: true, originalName: true },
    });
    const labels = new Map(files.map((f) => [f.id, f.originalName]));

    const existing = await prisma.invitation.findMany({
      where: {
        email: normalized,
        resourceType: "FILE",
        fileId: { in: ids },
        status: "PENDING",
      },
    });
    const existingByFile = new Map(
      existing.map((invite) => [invite.fileId, invite]),
    );

    const toCreate = ids.filter((fileId) => !existingByFile.has(fileId));
    const created =
      toCreate.length > 0
        ? await prisma.invitation.createManyAndReturn({
            data: toCreate.map((fileId) => ({
              email: normalized,
              resourceType: "FILE",
              fileId,
              groupId: null,
              permission: safePermission,
              token: generateToken(),
              status: "PENDING",
              invitedByUserId,
              expiresAt: computeExpiry(),
            })),
          })
        : [];

    if (existing.length > 0) {
      await prisma.invitation.updateMany({
        where: { id: { in: existing.map((invite) => invite.id) } },
        data: { permission: safePermission, expiresAt: computeExpiry() },
      });
    }

    const createdByFile = new Map(
      created.map((invite) => [invite.fileId, invite]),
    );
    const invites = ids
      .map((fileId) => existingByFile.get(fileId) ?? createdByFile.get(fileId))
      .filter((invite): invite is Invitation => invite !== undefined);

    const EMAIL_BATCH_SIZE = 5;
    const emailSentByFile = new Map<string, boolean>();
    for (let i = 0; i < invites.length; i += EMAIL_BATCH_SIZE) {
      const batch = invites.slice(i, i + EMAIL_BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (invite) => {
          const emailSent = await deliverInviteEmail({
            invite,
            inviterName,
            resourceLabel: labels.get(invite.fileId!) ?? "a file",
          });
          return { fileId: invite.fileId, emailSent };
        }),
      );
      for (const result of results) {
        emailSentByFile.set(result.fileId!, result.emailSent);
      }
    }

    await prisma.auditLog.createMany({
      data: invites.map((invite) => ({
        userId: invitedByUserId,
        action: "invite_sent",
        fileId: invite.fileId!,
        details: `Sent file-share invite to ${normalized} for ${labels.get(invite.fileId!) ?? "a file"}`,
      })),
    });

    const invited = invites.map((invite) => ({
      fileId: invite.fileId!,
      emailSent: emailSentByFile.get(invite.fileId!) ?? false,
      inviteId: invite.id,
    }));

    return { invited };
  },

  async createGroupInvite({
    groupId,
    email,
    role = "MEMBER",
    invitedByUserId,
  }: {
    groupId: string;
    email: string;
    role?: "ADMIN" | "MEMBER";
    invitedByUserId: string;
  }): Promise<GroupInviteResult> {
    const normalized = normalizeEmail(email);

    if (await isInvitingSelf(normalized, invitedByUserId)) {
      throw new Error("You cannot invite yourself");
    }

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: invitedByUserId } },
    });
    const inviter = await prisma.user.findUnique({
      where: { id: invitedByUserId },
    });
    const isSystemAdmin = inviter?.role === "admin";
    if (
      !isSystemAdmin &&
      (!membership ||
        (membership.role !== "OWNER" && membership.role !== "ADMIN"))
    ) {
      throw new Error("Forbidden");
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalized },
    });
    if (existingUser) {
      const member = await groupService.addMember(
        groupId,
        normalized,
        role,
        invitedByUserId,
      );
      return { granted: true, member };
    }

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new Error("Group not found");
    }

    const invite = await upsertInvite({
      email: normalized,
      resourceType: "GROUP",
      fileId: null,
      groupId,
      permission: role,
      invitedByUserId,
    });

    const emailSent = await deliverInviteEmail({
      invite,
      inviterName: await getInviterName(invitedByUserId),
      resourceLabel: group.name,
    });

    await auditService.log({
      userId: invitedByUserId,
      action: "invite_sent",
      details: `Sent group invite to ${normalized} for group ${group.name}`,
    });

    return { granted: false, pending: true, emailSent, invite };
  },

  async grantPendingInvitesForUser({
    userId,
    email,
  }: {
    userId: string;
    email: string;
  }): Promise<number> {
    const normalized = normalizeEmail(email);
    const invites = await prisma.invitation.findMany({
      where: {
        email: normalized,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    });

    let grantedCount = 0;
    for (const invite of invites) {
      try {
        if (invite.resourceType === "FILE" && invite.fileId) {
          await prisma.filePermission.upsert({
            where: {
              fileId_userId: { fileId: invite.fileId, userId },
            },
            update: { permission: invite.permission },
            create: {
              fileId: invite.fileId,
              userId,
              permission: invite.permission,
            },
          });
        } else if (invite.resourceType === "GROUP" && invite.groupId) {
          await prisma.groupMember.upsert({
            where: {
              groupId_userId: { groupId: invite.groupId, userId },
            },
            update: { role: invite.permission },
            create: {
              groupId: invite.groupId,
              userId,
              role: invite.permission,
            },
          });
        }

        await prisma.invitation.update({
          where: { id: invite.id },
          data: { status: "ACCEPTED", acceptedAt: new Date() },
        });

        await auditService.log({
          userId,
          action: "invite_granted",
          fileId: invite.fileId ?? undefined,
          details: `Auto-granted ${invite.resourceType} access to ${normalized}`,
        });

        grantedCount += 1;
      } catch (err) {
        logger.error(`Failed to grant invite ${invite.id}:`, err);
      }
    }

    return grantedCount;
  },

  async resendInvite({
    inviteId,
    userId,
  }: {
    inviteId: string;
    userId: string;
  }): Promise<{ invite: Invitation; emailSent: boolean }> {
    const invite = await prisma.invitation.findUnique({
      where: { id: inviteId },
    });
    if (!invite) {
      throw new Error("Invitation not found");
    }
    await authorizeInvite(invite, userId);
    if (invite.status !== "PENDING") {
      throw new Error("Only pending invitations can be resent");
    }

    const updated = await prisma.invitation.update({
      where: { id: inviteId },
      data: { expiresAt: computeExpiry() },
    });

    const emailSent = await deliverInviteEmail({
      invite: updated,
      inviterName: await getInviterName(userId),
      resourceLabel: await getResourceLabel(updated),
    });

    await auditService.log({
      userId,
      action: "invite_sent",
      fileId: updated.fileId ?? undefined,
      details: `Resent invite to ${updated.email}`,
    });

    return { invite: updated, emailSent };
  },

  async cancelInvite({
    inviteId,
    userId,
  }: {
    inviteId: string;
    userId: string;
  }): Promise<Invitation> {
    const invite = await prisma.invitation.findUnique({
      where: { id: inviteId },
    });
    if (!invite) {
      throw new Error("Invitation not found");
    }
    await authorizeInvite(invite, userId);

    const updated = await prisma.invitation.update({
      where: { id: inviteId },
      data: { status: "CANCELLED" },
    });

    await auditService.log({
      userId,
      action: "invite_cancelled",
      fileId: updated.fileId ?? undefined,
      details: `Cancelled invite to ${updated.email}`,
    });

    return updated;
  },

  async listFileInvites(fileId: string): Promise<Invitation[]> {
    return prisma.invitation.findMany({
      where: { fileId, status: "PENDING" },
      include: {
        invitedByUser: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async listGroupInvites(groupId: string): Promise<Invitation[]> {
    return prisma.invitation.findMany({
      where: { groupId, status: "PENDING" },
      include: {
        invitedByUser: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async expireStaleInvites(): Promise<number> {
    const result = await prisma.invitation.updateMany({
      where: { status: "PENDING", expiresAt: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });
    return result.count;
  },
};
