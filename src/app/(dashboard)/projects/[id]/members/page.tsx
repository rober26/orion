"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import ProjectSidebar from "@/src/components/projects/ProjectSidebar";
import { Loader2, UserPlus, UserMinus } from "lucide-react";

type MemberRole = "OWNER" | "MEMBER" | "VIEWER";

interface UserSummary {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

interface ProjectMember {
  user: UserSummary;
  role: MemberRole;
  joinedAt: string | null;
  inherited: boolean;
}

interface SearchUserResult extends UserSummary {
  connectionStatus: "PENDING" | "ACCEPTED" | "REJECTED" | null;
}

interface ApiError {
  error?: string;
}

interface ProjectPermissions {
  permissions?: {
    canManage?: boolean;
  };
}

function fullName(user: UserSummary): string {
  const value = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return value || user.username;
}

export default function ProjectMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [inviteRole, setInviteRole] = useState<"MEMBER" | "VIEWER">("MEMBER");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);

  const ownerIds = useMemo(
    () => new Set(members.filter((member) => member.role === "OWNER").map((member) => member.user.id)),
    [members],
  );

  const memberIds = useMemo(() => new Set(members.map((member) => member.user.id)), [members]);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [res, projectRes] = await Promise.all([
        fetch(`/api/projects/${id}/members`, { cache: "no-store" }),
        fetch(`/api/projects/${id}`, { cache: "no-store" }),
      ]);
      const payload = (await res.json()) as { members?: ProjectMember[] } & ApiError;
      const projectPayload = (await projectRes.json()) as ProjectPermissions & ApiError;
      if (!res.ok) {
        throw new Error(payload.error || "No se pudieron cargar los miembros");
      }

      if (!projectRes.ok) {
        throw new Error(projectPayload.error || "No se pudieron cargar permisos del proyecto");
      }

      setMembers(Array.isArray(payload.members) ? payload.members : []);
      setCanManage(Boolean(projectPayload.permissions?.canManage));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudieron cargar los miembros");
      setMembers([]);
      setCanManage(false);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      if (!canManage) {
        setSearching(false);
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const res = await fetch(`/api/social/users/search?q=${encodeURIComponent(query.trim())}&acceptedOnly=true`);
        const payload = (await res.json()) as SearchUserResult[] | ApiError;
        if (!res.ok) {
          throw new Error((payload as ApiError).error || "No se pudo buscar usuarios");
        }

        setSearchResults(
          (Array.isArray(payload) ? payload : []).filter((item) => !memberIds.has(item.id)),
        );
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo buscar usuarios");
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, memberIds, canManage]);

  const invite = async (userId: string) => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/projects/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: inviteRole }),
      });

      const payload = (await res.json()) as ApiError;
      if (!res.ok) {
        throw new Error(payload.error || "No se pudo invitar al usuario");
      }

      setQuery("");
      setSearchResults([]);
      await loadMembers();
      setFeedback("Miembro agregado correctamente");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo invitar al usuario");
    } finally {
      setSaving(false);
    }
  };

  const updateRole = async (userId: string, role: "MEMBER" | "VIEWER") => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/projects/${id}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      const payload = (await res.json()) as ApiError;
      if (!res.ok) {
        throw new Error(payload.error || "No se pudo actualizar el rol");
      }

      await loadMembers();
      setFeedback("Rol actualizado");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo actualizar el rol");
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (userId: string) => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/projects/${id}/members/${userId}`, { method: "DELETE" });
      const payload = (await res.json()) as ApiError;
      if (!res.ok) {
        throw new Error(payload.error || "No se pudo quitar el miembro");
      }

      await loadMembers();
      setFeedback("Miembro removido");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo quitar el miembro");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full rounded-[1rem] bg-orion-surface dark:bg-slate-950 overflow-hidden">
      <ProjectSidebar />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <section className="mx-auto w-full max-w-4xl space-y-6">
          <header className="page-head">
            <h1 className="page-title">Miembros del proyecto</h1>
            <p className="page-subtitle">Invita usuarios y define permisos de colaboración.</p>
            {!canManage && (
              <p className="mt-2 inline-flex items-center rounded-full bg-slate-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Solo lectura
              </p>
            )}
          </header>

          {feedback && (
            <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {feedback}
            </div>
          )}

          {canManage && (
            <div className="section-panel space-y-3">
              <div className="flex flex-wrap gap-3">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar conexiones aceptadas"
                  className="input-orion flex-1 min-w-56"
                />
                <select
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as "MEMBER" | "VIEWER")}
                  className="select-orion"
                >
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>

              {query.trim().length >= 2 && (
                <div className="rounded-xl border border-orion-border dark:border-orion-dark-border divide-y divide-orion-border dark:divide-orion-dark-border">
                  {searching ? (
                    <div className="p-3 text-sm text-slate-500 inline-flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Buscando...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500">No hay usuarios disponibles para invitar.</div>
                  ) : (
                    searchResults.map((user) => (
                      <div key={user.id} className="p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{fullName(user)}</p>
                          <p className="text-xs text-slate-500">@{user.username}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void invite(user.id)}
                          disabled={saving}
                          className="btn-primary rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-60"
                        >
                          <UserPlus size={12} /> Invitar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <div className="section-panel">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Lista de miembros</h2>

            {loading ? (
              <div className="text-sm text-slate-500 inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Cargando miembros...
              </div>
            ) : members.length === 0 ? (
              <div className="rounded-xl border border-dashed border-orion-border px-4 py-8 text-center text-sm text-slate-500 dark:border-orion-dark-border">
                No hay miembros en el proyecto.
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.user.id}
                    className="rounded-xl border border-orion-border dark:border-orion-dark-border px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{fullName(member.user)}</p>
                      <p className="text-xs text-slate-500">@{member.user.username}</p>
                    </div>

                    {ownerIds.has(member.user.id) || !canManage ? (
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
                        {ownerIds.has(member.user.id) ? "Owner" : member.role}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <select
                          value={member.role}
                          onChange={(event) => void updateRole(member.user.id, event.target.value as "MEMBER" | "VIEWER")}
                          disabled={saving}
                          className="rounded-lg border border-orion-border bg-white px-2 py-1.5 text-xs dark:bg-slate-900 dark:border-orion-dark-border"
                        >
                          <option value="MEMBER">Member</option>
                          <option value="VIEWER">Viewer</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => void removeMember(member.user.id)}
                          disabled={saving}
                          className="rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
                        >
                          <UserMinus size={12} /> Quitar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
