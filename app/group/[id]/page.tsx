"use client";

import { useSession } from "@/app/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, use, useState, startTransition } from "react";
import { ArrowLeft, Users } from "lucide-react";

import { AppShell } from "@/app/components/shared/AppShell";
import { LoadingScreen } from "@/app/components/shared/LoadingScreen";
import { GroupDetailSkeleton } from "@/app/components/groups/GroupDetailSkeleton";
import { Skeleton } from "@/app/components/shared/Skeleton";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { ConfirmationDialog } from "@/app/components/shared/ConfirmationDialog";
import { FilePreviewModal } from "@/app/components/shared/FilePreviewModal";

import { GroupDetailHeader } from "@/app/components/groups/GroupDetailHeader";
import { DetailTabs } from "@/app/components/groups/DetailTabs";
import { GroupFilesList } from "@/app/components/groups/GroupFilesList";
import { GroupMembersList } from "@/app/components/groups/GroupMembersList";
import { InviteMemberForm } from "@/app/components/groups/InviteMemberForm";
import { GroupSettingsModal } from "@/app/components/groups/GroupSettingsModal";

import { useAuthRedirect } from "@/app/hooks/useAuthRedirect";
import { useConfirmDialog } from "@/app/hooks/useConfirmDialog";
import { useFilePreview, useFileDownload } from "@/app/hooks/useFilePreview";

import type {
  Group,
  GroupFile,
  FullGroupDetails,
} from "@/app/components/groups/types";

