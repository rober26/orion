"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import ProfileEdit from "./components/ProfileEdit";
import ProfileSecurity from "./components/ProfileSecurity";
import ProfileView from "./components/ProfileView";
import { useProfileData } from "./hooks/useProfileData";
import type { UserProfile } from "./types";

type ProfileTab = "profile" | "security";

export default function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, publicProjects, publicFolders, publicNotebooks, publicDocuments, publicCalendars, loading, error, refreshProfile } =
    useProfileData();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);

  const activeProfile = localProfile || profile;
  const requestedTab = searchParams.get("tab");

  useEffect(() => {
    if (requestedTab === "admin" || requestedTab === "system") {
      router.replace("/admin-panel");
    }
  }, [requestedTab, router]);

  const activeTab: ProfileTab =
    requestedTab === "security"
      ? "security"
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

      {activeTab === "security" && <ProfileSecurity />}
    </div>
  );
}
