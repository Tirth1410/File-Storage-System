export type GroupRole = "OWNER" | "ADMIN" | "MEMBER";

export interface Group {
  id: string;
  name: string;
  description: string | null;
  ownerUserId: string;
  ownerName: string | null;
  ownerEmail: string;
  isArchived: boolean;
  createdAt: string;
  currentUserRole: GroupRole;
  memberCount: number;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: GroupRole;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export interface GroupFile {
  id: string;
  groupId: string;
  fileId: string;
  sharedByUserId: string;
  allowPreview: boolean;
  allowDownload: boolean;
  isActive: boolean;
  sharedAt: string;
  file: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: string;
    ownerUserId: string;
  };
  sharedByUser: {
    name: string | null;
    email: string;
  };
}

export interface FullGroupDetails {
  id: string;
  name: string;
  description: string | null;
  ownerUserId: string;
  createdAt: string;
  members: GroupMember[];
  groupFiles: GroupFile[];
}

export function roleToBadgeVariant(role: GroupRole) {
  if (role === "OWNER") return "admin";
  if (role === "ADMIN") return "warning";
  return "user";
}
