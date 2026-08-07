"use client";

import { useState, useEffect, useCallback } from "react";
import { Folder, ChevronRight, X, Home } from "lucide-react";
import { MoveToDialogSkeleton } from "./MoveToDialogSkeleton";

interface FolderNode {
  id: string;
  name: string;
  parentFolderId: string | null;
}

interface BreadcrumbItem {
  id: string;
  name: string;
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
  const [currentView, setCurrentView] = useState<string | null>(null);
  const [currentFolders, setCurrentFolders] = useState<FolderNode[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContents, setLoadingContents] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(currentFolderId);

  const loadContents = useCallback(async (folderId: string | null) => {
    setLoadingContents(true);
    try {
      const params = folderId ? `?folderId=${folderId}` : "";
      const [contentsRes, breadcrumbRes] = await Promise.all([
        fetch(`/api/folders/contents${params}`),
        folderId
          ? fetch(`/api/folders/${folderId}/breadcrumb`)
          : Promise.resolve(null),
      ]);

      if (contentsRes.ok) {
        const { folders } = await contentsRes.json();
        setCurrentFolders(folders || []);
      }

      if (breadcrumbRes && breadcrumbRes.ok) {
        setBreadcrumb(await breadcrumbRes.json());
      } else {
        setBreadcrumb([]);
      }
    } catch {
    } finally {
      setLoadingContents(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadContents(null);
      setLoading(false);
    };
    init();
  }, [loadContents]);

  function handleNavigate(folderId: string | null) {
    setCurrentView(folderId);
    setSelectedId(folderId);
    loadContents(folderId);
  }

  function handleSelect(folderId: string | null) {
    setSelectedId(folderId);
    handleNavigate(folderId);
  }

  const filteredFolders = currentFolders.filter(
    (f) => f.id !== excludeFolderId,
  );

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

        {/* Breadcrumb */}
        <div className="px-4 pt-3 pb-1 overflow-x-auto">
          <nav className="flex items-center gap-1 text-xs text-[#737373] whitespace-nowrap">
            <button
              onClick={() => handleNavigate(null)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer font-medium hover:text-[#002FA7] ${
                currentView === null
                  ? "bg-[rgba(0,47,167,0.08)] text-[#002FA7]"
                  : ""
              }`}
              title="My Files"
            >
              <Home className="w-3.5 h-3.5" />
              My Files
            </button>
            {breadcrumb.map((item) => (
              <div key={item.id} className="flex items-center gap-1">
                <ChevronRight className="w-3.5 h-3.5 text-[#A3A3A3] shrink-0" />
                <button
                  onClick={() => handleNavigate(item.id)}
                  className={`px-2 py-1 rounded-md truncate max-w-[140px] transition-colors cursor-pointer hover:text-[#002FA7] ${
                    currentView === item.id
                      ? "bg-[rgba(0,47,167,0.08)] text-[#002FA7] font-medium"
                      : ""
                  }`}
                  title={item.name}
                >
                  {item.name}
                </button>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading || loadingContents ? (
            <MoveToDialogSkeleton />
          ) : (
            <>
              {filteredFolders.length > 0 ? (
                <div className="space-y-0.5">
                  {filteredFolders.map((folder) => {
                    const isSelected = selectedId === folder.id;
                    return (
                      <div
                        key={folder.id}
                        onClick={() => handleSelect(folder.id)}
                        onDoubleClick={() => onSelect(folder.id)}
                        className={`flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? "bg-[rgba(0,47,167,0.08)] text-[#002FA7] ring-1 ring-[rgba(0,47,167,0.2)]"
                            : "hover:bg-[#F5F5F5] text-[#171717]"
                        }`}
                      >
                        <Folder className="w-5 h-5 shrink-0 text-[#002FA7]" />
                        <span className="text-sm truncate font-medium">
                          {folder.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : currentView === null ? (
                <p className="text-xs text-[#A3A3A3] text-center py-8">
                  No folders yet. Create one first.
                </p>
              ) : (
                <p className="text-xs text-[#A3A3A3] text-center py-8">
                  This folder is empty
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex justify-between items-center gap-2 px-6 py-4 border-t border-[#E5E7EB]">
          <button
            onClick={() => setSelectedId(null)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              selectedId === null
                ? "bg-[rgba(0,47,167,0.08)] text-[#002FA7]"
                : "text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5]"
            }`}
          >
            Root
          </button>
          <div className="flex items-center gap-2">
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
    </div>
  );
}
