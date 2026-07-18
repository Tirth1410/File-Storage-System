"use client";

/**
 * ShareModal — redesigned for the Minimal Editorial palette.
 * Moved from app/dashboard/ShareModal.tsx → app/components/shared/ShareModal.tsx
 * so it can be reused anywhere a file share action is triggered.
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface ShareModalProps {
  file: { id: string; originalName: string };
  onClose: () => void;
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

interface GroupListItem {
  id: string;
  name: string;
  currentUserRole: string;
}

export function ShareModal({ file, onClose }: ShareModalProps) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [permissions, setPermissions] = useState<SharedPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"links" | "users" | "groups">(
    "links",
  );
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowPreview, setAllowPreview] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");
  const [email, setEmail] = useState("");
  const [permError, setPermError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
      const [linksRes, permsRes, sharedGroupsRes, userGroupsRes] =
        await Promise.all([
          fetch(`/api/files/${file.id}/share`),
          fetch(`/api/files/${file.id}/permissions`),
          fetch(`/api/files/${file.id}/groups`),
          fetch(`/api/groups`),
        ]);
      const linksData = await linksRes.json();
      const permsData = await permsRes.json();
      const sharedGroupsData = await sharedGroupsRes.json();
      const userGroupsData = await userGroupsRes.json();

      if (linksRes.ok) setLinks(linksData.links || []);
      if (permsRes.ok) setPermissions(permsData.permissions || []);
      if (sharedGroupsRes.ok) setSharedGroups(sharedGroupsData.groups || []);
      if (userGroupsRes.ok) setUserGroups(userGroupsData || []);
    } catch (err) {
      console.error("Error fetching share data", err);
    }
    setLoading(false);
  }, [file.id]);

  useEffect(() => {
    const t = setTimeout(() => fetchData(), 0);
    return () => clearTimeout(t);
  }, [fetchData]);

  const generateLink = async () => {
    try {
      const res = await fetch(`/api/files/${file.id}/share`, {
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
      const res = await fetch(`/api/files/${file.id}/share/${linkId}`, {
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
    try {
      const res = await fetch(`/api/files/${file.id}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, permission: "read" }),
      });
      if (res.ok) {
        setEmail("");
        fetchData();
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
      const res = await fetch(`/api/files/${file.id}/permissions/${userId}`, {
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

  const shareWithGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupShareError("");
    if (!selectedGroupId) {
      setGroupShareError("Please select a group");
      return;
    }
    try {
      const res = await fetch(`/api/files/${file.id}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: selectedGroupId,
          allowPreview: allowPreviewGroup,
          allowDownload: allowDownloadGroup,
        }),
      });
      if (res.ok) {
        setSelectedGroupId("");
        fetchData();
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
      const res = await fetch(`/api/files/${file.id}/groups/${groupId}`, {
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
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#E5E7EB]">
          <div>
            <h3 className="text-base font-bold text-[#171717]">Share File</h3>
            <p className="text-sm text-[#737373] truncate max-w-[300px]">
              {file.originalName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5] transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab strip */}
        <div className="flex border-b border-[#E5E7EB]">
          {(["links", "users", "groups"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === tab
                  ? "text-[#002FA7] border-b-2 border-[#002FA7] bg-[rgba(0,47,167,0.03)]"
                  : "text-[#525252] hover:text-[#171717]"
              }`}
            >
              {tab === "links"
                ? "Share Links"
                : tab === "users"
                  ? "User Permissions"
                  : "Share to Group"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6 bg-[#FAFAFA] space-y-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-[3px] border-[#002FA7] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeTab === "links" ? (
            <div className="space-y-6">
              {/* Generate Form */}
              <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] space-y-4">
                <h4 className="text-sm font-bold text-[#171717]">
                  Generate New Link
                </h4>
                <div className="grid grid-cols-2 gap-4">
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
                <div className="flex gap-3 items-end">
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
                    onClick={generateLink}
                    className="bg-[#002FA7] hover:bg-[#002482] text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all shadow-sm shadow-[#002FA7]/20 cursor-pointer"
                  >
                    Generate
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
                      className="bg-white p-4 rounded-xl border border-[#E5E7EB] flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 overflow-hidden">
                        <span className="text-xs font-mono text-[#171717] truncate block">
                          {window.location.origin}/s/{link.token}
                        </span>
                        <div className="flex gap-3 mt-1.5 text-[10px] text-[#737373] font-mono">
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
                      <div className="flex items-center gap-3 shrink-0">
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
                          onClick={() => deleteLink(link.id)}
                          className="p-2 rounded-xl bg-[rgba(220,38,38,0.07)] text-[#DC2626] border border-[rgba(220,38,38,0.15)] hover:bg-[rgba(220,38,38,0.12)] transition-all cursor-pointer"
                          title="Delete Link"
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
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
                onSubmit={addPermission}
                className="bg-white p-5 rounded-xl border border-[#E5E7EB] space-y-4"
              >
                <h4 className="text-sm font-bold text-[#171717]">
                  Share with a User
                </h4>
                {permError && (
                  <p className="text-xs text-[#DC2626] bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.2)] p-3 rounded-lg">
                    {permError}
                  </p>
                )}
                <div className="flex gap-3 items-end">
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
                  <button
                    type="submit"
                    className="bg-[#002FA7] hover:bg-[#002482] text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all shadow-sm shadow-[#002FA7]/20 cursor-pointer"
                  >
                    Add User
                  </button>
                </div>
              </form>

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
                      className="bg-white p-4 rounded-xl border border-[#E5E7EB] flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[rgba(0,47,167,0.1)] text-[#002FA7] rounded-full flex items-center justify-center font-bold text-xs uppercase">
                          {perm.user.name?.[0] || perm.user.email[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#171717]">
                            {perm.user.name || "Unknown"}
                          </p>
                          <p className="text-xs text-[#737373]">
                            {perm.user.email} · {perm.permission}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removePermission(perm.userId)}
                        className="text-xs font-semibold text-[#DC2626] bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.2)] px-3 py-1 rounded-lg hover:bg-[rgba(220,38,38,0.12)] transition-all cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Share with Group Form */}
              <form
                onSubmit={shareWithGroup}
                className="bg-white p-5 rounded-xl border border-[#E5E7EB] space-y-4"
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
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 text-sm text-[#525252] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowPreviewGroup}
                        onChange={(e) => setAllowPreviewGroup(e.target.checked)}
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
                    className="w-full bg-[#002FA7] hover:bg-[#002482] text-white font-semibold py-2 rounded-lg text-sm transition-all shadow-sm shadow-[#002FA7]/20 cursor-pointer"
                  >
                    Share with Group
                  </button>
                </div>
              </form>

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
                      className="bg-white p-4 rounded-xl border border-[#E5E7EB] flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#171717]">
                          {sg.group.name}
                        </p>
                        <div className="flex gap-3 mt-1 text-[10px] text-[#737373] font-mono">
                          <span>Preview: {sg.allowPreview ? "Yes" : "No"}</span>
                          <span>
                            Download: {sg.allowDownload ? "Yes" : "No"}
                          </span>
                          <span>Active: {sg.isActive ? "Yes" : "No"}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => unshareFromGroup(sg.groupId)}
                        className="text-xs font-semibold text-[#DC2626] bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.2)] px-3 py-1 rounded-lg hover:bg-[rgba(220,38,38,0.12)] transition-all cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
