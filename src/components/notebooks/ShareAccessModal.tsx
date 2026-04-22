"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Globe, Loader2, Lock as LockIcon, Search, Shield, UserMinus, UserPlus, X } from "lucide-react";

type ShareTargetType = "folder" | "notebook" | "document";
type AccessRole = "READER" | "EDITOR" | "OWNER";

interface ShareAccessModalProps {
  open: boolean;
  targetId: string;
  targetType: ShareTargetType;
  isPublic: boolean;
  onTogglePublic: (nextValue: boolean) => Promise<void> | void;
  onChanged?: () => void;
  onClose: () => void;
}

interface MemberItem {
  user: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  role: AccessRole;
  inherited: boolean;
  sourceResource?: {
    type: "folder" | "project" | "notebook" | "document";
    id: string;
    name: string;
  } | null;
}

interface SearchUserItem {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  connectionStatus: "PENDING" | "ACCEPTED" | "REJECTED" | null;
}

function getBasePath(type: ShareTargetType, id: string): string {
  if (type === "folder") {
    return `/api/shares/folders/${id}/members`;
  }
  if (type === "document") {
    return `/api/shares/documents/${id}/members`;
  }
  return `/api/shares/notebooks/${id}/members`;
}

function fullName(user: SearchUserItem | MemberItem["user"]): string {
  const value = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return value || user.username;
}

