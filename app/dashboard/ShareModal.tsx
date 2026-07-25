"use client";

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
  user: {
    name: string | null;
    email: string;
  };
}

export function ShareModal({ file, onClose }: ShareModalProps) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [permissions, setPermissions] = useState<SharedPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"links" | "users">("links");

  // New Link State
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowPreview, setAllowPreview] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");

  // New Permission State
  const [email, setEmail] = useState("");
  const permissionLevel = "read";
  const [permError, setPermError] = useState("");

  const fetchData = useCallback(
    async (showLoading = false) => {
      if (showLoading) {
        setLoading(true);
      }
      try {
        const [linksRes, permsRes] = await Promise.all([
          fetch(`/api/files/${file.id}/share`),
          fetch(`/api/files/${file.id}/permissions`),
        ]);
        const linksData = await linksRes.json();
        const permsData = await permsRes.json();
        if (linksRes.ok) setLinks(linksData.links || []);
        if (permsRes.ok) setPermissions(permsData.permissions || []);
      } catch (error) {
        console.error("Error fetching share data", error);
      }
      setLoading(false);
    },
    [file.id],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(false);
    }, 0);
    return () => clearTimeout(timer);
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

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/s/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const addPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    setPermError("");
    try {
      const res = await fetch(`/api/files/${file.id}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, permission: permissionLevel }),
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

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-5 border-b border-neutral-800">
          <div>
            <h3 className="text-lg font-bold text-neutral-200">Share File</h3>
            <p className="text-sm text-neutral-500 truncate max-w-[300px]">
              {file.originalName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-100 transition-colors bg-neutral-950 border border-neutral-800 w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex border-b border-neutral-800">
          <button
            onClick={() => setActiveTab("links")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === "links"
                ? "text-indigo-400 border-b-2 border-indigo-400 bg-neutral-800/30"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            Share Links
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === "users"
                ? "text-indigo-400 border-b-2 border-indigo-400 bg-neutral-800/30"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            User Permissions
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-neutral-950 space-y-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : activeTab === "links" ? (
            <div className="space-y-6">
              <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 space-y-4">
                <h4 className="text-sm font-semibold text-neutral-300">
                  Generate New Link
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 text-sm text-neutral-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowPreview}
                      onChange={(e) => setAllowPreview(e.target.checked)}
                      className="rounded bg-neutral-950 border-neutral-700 text-indigo-500"
                    />
                    Allow Preview
                  </label>
                  <label className="flex items-center gap-2 text-sm text-neutral-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowDownload}
                      onChange={(e) => setAllowDownload(e.target.checked)}
                      className="rounded bg-neutral-950 border-neutral-700 text-indigo-500"
                    />
                    Allow Download
                  </label>
                </div>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-neutral-500 mb-1">
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
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-sm text-neutral-300 focus:outline-none focus:border-indigo-500 cursor-pointer [color-scheme:dark]"
                    />
                  </div>
                  <button
                    onClick={generateLink}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Generate Link
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-neutral-300">
                  Active Links ({links.length})
                </h4>
                {links.length === 0 ? (
                  <p className="text-xs text-neutral-500">
                    No active share links.
                  </p>
                ) : (
                  links.map((link) => (
                    <div
                      key={link.id}
                      className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 overflow-hidden">
                        <span className="text-sm font-mono text-neutral-300 truncate block">
                          {window.location.origin}/s/{link.token}
                        </span>
                        <div className="flex gap-3 mt-1 text-[10px] text-neutral-500">
                          <span>
                            Preview: {link.allowPreview ? "Yes" : "No"}
                          </span>
                          <span>
                            Download: {link.allowDownload ? "Yes" : "No"}
                          </span>
                          {link.expiresAt && (
                            <span className="text-amber-500/80">
                              Expires:{" "}
                              {new Date(link.expiresAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => copyToClipboard(link.token)}
                          className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold px-2.5 py-1.5 border border-neutral-800 rounded-lg hover:bg-neutral-800/40 transition-all cursor-pointer"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => deleteLink(link.id)}
                          className="text-red-400 hover:text-red-300 p-2 rounded-lg transition-colors bg-red-950/20 cursor-pointer"
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
          ) : (
            <div className="space-y-6">
              <form
                onSubmit={addPermission}
                className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 space-y-4"
              >
                <h4 className="text-sm font-semibold text-neutral-300">
                  Share with User
                </h4>
                {permError && (
                  <p className="text-xs text-red-400">{permError}</p>
                )}
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-neutral-500 mb-1">
                      User Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-sm text-neutral-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Add User
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-neutral-300">
                  Shared Users ({permissions.length})
                </h4>
                {permissions.length === 0 ? (
                  <p className="text-xs text-neutral-500">
                    Not shared with any specific users.
                  </p>
                ) : (
                  permissions.map((perm) => (
                    <div
                      key={perm.userId}
                      className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-900 text-indigo-200 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                          {perm.user.name?.[0] || perm.user.email[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-200">
                            {perm.user.name || "Unknown"}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {perm.user.email} • {perm.permission}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removePermission(perm.userId)}
                        className="text-red-400 hover:text-red-300 p-2 rounded-lg transition-colors bg-red-950/20 cursor-pointer"
                        title="Remove Access"
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
