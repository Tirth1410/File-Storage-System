import prisma from "@/app/lib/prisma";
import { auditService } from "@/app/lib/audit-service";

export const groupService = {
  async createGroup(
    name: string,
    description: string | undefined,
    ownerUserId: string,
  ) {
    return await prisma.$transaction(async (tx) => {
      // 1. Create group
      const group = await tx.group.create({
        data: {
          name,
          description,
          ownerUserId,
        },
      });

      // 2. Add owner to GroupMember
      await tx.groupMember.create({
        data: {
          groupId: group.id,
          userId: ownerUserId,
          role: "OWNER",
        },
      });

      // 3. Log audit
      await auditService.log({
        userId: ownerUserId,
        action: "group_created",
        details: `Created group ${name}`,
      });

      return group;
    });
  },

  async listUserGroups(userId: string) {
    // Return all groups where the user is a member, including the roles and member count
    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: {
              select: {
                id: true,
              },
            },
            owner: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      description: m.group.description,
      ownerUserId: m.group.ownerUserId,
      ownerName: m.group.owner.name,
      ownerEmail: m.group.owner.email,
      isArchived: m.group.isArchived,
      createdAt: m.group.createdAt,
      updatedAt: m.group.updatedAt,
      currentUserRole: m.role,
      memberCount: m.group.members.length,
    }));
  },

  async getGroupDetails(groupId: string, userId: string) {
    // Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!membership) {
      // Check system admin
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== "admin") {
        throw new Error("Forbidden");
      }
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        groupFiles: {
          include: {
            file: true,
            sharedByUser: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        owner: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!group) {
      throw new Error("Group not found");
    }

    return group;
  },

  async updateGroup(
    groupId: string,
    name: string,
    description: string | undefined,
    userId: string,
  ) {
    // Check role: must be OWNER or ADMIN or system admin
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isSystemAdmin = user?.role === "admin";

    if (
      !isSystemAdmin &&
      (!membership ||
        (membership.role !== "OWNER" && membership.role !== "ADMIN"))
    ) {
      throw new Error("Forbidden");
    }

    const updated = await prisma.group.update({
      where: { id: groupId },
      data: {
        name,
        description,
      },
    });

    await auditService.log({
      userId,
      action: "group_updated",
      details: `Updated details for group ${updated.name}`,
    });

    return updated;
  },

  async deleteGroup(groupId: string, userId: string) {
    // Must be owner or system admin
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new Error("Group not found");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isSystemAdmin = user?.role === "admin";

    if (group.ownerUserId !== userId && !isSystemAdmin) {
      throw new Error("Forbidden");
    }

    await prisma.group.delete({
      where: { id: groupId },
    });

    await auditService.log({
      userId,
      action: "group_deleted",
      details: `Deleted group ${group.name}`,
    });

    return { success: true };
  },

  async addMember(
    groupId: string,
    email: string,
    role: string,
    userId: string,
  ) {
    // Must be group owner/admin or system admin
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isSystemAdmin = user?.role === "admin";

    if (
      !isSystemAdmin &&
      (!membership ||
        (membership.role !== "OWNER" && membership.role !== "ADMIN"))
    ) {
      throw new Error("Forbidden");
    }

    const targetUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!targetUser) {
      throw new Error("User with this email not found");
    }

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new Error("Group not found");
    }

    const newMember = await prisma.groupMember.create({
      data: {
        groupId,
        userId: targetUser.id,
        role,
      },
    });

    await auditService.log({
      userId,
      action: "group_member_added",
      details: `Added ${email} to group ${group.name} with role ${role}`,
    });

    return newMember;
  },

  async removeMember(groupId: string, memberUserId: string, userId: string) {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new Error("Group not found");
    }

    // A member can leave, or an owner/admin can kick
    const callerMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    const targetMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: memberUserId } },
    });

    if (!targetMembership) {
      throw new Error("Member not found in group");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isSystemAdmin = user?.role === "admin";

    const isSelfLeaving = memberUserId === userId;
    const isCallerOwner = callerMembership?.role === "OWNER";
    const isCallerAdmin = callerMembership?.role === "ADMIN";

    if (!isSystemAdmin && !isSelfLeaving && !isCallerOwner && !isCallerAdmin) {
      throw new Error("Forbidden");
    }

    // Owner cannot leave or be kicked (must delete group or transfer ownership first)
    if (targetMembership.role === "OWNER") {
      throw new Error("Owner cannot be removed from the group");
    }

    // Admin cannot kick another admin unless caller is owner or system admin
    if (
      targetMembership.role === "ADMIN" &&
      isCallerAdmin &&
      !isSelfLeaving &&
      !isSystemAdmin
    ) {
      throw new Error("Admins cannot remove other admins");
    }

    await prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId,
          userId: memberUserId,
        },
      },
    });

    await auditService.log({
      userId,
      action: "group_member_removed",
      details: `Removed member ${memberUserId} from group ${group.name}`,
    });

    return { success: true };
  },

  async updateMemberRole(
    groupId: string,
    memberUserId: string,
    role: string,
    userId: string,
  ) {
    // Only group OWNER or system admin can change roles
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new Error("Group not found");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isSystemAdmin = user?.role === "admin";

    const callerMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (callerMembership?.role !== "OWNER" && !isSystemAdmin) {
      throw new Error("Only the owner can update member roles");
    }

    const targetMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: memberUserId } },
    });

    if (!targetMembership) {
      throw new Error("Member not found");
    }

    if (targetMembership.role === "OWNER") {
      throw new Error("Cannot change the role of the owner");
    }

    const updated = await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId,
          userId: memberUserId,
        },
      },
      data: {
        role,
      },
    });

    await auditService.log({
      userId,
      action: "group_member_role_updated",
      details: `Updated role of member ${memberUserId} to ${role} in group ${group.name}`,
    });

    return updated;
  },

  async shareFileWithGroup(
    fileId: string,
    groupId: string,
    allowPreview: boolean,
    allowDownload: boolean,
    userId: string,
  ) {
    // Verify file ownership or admin status
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file) {
      throw new Error("File not found");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isSystemAdmin = user?.role === "admin";

    if (file.ownerUserId !== userId && !isSystemAdmin) {
      throw new Error("Forbidden");
    }

    // Verify caller is a member of the group, or is system admin
    const groupMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!groupMembership && !isSystemAdmin) {
      throw new Error(
        "You must be a member of the group to share a file with it",
      );
    }

    const shared = await prisma.groupFile.upsert({
      where: {
        groupId_fileId: {
          groupId,
          fileId,
        },
      },
      update: {
        allowPreview,
        allowDownload,
        isActive: true,
      },
      create: {
        groupId,
        fileId,
        sharedByUserId: userId,
        allowPreview,
        allowDownload,
        isActive: true,
      },
    });

    const group = await prisma.group.findUnique({ where: { id: groupId } });

    await auditService.log({
      userId,
      action: "group_file_shared",
      fileId,
      details: `Shared file ${file.originalName} with group ${group?.name || groupId}`,
    });

    return shared;
  },

  async updateGroupFilePermissions(
    fileId: string,
    groupId: string,
    allowPreview: boolean,
    allowDownload: boolean,
    isActive: boolean,
    userId: string,
  ) {
    const fileShare = await prisma.groupFile.findUnique({
      where: { groupId_fileId: { groupId, fileId } },
      include: { file: true },
    });

    if (!fileShare) {
      throw new Error("File is not shared with this group");
    }

    // Verify caller is owner of the file, or is admin/owner of the group, or is system admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isSystemAdmin = user?.role === "admin";

    const groupMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    const isFileOwner = fileShare.file.ownerUserId === userId;
    const isGroupPowerUser =
      groupMembership?.role === "OWNER" || groupMembership?.role === "ADMIN";

    if (!isFileOwner && !isGroupPowerUser && !isSystemAdmin) {
      throw new Error("Forbidden");
    }

    const updated = await prisma.groupFile.update({
      where: { groupId_fileId: { groupId, fileId } },
      data: {
        allowPreview,
        allowDownload,
        isActive,
      },
    });

    await auditService.log({
      userId,
      action: "group_file_permissions_updated",
      fileId,
      details: `Updated permissions for file ${fileShare.file.originalName} in group ${groupId}`,
    });

    return updated;
  },

  async unshareFileFromGroup(fileId: string, groupId: string, userId: string) {
    const fileShare = await prisma.groupFile.findUnique({
      where: { groupId_fileId: { groupId, fileId } },
      include: { file: true },
    });

    if (!fileShare) {
      throw new Error("File is not shared with this group");
    }

    // Verify caller is owner of the file, or is admin/owner of the group, or is system admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isSystemAdmin = user?.role === "admin";

    const groupMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    const isFileOwner = fileShare.file.ownerUserId === userId;
    const isGroupPowerUser =
      groupMembership?.role === "OWNER" || groupMembership?.role === "ADMIN";

    if (!isFileOwner && !isGroupPowerUser && !isSystemAdmin) {
      throw new Error("Forbidden");
    }

    await prisma.groupFile.delete({
      where: { groupId_fileId: { groupId, fileId } },
    });

    await auditService.log({
      userId,
      action: "group_file_unshared",
      fileId,
      details: `Unshared file ${fileShare.file.originalName} from group ${groupId}`,
    });

    return { success: true };
  },

  async listFileGroups(fileId: string) {
    return await prisma.groupFile.findMany({
      where: { fileId },
      include: {
        group: {
          select: {
            name: true,
          },
        },
      },
    });
  },
};
