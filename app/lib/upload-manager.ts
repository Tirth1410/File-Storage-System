export type UploadStatus =
  | "waiting"
  | "preparing"
  | "uploading"
  | "completing"
  | "completed"
  | "failed"
  | "cancelled";

export interface UploadJob {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number; // 0 - 100
  uploadedBytes: number;
  totalBytes: number;
  speedMBs: number;
  etaSeconds: number;
  error: string | null;
  folderId?: string | null;
  uploadId?: string;
  objectKey?: string;
  abortController?: AbortController;
  startTime?: number;
}

export interface UploadBatchStats {
  total: number;
  completed: number;
  failed: number;
  cancelled: number;
  active: number;
  waiting: number;
  overallProgress: number; // 0 - 100
}

const DEFAULT_STATS: UploadBatchStats = {
  total: 0,
  completed: 0,
  failed: 0,
  cancelled: 0,
  active: 0,
  waiting: 0,
  overallProgress: 0,
};

const COMPLETED_AUTO_REMOVE_MS = 1200;

/**
 * Compute batch stats from the current queue plus credited bytes from files
 * that already completed. Completed jobs are credited exactly once when they
 * finish, so they keep counting toward the overall progress even after they
 * are removed from the queue.
 */
export function computeBatchStats(
  jobs: UploadJob[],
  creditedCompletedBytes: number,
  creditedCompletedCount: number,
): UploadBatchStats {
  let failed = 0;
  let cancelled = 0;
  let active = 0;
  let waiting = 0;
  let completedInArray = 0;
  let totalBytesSum = creditedCompletedBytes;
  let uploadedBytesSum = creditedCompletedBytes;

  for (const job of jobs) {
    if (job.status === "completed") {
      completedInArray++;
      continue;
    }

    totalBytesSum += job.totalBytes;
    uploadedBytesSum += job.uploadedBytes;

    switch (job.status) {
      case "failed":
        failed++;
        break;
      case "cancelled":
        cancelled++;
        break;
      case "preparing":
      case "uploading":
      case "completing":
        active++;
        break;
      case "waiting":
        waiting++;
        break;
    }
  }

  const total = creditedCompletedCount + jobs.length - completedInArray;

  return {
    total,
    completed: creditedCompletedCount,
    failed,
    cancelled,
    active,
    waiting,
    overallProgress:
      totalBytesSum > 0
        ? Math.round((uploadedBytesSum / totalBytesSum) * 100)
        : 0,
  };
}

export class UploadManager {
  private jobs: UploadJob[] = [];
  private concurrency: number;
  private activeCount = 0;
  private listeners = new Set<() => void>();
  private onBatchCompleteCallback?: () => void;
  private batchPending = false;
  private autoRemoveTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private creditedCompletedBytes = 0;
  private creditedCompletedCount = 0;

  private jobsSnapshot: UploadJob[] = [];
  private statsSnapshot: UploadBatchStats = DEFAULT_STATS;
  private notifyTimer: ReturnType<typeof setTimeout> | null = null;
  private notifyPending = false;
  private readonly NOTIFY_THROTTLE_MS = 100;

  constructor(concurrency = 3) {
    this.concurrency = concurrency;
    this.updateSnapshots();
  }

  public setConcurrency(concurrency: number) {
    this.concurrency = concurrency;
    this.processQueue();
  }

  public setOnBatchComplete(callback: () => void) {
    this.onBatchCompleteCallback = callback;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateSnapshots() {
    this.jobsSnapshot = this.jobs.map((job) => ({ ...job }));
    this.statsSnapshot = computeBatchStats(
      this.jobs,
      this.creditedCompletedBytes,
      this.creditedCompletedCount,
    );
  }

  private notify() {
    if (this.notifyTimer === null) {
      this.flushNotify();
      this.notifyTimer = setTimeout(() => {
        this.notifyTimer = null;
        if (this.notifyPending) {
          this.notifyPending = false;
          this.flushNotify();
        }
      }, this.NOTIFY_THROTTLE_MS);
    } else {
      this.notifyPending = true;
    }
  }

  private flushNotify() {
    this.updateSnapshots();
    this.listeners.forEach((listener) => listener());
  }

  public getJobs(): UploadJob[] {
    return this.jobsSnapshot;
  }

  public getStats(): UploadBatchStats {
    return this.statsSnapshot;
  }

  public addFiles(files: File[], folderId?: string | null): void {
    const hasInFlight = this.jobs.some((j) =>
      ["waiting", "preparing", "uploading", "completing"].includes(j.status),
    );
    if (!hasInFlight) {
      this.creditedCompletedBytes = 0;
      this.creditedCompletedCount = 0;
    }

    const newJobs: UploadJob[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file,
      status: "waiting",
      progress: 0,
      uploadedBytes: 0,
      totalBytes: file.size,
      speedMBs: 0,
      etaSeconds: 0,
      error: null,
      folderId: folderId ?? undefined,
    }));

