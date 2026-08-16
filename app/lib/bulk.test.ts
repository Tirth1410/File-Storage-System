import { describe, expect, test } from "bun:test";
import {
  MAX_BULK_OPERATION_ITEMS,
  BulkOperationError,
  validateItemCount,
  buildGroupFileUpsertSql,
  buildFilePermissionUpsertSql,
  buildDescendantCheckSql,
} from "./bulk";

describe("validateItemCount", () => {
  test("allows the maximum of 500 items", () => {
    expect(() =>
      validateItemCount(MAX_BULK_OPERATION_ITEMS, "move"),
    ).not.toThrow();
  });

  test("rejects more than 500 items with a clear message", () => {
    expect(() => validateItemCount(501, "move")).toThrow(BulkOperationError);
    expect(() => validateItemCount(501, "move")).toThrow(
      `Cannot move more than ${MAX_BULK_OPERATION_ITEMS} items at once`,
    );
  });

  test("uses the requested verb in the message", () => {
    expect(() => validateItemCount(501, "share")).toThrow(
      `Cannot share more than ${MAX_BULK_OPERATION_ITEMS} items at once`,
    );
    expect(() => validateItemCount(501, "delete")).toThrow(
      `Cannot delete more than ${MAX_BULK_OPERATION_ITEMS} items at once`,
    );
  });
});

describe("buildGroupFileUpsertSql", () => {
  test("targets the group_file table and group_id/file_id conflict", () => {
    const sql = buildGroupFileUpsertSql([
      {
        groupId: "g1",
        fileId: "f1",
        sharedByUserId: "u1",
        allowPreview: true,
        allowDownload: false,
      },
    ]);
    expect(sql.text).toContain("INSERT INTO group_file");
    expect(sql.text).toContain('ON CONFLICT ("groupId", "fileId")');
  });

  test("binds row values as parameters, never interpolated", () => {
    const sql = buildGroupFileUpsertSql([
      {
        groupId: "g1",
        fileId: "f1",
        sharedByUserId: "u1",
        allowPreview: true,
        allowDownload: false,
      },
    ]);
    expect(sql.text).not.toContain("'g1'");
    expect(sql.values).toContain("g1");
    expect(sql.values).toContain("f1");
    expect(sql.values).toContain("u1");
    expect(sql.values).toContain(false);
    // 6 values per row: generated id + 5 row values, all bound as parameters
    expect(sql.values).toHaveLength(6);
  });

  test("emits one VALUES tuple per row", () => {
    const sql = buildGroupFileUpsertSql([
      {
        groupId: "g1",
        fileId: "f1",
        sharedByUserId: "u1",
        allowPreview: true,
        allowDownload: true,
      },
      {
        groupId: "g1",
        fileId: "f2",
        sharedByUserId: "u1",
        allowPreview: false,
        allowDownload: true,
      },
      {
        groupId: "g1",
        fileId: "f3",
        sharedByUserId: "u1",
        allowPreview: true,
        allowDownload: false,
      },
    ]);
    expect(sql.values).toHaveLength(18);
  });
});

describe("buildFilePermissionUpsertSql", () => {
  test("targets the file_permission table and file_id/user_id conflict", () => {
    const sql = buildFilePermissionUpsertSql([
      { fileId: "f1", userId: "u2", permission: "write" },
    ]);
    expect(sql.text).toContain("INSERT INTO file_permission");
    expect(sql.text).toContain('ON CONFLICT ("fileId", "userId")');
  });

  test("binds row values as parameters", () => {
    const sql = buildFilePermissionUpsertSql([
      { fileId: "f1", userId: "u2", permission: "write" },
    ]);
    expect(sql.text).not.toContain("'f1'");
    expect(sql.values).toContain("f1");
    expect(sql.values).toContain("u2");
    expect(sql.values).toContain("write");
  });
});

describe("buildDescendantCheckSql", () => {
  test("seeds all selected folders and returns roots whose subtree contains the target", () => {
    const sql = buildDescendantCheckSql(["r1", "r2", "r3"], "target-1");
    expect(sql.text).toContain("WITH RECURSIVE subtree");
    expect(sql.text).toContain("WHERE id = $");
    // 3 seeded ids + 1 target bound
    expect(sql.values).toEqual(["r1", "r2", "r3", "target-1"]);
  });
});
