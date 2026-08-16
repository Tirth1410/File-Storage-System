import { describe, expect, test } from "bun:test";
import {
  computeBatchStats,
  type UploadJob,
  type UploadStatus,
} from "./upload-manager";

function makeJob(
  id: string,
  size: number,
  status: UploadStatus,
  uploaded = 0,
): UploadJob {
  return {
    id,
    file: new File([], `${id}.bin`),
    status,
    progress:
      status === "completed"
        ? 100
        : size > 0
          ? Math.round((uploaded / size) * 100)
          : 0,
    uploadedBytes: uploaded,
    totalBytes: size,
    speedMBs: 0,
    etaSeconds: 0,
    error: null,
  };
}

describe("computeBatchStats", () => {
  test("overall progress is byte-weighted across the whole batch", () => {
    const stats = computeBatchStats(
      [makeJob("a", 100, "uploading", 100), makeJob("b", 300, "uploading", 0)],
      0,
      0,
    );
    expect(stats.overallProgress).toBe(25);
  });

  test("keeps percentage flat when a completed job is removed from the queue", () => {
    const completed = makeJob("done", 100, "completed");
    const active = makeJob("active", 100, "uploading", 50);

    const beforeRemoval = computeBatchStats([completed, active], 100, 1);
    const afterRemoval = computeBatchStats([active], 100, 1);

    expect(beforeRemoval.overallProgress).toBe(75);
    expect(afterRemoval.overallProgress).toBe(75);
  });

  test("does not double-count a completed job that is still in the queue", () => {
    const stats = computeBatchStats(
      [
        makeJob("done", 100, "completed"),
        makeJob("active", 100, "uploading", 50),
      ],
      100,
      1,
    );
    expect(stats.overallProgress).toBe(75);
  });

  test("a fresh batch with no credit starts at 0%", () => {
    const stats = computeBatchStats([makeJob("a", 100, "waiting")], 0, 0);
    expect(stats.overallProgress).toBe(0);
  });

  test("all completed files reach 100%", () => {
    const stats = computeBatchStats(
      [makeJob("a", 100, "completed"), makeJob("b", 200, "completed")],
      300,
      2,
    );
    expect(stats.overallProgress).toBe(100);
    expect(stats.completed).toBe(2);
    expect(stats.total).toBe(2);
  });

  test("counters include credited completed files no longer in the queue", () => {
    const stats = computeBatchStats(
      [makeJob("active", 100, "uploading", 50)],
      100,
      1,
    );
    expect(stats.total).toBe(2);
    expect(stats.completed).toBe(1);
    expect(stats.active).toBe(1);
  });

  test("a failed job kept in the queue caps the batch below 100%", () => {
    const stats = computeBatchStats(
      [makeJob("failed", 100, "failed", 40)],
      900,
      9,
    );
    expect(stats.overallProgress).toBe(94);
    expect(stats.failed).toBe(1);
  });

  test("empty state", () => {
    const stats = computeBatchStats([], 0, 0);
    expect(stats.overallProgress).toBe(0);
    expect(stats.total).toBe(0);
    expect(stats.completed).toBe(0);
  });
});