    this.jobs.push(...newJobs);
    this.batchPending = true;
    this.notify();
    this.processQueue();
  }

  public async retryJob(jobId: string): Promise<void> {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return;
    if (job.status === "failed" || job.status === "cancelled") {
      job.status = "waiting";
      job.progress = 0;
      job.uploadedBytes = 0;
      job.speedMBs = 0;
      job.etaSeconds = 0;
      job.error = null;
      job.uploadId = undefined;
      job.objectKey = undefined;
      job.abortController = undefined;
      this.batchPending = true;
      this.notify();
      this.processQueue();
    }
  }

  public async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return;

    if (job.status === "waiting") {
      // Waiting jobs are removed without touching backend
      this.jobs = this.jobs.filter((j) => j.id !== jobId);
      this.notify();
      return;
    }

    if (
      job.status === "preparing" ||
      job.status === "uploading" ||
      job.status === "completing"
    ) {
      job.status = "cancelled";
      job.abortController?.abort();

      if (job.uploadId && job.objectKey) {
        const { uploadId, objectKey } = job;
        try {
          await fetch("/api/files/abort-upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uploadId, objectKey }),
          });
        } catch {
          // ignore abort failure
        }
      }
      this.notify();
    }
  }

  public async cancelAll(): Promise<void> {
    const activeAndWaiting = this.jobs.filter(
      (j) =>
        j.status === "waiting" ||
        j.status === "preparing" ||
        j.status === "uploading" ||
        j.status === "completing",
    );

    // Remove waiting jobs immediately
    this.jobs = this.jobs.filter((j) => j.status !== "waiting");

    // Abort active jobs
    for (const job of activeAndWaiting) {
      if (job.status !== "waiting") {
        job.status = "cancelled";
        job.abortController?.abort();
        if (job.uploadId && job.objectKey) {
          const { uploadId, objectKey } = job;
          fetch("/api/files/abort-upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uploadId, objectKey }),
          }).catch(() => {});
        }
      }
    }
    this.notify();
  }

  public clearCompleted(): void {
    this.jobs = this.jobs.filter(
      (j) =>
        j.status === "waiting" ||
        j.status === "preparing" ||
        j.status === "uploading" ||
        j.status === "completing",
    );
    this.notify();
  }

  public removeJob(jobId: string): void {
    const job = this.jobs.find((j) => j.id === jobId);
    if (
      job &&
      (job.status === "completed" ||
        job.status === "failed" ||
        job.status === "cancelled")
    ) {
      this.jobs = this.jobs.filter((j) => j.id !== jobId);
      const timer = this.autoRemoveTimers.get(jobId);
      if (timer) clearTimeout(timer);
      this.autoRemoveTimers.delete(jobId);
      this.notify();
    }
  }

  private scheduleAutoRemove(jobId: string): void {
    const timer = setTimeout(() => {
      this.autoRemoveTimers.delete(jobId);
      const job = this.jobs.find((j) => j.id === jobId);
      if (job && job.status === "completed") {
        this.jobs = this.jobs.filter((j) => j.id !== jobId);
        this.notify();
      }
    }, COMPLETED_AUTO_REMOVE_MS);
    this.autoRemoveTimers.set(jobId, timer);
  }

  private processQueue(): void {
    while (this.activeCount < this.concurrency) {
      const nextJob = this.jobs.find((j) => j.status === "waiting");
      if (!nextJob) break;

      this.activeCount++;
      this.executeJob(nextJob).finally(() => {
        this.activeCount--;
        this.processQueue();
      });
    }
    this.checkBatchComplete();
  }

  private checkBatchComplete(): void {
    if (!this.batchPending) return;
    if (this.activeCount > 0) return;
    const hasRemaining = this.jobs.some(
      (j) =>
        j.status === "waiting" ||
        j.status === "preparing" ||
        j.status === "uploading" ||
        j.status === "completing",
    );
    if (hasRemaining) return;
    this.batchPending = false;
    this.onBatchCompleteCallback?.();
  }

  private async executeJob(job: UploadJob): Promise<void> {
    job.status = "preparing";
    job.abortController = new AbortController();
    job.startTime = Date.now();
    this.notify();

    let uploadId = "";
    let objectKey = "";

    try {
      if (job.status === ("cancelled" as UploadStatus)) return;

      // Step 1: Initiate upload (validates quota, creates DB File and UploadSession, starts R2 multipart)
      const initRes = await fetch("/api/files/initiate-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: job.file.name,
          size: job.file.size,
          mimeType: job.file.type || "application/octet-stream",
          folderId: job.folderId,
        }),
        signal: job.abortController.signal,
      });

      if (job.status === ("cancelled" as UploadStatus)) return;

      if (!initRes.ok) {
        const errData = await initRes.json().catch(() => ({}));
        const msg =
          errData.message || errData.error || "Failed to initiate upload";
        throw new Error(msg);
      }

      const initData = await initRes.json();
      uploadId = initData.uploadId;
      objectKey = initData.objectKey;
      const partSizeBytes = initData.partSizeBytes;

      job.uploadId = uploadId;
      job.objectKey = objectKey;
      job.status = "uploading";
      this.notify();

      // Step 2: Multipart Upload
      const totalParts = Math.ceil(job.file.size / partSizeBytes);
      const parts: { partNumber: number; etag: string }[] = [];
      const queue = Array.from({ length: totalParts }, (_, i) => i + 1);
      const activeUploads: Promise<void>[] = [];
      const CHUNK_CONCURRENCY = 3;
      let uploadedBytes = 0;

      const uploadPart = async (partNumber: number) => {
        if (job.status === ("cancelled" as UploadStatus)) return;

        const start = (partNumber - 1) * partSizeBytes;
        const end = Math.min(start + partSizeBytes, job.file.size);
        const chunk = job.file.slice(start, end);
        const chunkSize = chunk.size;

        const signRes = await fetch("/api/files/sign-part", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uploadId, objectKey, partNumber }),
          signal: job.abortController?.signal,
        });

        if (job.status === ("cancelled" as UploadStatus)) return;
        if (!signRes.ok) throw new Error(`Failed to sign part ${partNumber}`);

        const { url } = await signRes.json();

        let attempts = 0;
        let etag = "";
        while (attempts < 3) {
          if (job.status === ("cancelled" as UploadStatus)) return;
          try {
            const uploadRes = await fetch(url, {
              method: "PUT",
              body: chunk,
              headers: {
                "Content-Type": job.file.type || "application/octet-stream",
              },
              signal: job.abortController?.signal,
            });
            if (!uploadRes.ok)
              throw new Error(`Part ${partNumber} upload failed`);
            const rawEtag = uploadRes.headers.get("ETag");
            if (!rawEtag) throw new Error("ETag header missing");
            etag = rawEtag.replace(/"/g, "");
            break;
          } catch (err) {
            if (
              job.status === ("cancelled" as UploadStatus) ||
              (err instanceof Error && err.name === "AbortError")
            )
              return;
            attempts++;
            if (attempts >= 3) throw err;
            await new Promise((r) => setTimeout(r, 1000 * attempts));
          }
        }

        if (job.status === ("cancelled" as UploadStatus)) return;
        parts.push({ partNumber, etag });
        uploadedBytes += chunkSize;

        const elapsed = (Date.now() - (job.startTime || Date.now())) / 1000;
        const speed = elapsed > 0 ? uploadedBytes / elapsed : 0;
        const remainingBytes = job.file.size - uploadedBytes;
        const eta = speed > 0 ? remainingBytes / speed : 0;

        job.uploadedBytes = uploadedBytes;
        job.progress = Math.round((uploadedBytes / job.file.size) * 100);
        job.speedMBs = speed / (1024 * 1024);
        job.etaSeconds = Math.round(eta);
        this.notify();
      };

      for (const partNumber of queue) {
        if (job.status === ("cancelled" as UploadStatus)) break;
        if (activeUploads.length >= CHUNK_CONCURRENCY) {
          await Promise.race(activeUploads);
        }
        if (job.status === ("cancelled" as UploadStatus)) break;
        const p = uploadPart(partNumber).then(() => {
          activeUploads.splice(activeUploads.indexOf(p), 1);
        });
        activeUploads.push(p);
      }
      await Promise.all(activeUploads);

      if (job.status === ("cancelled" as UploadStatus)) return;

      // Step 3: Complete upload
      job.status = "completing";
      this.notify();

      const completeRes = await fetch("/api/files/complete-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId, objectKey, parts }),
        signal: job.abortController.signal,
      });

      if (!completeRes.ok) throw new Error("Failed to complete upload");

      job.status = "completed";
      job.progress = 100;
      job.uploadedBytes = job.file.size;
      job.speedMBs = 0;
      job.etaSeconds = 0;
      this.creditedCompletedBytes += job.file.size;
      this.creditedCompletedCount += 1;
      this.notify();
      this.scheduleAutoRemove(job.id);
    } catch (err) {
      if (
        job.status === ("cancelled" as UploadStatus) ||
        (err instanceof Error && err.name === "AbortError")
      ) {
        return;
      }
      console.error("Job error:", err);
      job.status = "failed";
      job.error = err instanceof Error ? err.message : "Upload failed";
      this.notify();

      if (uploadId && objectKey) {
        try {
          await fetch("/api/files/abort-upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uploadId, objectKey }),
          });
        } catch {
          // ignore cleanup error
        }
      }
    }
  }
}

export const uploadManager = new UploadManager(3);
