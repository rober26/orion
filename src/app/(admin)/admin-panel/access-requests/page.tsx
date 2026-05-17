"use client";

import { Check, LoaderCircle, Mail, X } from "lucide-react";
import { useEffect, useState } from "react";
import AdminPanelNav from "@/src/components/admin/AdminPanelNav";
import {
  getAdminAccessRequests,
  reviewAdminAccessRequest,
} from "@/src/app/(dashboard)/social/perfil/services/profileService";
import type { AccessRequest } from "@/src/app/(dashboard)/social/perfil/types";

export default function AdminAccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getAdminAccessRequests();
      setRequests(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las solicitudes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  const handleReview = async (requestId: string, action: "approve" | "reject") => {
    setProcessingId(requestId);
    setError(null);
    try {
      const updated = await reviewAdminAccessRequest(requestId, { action });
      setRequests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo procesar la solicitud");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="surface-panel p-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Solicitudes de acceso
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              Revisa, aprueba o rechaza solicitudes pendientes de nuevos usuarios.
            </p>
          </div>
          <AdminPanelNav />
        </div>

        {loading && (
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-500">
            <LoaderCircle size={14} className="animate-spin" />
            Cargando solicitudes...
          </p>
        )}

        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {!loading && !error && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[860px] border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Username</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((item) => {
                  const fullName = [item.firstName, item.lastName].filter(Boolean).join(" ").trim() || "Sin nombre";
                  const isPending = item.status === "PENDING";
                  const isProcessing = processingId === item.id;

                  return (
                    <tr key={item.id} className="rounded-xl bg-slate-50 text-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                      <td className="px-3 py-3 font-semibold">{fullName}</td>
                      <td className="px-3 py-3">{item.username}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <Mail size={14} />
                          {item.email}
                        </span>
                      </td>
                      <td className="px-3 py-3">{item.status}</td>
                      <td className="px-3 py-3">{new Date(item.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-3">
                        {isPending ? (
                          <div className="flex gap-2">
                            <button
                              className="btn-secondary text-xs"
                              onClick={() => void handleReview(item.id, "approve")}
                              disabled={isProcessing}
                            >
                              {isProcessing ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
                              Aprobar
                            </button>
                            <button
                              className="btn-secondary text-xs"
                              onClick={() => void handleReview(item.id, "reject")}
                              disabled={isProcessing}
                            >
                              <X size={14} />
                              Rechazar
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Procesada</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
