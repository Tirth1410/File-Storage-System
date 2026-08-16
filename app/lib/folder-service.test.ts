import { mock, describe, expect, test } from "bun:test";
import { BulkOperationError, MAX_BULK_OPERATION_ITEMS } from "@/app/lib/bulk";

const state = {
  selectAllFolderCount: 0,
  selectAllFileCount: 0,
  queryRawCalls: 0,
  queryRawResult: [] as { root_id: string }[],
  auditCreateManyData: null as unknown,
  auditCreates: 0,
  transactionCalls: 0,
};

const tx = {
  folder: {
    updateMany: async () => ({ count: 0 }),
  },
  file: {
    updateMany: async () => ({ count: 0 }),
  },
  auditLog: {
    createMany: async ({ data }: { data: unknown }) => {
      state.auditCreateManyData = data;
      return { count: Array.isArray(data) ? data.length : 0 };
    },
  },
};

const prismaMock = {
  folder: {
    findUnique: async ({ where }: { where: { id: string } }) => {
      if (where.id === "target") {
        return {
          id: "target",
          ownerUserId: "u1",
          name: "target",
          parentFolderId: null,
        };
      }
      return null;
    },
    findMany: async ({ where }: { where?: Record<string, unknown> }) => {
      const w = where ?? {};
      if (w.id && typeof w.id === "object" && "in" in w.id) {
        const ids = (w.id as { in: string[] }).in;
        return ids.map((id: string) => ({
          id,
          ownerUserId: "u1",
          name: `folder-${id}`,
          parentFolderId: "src",
        }));
      }
      if (w.ownerUserId) {
        return Array.from({ length: state.selectAllFolderCount }, (_, i) => ({
          id: `sa-f-${i}`,
          ownerUserId: "u1",
          parentFolderId: "src",
        }));
      }
      return [];
    },
  },
  file: {
    findMany: async ({ where }: { where?: Record<string, unknown> }) => {
      const w = where ?? {};
      if (w.id && typeof w.id === "object" && "in" in w.id) {
        const ids = (w.id as { in: string[] }).in;
        return ids.map((id: string) => ({
          id,
          ownerUserId: "u1",
          name: `file-${id}`,
          originalName: `file-${id}`,
          folderId: "src",
          status: "available",
        }));
      }
      if (w.ownerUserId) {
        return Array.from({ length: state.selectAllFileCount }, (_, i) => ({
          id: `sa-fl-${i}`,
          ownerUserId: "u1",
          folderId: "src",
          status: "available",
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
  $queryRaw: async () => {
    state.queryRawCalls++;
    return state.queryRawResult;
  },
  $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => {
    state.transactionCalls++;
    return fn(tx);
  },
};

mock.module("@/app/lib/prisma", () => ({ default: prismaMock }));

async function loadService() {
  const mod = await import("@/app/lib/folder-service");
  return mod.folderService;
}

function reset() {
  state.selectAllFolderCount = 0;
  state.selectAllFileCount = 0;
  state.queryRawCalls = 0;
  state.queryRawResult = [];
  state.auditCreateManyData = null;
  state.auditCreates = 0;
  state.transactionCalls = 0;
}

describe("folderService.bulkMove", () => {
  test("rejects a select-all that exceeds the 500-item cap", async () => {
    reset();
    const folderService = await loadService();
    state.selectAllFolderCount = MAX_BULK_OPERATION_ITEMS + 1;

    await expect(
      folderService.bulkMove({
        selectAll: true,
        targetFolderId: null,
        userId: "u1",
      }),
    ).rejects.toThrow(BulkOperationError);
    expect(state.transactionCalls).toBe(0);
  });

  test("rejects more than 500 explicit file ids before querying", async () => {
    reset();
    const folderService = await loadService();
    const ids = Array.from(
      { length: MAX_BULK_OPERATION_ITEMS + 1 },
      (_, i) => `f-${i}`,
    );

    await expect(
      folderService.bulkMove({
        fileIds: ids,
        targetFolderId: null,
        userId: "u1",
      }),
    ).rejects.toThrow(BulkOperationError);
    expect(state.transactionCalls).toBe(0);
  });

  test("performs exactly one descendant query for many selected folders", async () => {
    reset();
    const folderService = await loadService();

    const result = await folderService.bulkMove({
      folderIds: ["f1", "f2", "f3"],
      targetFolderId: "target",
      userId: "u1",
    });

    expect(state.queryRawCalls).toBe(1);
    expect(state.transactionCalls).toBe(1);
    expect(result.moved).toHaveLength(3);
    expect(result.failed).toHaveLength(0);
  });

  test("flags only folders whose subtree contains the target", async () => {
    reset();
    const folderService = await loadService();
    state.queryRawResult = [{ root_id: "f2" }];

    const result = await folderService.bulkMove({
      folderIds: ["f1", "f2", "f3"],
      targetFolderId: "target",
      userId: "u1",
    });

    expect(state.queryRawCalls).toBe(1);
    expect(result.moved.map((m) => m.id)).toEqual(["f1", "f3"]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].id).toBe("f2");
    expect(result.failed[0].reason).toMatch(/descendant/i);
  });

  test("writes a single auditLog.createMany inside the transaction", async () => {
    reset();
    const folderService = await loadService();

    await folderService.bulkMove({
      folderIds: ["f1", "f2"],
      fileIds: ["g1", "g2", "g3"],
      targetFolderId: "target",
      userId: "u1",
    });

    expect(state.auditCreates).toBe(0);
    expect(state.auditCreateManyData).toHaveLength(5);
    const actions = (state.auditCreateManyData as { action: string }[]).map(
      (row) => row.action,
    );
    expect(actions.filter((a) => a === "folder_moved")).toHaveLength(2);
    expect(actions.filter((a) => a === "file_moved")).toHaveLength(3);
  });

  test("resolves select-all with excludes and honors the cap", async () => {
    reset();
    const folderService = await loadService();
    state.selectAllFolderCount = 5;
    state.selectAllFileCount = 5;

    const result = await folderService.bulkMove({
      selectAll: true,
      excludeIds: ["sa-f-2"],
      targetFolderId: null,
      userId: "u1",
    });

    expect(result.moved).toHaveLength(9);
    expect(result.moved.map((m) => m.id)).not.toContain("sa-f-2");
    expect(state.auditCreateManyData).toHaveLength(9);
  });
});
