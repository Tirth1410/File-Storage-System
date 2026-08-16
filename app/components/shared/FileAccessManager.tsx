"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { ShareModalSkeleton } from "./ShareModalSkeleton";
import { Spinner } from "./Spinner";

interface FileAccessManagerProps {
  file?: { id: string; originalName: string };
  fileIds?: string[];
  selectAll?: boolean;
  sourceFolderId?: string | null;
  excludeIds?: string[];
}

interface BulkShareResponse {
  pending?: boolean;
  shared?: { fileId: string }[];
  invites?: { fileId: string; emailSent: boolean; inviteId: string }[];
  skipped?: { fileId: string; reason?: string }[];
  notFound?: { fileId: string }[];
  forbidden?: { fileId: string }[];
  failed?: { fileId: string; reason?: string }[];
}

interface ShareLink {
  id: string;
  token: string;
  allowPreview: boolean;
  allowDownload: boolean;
  expiresAt: string | null;
}

interface SharedPermission {
  userId: string;
  permission: string;
  user: { name: string | null; email: string };
}

interface SharedGroupItem {
  groupId: string;
  allowPreview: boolean;
  allowDownload: boolean;
  isActive: boolean;
  group: {
    name: string;
  };
}

interface PendingInvite {
  id: string;
  email: string;
  permission: string;
  expiresAt: string | null;
  invitedByUser: { name: string | null; email: string } | null;
}

interface GroupListItem {
  id: string;
  name: string;
  currentUserRole: string;
}

