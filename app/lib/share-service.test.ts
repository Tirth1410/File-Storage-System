import { mock, describe, expect, test } from "bun:test";
import { BulkOperationError, MAX_BULK_OPERATION_ITEMS } from "@/app/lib/bulk";

const state = {
  selectAllFileCount: 0,
  executeRawCalls: 0,
  auditCreateManyData: null as unknown,
  auditCreates: 0,
  inviteCreates: 0,
  emailSends: 0,
  transactionCalls: 0,
  digestFails: false,
  noFilesFound: false,
  existingPendingInviteFileId: null as string | null,
};

const tx = {
  $executeRaw: async () => {
    state.executeRawCalls++;
    return 1;
  },
  auditLog: {
    createMany: async ({ data }: { data: unknown }) => {
      state.auditCreateManyData = data;
      return { count: Array.isArray(data) ? data.length : 0 };
    },
  },
};

const prismaMock = {
  user: {
    findUnique: async ({
      where,
    }: {
      where: { id?: string; email?: string };
    }) => {
      if (where.id) return { id: where.id, email: "me@x.com", name: "Me" };
      if (where.email === "existing@x.com") {
        return { id: "recipient", email: where.email, name: "Recipient" };
      }
      return null;
    },
  },
  file: {
    findMany: async ({ where }: { where?: Record<string, unknown> }) => {
      if (state.noFilesFound) return [];
      const w = where ?? {};
      if (w.id && typeof w.id === "object" && "in" in w.id) {
        return (w.id as { in: string[] }).in.map((id: string) => ({
          id,
          ownerUserId: "u1",
          status: "available",
          originalName: `file-${id}`,
        }));
      }
      if (w.ownerUserId) {
        return Array.from({ length: state.selectAllFileCount }, (_, i) => ({
          id: `sa-${i}`,
          ownerUserId: "u1",
          status: "available",
          originalName: `file-sa-${i}`,
        }));
      }
      return [];
    },
  },
  invitation: {
    findMany: async () => {
      if (state.existingPendingInviteFileId) {
        return [
          {
            id: "inv-existing",
            email: "new@x.com",
            resourceType: "FILE",
            fileId: state.existingPendingInviteFileId,
            groupId: null,
            permission: "read",
            token: "tok-existing",
            status: "PENDING",
            invitedByUserId: "u1",
            expiresAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
      }
      return [];
    },
    createManyAndReturn: async ({
      data,
    }: {
      data: { fileId: string; token: string }[];
    }) => {
      state.inviteCreates++;
      return data.map((row) => ({
        id: `inv-${row.fileId}`,
        email: "new@x.com",
        resourceType: "FILE",
        fileId: row.fileId,
        groupId: null,
        permission: "read",
        token: row.token,
        status: "PENDING",
        invitedByUserId: "u1",
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    },
    updateMany: async () => ({ count: 0 }),
  },
  auditLog: {
    create: async () => {
      state.auditCreates++;
      return {};
    },
    createMany: async ({ data }: { data: unknown }) => {
      state.auditCreateManyData = data;
      return { count: Array.isArray(data) ? data.length : 0 };
    },
  },
  $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => {
    state.transactionCalls++;
    return fn(tx);
  },
};

mock.module("@/app/lib/prisma", () => ({ default: prismaMock }));
mock.module("@/app/lib/email-service", () => ({
  sendInviteEmailService: async () => {
    state.emailSends++;
    return { success: true };
  },
  sendInviteDigestEmailService: async () => {
    state.emailSends++;
    return { success: !state.digestFails };
  },
}));

function reset() {
  state.selectAllFileCount = 0;
  state.executeRawCalls = 0;
  state.auditCreateManyData = null;
  state.auditCreates = 0;
  state.inviteCreates = 0;
  state.emailSends = 0;
  state.transactionCalls = 0;
  state.digestFails = false;
  state.noFilesFound = false;
  state.existingPendingInviteFileId = null;
}

describe("shareService.bulkShareWithUser", () => {
  test("rejects a select-all exceeding the 500-item cap", async () => {
    reset();
    const { shareService } = await import("@/app/lib/share-service");
    state.selectAllFileCount = MAX_BULK_OPERATION_ITEMS + 1;

    await expect(
      shareService.bulkShareWithUser({
        selectAll: true,
        email: "existing@x.com",
        userId: "u1",
      }),
    ).rejects.toThrow(BulkOperationError);
    expect(state.transactionCalls).toBe(0);
  });

  test("issues a single upsert and one audit createMany for a registered recipient", async () => {
    reset();
    const { shareService } = await import("@/app/lib/share-service");

    const result = await shareService.bulkShareWithUser({
      fileIds: ["f1", "f2"],
      email: "existing@x.com",
      permission: "write",
      userId: "u1",
    });

    expect(state.transactionCalls).toBe(1);
    expect(state.executeRawCalls).toBe(1);
    expect(state.auditCreates).toBe(0);
    expect(state.auditCreateManyData).toHaveLength(2);
    expect(result.shared).toHaveLength(2);
    expect(result.invites).toHaveLength(0);
    const details = (state.auditCreateManyData as { details: string }[]).map(
      (row) => row.details,
    );
    expect(details[0]).toBe(
      'Shared file "file-f1" with existing@x.com at write via bulk share',
    );
  });

  test("resolves select-all server-side minus excluded ids", async () => {
    reset();
    const { shareService } = await import("@/app/lib/share-service");
    state.selectAllFileCount = 4;

    const result = await shareService.bulkShareWithUser({
      selectAll: true,
      folderId: "src",
      excludeIds: ["sa-1"],
      email: "existing@x.com",
      userId: "u1",
    });

    expect(result.shared.map((s) => s.fileId)).toEqual([
      "sa-0",
      "sa-2",
      "sa-3",
    ]);
    expect(state.auditCreateManyData).toHaveLength(3);
  });

  test("routes unregistered recipients through the batched invite path", async () => {
    reset();
    const { shareService } = await import("@/app/lib/share-service");

    const result = await shareService.bulkShareWithUser({
      fileIds: ["f1", "f2", "f3"],
      email: "new@x.com",
      userId: "u1",
    });

    expect(result.shared).toHaveLength(0);
    expect(result.invites).toHaveLength(3);
    expect(state.inviteCreates).toBe(1);
    expect(state.emailSends).toBe(1);
    expect(state.auditCreateManyData).toHaveLength(4);
    expect(state.auditCreates).toBe(0);
  });

  test("sends exactly one digest email for 500 files to an unregistered recipient", async () => {
    reset();
    const { shareService } = await import("@/app/lib/share-service");

    const fileIds = Array.from({ length: 500 }, (_, i) => "f" + (i + 1));
    const result = await shareService.bulkShareWithUser({
      fileIds,
      email: "new@x.com",
      userId: "u1",
    });

    expect(result.invites).toHaveLength(500);
    expect(state.emailSends).toBe(1);
  });

  test("SC-002: a 500-file bulk share performs one digest send and one batched create, not per-file work", async () => {
    reset();
    const { shareService } = await import("@/app/lib/share-service");

    const fileIds = Array.from({ length: 500 }, (_, i) => "f" + (i + 1));
    const result = await shareService.bulkShareWithUser({
      fileIds,
      email: "new@x.com",
      userId: "u1",
    });

    expect(result.invites).toHaveLength(500);
    expect(state.emailSends).toBe(1);
    expect(state.inviteCreates).toBe(1);
    expect(state.transactionCalls).toBe(0);
  });

  test("FR-007: digest delivery failure does not roll back the share", async () => {
    reset();
    state.digestFails = true;
    const { shareService } = await import("@/app/lib/share-service");

    const result = await shareService.bulkShareWithUser({
      fileIds: ["f1", "f2", "f3"],
      email: "new@x.com",
      userId: "u1",
    });

    expect(result.invites).toHaveLength(3);
    for (const invite of result.invites) {
      expect(invite.emailSent).toBe(false);
    }
    expect(state.inviteCreates).toBe(1);
  });

  test("FR-008: nothing actually shared sends zero emails and creates no invites", async () => {
    reset();
    state.noFilesFound = true;
    const { shareService } = await import("@/app/lib/share-service");

    const result = await shareService.bulkShareWithUser({
      fileIds: ["f1", "f2", "f3"],
      email: "new@x.com",
      userId: "u1",
    });

    expect(result.invites).toHaveLength(0);
    expect(state.emailSends).toBe(0);
    expect(state.inviteCreates).toBe(0);
  });

  test("SC-005/FR-006: two bulk-share actions send exactly two digest emails, one per action", async () => {
    reset();
    const { shareService } = await import("@/app/lib/share-service");

    const firstIds = Array.from({ length: 100 }, (_, i) => "f" + (i + 1));
    const result = await shareService.bulkShareWithUser({
      fileIds: firstIds,
      email: "new@x.com",
      userId: "u1",
    });
    expect(state.emailSends).toBe(1);
    expect(result.invites).toHaveLength(100);

    const secondIds = Array.from({ length: 50 }, (_, i) => "f" + (i + 101));
    const result2 = await shareService.bulkShareWithUser({
      fileIds: secondIds,
      email: "new@x.com",
      userId: "u1",
    });

    expect(state.emailSends).toBe(2);
    expect(result2.invites).toHaveLength(50);
  });

  test("FR-006: existing pending invite is refreshed, not re-created, with one new digest", async () => {
    reset();
    state.existingPendingInviteFileId = "f1";
    const { shareService } = await import("@/app/lib/share-service");

    const result = await shareService.bulkShareWithUser({
      fileIds: ["f1", "f2", "f3"],
      email: "new@x.com",
      userId: "u1",
    });

    expect(state.emailSends).toBe(1);
    expect(result.invites).toHaveLength(3);
    expect(state.inviteCreates).toBe(1);
  });
});
