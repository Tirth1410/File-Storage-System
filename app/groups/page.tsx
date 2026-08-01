"use client";

import { useSession } from "@/app/lib/auth-client";
import { useEffect, useState, useCallback, startTransition } from "react";
import { Plus, Users } from "lucide-react";

import { AppShell } from "@/app/components/shared/AppShell";
import { LoadingScreen } from "@/app/components/shared/LoadingScreen";
import { LoadingState } from "@/app/components/shared/LoadingState";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { TourKickoffModal } from "@/app/components/shared/TourKickoffModal";
import { PageHeader } from "@/app/components/shared/PageHeader";

import { GroupCard } from "@/app/components/groups/GroupCard";
import { CreateGroupModal } from "@/app/components/groups/CreateGroupModal";

import { useProductTour } from "@/app/hooks/useProductTour";
import { useAuthRedirect } from "@/app/hooks/useAuthRedirect";

import type { Group } from "@/app/components/groups/types";

export default function GroupsPage() {
  const { data: session, isPending } = useSession();
  useAuthRedirect(session, isPending);
  const { showModal, startTour, dismissTour } = useProductTour("groups");

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Group creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createError, setCreateError] = useState("");

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

  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    startTransition(() => fetchGroups());
  }, [userId, fetchGroups]);

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

  if (isPending) return <LoadingScreen message="Verifying session..." />;
  if (!session?.user) return <LoadingScreen message="Redirecting..." />;

  const { user } = session;

  return (
    <>
      <AppShell
        userName={user.name || undefined}
        isAdmin={user.role === "admin"}
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
          <div className="space-y-6">
            <PageHeader
              title="My Groups"
              subtitle={
                loading
                  ? "Loading your groups..."
                  : `${groups.length} group${groups.length !== 1 ? "s" : ""}`
              }
              dataTour="groups-title"
              actions={
                <button
                  onClick={() => setShowCreateModal(true)}
                  data-tour="create-group-btn"
                  className="self-start bg-[#002FA7] hover:bg-[#002482] text-white font-semibold py-2 px-4 rounded-xl text-sm transition-all shadow-sm shadow-[#002FA7]/20 cursor-pointer flex items-center gap-1.5 sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  Create Group
                </button>
              }
            />

            {loading ? (
              <LoadingState label="Loading groups..." />
            ) : groups.length === 0 ? (
              <EmptyState
                className="bg-white border border-[#E5E7EB] rounded-2xl py-24"
                icon={<Users className="w-7 h-7 text-[#A3A3A3]" />}
                title="No groups found"
                description="Create a group to start sharing folders and files securely with team members."
                action={
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-[#002FA7] hover:bg-[#002482] text-white font-semibold py-1.5 px-4 rounded-lg text-xs transition-all cursor-pointer"
                  >
                    Create Group
                  </button>
                }
              />
            ) : (
              <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                data-tour="groups-list"
              >
                {groups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    href={`/group/${group.id}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {showCreateModal && (
        <CreateGroupModal
          name={createName}
          description={createDesc}
          error={createError}
          onNameChange={setCreateName}
          onDescriptionChange={setCreateDesc}
          onSubmit={handleCreateGroup}
          onClose={() => {
            setShowCreateModal(false);
            setCreateError("");
          }}
        />
      )}
    </>
  );
}