export default function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const { data: session, isPending } = useSession();
  useAuthRedirect(session, isPending);
  const { dialogState, confirm, alert, close } = useConfirmDialog();
  const {
    previewFile,
    previewAllowDownload,
    open: openPreview,
    close: closePreview,
  } = useFilePreview<GroupFile["file"]>();
  const handleDownload = useFileDownload(alert);

  const [group, setGroup] = useState<Group | null>(null);
  const [groupDetails, setGroupDetails] = useState<FullGroupDetails | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
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

  const userId = session?.user?.id;

  const fetchGroup = useCallback(
    async (groupId: string) => {
      setLoading(true);
      try {
        const [groupsRes, detailsRes] = await Promise.all([
          fetch("/api/groups"),
          fetch(`/api/groups/${groupId}`),
        ]);

        if (detailsRes.status === 403 || detailsRes.status === 404) {
          setNotFound(true);
          return;
        }

        if (groupsRes.ok) {
          const groups: Group[] = await groupsRes.json();
          setGroup(groups.find((g) => g.id === groupId) ?? null);
        }
        if (detailsRes.ok) {
          setGroupDetails(await detailsRes.json());
        }
      } catch (err) {
        console.error("Error fetching group:", err);
        alert("Error", "Failed to load group", "danger");
      } finally {
        setLoading(false);
      }
    },
    [alert],
  );

  useEffect(() => {
    if (!userId || !id) return;
    startTransition(() => fetchGroup(id));
  }, [userId, id, fetchGroup]);

  const fetchGroupDetails = useCallback(
    async (groupId: string) => {
      setDetailsLoading(true);
      try {
        const res = await fetch(`/api/groups/${groupId}`);
        if (res.ok) {
          setGroupDetails(await res.json());
        } else {
          alert("Error", "Failed to load group details", "danger");
        }
      } catch (err) {
        console.error(err);
        alert("Error", "Failed to load group details", "danger");
      } finally {
        setDetailsLoading(false);
      }
    },
    [alert],
  );

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    if (!group) return;
    try {
      const res = await fetch(`/api/groups/${group.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (res.ok) {
        setInviteEmail("");
        setInviteRole("MEMBER");
        fetchGroupDetails(group.id);
      } else {
        const d = await res.json();
        setInviteError(d.error || "Failed to invite member");
      }
    } catch {
      setInviteError("Internal Server Error");
    }
  };

  const handleRemoveMember = (memberUserId: string) => {
    if (!group) return;
    confirm({
      title: "Remove Member",
      message: "Are you sure you want to remove this member?",
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
      type: "confirm",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(
            `/api/groups/${group.id}/members/${memberUserId}`,
            { method: "DELETE" },
          );
          if (res.ok) {
            fetchGroupDetails(group.id);
          } else {
            const d = await res.json();
            alert("Error", d.error || "Failed to remove member", "danger");
          }
        } catch {
          alert("Error", "Error removing member", "danger");
        }
      },
    });
  };

  const handleChangeRole = async (
    memberUserId: string,
    newRole: "ADMIN" | "MEMBER",
  ) => {
    if (!group) return;
    try {
      const res = await fetch(
        `/api/groups/${group.id}/members/${memberUserId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        },
      );
      if (res.ok) {
        fetchGroupDetails(group.id);
      } else {
        const d = await res.json();
        alert("Error", d.error || "Failed to change role", "danger");
      }
    } catch {
      alert("Error", "Error changing role", "danger");
    }
  };

  const handleLeaveGroup = () => {
    if (!group || !session?.user) return;
    confirm({
      title: "Leave Group",
      message: "Are you sure you want to leave this group?",
      confirmLabel: "Leave",
      cancelLabel: "Cancel",
      type: "confirm",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(
            `/api/groups/${group.id}/members/${session.user.id}`,
            { method: "DELETE" },
          );
          if (res.ok) {
            router.push("/groups");
          } else {
            const d = await res.json();
            alert("Error", d.error || "Failed to leave group", "danger");
          }
        } catch {
          alert("Error", "Error leaving group", "danger");
        }
      },
    });
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    if (!group) return;
    try {
      const res = await fetch(`/api/groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDesc }),
      });
      if (res.ok) {
        setShowSettingsModal(false);
        setGroup((prev) =>
          prev ? { ...prev, name: editName, description: editDesc } : prev,
        );
      } else {
        const d = await res.json();
        setEditError(d.error || "Failed to update group");
      }
    } catch {
      setEditError("Internal Server Error");
    }
  };

  const handleDeleteGroup = () => {
    if (!group) return;
    confirm({
      title: "Delete Group",
      message:
        "CRITICAL: Are you sure you want to delete this group? All shared files access for members will be revoked immediately. This cannot be undone.",
      confirmLabel: "Delete Group",
      cancelLabel: "Cancel",
      type: "confirm",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/groups/${group.id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            router.push("/groups");
          } else {
            const d = await res.json();
            alert("Error", d.error || "Failed to delete group", "danger");
          }
        } catch {
          alert("Error", "Error deleting group", "danger");
        }
      },
    });
  };

  const handleUnshareFile = (fileId: string) => {
    if (!group) return;
    confirm({
      title: "Unshare File",
      message: "Are you sure you want to unshare this file from the group?",
      confirmLabel: "Unshare",
      cancelLabel: "Cancel",
      type: "confirm",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/files/${fileId}/groups/${group.id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            fetchGroupDetails(group.id);
          } else {
            const d = await res.json();
            alert("Error", d.error || "Failed to unshare file", "danger");
          }
        } catch {
          alert("Error", "Error unsharing file", "danger");
        }
      },
    });
  };

  if (isPending) return <LoadingScreen message="Verifying session..." />;
  if (!session?.user) return <LoadingScreen message="Redirecting..." />;

  const { user } = session;

  return (
    <>
      <AppShell
        userName={user.name || undefined}
        avatarUrl={user.image ?? null}
        isAdmin={user.role === "admin"}
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
          close();
        }}
        onCancel={close}
      />

      <main className="min-h-screen bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 sm:px-6 md:px-10 md:py-8">
          {loading ? (
            <GroupDetailSkeleton />
          ) : notFound ? (
            <EmptyState
              className="bg-white border border-[#E5E7EB] rounded-2xl py-24"
              icon={<Users className="w-7 h-7 text-[#A3A3A3]" />}
              title="Group not found"
              description="This group may have been deleted or you no longer have access to it."
              action={
                <Link
                  href="/groups"
                  className="bg-[#002FA7] hover:bg-[#002482] text-white font-semibold py-1.5 px-4 rounded-lg text-xs transition-all cursor-pointer"
                >
                  Back to Groups
                </Link>
              }
            />
          ) : group ? (
            <div className="space-y-6">
              <Link
                href="/groups"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#737373] hover:text-[#002FA7] transition-all no-underline cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Groups
              </Link>

              <GroupDetailHeader
                group={group}
                currentUserId={user.id}
                onSettings={() => {
                  setEditName(group.name);
                  setEditDesc(group.description || "");
                  setShowSettingsModal(true);
                }}
                onLeave={handleLeaveGroup}
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <DetailTabs
                    active={detailsTab}
                    fileCount={groupDetails?.groupFiles?.length || 0}
                    memberCount={groupDetails?.members?.length || 0}
                    onChange={setDetailsTab}
                  />

                  {detailsLoading ? (
                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton circle width={32} height={32} />
                          <div className="flex-1 space-y-1.5">
                            <Skeleton width="50%" height={14} />
                            <Skeleton width="30%" height={12} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : detailsTab === "files" ? (
                    <GroupFilesList
                      files={groupDetails?.groupFiles || []}
                      currentUserId={user.id}
                      currentUserRole={group.currentUserRole}
                      onPreview={openPreview}
                      onDownload={handleDownload}
                      onUnshare={handleUnshareFile}
                    />
                  ) : (
                    <GroupMembersList
                      members={groupDetails?.members || []}
                      currentUserId={user.id}
                      currentUserRole={group.currentUserRole}
                      onChangeRole={handleChangeRole}
                      onRemove={handleRemoveMember}
                    />
                  )}
                </div>

                <div className="lg:col-span-1 space-y-6">
                  {(group.currentUserRole === "OWNER" ||
                    group.currentUserRole === "ADMIN") && (
                    <InviteMemberForm
                      email={inviteEmail}
                      role={inviteRole}
                      error={inviteError}
                      onEmailChange={setInviteEmail}
                      onRoleChange={setInviteRole}
                      onSubmit={handleAddMember}
                    />
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      {showSettingsModal && group && (
        <GroupSettingsModal
          name={editName}
          description={editDesc}
          error={editError}
          onNameChange={setEditName}
          onDescriptionChange={setEditDesc}
          onSubmit={handleUpdateGroup}
          onClose={() => {
            setShowSettingsModal(false);
            setEditError("");
          }}
          onDeleteGroup={handleDeleteGroup}
        />
      )}

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          allowDownload={previewAllowDownload}
          onDownload={handleDownload}
          onClose={closePreview}
        />
      )}
    </>
  );
}