export default function ShareAccessModal({
  open,
  targetId,
  targetType,
  isPublic,
  onTogglePublic,
  onChanged,
  onClose,
}: ShareAccessModalProps) {
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchUserItem[]>([]);
  const [inviteRole, setInviteRole] = useState<"READER" | "EDITOR">("READER");
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [togglingPublic, setTogglingPublic] = useState(false);

  const basePath = useMemo(() => getBasePath(targetType, targetId), [targetType, targetId]);
  const memberIds = useMemo(() => new Set(members.map((member) => member.user.id)), [members]);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(basePath, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo cargar los miembros");
      }
      setMembers((data.members || []) as MemberItem[]);
    } catch (error) {
      console.error("LOAD_MEMBERS_ERROR", error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    if (!open) {
      return;
    }
    void loadMembers();
  }, [open, loadMembers]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/social/users/search?q=${encodeURIComponent(query.trim())}&acceptedOnly=true`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "No se pudo buscar usuarios");
        }
        setResults((data as SearchUserItem[]).filter((item) => !memberIds.has(item.id)));
      } catch (error) {
        console.error("SEARCH_USERS_ERROR", error);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [open, query, memberIds]);

  const inviteUser = async (userId: string) => {
    try {
      const response = await fetch(basePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: inviteRole }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo compartir");
      }
      setFeedback({ type: "success", text: "Acceso actualizado correctamente." });
      setQuery("");
      setResults([]);
      await loadMembers();
      await onChanged?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo compartir";
      setFeedback({ type: "error", text: message });
    }
  };

  const updateRole = async (userId: string, role: "READER" | "EDITOR") => {
    try {
      const response = await fetch(`${basePath}/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo actualizar el rol");
      }
      setFeedback({ type: "success", text: "Rol actualizado." });
      await loadMembers();
      await onChanged?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar";
      setFeedback({ type: "error", text: message });
    }
  };

  const removeMember = async (userId: string) => {
    try {
      const response = await fetch(`${basePath}/${userId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo revocar el acceso");
      }
      setFeedback({ type: "success", text: "Acceso revocado." });
      await loadMembers();
      await onChanged?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo revocar";
      setFeedback({ type: "error", text: message });
    }
  };

  const togglePublic = async () => {
    if (togglingPublic) {
      return;
    }

    setTogglingPublic(true);
    try {
      await onTogglePublic(!isPublic);
      setFeedback({ type: "success", text: isPublic ? "Ahora es privado." : "Ahora es publico." });
      await onChanged?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar visibilidad";
      setFeedback({ type: "error", text: message });
    } finally {
      setTogglingPublic(false);
    }
  };

  const directMembers = members.filter((member) => !member.inherited);
  const inheritedMembers = members.filter((member) => member.inherited);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-orion-border dark:border-orion-dark-border bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-orion-border dark:border-orion-dark-border">
          <h3 className="text-lg font-bold text-white">Compartir {targetType}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md hover:bg-slate-800 text-slate-300"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {feedback ? (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                feedback.type === "error"
                  ? "border-red-400/40 text-red-200 bg-red-500/10"
                  : "border-emerald-400/40 text-emerald-200 bg-emerald-500/10"
              }`}
            >
              {feedback.text}
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="rounded-xl border border-orion-border dark:border-orion-dark-border bg-slate-800/70 px-3 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Visibilidad del recurso</p>
                <p className="text-xs text-slate-400">
                  {isPublic ? "Publico en tu perfil. Incluye herencia a hijos." : "Privado. No aparece en tu perfil."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void togglePublic()}
                disabled={togglingPublic}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider disabled:opacity-60 ${
                  isPublic
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-slate-700 text-slate-200"
                }`}
              >
                {togglingPublic ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : isPublic ? (
                  <Globe size={12} />
                ) : (
                  <LockIcon size={12} />
                )}
                {isPublic ? "Publico" : "Privado"}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar conexiones aceptadas"
                  className="w-full input-orion pl-9"
                />
              </div>
              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as "READER" | "EDITOR")}
                className="h-11 rounded-xl border border-orion-border dark:border-orion-dark-border bg-slate-800 px-3 text-sm text-white"
              >
                <option value="READER">Lector</option>
                <option value="EDITOR">Editor</option>
              </select>
            </div>

            {query.trim().length >= 2 && (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-orion-border dark:border-orion-dark-border divide-y divide-orion-border dark:divide-orion-dark-border">
                {searching ? (
                  <div className="p-3 text-sm text-slate-300 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Buscando...</div>
                ) : results.length === 0 ? (
                  <div className="p-3 text-sm text-slate-400">Sin conexiones aceptadas disponibles para compartir.</div>
                ) : (
                  results.map((user) => (
                    <div key={user.id} className="p-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{fullName(user)}</p>
                        <p className="text-xs text-slate-400">@{user.username}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void inviteUser(user.id)}
                        className="btn-primary px-3 py-1.5 rounded-lg text-xs"
                      >
                        <UserPlus size={12} />
                        Invitar
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider font-bold text-slate-400">Acceso directo</p>

            <div className="rounded-xl border border-orion-border dark:border-orion-dark-border divide-y divide-orion-border dark:divide-orion-dark-border max-h-72 overflow-y-auto">
              {loading ? (
                <div className="p-3 text-sm text-slate-300 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Cargando...</div>
              ) : directMembers.length === 0 ? (
                <div className="p-3 text-sm text-slate-400">No hay miembros directos.</div>
              ) : (
                directMembers.map((member) => (
                  <div key={member.user.id} className="p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{fullName(member.user)}</p>
                      <p className="text-xs text-slate-400">@{member.user.username}</p>
                    </div>

                    {member.role === "OWNER" ? (
                      <span className="text-xs px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300">Owner</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <select
                          value={member.role}
                          onChange={(event) => void updateRole(member.user.id, event.target.value as "READER" | "EDITOR")}
                          className="h-9 rounded-lg border border-orion-border dark:border-orion-dark-border bg-slate-800 px-2 text-xs text-white"
                        >
                          <option value="READER">Lector</option>
                          <option value="EDITOR">Editor</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => void removeMember(member.user.id)}
                          className="h-9 px-2 rounded-lg border border-red-400/40 text-red-300 text-xs hover:bg-red-500/10 inline-flex items-center gap-1"
                        >
                          <UserMinus size={12} /> Quitar
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider font-bold text-slate-400">Acceso heredado</p>
            <div className="rounded-xl border border-orion-border dark:border-orion-dark-border divide-y divide-orion-border dark:divide-orion-dark-border max-h-56 overflow-y-auto">
              {loading ? (
                <div className="p-3 text-sm text-slate-300 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Cargando...</div>
              ) : inheritedMembers.length === 0 ? (
                <div className="p-3 text-sm text-slate-400">No hay accesos heredados.</div>
              ) : (
                inheritedMembers.map((member) => (
                  <div key={`inherited:${member.user.id}`} className="p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{fullName(member.user)}</p>
                      <p className="text-xs text-slate-400">
                        @{member.user.username}
                        {member.sourceResource ? ` • heredado desde ${member.sourceResource.name}` : " • heredado"}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-md bg-blue-500/20 text-blue-300 inline-flex items-center gap-1">
                      <Shield size={12} /> {member.role === "EDITOR" ? "Editor" : member.role === "OWNER" ? "Owner" : "Lector"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
