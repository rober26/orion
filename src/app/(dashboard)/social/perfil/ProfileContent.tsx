"use client";

import { Bell, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import AdminPanel from "./components/AdminPanel";
import ProfileEdit from "./components/ProfileEdit";
import ProfileSecurity from "./components/ProfileSecurity";
import ProfileView from "./components/ProfileView";
import SystemSettings from "./components/SystemSettings";
import { useProfileData } from "./hooks/useProfileData";
import type { UserProfile } from "./types";

type ProfileTab = "profile" | "security" | "admin" | "system";

export default function ProfileContent() {
  const { profile, publicProjects, publicFolders, publicNotebooks, publicDocuments, loading, error, refreshProfile } =
    useProfileData();
  const [tab, setTab] = useState<ProfileTab>("profile");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);

  const activeProfile = localProfile || profile;
  const isAdmin = activeProfile?.role === "ADMIN";
  const activeTab: ProfileTab = (tab === "admin" || tab === "system") && !isAdmin ? "profile" : tab;

  const tabs = useMemo(
    () => [
      { id: "profile" as const, label: "Perfil" },
      { id: "security" as const, label: "Seguridad" },
      ...(isAdmin ? [{ id: "admin" as const, label: "Administración" }] : []),
      ...(isAdmin ? [{ id: "system" as const, label: "Config. sistema" }] : []),
    ],
    [isAdmin],
  );

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
      <div className="flex flex-wrap gap-2 rounded-2xl border border-orion-border bg-white p-2 dark:border-orion-dark-border dark:bg-slate-950">
        {tabs.map((item) => (
          <button
            key={item.id}
              onClick={() => setTab(item.id)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === item.id
                ? "bg-orion-primary text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <div className="space-y-6">
          <ProfileView
            profile={activeProfile}
            publicProjects={publicProjects}
            publicFolders={publicFolders}
            publicNotebooks={publicNotebooks}
            publicDocuments={publicDocuments}
            onEditClick={() => setIsEditModalOpen(true)}
          />
          <ProfileEdit
            profile={activeProfile}
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onProfileUpdated={handleProfileUpdated}
          />
          <section className="surface-soft p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Preparado para más funcionalidades</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-orion-border bg-white p-4 dark:border-orion-dark-border dark:bg-slate-900">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <Bell size={16} /> Notificaciones
                </p>
                <p className="mt-1 text-xs text-slate-500">Estructura lista para ajustes de alertas personales y del sistema.</p>
              </div>
              <div className="rounded-xl border border-orion-border bg-white p-4 dark:border-orion-dark-border dark:bg-slate-900">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <UserPlus size={16} /> Conexiones entre usuarios
                </p>
                <p className="mt-1 text-xs text-slate-500">Diseño preparado para mostrar solicitudes y red de conexiones.</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === "security" && <ProfileSecurity />}
      {activeTab === "admin" && isAdmin && <AdminPanel />}
      {activeTab === "system" && isAdmin && <SystemSettings />}
    </div>
  );
}
