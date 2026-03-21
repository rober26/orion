"use client";
import { useState, useEffect } from "react";
import { User, Mail, Shield, Calendar, BookOpen, Share2, Save } from "lucide-react";

export default function ProfileContent() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users/me").then(res => res.json()).then(data => {
      setUser(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-slate-500 font-medium">Cargando perfil...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-8 pb-10 border-b border-orion-border dark:border-orion-dark-border">
          <div className="w-32 h-32 bg-blue-100 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center text-orion-primary shadow-sm border border-blue-200 dark:border-blue-800">
            <User size={64} />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {user?.name || user?.username}
            </h1>
            <p className="text-lg text-slate-500 flex items-center justify-center sm:justify-start gap-2 mt-2">
              <Shield size={20} className="text-orion-primary" />
              {user?.role === 'ADMIN' ? 'Administrador del Sistema' : 'Usuario Orion'}
            </p>
          </div>
          <button className="btn-primary py-3 px-8 shadow-md">
            <Save size={20} />
            Guardar cambios
          </button>
      </div>
    </div>
  );
}

function StatItem({ icon, label, value, color }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">{icon}</div>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <span className={`font-mono text-2xl font-black ${color}`}>{value}</span>
    </div>
  );
}
