import { mock, describe, expect, test } from "bun:test";
import { BulkOperationError, MAX_BULK_OPERATION_ITEMS } from "@/app/lib/bulk";

const state = {
  selectAllFileCount: 0,
  executeRawCalls: 0,
  auditCreateManyData: null as unknown,
  auditCreates: 0,
  groupLookups: 0,
  transactionCalls: 0,
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
  group: {
    findUnique: async () => {
      state.groupLookups++;
      return { id: "g1", name: "Engineering", ownerUserId: "u1" };
    },
  },
  user: {
    findUnique: async () => ({ id: "u1", role: "member", email: "me@x.com" }),
  },
  groupMember: {
    findUnique: async () => ({ role: "OWNER" }),
  },
  file: {
    findMany: async ({ where }: { where?: Record<string, unknown> }) => {
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
  auditLog: {
    create: async () => {
      state.auditCreates++;
      return {};
    },
  },
  $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => {
    state.transactionCalls++;
    return fn(tx);
  },
};

mock.module("@/app/lib/prisma", () => ({ default: prismaMock }));

function reset() {
  state.selectAllFileCount = 0;
  state.executeRawCalls = 0;
  state.auditCreateManyData = null;
  state.auditCreates = 0;
  state.groupLookups = 0;
  state.transactionCalls = 0;
}

describe("groupService.bulkShareWithGroup", () => {
  test("rejects a select-all exceeding the 500-item cap before sharing", async () => {
    reset();
    const { groupService } = await import("@/app/lib/group-service");
    state.selectAllFileCount = MAX_BULK_OPERATION_ITEMS + 1;

    await expect(
      groupService.bulkShareWithGroup({
        selectAll: true,
        groupId: "g1",
        userId: "u1",
      }),
    ).rejects.toThrow(BulkOperationError);
    expect(state.groupLookups).toBe(0);
    expect(state.transactionCalls).toBe(0);
  });

  test("issues a single ON CONFLICT upsert statement and one audit createMany", async () => {
    reset();
    const { groupService } = await import("@/app/lib/group-service");

    const result = await groupService.bulkShareWithGroup({
      fileIds: ["f1", "f2", "f3"],
      groupId: "g1",
      allowPreview: true,
      allowDownload: false,
      userId: "u1",
    });

    expect(state.transactionCalls).toBe(1);
    expect(state.executeRawCalls).toBe(1);
    expect(state.auditCreates).toBe(0);
    expect(state.auditCreateManyData).toHaveLength(3);
    expect(result.shared).toHaveLength(3);
    const actions = (state.auditCreateManyData as { action: string }[]).map(
      (row) => row.action,
    );
    expect(actions).toEqual([
      "group_file_shared",
      "group_file_shared",
      "group_file_shared",
    ]);
    const details = (state.auditCreateManyData as { details: string }[]).map(
      (row) => row.details,
    );
    expect(details[0]).toBe(
      "Shared file file-f1 with group Engineering via bulk share",
    );
  });

  test("resolves select-all server-side minus excluded ids", async () => {
    reset();
    const { groupService } = await import("@/app/lib/group-service");
    state.selectAllFileCount = 5;

    const result = await groupService.bulkShareWithGroup({
      selectAll: true,
      folderId: "src",
      excludeIds: ["sa-2", "sa-4"],
      groupId: "g1",
      userId: "u1",
    });

    expect(result.shared).toHaveLength(3);
    expect(result.shared.map((s) => s.fileId)).toEqual([
      "sa-0",
      "sa-1",
      "sa-3",
    ]);
    expect(state.auditCreateManyData).toHaveLength(3);
  });

  test("per-item classification preserves not found / forbidden / skipped", async () => {
    reset();
    const { groupService } = await import("@/app/lib/group-service");
    const ids = ["found", "missing", "own"];
    // Mock file rows: only "found" and "own" exist
    const prisma2 = (await import("@/app/lib/prisma")).default as {
      file: { findMany: (args: unknown) => Promise<unknown[]> };
    };
    prisma2.file.findMany = async (args: unknown) => {
      const where = (args as { where?: Record<string, unknown> }).where ?? {};
      const inIds = (where.id as { in: string[] }).in;
      return inIds
        .filter((id: string) => id !== "missing")
        .map((id: string) => ({
          id,
          ownerUserId: id === "own" ? "other-user" : "u1",
          status: id === "own" ? "available" : "available",
          originalName: `file-${id}`,
        }));
    };

    const result = await groupService.bulkShareWithGroup({
      fileIds: ids,
      groupId: "g1",
      userId: "u1",
    });

    expect(result.notFound.map((n) => n.fileId)).toEqual(["missing"]);
    expect(result.forbidden.map((n) => n.fileId)).toEqual(["own"]);
    expect(result.shared.map((s) => s.fileId)).toEqual(["found"]);
  });
});
