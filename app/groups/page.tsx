"use client";

import { useSession } from "@/app/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

const PDFCanvasViewer = dynamic(
  () => import("@/app/components/shared/PDFCanvasViewer"),
  { ssr: false },
);

import { AppShell } from "@/app/components/shared/AppShell";
import { LoadingScreen } from "@/app/components/shared/LoadingScreen";
import { SectionCard } from "@/app/components/shared/SectionCard";
import { StatusBadge } from "@/app/components/shared/StatusBadge";
import { formatBytes } from "@/app/lib/utils";
import { ConfirmationDialog } from "@/app/components/shared/ConfirmationDialog";
import { useProductTour } from "@/app/hooks/useProductTour";
import { TourKickoffModal } from "@/app/components/shared/TourKickoffModal";

interface Group {
  id: string;
  name: string;
  description: string | null;
  ownerUserId: string;
  ownerName: string | null;
  ownerEmail: string;
  isArchived: boolean;
  createdAt: string;
  currentUserRole: "OWNER" | "ADMIN" | "MEMBER";
  memberCount: number;
}

interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface GroupFile {
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

interface FullGroupDetails {
  id: string;
  name: string;
  description: string | null;
  ownerUserId: string;
  createdAt: string;
  members: GroupMember[];
  groupFiles: GroupFile[];
}

export default function GroupsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { showModal, startTour, dismissTour } = useProductTour("groups");

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Group creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createError, setCreateError] = useState("");

  // Detailed group view state
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [groupDetails, setGroupDetails] = useState<FullGroupDetails | null>(
    null,
  );
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsTab, setDetailsTab] = useState<"files" | "members">("files");

  // Invite member state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [inviteError, setInviteError] = useState("");

  // Group settings edit state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editError, setEditError] = useState("");

  // Custom Alert / Confirm Dialog state
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: "alert" | "confirm";
    variant?: "danger" | "info" | "success";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const showCustomAlert = (
    title: string,
    message: string,
    variant: "danger" | "info" | "success" = "info",
  ) => {
    setDialogState({
      isOpen: true,
      title,
      message,
      confirmLabel: "OK",
      type: "alert",
      variant,
      onConfirm: () => {},
    });
  };

  // Preview file state
  const [previewFile, setPreviewFile] = useState<GroupFile["file"] | null>(
    null,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewAllowDownload, setPreviewAllowDownload] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/groups");
      if (res.ok) setGroups(await res.json());
    } catch (err) {
      console.error("Error fetching groups:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    Promise.resolve().then(() => fetchGroups());
  }, [session, fetchGroups]);

  const fetchGroupDetails = useCallback(async (groupId: string) => {
    setDetailsLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (res.ok) {
        setGroupDetails(await res.json());
      } else {
        showCustomAlert("Error", "Failed to load group details", "danger");
        setActiveGroup(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeGroup) {
      Promise.resolve().then(() => fetchGroupDetails(activeGroup.id));
    } else {
      Promise.resolve().then(() => setGroupDetails(null));
    }
  }, [activeGroup, fetchGroupDetails]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName, description: createDesc }),
      });
      if (res.ok) {
        setCreateName("");
        setCreateDesc("");
        setShowCreateModal(false);
        fetchGroups();
      } else {
        const d = await res.json();
        setCreateError(d.error || "Failed to create group");
      }
    } catch {
      setCreateError("Internal Server Error");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    if (!activeGroup) return;
    try {
      const res = await fetch(`/api/groups/${activeGroup.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (res.ok) {
        setInviteEmail("");
        setInviteRole("MEMBER");
        fetchGroupDetails(activeGroup.id);
      } else {
        const d = await res.json();
        setInviteError(d.error || "Failed to invite member");
      }
    } catch {
      setInviteError("Internal Server Error");
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!activeGroup) return;
    setDialogState({
      isOpen: true,
      title: "Remove Member",
      message: "Are you sure you want to remove this member?",
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
      type: "confirm",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(
            `/api/groups/${activeGroup.id}/members/${memberUserId}`,
            {
              method: "DELETE",
            },
          );
          if (res.ok) {
            fetchGroupDetails(activeGroup.id);
          } else {
            const d = await res.json();
            showCustomAlert(
              "Error",
              d.error || "Failed to remove member",
              "danger",
            );
          }
        } catch {
          showCustomAlert("Error", "Error removing member", "danger");
        }
      },
    });
  };

  const handleChangeRole = async (
    memberUserId: string,
    newRole: "ADMIN" | "MEMBER",
  ) => {
    if (!activeGroup) return;
    try {
      const res = await fetch(
        `/api/groups/${activeGroup.id}/members/${memberUserId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        },
      );
      if (res.ok) {
        fetchGroupDetails(activeGroup.id);
      } else {
        const d = await res.json();
        showCustomAlert("Error", d.error || "Failed to change role", "danger");
      }
    } catch {
      showCustomAlert("Error", "Error changing role", "danger");
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeGroup || !session?.user) return;
    setDialogState({
      isOpen: true,
      title: "Leave Group",
      message: "Are you sure you want to leave this group?",
      confirmLabel: "Leave",
      cancelLabel: "Cancel",
      type: "confirm",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(
            `/api/groups/${activeGroup.id}/members/${session.user.id}`,
            {
              method: "DELETE",
            },
          );
          if (res.ok) {
            setActiveGroup(null);
            fetchGroups();
          } else {
            const d = await res.json();
            showCustomAlert(
              "Error",
              d.error || "Failed to leave group",
              "danger",
            );
          }
        } catch {
          showCustomAlert("Error", "Error leaving group", "danger");
        }
      },
    });
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    if (!activeGroup) return;
    try {
      const res = await fetch(`/api/groups/${activeGroup.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDesc }),
      });
      if (res.ok) {
        setShowSettingsModal(false);
        setActiveGroup((prev) =>
          prev ? { ...prev, name: editName, description: editDesc } : null,
        );
        fetchGroups();
      } else {
        const d = await res.json();
        setEditError(d.error || "Failed to update group");
      }
    } catch {
      setEditError("Internal Server Error");
    }
  };

  const handleDeleteGroup = async () => {
    if (!activeGroup) return;
    setDialogState({
      isOpen: true,
      title: "Delete Group",
      message:
        "CRITICAL: Are you sure you want to delete this group? All shared files access for members will be revoked immediately. This cannot be undone.",
      confirmLabel: "Delete Group",
      cancelLabel: "Cancel",
      type: "confirm",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/groups/${activeGroup.id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            setActiveGroup(null);
            fetchGroups();
          } else {
            const d = await res.json();
            showCustomAlert(
              "Error",
              d.error || "Failed to delete group",
              "danger",
            );
          }
        } catch {
          showCustomAlert("Error", "Error deleting group", "danger");
        }
      },
    });
  };

  const handleUnshareFile = async (fileId: string) => {
    if (!activeGroup) return;
    setDialogState({
      isOpen: true,
      title: "Unshare File",
      message: "Are you sure you want to unshare this file from the group?",
      confirmLabel: "Unshare",
      cancelLabel: "Cancel",
      type: "confirm",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(
            `/api/files/${fileId}/groups/${activeGroup.id}`,
            {
              method: "DELETE",
            },
          );
          if (res.ok) {
            fetchGroupDetails(activeGroup.id);
          } else {
            const d = await res.json();
            showCustomAlert(
              "Error",
              d.error || "Failed to unshare file",
              "danger",
            );
          }
        } catch {
          showCustomAlert("Error", "Error unsharing file", "danger");
        }
      },
    });
  };

  const handleFilePreview = async (
    file: GroupFile["file"],
    allowDownload: boolean = true,
  ) => {
    setPreviewFile(file);
    setPreviewAllowDownload(allowDownload);
    setPreviewUrl(null);
    setPreviewLoading(true);
    try {
      const res = await fetch(
        `/api/files/${file.id}/download-url?download=false`,
      );
      if (res.ok) {
        const { url } = await res.json();
        setPreviewUrl(url);
      }
    } catch {
      console.error("Preview error");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleFileDownload = async (file: GroupFile["file"]) => {
    try {
      const res = await fetch(
        `/api/files/${file.id}/download-url?download=true`,
      );
      if (res.ok) {
        const { url } = await res.json();
        const a = document.createElement("a");
        a.href = url;
        a.download = file.originalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        showCustomAlert("Error", "Failed to get download URL", "danger");
      }
    } catch {
      showCustomAlert("Error", "Error downloading file", "danger");
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    if (role === "OWNER") return "admin";
    if (role === "ADMIN") return "warning";
    return "user";
  };

  if (isPending) return <LoadingScreen message="Verifying session..." />;
  if (!session?.user) return <LoadingScreen message="Redirecting..." />;

  const { user } = session;

  return (
    <>
      <AppShell
        userName={user.name || undefined}
        actions={
          user.role === "admin"
            ? [
                {
                  label: "Admin",
                  onClick: () => router.push("/admin"),
                  variant: "primary",
                },
              ]
            : []
        }
      />

      <ConfirmationDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        confirmLabel={dialogState.confirmLabel}
        cancelLabel={dialogState.cancelLabel}
        type={dialogState.type}
        variant={dialogState.variant}
        onConfirm={() => {
          dialogState.onConfirm();
          setDialogState((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setDialogState((prev) => ({ ...prev, isOpen: false }))}
      />

      <TourKickoffModal
        isOpen={showModal}
        title="Welcome to Groups!"
        description="Take a quick tour to learn how to create groups, invite members, and share files securely."
        onStart={startTour}
        onSkip={dismissTour}
      />

      <main className="min-h-screen bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 sm:px-6 md:px-10 md:py-8">
          {activeGroup ? (
            /* ──── GROUP DETAILED VIEW ──── */
            <div className="space-y-6">
              {/* Back breadcrumb */}
              <button
                onClick={() => setActiveGroup(null)}
                className="flex items-center gap-2 text-xs font-semibold text-[#737373] hover:text-[#002FA7] transition-all cursor-pointer"
              >
                ← Back to Groups
              </button>

              {/* Group Detail Header */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 sm:p-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight text-[#171717] break-words">
                      {activeGroup.name}
                    </h1>
                    <StatusBadge
                      variant={getRoleBadgeVariant(activeGroup.currentUserRole)}
                      label={activeGroup.currentUserRole}
                    />
                  </div>
                  <p className="text-sm text-[#737373] mt-1">
                    {activeGroup.description || "No description provided."}
                  </p>
                  <p className="text-xs text-[#A3A3A3] mt-2">
                    Owned by {activeGroup.ownerName || activeGroup.ownerEmail}{" "}
                    {activeGroup.ownerUserId === user.id && "(You)"} · Created{" "}
                    {new Date(activeGroup.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeGroup.currentUserRole === "OWNER" && (
                    <button
                      onClick={() => {
                        setEditName(activeGroup.name);
                        setEditDesc(activeGroup.description || "");
                        setShowSettingsModal(true);
                      }}
                      className="bg-white border border-[#E5E7EB] hover:bg-[#F5F5F5] text-[#171717] font-semibold py-2 px-4 rounded-xl text-sm transition-all cursor-pointer"
                    >
                      Group Settings
                    </button>
                  )}
                  {activeGroup.currentUserRole !== "OWNER" && (
                    <button
                      onClick={handleLeaveGroup}
                      className="bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.15)] hover:bg-[rgba(220,38,38,0.12)] text-[#DC2626] font-semibold py-2 px-4 rounded-xl text-sm transition-all cursor-pointer"
                    >
                      Leave Group
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs list */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main section: tab content */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex overflow-x-auto border-b border-[#E5E7EB] gap-4">
                    <button
                      onClick={() => setDetailsTab("files")}
                      className={`pb-3 text-sm font-bold border-b-2 px-1 transition-all cursor-pointer ${
                        detailsTab === "files"
                          ? "border-[#002FA7] text-[#002FA7]"
                          : "border-transparent text-[#737373] hover:text-[#171717]"
                      }`}
                    >
                      Files ({groupDetails?.groupFiles?.length || 0})
                    </button>
                    <button
                      onClick={() => setDetailsTab("members")}
                      className={`pb-3 text-sm font-bold border-b-2 px-1 transition-all cursor-pointer ${
                        detailsTab === "members"
                          ? "border-[#002FA7] text-[#002FA7]"
                          : "border-transparent text-[#737373] hover:text-[#171717]"
                      }`}
                    >
                      Members ({groupDetails?.members?.length || 0})
                    </button>
                  </div>

                  {detailsLoading ? (
                    <div className="bg-white border border-[#E5E7EB] rounded-2xl py-20 flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-[3px] border-[#002FA7] border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-[#737373]">
                        Loading group data...
                      </p>
                    </div>
                  ) : detailsTab === "files" ? (
                    /* ──── GROUP FILES LIST ──── */
                    <SectionCard noPadding title="Shared Files">
                      {!groupDetails?.groupFiles ||
                      groupDetails.groupFiles.length === 0 ? (
                        <div className="py-16 text-center text-sm text-[#737373]">
                          No files shared in this group yet. Share a file from
                          the Dashboard Share menu.
                        </div>
                      ) : (
                        <div className="divide-y divide-[#F5F5F5]">
                          {groupDetails.groupFiles.map((gf) => (
                            <div
                              key={gf.id}
                              className="px-4 py-4 flex flex-col items-stretch justify-between gap-3 hover:bg-[#FAFAFA] transition-colors sm:flex-row sm:items-center sm:px-6 sm:gap-4"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-[#171717] truncate">
                                  {gf.file.originalName}
                                </p>
                                <p className="text-xs text-[#737373] mt-0.5">
                                  {formatBytes(gf.file.sizeBytes)} · Shared by{" "}
                                  {gf.sharedByUser.name ||
                                    gf.sharedByUser.email}
                                </p>
                              </div>
                              <div className="flex flex-wrap justify-end gap-2">
                                {gf.allowPreview && (
                                  <button
                                    onClick={() =>
                                      handleFilePreview(
                                        gf.file,
                                        gf.allowDownload,
                                      )
                                    }
                                    className="bg-[rgba(0,47,167,0.06)] hover:bg-[rgba(0,47,167,0.12)] text-[#002FA7] font-semibold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
                                  >
                                    Preview
                                  </button>
                                )}
                                {gf.allowDownload && (
                                  <button
                                    onClick={() => handleFileDownload(gf.file)}
                                    className="bg-white border border-[#E5E7EB] hover:bg-[#F5F5F5] text-[#171717] font-semibold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
                                  >
                                    Download
                                  </button>
                                )}
                                {(gf.file.ownerUserId === user.id ||
                                  activeGroup.currentUserRole === "OWNER" ||
                                  activeGroup.currentUserRole === "ADMIN") && (
                                  <button
                                    onClick={() =>
                                      handleUnshareFile(gf.file.id)
                                    }
                                    className="bg-[rgba(220,38,38,0.06)] hover:bg-[rgba(220,38,38,0.12)] text-[#DC2626] font-semibold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
                                    title="Unshare File"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </SectionCard>
                  ) : (
                    /* ──── GROUP MEMBERS LIST ──── */
                    <SectionCard noPadding title="Group Members">
                      {groupDetails?.members.map((m) => {
                        const isSelf = m.userId === user.id;
                        const isOwner = m.role === "OWNER";
                        const canManage =
                          (activeGroup.currentUserRole === "OWNER" ||
                            activeGroup.currentUserRole === "ADMIN") &&
                          !isOwner &&
                          !isSelf;

                        return (
                          <div
                            key={m.id}
                            className="px-4 py-4 flex flex-col items-stretch justify-between gap-3 hover:bg-[#FAFAFA] transition-colors sm:flex-row sm:items-center sm:px-6 sm:gap-4"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 bg-[rgba(0,47,167,0.1)] text-[#002FA7] rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                {m.user.name?.[0] || m.user.email[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-[#171717]">
                                  {m.user.name || "Unknown"} {isSelf && "(You)"}
                                </p>
                                <p className="text-xs text-[#737373] mt-0.5 truncate">
                                  {m.user.email}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-3">
                              <StatusBadge
                                variant={getRoleBadgeVariant(m.role)}
                                label={m.role}
                              />
                              {canManage && (
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                  {activeGroup.currentUserRole === "OWNER" && (
                                    <select
                                      value={m.role}
                                      onChange={(e) =>
                                        handleChangeRole(
                                          m.userId,
                                          e.target.value as "ADMIN" | "MEMBER",
                                        )
                                      }
                                      className="bg-white border border-[#E5E7EB] rounded-lg p-1 text-xs text-[#171717] focus:outline-none"
                                    >
                                      <option value="ADMIN">ADMIN</option>
                                      <option value="MEMBER">MEMBER</option>
                                    </select>
                                  )}
                                  <button
                                    onClick={() => handleRemoveMember(m.userId)}
                                    className="bg-[rgba(220,38,38,0.06)] hover:bg-[rgba(220,38,38,0.12)] text-[#DC2626] font-semibold px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </SectionCard>
                  )}
                </div>

                {/* Sidebar: Invite panel (if owner or admin) */}
                <div className="lg:col-span-1 space-y-6">
                  {(activeGroup.currentUserRole === "OWNER" ||
                    activeGroup.currentUserRole === "ADMIN") && (
                    <SectionCard title="Invite Member">
                      <form onSubmit={handleAddMember} className="space-y-4">
                        {inviteError && (
                          <p className="text-xs text-[#DC2626] bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.2)] p-3 rounded-lg">
                            {inviteError}
                          </p>
                        )}
                        <div>
                          <label className="block text-xs text-[#737373] mb-1 font-medium">
                            Email Address
                          </label>
                          <input
                            type="email"
                            required
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="collaborator@example.com"
                            className="w-full bg-white border border-[#E5E7EB] rounded-lg p-2.5 text-sm text-[#171717] placeholder-[#A3A3A3] focus:outline-none focus:border-[#002FA7]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#737373] mb-1 font-medium">
                            Role
                          </label>
                          <select
                            value={inviteRole}
                            onChange={(e) =>
                              setInviteRole(
                                e.target.value as "ADMIN" | "MEMBER",
                              )
                            }
                            className="w-full bg-white border border-[#E5E7EB] rounded-lg p-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#002FA7]"
                          >
                            <option value="MEMBER">
                              MEMBER (Can view and download shared files)
                            </option>
                            <option value="ADMIN">
                              ADMIN (Can manage files and members)
                            </option>
                          </select>
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-[#002FA7] hover:bg-[#002482] text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-sm shadow-[#002FA7]/20 cursor-pointer"
                        >
                          Send Invitation
                        </button>
                      </form>
                    </SectionCard>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ──── GROUPS GRID LIST ──── */
            <div className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1
                    className="text-2xl font-bold tracking-tight text-[#171717]"
                    data-tour="groups-title"
                  >
                    My Groups
                  </h1>
                  <p className="text-sm text-[#737373] mt-0.5">
                    View group files and manage sharing groups
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  data-tour="create-group-btn"
                  className="self-start bg-[#002FA7] hover:bg-[#002482] text-white font-semibold py-2 px-4 rounded-xl text-sm transition-all shadow-sm shadow-[#002FA7]/20 cursor-pointer flex items-center gap-1.5 sm:self-auto"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Create Group
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-8 h-8 border-[3px] border-[#002FA7] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-[#737373]">Loading groups...</p>
                </div>
              ) : groups.length === 0 ? (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl py-24 text-center px-6">
                  <div className="w-14 h-14 bg-[#F5F5F5] border border-[#E5E7EB] rounded-2xl flex items-center justify-center mb-4 mx-auto">
                    <svg
                      className="w-7 h-7 text-[#A3A3A3]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-[#171717] mb-1">
                    No groups found
                  </h3>
                  <p className="text-xs text-[#737373] max-w-xs mx-auto mb-4">
                    Create a group to start sharing folders and files securely
                    with team members.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-[#002FA7] hover:bg-[#002482] text-white font-semibold py-1.5 px-4 rounded-lg text-xs transition-all cursor-pointer"
                  >
                    Create Group
                  </button>
                </div>
              ) : (
                <div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  data-tour="groups-list"
                >
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className="bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[180px]"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="text-base font-bold text-[#171717] truncate min-w-0">
                            {group.name}
                          </h3>
                          <StatusBadge
                            variant={getRoleBadgeVariant(group.currentUserRole)}
                            label={group.currentUserRole}
                          />
                        </div>
                        <p className="text-xs text-[#737373] mt-2 line-clamp-2">
                          {group.description || "No description provided."}
                        </p>
                      </div>
                      <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#F5F5F5]">
                        <span className="text-xs text-[#A3A3A3]">
                          {group.memberCount} member
                          {group.memberCount !== 1 ? "s" : ""}
                        </span>
                        <button
                          onClick={() => setActiveGroup(group)}
                          className="text-xs font-bold text-[#002FA7] hover:underline cursor-pointer"
                        >
                          View Details →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ──── CREATE GROUP MODAL ──── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center gap-3 px-4 py-4 border-b border-[#E5E7EB] sm:px-6">
              <h3 className="text-sm font-bold text-[#171717]">
                Create New Group
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError("");
                }}
                className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5] transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="p-4 space-y-4 sm:p-6">
              {createError && (
                <p className="text-xs text-[#DC2626] bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.2)] p-3 rounded-lg">
                  {createError}
                </p>
              )}
              <div>
                <label className="block text-xs text-[#737373] mb-1 font-medium">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Engineering Team, Marketing, etc."
                  className="w-full bg-white border border-[#E5E7EB] rounded-lg p-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#002FA7]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#737373] mb-1 font-medium">
                  Description (optional)
                </label>
                <textarea
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder="Details about the group members and purpose..."
                  className="w-full bg-white border border-[#E5E7EB] rounded-lg p-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#002FA7] min-h-[80px]"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-white border border-[#E5E7EB] hover:bg-[#F5F5F5] text-[#171717] font-semibold py-2 rounded-xl text-sm transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#002FA7] hover:bg-[#002482] text-white font-semibold py-2 rounded-xl text-sm transition-all shadow-sm shadow-[#002FA7]/20 cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──── GROUP SETTINGS EDIT MODAL ──── */}
      {showSettingsModal && activeGroup && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center gap-3 px-4 py-4 border-b border-[#E5E7EB] sm:px-6">
              <h3 className="text-sm font-bold text-[#171717]">
                Edit Group Settings
              </h3>
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  setEditError("");
                }}
                className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5] transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateGroup} className="p-4 space-y-4 sm:p-6">
              {editError && (
                <p className="text-xs text-[#DC2626] bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.2)] p-3 rounded-lg">
                  {editError}
                </p>
              )}
              <div>
                <label className="block text-xs text-[#737373] mb-1 font-medium">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-lg p-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#002FA7]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#737373] mb-1 font-medium">
                  Description
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-lg p-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#002FA7] min-h-[80px]"
                />
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
                    className="flex-1 bg-white border border-[#E5E7EB] hover:bg-[#F5F5F5] text-[#171717] font-semibold py-2 rounded-xl text-sm transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#002FA7] hover:bg-[#002482] text-white font-semibold py-2 rounded-xl text-sm transition-all shadow-sm shadow-[#002FA7]/20 cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteGroup}
                  className="w-full bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.15)] hover:bg-[rgba(220,38,38,0.12)] text-[#DC2626] font-semibold py-2 rounded-xl text-xs transition-all cursor-pointer mt-4"
                >
                  Delete Group Permanently
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──── FILE PREVIEW MODAL ──── */}
      {previewFile && (
        <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full max-w-4xl max-h-[calc(100vh-24px)] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center gap-3 px-4 py-4 border-b border-[#E5E7EB] sm:px-6">
              <div className="min-w-0 overflow-hidden">
                <h3 className="text-sm font-bold text-[#171717] truncate">
                  {previewFile.originalName}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {previewAllowDownload && (
                  <button
                    onClick={() => handleFileDownload(previewFile)}
                    className="bg-[#002FA7] hover:bg-[#002482] text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download
                  </button>
                )}
                <button
                  onClick={() => {
                    setPreviewFile(null);
                    setPreviewUrl(null);
                  }}
                  className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5] transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
            {/* Body */}
            <div
              className={`flex-1 bg-[#FAFAFA] flex items-center justify-center min-h-[300px] max-h-[65vh] ${
                previewFile?.mimeType === "application/pdf"
                  ? "overflow-hidden p-0"
                  : "overflow-auto p-6"
              }`}
            >
              {previewLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-[3px] border-[#002FA7] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-[#737373]">
                    Loading preview...
                  </span>
                </div>
              ) : previewUrl ? (
                <>
                  {previewFile.mimeType.startsWith("image/") && (
                    <Image
                      src={previewUrl}
                      alt={previewFile.originalName}
                      width={800}
                      height={600}
                      unoptimized
                      className="max-w-full max-h-full object-contain rounded-xl"
                    />
                  )}
                  {previewFile.mimeType.startsWith("video/") && (
                    <video
                      src={previewUrl}
                      controls
                      autoPlay
                      className="max-w-full max-h-full object-contain rounded-xl"
                    />
                  )}
                  {previewFile.mimeType === "application/pdf" && (
                    <PDFCanvasViewer
                      key={previewUrl}
                      url={previewUrl}
                      heightClass="h-[65vh] max-h-[65vh]"
                    />
                  )}
                </>
              ) : (
                <p className="text-sm text-[#737373]">Preview unavailable.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
