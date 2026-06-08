"use client";

import { LoaderCircle, Plus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createAdminUser,
  getAdminUsers,
  updateAdminUser,
} from "@/src/app/(dashboard)/social/perfil/services/profileService";
import AdminPanelNav from "@/src/components/admin/AdminPanelNav";
import type {
  AdminUser,
  CreateAdminUserPayload,
  UserRole,
} from "@/src/app/(dashboard)/social/perfil/types";

const initialForm: CreateAdminUserPayload = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  password: "",
  role: "USER",
  isActive: true,
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateAdminUserPayload>(initialForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getAdminUsers();
      setUsers(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la lista de usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const onChangeField = <K extends keyof CreateAdminUserPayload>(field: K, value: CreateAdminUserPayload[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);
    setCreating(true);

    try {
      const created = await createAdminUser({
        ...form,
        email: form.email.trim().toLowerCase(),
        username: form.username.trim().toLowerCase(),
      });

      setUsers((prev) => [created, ...prev]);
      setForm(initialForm);
      setIsCreateOpen(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "No se pudo crear el usuario");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (target: AdminUser) => {
    try {
      const updated = await updateAdminUser(target.id, { isActive: !target.isActive });
      setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado");
    }
  };

  const handleToggleRole = async (target: AdminUser) => {
    const nextRole: UserRole = target.role === "ADMIN" ? "USER" : "ADMIN";

    try {
      const updated = await updateAdminUser(target.id, { role: nextRole });
      setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el rol");
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="surface-panel p-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              <Users size={20} />
              Gestión de usuarios
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              Crea usuarios, bloquea/activa cuentas y administra roles.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AdminPanelNav />
            <button className="btn-primary" onClick={() => setIsCreateOpen(true)}>
              <Plus size={16} />
              Crear usuario
            </button>
          </div>
        </div>

        {loading && (
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-500">
            <LoaderCircle size={14} className="animate-spin" />
            Cargando usuarios...
          </p>
        )}

        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {!loading && !error && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">Usuario</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Rol</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="rounded-xl bg-slate-50 text-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                    <td className="px-3 py-3 font-semibold">{user.username}</td>
                    <td className="px-3 py-3">{user.email}</td>
                    <td className="px-3 py-3">{user.role}</td>
                    <td className="px-3 py-3">{user.isActive ? "Activo" : "Bloqueado"}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button className="btn-secondary text-xs" onClick={() => handleToggleActive(user)}>
                          {user.isActive ? "Bloquear" : "Activar"}
                        </button>
                        <button className="btn-secondary text-xs" onClick={() => handleToggleRole(user)}>
                          Cambiar rol
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {isCreateOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="surface-panel w-full max-w-xl p-5 sm:p-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Crear usuario</h3>
            <p className="mt-1 text-sm text-slate-500">Ingresa los datos iniciales de la cuenta.</p>

            <form className="mt-4 space-y-4" onSubmit={handleCreate}>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className="input-orion"
                  placeholder="Nombre"
                  value={form.firstName}
                  onChange={(e) => onChangeField("firstName", e.target.value)}
                />
                <input
                  className="input-orion"
                  placeholder="Apellido"
                  value={form.lastName}
                  onChange={(e) => onChangeField("lastName", e.target.value)}
                />
              </div>

              <input
                className="input-orion"
                placeholder="Username"
                value={form.username}
                onChange={(e) => onChangeField("username", e.target.value)}
                required
              />

              <input
                className="input-orion"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => onChangeField("email", e.target.value)}
                required
              />

              <input
                className="input-orion"
                type="password"
                placeholder="Contraseña inicial"
                value={form.password}
                onChange={(e) => onChangeField("password", e.target.value)}
                minLength={8}
                required
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  <span>Rol</span>
                  <select
                    className="input-orion"
                    value={form.role}
                    onChange={(e) => onChangeField("role", e.target.value as UserRole)}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </label>

                <label className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  <span>Estado inicial</span>
                  <select
                    className="input-orion"
                    value={form.isActive ? "active" : "blocked"}
                    onChange={(e) => onChangeField("isActive", e.target.value === "active")}
                  >
                    <option value="active">Activo</option>
                    <option value="blocked">Bloqueado</option>
                  </select>
                </label>
              </div>

              {createError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{createError}</p>}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setCreateError(null);
                    setForm(initialForm);
                  }}
                  disabled={creating}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}
                  {creating ? "Creando..." : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
