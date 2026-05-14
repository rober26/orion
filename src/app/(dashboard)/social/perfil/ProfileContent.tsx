"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import AdminPanel from "./components/AdminPanel";
import ProfileEdit from "./components/ProfileEdit";
import ProfileView from "./components/ProfileView";
import SystemSettings from "./components/SystemSettings";
import { useProfileData } from "./hooks/useProfileData";
import type { UserProfile } from "./types";

type ProfileTab = "profile" | "admin" | "system";

export default function ProfileContent() {
  const searchParams = useSearchParams();
  const { profile, publicProjects, publicFolders, publicNotebooks, publicDocuments, publicCalendars, loading, error, refreshProfile } =
    useProfileData();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);

  const activeProfile = localProfile || profile;
  const isAdmin = activeProfile?.role === "ADMIN";
  const requestedTab = searchParams.get("tab");
  const activeTab: ProfileTab =
    requestedTab === "admin" && isAdmin
      ? "admin"
      : requestedTab === "system" && isAdmin
        ? "system"
        : "profile";

  const handleProfileUpdated = (updatedProfile: UserProfile) => {
    setLocalProfile(updatedProfile);
  };

  if (loading) {
    return <div className="p-8 text-sm font-medium text-slate-500">Cargando perfil...</div>;
  }

  if (error || !activeProfile) {
    return (
      <div className="surface-panel space-y-4 p-6">
        <p className="text-sm text-red-600">{error || "No se pudo cargar el perfil"}</p>
        <button className="btn-secondary" onClick={() => refreshProfile()}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {activeTab === "profile" && (
        <div className="space-y-6">
          <ProfileView
            profile={activeProfile}
            publicProjects={publicProjects}
            publicFolders={publicFolders}
            publicNotebooks={publicNotebooks}
            publicDocuments={publicDocuments}
            publicCalendars={publicCalendars}
            onEditClick={() => setIsEditModalOpen(true)}
          />
          <ProfileEdit
            profile={activeProfile}
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onProfileUpdated={handleProfileUpdated}
          />
        </div>
      )}

      {activeTab === "admin" && isAdmin && <AdminPanel />}
      {activeTab === "system" && isAdmin && <SystemSettings />}
    </div>
  );
}
