"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicDocument, PublicFolder, PublicNotebook, PublicProject, UserProfile } from "../types";

interface UseProfileDataResult {
  profile: UserProfile | null;
  publicProjects: PublicProject[];
  publicFolders: PublicFolder[];
  publicNotebooks: PublicNotebook[];
  publicDocuments: PublicDocument[];
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
}

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function useProfileData(): UseProfileDataResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [publicProjects, setPublicProjects] = useState<PublicProject[]>([]);
  const [publicFolders, setPublicFolders] = useState<PublicFolder[]>([]);
  const [publicNotebooks, setPublicNotebooks] = useState<PublicNotebook[]>([]);
  const [publicDocuments, setPublicDocuments] = useState<PublicDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    const profileRes = await fetch("/api/users/me", { cache: "no-store" });
    const profileData = await safeJson<UserProfile | { error: string }>(profileRes);

    if (!profileRes.ok || !profileData || "error" in profileData) {
      throw new Error("No se pudo cargar el perfil");
    }

    setProfile(profileData);

    const publicContentRes = await fetch("/api/users/me/public-content", { cache: "no-store" });
    const publicContent = await safeJson<{
      projects: PublicProject[];
      folders: PublicFolder[];
      notebooks: PublicNotebook[];
      documents: PublicDocument[];
    }>(
      publicContentRes,
    );

    if (publicContentRes.ok && publicContent) {
      setPublicProjects(publicContent.projects);
      setPublicFolders(publicContent.folders ?? []);
      setPublicNotebooks(publicContent.notebooks);
      setPublicDocuments(publicContent.documents ?? []);
    } else {
      setPublicProjects([]);
      setPublicFolders([]);
      setPublicNotebooks([]);
      setPublicDocuments([]);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        await refreshProfile();
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Error al cargar el perfil");
          setProfile(null);
          setPublicProjects([]);
          setPublicFolders([]);
          setPublicNotebooks([]);
          setPublicDocuments([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [refreshProfile]);

  return {
    profile,
    publicProjects,
    publicFolders,
    publicNotebooks,
    publicDocuments,
    loading,
    error,
    refreshProfile,
  };
}
