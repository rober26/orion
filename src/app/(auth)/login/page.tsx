"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginContent() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get("message");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error || "Credenciales incorrectas");
      }
    } catch {
      setError("Error de conexion con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Iniciar Sesión</h2>
        {message && (
          <p className="mt-2 rounded bg-green-50 p-2 text-sm text-green-600 dark:bg-green-900/30">{message}</p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-500 dark:border-red-800 dark:bg-red-900/30">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Correo Electrónico</label>
          <input
            type="email"
            name="email"
            required
            onChange={handleChange}
            className="input-orion"
            placeholder="nombre@correo.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Contraseña</label>
          <input
            type="password"
            name="password"
            required
            onChange={handleChange}
            className="input-orion"
            placeholder="••••••••"
          />
        </div>

        <button disabled={loading} type="submit" className="btn-primary w-full py-2.5 shadow-lg shadow-blue-500/20">
          {loading ? "Verificando..." : "Entrar a Orion"}
        </button>
      </form>

      <div className="text-center text-sm text-slate-500">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="font-medium text-blue-600 hover:underline">
          Solicitar acceso
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-slate-500">Cargando...</div>}>
      <LoginContent />
    </Suspense>
  );
}
