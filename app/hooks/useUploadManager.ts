import { useSyncExternalStore, useCallback } from "react";
import {
  uploadManager,
  UploadJob,
  UploadBatchStats,
} from "@/app/lib/upload-manager";

const SERVER_JOBS: UploadJob[] = [];

export function useUploadManager() {
  const jobs = useSyncExternalStore(
    (callback) => uploadManager.subscribe(callback),
    () => uploadManager.getJobs(),
    () => SERVER_JOBS,
  );

  const stats: UploadBatchStats = uploadManager.getStats();

  const addFiles = useCallback((files: File[], folderId?: string | null) => {
    uploadManager.addFiles(files, folderId);
  }, []);

  const retryJob = useCallback((jobId: string) => {
    uploadManager.retryJob(jobId);
  }, []);

  const cancelJob = useCallback((jobId: string) => {
    uploadManager.cancelJob(jobId);
  }, []);

  const cancelAll = useCallback(() => {
    uploadManager.cancelAll();
  }, []);

  const clearCompleted = useCallback(() => {
    uploadManager.clearCompleted();
  }, []);

  const removeJob = useCallback((jobId: string) => {
    uploadManager.removeJob(jobId);
  }, []);

  const setOnJobComplete = useCallback((callback: (job: UploadJob) => void) => {
    uploadManager.setOnJobComplete(callback);
  }, []);

  return {
    jobs,
    stats,
    addFiles,
    retryJob,
    cancelJob,
    cancelAll,
    clearCompleted,
    removeJob,
    setOnJobComplete,
    uploadManager,
  };
}
