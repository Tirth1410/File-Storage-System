export interface UploadedFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: string;
  status: string;
  createdAt: string;
  ownerUserId: string;
}

export interface FolderData {
  id: string;
  name: string;
  ownerUserId: string;
  parentFolderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface ProfileData {
  storage: {
    quotaBytes: string;
    usedBytes: string;
    remainingBytes: string;
    utilization: number;
  };
  files: {
    totalUploadedFiles: number;
    totalDownloads: number;
  };
}
