export interface User {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  createdAt: Date | string;
  storage: UserStorageSummary;
}

export interface UserStorageSummary {
  quotaBytes: string;
  usedBytes: string;
  remainingBytes: string;
  utilization: number;
}

export interface StorageStats {
  totalAllocated: string;
  totalUsed: string;
  totalAvailable: string;
  overallUtilization: number;
}

export interface FileStats {
  totalUploadedFiles: number;
  totalActiveFiles: number;
  totalDeletedFiles: number;
  totalStorageConsumed: string;
  averageFileSize: string;
}

export interface TransferStats {
  totalUploadRequests: number;
  successfulUploads: number;
  failedUploads: number;
  totalDownloadRequests: number;
  successfulDownloads: number;
  failedDownloads: number;
}

export interface UserOverviewStats {
  totalRegistered: number;
  activeUsers: number;
  nearingLimit: number;
  exhaustedQuota: number;
}

export interface DashboardStats {
  storage: StorageStats;
  files: FileStats;
  transfers: TransferStats;
  users: UserOverviewStats;
}

export interface UserDetailStats {
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    lastActivity: string;
  };
  storage: {
    quotaBytes: string;
    usedBytes: string;
    remainingBytes: string;
    utilization: number;
  };
  files: {
    totalUploadedFiles: number;
    totalActiveFiles: number;
    totalDeletedFiles: number;
  };
  activity: {
    uploadRequests: number;
    successfulUploads: number;
    failedUploads: number;
    downloadRequests: number;
    successfulDownloads: number;
    failedDownloads: number;
  };
}