export function FileAccessManager({
  file,
  fileIds,
  selectAll = false,
  sourceFolderId = null,
  excludeIds = [],
}: FileAccessManagerProps) {
  const isBulk = !!fileIds && fileIds.length > 0;
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [permissions, setPermissions] = useState<SharedPermission[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"links" | "users" | "groups">(
    isBulk ? "users" : "links",
  );
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowPreview, setAllowPreview] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"read" | "write">("read");
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [permError, setPermError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const runAction = useCallback(
    async (key: string, fn: () => Promise<void>) => {
      setPendingAction(key);
      try {
        await fn();
      } finally {
        setPendingAction((cur) => (cur === key ? null : cur));
      }
    },
    [],
  );

  const formatBulkSummary = (data: BulkShareResponse): string => {
    const parts: string[] = [];
    if (data.shared?.length) parts.push(`Shared: ${data.shared.length}`);
    if (data.invites?.length) parts.push(`Invites: ${data.invites.length}`);
    if (data.skipped?.length) parts.push(`Skipped: ${data.skipped.length}`);
    if (data.notFound?.length) parts.push(`Not found: ${data.notFound.length}`);
    if (data.forbidden?.length)
      parts.push(`Forbidden: ${data.forbidden.length}`);
    if (data.failed?.length) parts.push(`Failed: ${data.failed.length}`);
    return parts.length ? parts.join("  ·  ") : "No files were eligible";
  };

  // Group states
  const [userGroups, setUserGroups] = useState<GroupListItem[]>([]);
  const [sharedGroups, setSharedGroups] = useState<SharedGroupItem[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [allowDownloadGroup, setAllowDownloadGroup] = useState(true);
  const [allowPreviewGroup, setAllowPreviewGroup] = useState(true);
  const [groupShareError, setGroupShareError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (isBulk) {
        const userGroupsRes = await fetch(`/api/groups`);
        const userGroupsData = await userGroupsRes.json();
        if (userGroupsRes.ok) setUserGroups(userGroupsData || []);
      } else {
        const [linksRes, permsRes, sharedGroupsRes, userGroupsRes] =
          await Promise.all([
            fetch(`/api/files/${file!.id}/share`),
            fetch(`/api/files/${file!.id}/permissions`),
            fetch(`/api/files/${file!.id}/groups`),
            fetch(`/api/groups`),
          ]);
        const linksData = await linksRes.json();
        const permsData = await permsRes.json();
        const sharedGroupsData = await sharedGroupsRes.json();
        const userGroupsData = await userGroupsRes.json();

        if (linksRes.ok) setLinks(linksData.links || []);
        if (permsRes.ok) {
          setPermissions(permsData.permissions || []);
          setPendingInvites(permsData.pendingInvites || []);
        }
        if (sharedGroupsRes.ok) setSharedGroups(sharedGroupsData.groups || []);
        if (userGroupsRes.ok) setUserGroups(userGroupsData || []);
      }
    } catch (err) {
      console.error("Error fetching share data", err);
    }
    setLoading(false);
  }, [isBulk, file]);

  useEffect(() => {
    const t = setTimeout(() => fetchData(), 0);
    return () => clearTimeout(t);
  }, [fetchData]);

  const generateLink = async () => {
    try {
      const res = await fetch(`/api/files/${file!.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowDownload,
          allowPreview,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      if (res.ok) {
        fetchData();
        setExpiresAt("");
        toast.success("Share link generated successfully!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to generate link");
      }
    } catch {
      toast.error("Error generating link");
    }
  };

  const deleteLink = async (linkId: string) => {
    try {
      const res = await fetch(`/api/files/${file!.id}/share/${linkId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData();
        toast.success("Share link deleted successfully!");
      } else {
        toast.error("Failed to delete link");
      }
    } catch {
      toast.error("Error deleting link");
    }
  };

  const copyToClipboard = (token: string, linkId: string) => {
    const url = `${window.location.origin}/s/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(linkId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const addPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    setPermError("");
    setBulkResult(null);
    try {
      const res = await fetch(
        isBulk ? `/api/files/bulk-share` : `/api/files/${file!.id}/permissions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isBulk
              ? {
                  fileIds,
                  email,
                  permission,
                  selectAll,
                  folderId: sourceFolderId,
                  excludeIds,
                }
              : { email, permission: "read" },
          ),
        },
      );
      if (res.ok) {
        const data = (await res.json()) as BulkShareResponse;
        if (isBulk) {
          setEmail("");
          setBulkResult(formatBulkSummary(data));
          const doneCount =
            (data.shared?.length ?? 0) + (data.invites?.length ?? 0);
          toast.success(
            doneCount > 0
              ? `Shared ${doneCount} file${doneCount > 1 ? "s" : ""} with ${email}`
              : "No selected files were eligible",
          );
        } else {
          if (data.pending) {
            toast.success(`Invitation sent to ${email}`);
          }
          setEmail("");
          fetchData();
        }
      } else {
        const data = await res.json();
        setPermError(data.error || "Failed to add permission");
      }
    } catch {
      setPermError("Error adding permission");
    }
  };

  const removePermission = async (userId: string) => {
    try {
      const res = await fetch(`/api/files/${file!.id}/permissions/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData();
        toast.success("User access removed successfully!");
      } else {
        toast.error("Failed to remove user permission");
      }
    } catch {
      toast.error("Error removing permission");
    }
  };

  const resendInvite = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/invitations/${inviteId}/resend`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Invitation resent successfully!");
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to resend invitation");
      }
    } catch {
      toast.error("Error resending invitation");
    }
  };

  const cancelInvite = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/invitations/${inviteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Invitation cancelled");
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to cancel invitation");
      }
    } catch {
      toast.error("Error cancelling invitation");
    }
  };

  const shareWithGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupShareError("");
    setBulkResult(null);
    if (!selectedGroupId) {
      setGroupShareError("Please select a group");
      return;
    }
    try {
      const res = await fetch(
        isBulk
          ? `/api/files/bulk-share/group`
          : `/api/files/${file!.id}/groups`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isBulk
              ? {
                  fileIds,
                  groupId: selectedGroupId,
                  allowPreview: allowPreviewGroup,
                  allowDownload: allowDownloadGroup,
                  selectAll,
                  folderId: sourceFolderId,
                  excludeIds,
                }
              : {
                  groupId: selectedGroupId,
                  allowPreview: allowPreviewGroup,
                  allowDownload: allowDownloadGroup,
                },
          ),
        },
      );
      if (res.ok) {
        const data = (await res.json()) as BulkShareResponse;
        setSelectedGroupId("");
        if (isBulk) {
          setBulkResult(formatBulkSummary(data));
          const doneCount = data.shared?.length ?? 0;
          toast.success(
            doneCount > 0
              ? `Shared ${doneCount} file${doneCount > 1 ? "s" : ""} with group`
              : "No selected files were eligible",
          );
        } else {
          fetchData();
        }
      } else {
        const data = await res.json();
        setGroupShareError(data.error || "Failed to share with group");
      }
    } catch {
      setGroupShareError("Error sharing with group");
    }
  };

  const unshareFromGroup = async (groupId: string) => {
    try {
      const res = await fetch(`/api/files/${file!.id}/groups/${groupId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData();
        toast.success("Group access removed successfully!");
      } else {
        toast.error("Failed to unshare from group");
      }
    } catch {
      toast.error("Error unsharing from group");
    }
  };

  return (
    <>
      {/* Tab strip */}
      <div
        className="flex overflow-x-auto border-b border-[#E5E7EB]"
        data-tour="share-tabs"
      >
        {(isBulk
          ? (["users", "groups"] as const)
          : (["links", "users", "groups"] as const)
        ).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`min-w-max flex-1 px-3 py-3 text-xs font-semibold transition-colors cursor-pointer sm:text-sm ${
              activeTab === tab
                ? "text-[#002FA7] border-b-2 border-[#002FA7] bg-[rgba(0,47,167,0.03)]"
                : "text-[#525252] hover:text-[#171717]"
            }`}
          >
            {tab === "links"
              ? "Share Public Link"
              : tab === "users"
                ? "User Permissions"
                : "Share to Group"}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-4 bg-[#FAFAFA] space-y-6 sm:p-6">
        {loading ? (
          isBulk ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <ShareModalSkeleton />
          )
        ) : (
          <>
            {isBulk && bulkResult && (
              <div className="bg-[rgba(0,47,167,0.06)] border border-[rgba(0,47,167,0.2)] text-[#002FA7] p-3 rounded-lg text-xs font-semibold">
                {bulkResult}
              </div>
            )}
            {activeTab === "links" ? (
              <div className="space-y-6">
                {/* Generate Form */}
                <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-4 sm:p-5">
                  <h4 className="text-sm font-bold text-[#171717]">
                    Generate New Link
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                    {[
                      {
                        label: "Allow Preview",
                        value: allowPreview,
                        setter: setAllowPreview,
                      },
                      {
                        label: "Allow Download",
                        value: allowDownload,
                        setter: setAllowDownload,
                      },
                    ].map(({ label, value, setter }) => (
                      <label
                        key={label}
                        className="flex items-center gap-2 text-sm text-[#525252] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setter(e.target.checked)}
                          className="rounded accent-[#002FA7]"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <label className="block text-xs text-[#737373] mb-1 font-medium">
                        Expiration (optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        onClick={(e) => {
                          try {
                            e.currentTarget.showPicker();
                          } catch {}
                        }}
                        className="w-full bg-white border border-[#E5E7EB] rounded-lg p-2 text-sm text-[#171717] focus:outline-none focus:border-[#002FA7] cursor-pointer"
                      />
                    </div>
                    <button
                      onClick={() => runAction("generate-link", generateLink)}
                      disabled={pendingAction === "generate-link"}
                      className="w-full bg-[#002FA7] hover:bg-[#002482] text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all shadow-sm shadow-[#002FA7]/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto"
                    >
                      {pendingAction === "generate-link" ? (
                        <span className="inline-flex items-center gap-2">
                          <Spinner size="sm" /> Generating...
                        </span>
                      ) : (
                        "Generate"
                      )}
                    </button>
                  </div>
                </div>

                {/* Active Links */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#171717] uppercase tracking-wide">
                    Active Links ({links.length})
                  </h4>
                  {links.length === 0 ? (
                    <p className="text-xs text-[#737373]">
                      No active share links.
                    </p>
                  ) : (
                    links.map((link) => (
                      <div
                        key={link.id}
                        className="bg-white p-4 rounded-xl border border-[#E5E7EB] flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center sm:gap-4"
                      >
                        <div className="flex-1 overflow-hidden">
                          <span className="text-xs font-mono text-[#171717] truncate block">
                            {window.location.origin}/s/{link.token}
                          </span>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[10px] text-[#737373] font-mono">
                            <span>
                              Preview: {link.allowPreview ? "Yes" : "No"}
                            </span>
                            <span>
                              Download: {link.allowDownload ? "Yes" : "No"}
                            </span>
                            {link.expiresAt && (
                              <span className="text-amber-600">
                                Expires:{" "}
                                {new Date(link.expiresAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 shrink-0 sm:gap-3">
                          <button
                            onClick={() => copyToClipboard(link.token, link.id)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                              copiedId === link.id
                                ? "bg-[rgba(22,163,74,0.1)] text-[#16A34A] border-[rgba(22,163,74,0.2)]"
                                : "text-[#002FA7] border-[rgba(0,47,167,0.15)] hover:bg-[rgba(0,47,167,0.08)]"
                            } cursor-pointer`}
                          >
                            {copiedId === link.id ? "Copied!" : "Copy"}
                          </button>
                          <button
                            onClick={() =>
                              runAction(`delete-link-${link.id}`, () =>
                                deleteLink(link.id),
                              )
                            }
                            disabled={
                              pendingAction === `delete-link-${link.id}`
                            }
                            className="p-2 rounded-xl bg-[rgba(220,38,38,0.07)] text-[#DC2626] border border-[rgba(220,38,38,0.15)] hover:bg-[rgba(220,38,38,0.12)] transition-all cursor-pointer disabled:opacity-60"
                            title="Delete Link"
                          >
                            {pendingAction === `delete-link-${link.id}` ? (
                              <Spinner size="sm" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : activeTab === "users" ? (
              <div className="space-y-6">
                {/* Add User Form */}
                <form
                  onSubmit={(e) =>
                    runAction("add-user", () => addPermission(e))
                  }
                  className="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-4 sm:p-5"
                >
                  <h4 className="text-sm font-bold text-[#171717]">
                    Share with a User
                  </h4>
                  {permError && (
                    <p className="text-xs text-[#DC2626] bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.2)] p-3 rounded-lg">
                      {permError}
                    </p>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <label className="block text-xs text-[#737373] mb-1 font-medium">
                        User Email
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="w-full bg-white border border-[#E5E7EB] rounded-lg p-2 text-sm text-[#171717] placeholder-[#A3A3A3] focus:outline-none focus:border-[#002FA7]"
                      />
                    </div>
                    {isBulk && (
                      <div className="flex-1">
                        <label className="block text-xs text-[#737373] mb-1 font-medium">
                          Permission
                        </label>
                        <select
                          value={permission}
                          onChange={(e) =>
                            setPermission(e.target.value as "read" | "write")
                          }
                          className="w-full bg-white border border-[#E5E7EB] rounded-lg p-2 text-sm text-[#171717] focus:outline-none focus:border-[#002FA7]"
                        >
                          <option value="read">Read only</option>
                          <option value="write">Read &amp; write</option>
                        </select>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={pendingAction === "add-user"}
                      className="w-full bg-[#002FA7] hover:bg-[#002482] text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all shadow-sm shadow-[#002FA7]/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto"
                    >
                      {pendingAction === "add-user" ? (
                        <span className="inline-flex items-center gap-2">
                          <Spinner size="sm" /> Adding...
                        </span>
                      ) : isBulk ? (
                        "Share"
                      ) : (
                        "Add User"
                      )}
                    </button>
                  </div>
                </form>

                {!isBulk && (
                  <>
                    {/* Shared Users List */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-[#171717] uppercase tracking-wide">
                        Shared Users ({permissions.length})
                      </h4>
                      {permissions.length === 0 ? (
                        <p className="text-xs text-[#737373]">
                          Not shared with any specific users.
                        </p>
                      ) : (
                        permissions.map((perm) => (
                          <div
                            key={perm.userId}
                            className="bg-white p-4 rounded-xl border border-[#E5E7EB] flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center sm:gap-4"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 bg-[rgba(0,47,167,0.1)] text-[#002FA7] rounded-full flex items-center justify-center font-bold text-xs uppercase">
                                {perm.user.name?.[0] || perm.user.email[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#171717]">
                                  {perm.user.name || "Unknown"}
                                </p>
                                <p className="text-xs text-[#737373] truncate">
                                  {perm.user.email} · {perm.permission}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                runAction(`remove-user-${perm.userId}`, () =>
                                  removePermission(perm.userId),
                                )
                              }
                              disabled={
                                pendingAction === `remove-user-${perm.userId}`
                              }
                              className="self-end text-xs font-semibold text-[#DC2626] bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.2)] px-3 py-1 rounded-lg hover:bg-[rgba(220,38,38,0.12)] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:self-auto"
                            >
                              {pendingAction ===
                              `remove-user-${perm.userId}` ? (
                                <Spinner size="sm" />
                              ) : (
                                "Remove"
                              )}
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Pending Invites */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-[#171717] uppercase tracking-wide">
                        Pending Invites ({pendingInvites.length})
                      </h4>
                      {pendingInvites.length === 0 ? (
                        <p className="text-xs text-[#737373]">
                          No pending invitations.
                        </p>
                      ) : (
                        pendingInvites.map((inv) => (
                          <div
                            key={inv.id}
                            className="bg-white p-4 rounded-xl border border-[#E5E7EB] flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center sm:gap-4"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#171717]">
                                {inv.email}
                              </p>
                              <p className="text-xs text-[#737373] mt-0.5 truncate">
                                Pending
                                {inv.expiresAt &&
                                  ` · expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                              </p>
                            </div>
                            <div className="flex items-center justify-end gap-2 shrink-0">
                              <button
                                onClick={() =>
                                  runAction(`resend-${inv.id}`, () =>
                                    resendInvite(inv.id),
                                  )
                                }
                                disabled={pendingAction === `resend-${inv.id}`}
                                className="text-xs font-semibold text-[#002FA7] border border-[rgba(0,47,167,0.15)] bg-[rgba(0,47,167,0.03)] px-3 py-1.5 rounded-lg hover:bg-[rgba(0,47,167,0.08)] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {pendingAction === `resend-${inv.id}` ? (
                                  <Spinner size="sm" />
                                ) : (
                                  "Resend"
                                )}
                              </button>
                              <button
                                onClick={() =>
                                  runAction(`cancel-${inv.id}`, () =>
                                    cancelInvite(inv.id),
                                  )
                                }
                                disabled={pendingAction === `cancel-${inv.id}`}
                                className="text-xs font-semibold text-[#DC2626] bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.2)] px-3 py-1.5 rounded-lg hover:bg-[rgba(220,38,38,0.12)] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {pendingAction === `cancel-${inv.id}` ? (
                                  <Spinner size="sm" />
                                ) : (
                                  "Cancel"
                                )}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Share with Group Form */}
                <form
                  onSubmit={(e) =>
                    runAction("share-group", () => shareWithGroup(e))
                  }
                  className="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-4 sm:p-5"
                >
                  <h4 className="text-sm font-bold text-[#171717]">
                    Share with a Group
                  </h4>
                  {groupShareError && (
                    <p className="text-xs text-[#DC2626] bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.2)] p-3 rounded-lg">
                      {groupShareError}
                    </p>
                  )}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-[#737373] mb-1 font-medium">
                        Select Group
                      </label>
                      <select
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="w-full bg-white border border-[#E5E7EB] rounded-lg p-2 text-sm text-[#171717] focus:outline-none focus:border-[#002FA7]"
                      >
                        <option value="">-- Choose a Group --</option>
                        {userGroups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} ({g.currentUserRole})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                      <label className="flex items-center gap-2 text-sm text-[#525252] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowPreviewGroup}
                          onChange={(e) =>
                            setAllowPreviewGroup(e.target.checked)
                          }
                          className="rounded accent-[#002FA7]"
                        />
                        Allow Preview
                      </label>
                      <label className="flex items-center gap-2 text-sm text-[#525252] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowDownloadGroup}
                          onChange={(e) =>
                            setAllowDownloadGroup(e.target.checked)
                          }
                          className="rounded accent-[#002FA7]"
                        />
                        Allow Download
                      </label>
                    </div>
                    <button
                      type="submit"
                      disabled={pendingAction === "share-group"}
                      className="w-full bg-[#002FA7] hover:bg-[#002482] text-white font-semibold py-2 rounded-lg text-sm transition-all shadow-sm shadow-[#002FA7]/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {pendingAction === "share-group" ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <Spinner size="sm" /> Sharing...
                        </span>
                      ) : (
                        "Share with Group"
                      )}
                    </button>
                  </div>
                </form>

                {!isBulk && (
                  <>
                    {/* Shared Groups List */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-[#171717] uppercase tracking-wide">
                        Shared Groups ({sharedGroups.length})
                      </h4>
                      {sharedGroups.length === 0 ? (
                        <p className="text-xs text-[#737373]">
                          Not shared with any groups.
                        </p>
                      ) : (
                        sharedGroups.map((sg) => (
                          <div
                            key={sg.groupId}
                            className="bg-white p-4 rounded-xl border border-[#E5E7EB] flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center sm:gap-4"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#171717]">
                                {sg.group.name}
                              </p>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[10px] text-[#737373] font-mono">
                                <span>
                                  Preview: {sg.allowPreview ? "Yes" : "No"}
                                </span>
                                <span>
                                  Download: {sg.allowDownload ? "Yes" : "No"}
                                </span>
                                <span>
                                  Active: {sg.isActive ? "Yes" : "No"}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                runAction(`unshare-group-${sg.groupId}`, () =>
                                  unshareFromGroup(sg.groupId),
                                )
                              }
                              disabled={
                                pendingAction === `unshare-group-${sg.groupId}`
                              }
                              className="self-end text-xs font-semibold text-[#DC2626] bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.2)] px-3 py-1 rounded-lg hover:bg-[rgba(220,38,38,0.12)] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:self-auto"
                            >
                              {pendingAction ===
                              `unshare-group-${sg.groupId}` ? (
                                <Spinner size="sm" />
                              ) : (
                                "Remove"
                              )}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
