"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo procesar la solicitud");
        return;
      }

      setMessage(data.message || "Revisa tu email para continuar");
    } catch {
      setError("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Recuperar contraseña</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          Te enviaremos un enlace para restablecer tu contraseña.
        </p>
      </div>

      {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="input-orion"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
          {loading ? "Enviando..." : "Enviar enlace"}
        </button>
      </form>

      <div className="text-center text-sm text-slate-500">
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Volver al login
        </Link>
      </div>
    </div>
  );
}
