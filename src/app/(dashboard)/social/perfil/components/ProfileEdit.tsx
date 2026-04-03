"use client";

import { LoaderCircle, Save, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { updateMyProfile, uploadMyAvatar } from "../services/profileService";
import type { ProfileVisibility, UserProfile } from "../types";

interface ProfileEditProps {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: (profile: UserProfile) => void;
}

export default function ProfileEdit({ profile, isOpen, onClose, onProfileUpdated }: ProfileEditProps) {
  const [firstName, setFirstName] = useState(profile.firstName || "");
  const [lastName, setLastName] = useState(profile.lastName || "");
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || "");
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>(profile.profileVisibility);

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(profile.firstName || "");
    setLastName(profile.lastName || "");
    setUsername(profile.username);
    setBio(profile.bio || "");
    setAvatarUrl(profile.avatarUrl || "");
    setProfileVisibility(profile.profileVisibility);
    setMessage(null);
    setError(null);
  }, [profile, isOpen]);

  const avatarPreview = useMemo(() => avatarUrl || null, [avatarUrl]);

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadingAvatar(true);
    setError(null);
    setMessage(null);

    try {
      const result = await uploadMyAvatar(file);
      setAvatarUrl(result.avatarUrl);
      setMessage("Avatar subido correctamente");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el avatar");
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const updated = await updateMyProfile({
        firstName,
        lastName,
        username,
        bio,
        avatarUrl,
        profileVisibility,
      });

      onProfileUpdated(updated);
      setMessage("Perfil actualizado con exito");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el perfil");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="surface-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <div className="flex items-center justify-between border-b border-orion-border px-5 py-4 dark:border-orion-dark-border">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Editar perfil</h2>
          <button type="button" onClick={onClose} className="icon-btn text-slate-500 hover:text-slate-700 dark:text-slate-300">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border border-orion-border bg-slate-100 dark:border-orion-dark-border dark:bg-slate-800">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="Preview avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-500">Sin avatar</div>
              )}
            </div>

            <label className="btn-secondary inline-flex cursor-pointer items-center gap-2">
              {uploadingAvatar ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploadingAvatar ? "Subiendo..." : "Subir avatar"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarFileChange}
                disabled={uploadingAvatar || saving}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Nombre</span>
              <input className="input-orion" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Apellido</span>
              <input className="input-orion" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Username</span>
            <input
              className="input-orion"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              required
            />
          </label>

          <label className="space-y-2 block">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Bio</span>
            <textarea
              className="input-orion min-h-24 resize-y"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={300}
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-slate-600 dark:text-slate-300">Visibilidad del perfil</legend>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="radio"
                  name="profileVisibility"
                  checked={profileVisibility === "PUBLIC"}
                  onChange={() => setProfileVisibility("PUBLIC")}
                />
                Publico
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="radio"
                  name="profileVisibility"
                  checked={profileVisibility === "PRIVATE"}
                  onChange={() => setProfileVisibility("PRIVATE")}
                />
                Privado
              </label>
            </div>
          </fieldset>

          {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving || uploadingAvatar}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving || uploadingAvatar}>
              {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
