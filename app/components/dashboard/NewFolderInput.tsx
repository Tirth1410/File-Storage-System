"use client";

import { useState, useRef, useEffect } from "react";
import { FolderPlus, X, Check } from "lucide-react";
import { toast } from "sonner";

interface NewFolderInputProps {
  parentFolderId: string | null;
  onCreated: () => void;
  onCancel?: () => void;
}

export function NewFolderInput({
  parentFolderId,
  onCreated,
  onCancel,
}: NewFolderInputProps) {
  const [showInput, setShowInput] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;

    setCreating(true);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          parentFolderId: parentFolderId,
        }),
      });

      if (res.ok) {
        setName("");
        setShowInput(false);
        onCreated();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to create folder");
      }
    } catch {
      toast.error("Failed to create folder");
    } finally {
      setCreating(false);
    }
  }

  function handleCancel() {
    setShowInput(false);
    setName("");
    onCancel?.();
  }

  if (!showInput) {
    return (
      <button
        onClick={() => setShowInput(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#002FA7] bg-[rgba(0,47,167,0.07)] border border-[rgba(0,47,167,0.15)] rounded-lg hover:bg-[rgba(0,47,167,0.12)] transition-all cursor-pointer"
      >
        <FolderPlus className="w-3.5 h-3.5" />
        New Folder
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCreate();
          if (e.key === "Escape") handleCancel();
        }}
        placeholder="Folder name"
        disabled={creating}
        className="flex-1 px-3 py-1.5 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002FA7] focus:border-transparent bg-white placeholder:text-[#A3A3A3] min-w-[160px]"
      />
      <button
        onClick={handleCreate}
        disabled={creating || !name.trim()}
        className="p-1.5 rounded-lg bg-[#002FA7] text-white hover:bg-[#002482] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        title="Create"
      >
        <Check className="w-4 h-4" />
      </button>
      <button
        onClick={handleCancel}
        disabled={creating}
        className="p-1.5 rounded-lg text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5] border border-transparent hover:border-[#E5E7EB] transition-all cursor-pointer disabled:opacity-50"
        title="Cancel"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
