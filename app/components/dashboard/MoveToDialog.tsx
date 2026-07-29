"use client";

import { useState, useEffect } from "react";
import { Folder, ChevronRight, ChevronDown, X } from "lucide-react";

interface FolderNode {
  id: string;
  name: string;
  parentFolderId: string | null;
}

interface MoveToDialogProps {
  title: string;
  currentFolderId: string | null;
  excludeFolderId?: string | null;
  onSelect: (folderId: string | null) => void;
  onClose: () => void;
}

export function MoveToDialog({
  title,
  currentFolderId,
  excludeFolderId,
  onSelect,
  onClose,
}: MoveToDialogProps) {
  const [rootFolders, setRootFolders] = useState<FolderNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [childrenMap, setChildrenMap] = useState<Map<string, FolderNode[]>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(currentFolderId);

  useEffect(() => {
    fetch("/api/folders")
      .then((res) => res.ok && res.json())
      .then((folders) => {
        if (folders) setRootFolders(folders);
      })
      .finally(() => setLoading(false));
  }, []);

  async function fetchChildren(folderId: string) {
    if (childrenMap.has(folderId)) return;
    try {
      const res = await fetch(`/api/folders/contents?folderId=${folderId}`);
      if (res.ok) {
        const { folders } = await res.json();
        setChildrenMap((prev) => new Map(prev).set(folderId, folders));
      }
    } catch {
    }
  }

  function toggleExpand(folderId: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
        fetchChildren(folderId);
      }
      return next;
    });
  }

  function renderFolderTree(
    folders: FolderNode[],
    depth: number = 0,
  ): React.ReactNode {
    const filtered = folders.filter((f) => f.id !== excludeFolderId);
    return filtered.map((folder) => {
      const children = childrenMap.get(folder.id);
      const hasChildren = children !== undefined ? children.length > 0 : false;
      const isExpanded = expandedFolders.has(folder.id);
      const isSelected = selectedId === folder.id;

      return (
        <div key={folder.id}>
          <div
            className={`flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer transition-all ${
              isSelected
                ? "bg-[rgba(0,47,167,0.08)] text-[#002FA7]"
                : "hover:bg-[#F5F5F5] text-[#171717]"
            }`}
            style={{ paddingLeft: `${12 + depth * 20}px` }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
              className="w-5 h-5 flex items-center justify-center shrink-0 text-[#A3A3A3] hover:text-[#525252] cursor-pointer"
            >
              {hasChildren || children === undefined ? (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )
              ) : null}
            </button>
            <button
              onClick={() => setSelectedId(folder.id)}
              className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
            >
              <Folder className="w-4 h-4 shrink-0 text-[#002FA7]" />
              <span className="text-sm truncate">{folder.name}</span>
            </button>
          </div>
          {isExpanded && children && children.length > 0 && (
            <div>{renderFolderTree(children, depth + 1)}</div>
          )}
          {isExpanded && children && children.length === 0 && (
            <div
              className="text-xs text-[#A3A3A3] py-1"
              style={{ paddingLeft: `${32 + (depth + 1) * 20}px` }}
            >
              Empty folder
            </div>
          )}
        </div>
      );
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden max-h-[80vh]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#E5E7EB]">
          <h3 className="text-sm font-bold text-[#171717]">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-[3px] border-[#002FA7] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <button
                onClick={() => setSelectedId(null)}
                className={`w-full flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer transition-all mb-1 ${
                  selectedId === null
                    ? "bg-[rgba(0,47,167,0.08)] text-[#002FA7]"
                    : "hover:bg-[#F5F5F5] text-[#171717]"
                }`}
              >
                <Folder className="w-4 h-4 shrink-0 text-[#002FA7]" />
                <span className="text-sm font-medium">Root (My Files)</span>
              </button>
              {rootFolders.length > 0 ? (
                renderFolderTree(rootFolders)
              ) : (
                <p className="text-xs text-[#A3A3A3] text-center py-8">
                  No folders yet. Create one first.
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#E5E7EB]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-[#525252] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F5F5F5] transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onSelect(selectedId)}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#002FA7] rounded-lg hover:bg-[#002482] transition-all cursor-pointer"
          >
            Move Here
          </button>
        </div>
      </div>
    </div>
  );
}
