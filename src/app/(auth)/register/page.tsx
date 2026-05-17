"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RegisterMode = "register" | "request";

interface RegisterForm {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface AccessRequestForm {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
}

const initialRegisterForm: RegisterForm = {
  email: "",
  username: "",
  password: "",
  firstName: "",
  lastName: "",
};

const initialAccessRequestForm: AccessRequestForm = {
  email: "",
  username: "",
  firstName: "",
  lastName: "",
};

export default function RegisterPage() {
  const [mode, setMode] = useState<RegisterMode>("request");
  const [loadingMode, setLoadingMode] = useState(true);

  const [registerForm, setRegisterForm] = useState<RegisterForm>(initialRegisterForm);
  const [accessRequestForm, setAccessRequestForm] = useState<AccessRequestForm>(initialAccessRequestForm);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadAvailability = async () => {
      setLoadingMode(true);
      try {
        const res = await fetch("/api/auth/register/availability", { cache: "no-store" });
        const data = (await res.json()) as { allowRegistration?: boolean };
        setMode(data.allowRegistration ? "register" : "request");
      } catch {
        setMode("request");
      } finally {
        setLoadingMode(false);
      }
    };

    void loadAvailability();
  }, []);

  const submitRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        ...registerForm,
        email: registerForm.email.trim().toLowerCase(),
        username: registerForm.username.trim().toLowerCase(),
      };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo completar el registro");
        return;
      }

      setRegisterForm(initialRegisterForm);
      setMessage("Registro completado. Ya puedes iniciar sesión.");
    } catch {
      setError("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const submitAccessRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        ...accessRequestForm,
        email: accessRequestForm.email.trim().toLowerCase(),
        username: accessRequestForm.username.trim().toLowerCase(),
      };

      const res = await fetch("/api/auth/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo enviar la solicitud");
        return;
      }

      setAccessRequestForm(initialAccessRequestForm);
      setMessage("Solicitud enviada. Un administrador la revisará desde el panel.");
    } catch {
      setError("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  if (loadingMode) {
    return <p className="text-center text-sm text-slate-500">Cargando formulario...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          {mode === "register" ? "Crear cuenta" : "Solicitar acceso"}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          {mode === "register"
            ? "Completa el formulario para acceder a Orion."
            : "El registro público está cerrado. Envía tu solicitud para revisión administrativa."}
        </p>
      </div>

      {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {mode === "register" ? (
        <form onSubmit={submitRegister} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="input-orion"
              placeholder="Nombre"
              value={registerForm.firstName}
              onChange={(event) => setRegisterForm((prev) => ({ ...prev, firstName: event.target.value }))}
            />
            <input
              className="input-orion"
              placeholder="Apellido"
              value={registerForm.lastName}
              onChange={(event) => setRegisterForm((prev) => ({ ...prev, lastName: event.target.value }))}
            />
          </div>

          <input
            className="input-orion"
            type="text"
            placeholder="Username"
            value={registerForm.username}
            onChange={(event) => setRegisterForm((prev) => ({ ...prev, username: event.target.value }))}
            required
          />

          <input
            className="input-orion"
            type="email"
            placeholder="Email"
            value={registerForm.email}
            onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))}
            required
          />

          <input
            className="input-orion"
            type="password"
            placeholder="Contraseña"
            value={registerForm.password}
            onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
            minLength={8}
            required
          />

          <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
            {loading ? "Procesando..." : "Crear cuenta"}
          </button>
        </form>
      ) : (
        <form onSubmit={submitAccessRequest} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="input-orion"
              placeholder="Nombre"
              value={accessRequestForm.firstName}
              onChange={(event) => setAccessRequestForm((prev) => ({ ...prev, firstName: event.target.value }))}
              required
            />
            <input
              className="input-orion"
              placeholder="Apellido"
              value={accessRequestForm.lastName}
              onChange={(event) => setAccessRequestForm((prev) => ({ ...prev, lastName: event.target.value }))}
              required
            />
          </div>

          <input
            className="input-orion"
            type="text"
            placeholder="Username"
            value={accessRequestForm.username}
            onChange={(event) => setAccessRequestForm((prev) => ({ ...prev, username: event.target.value }))}
            required
          />

          <input
            className="input-orion"
            type="email"
            placeholder="Email"
            value={accessRequestForm.email}
            onChange={(event) => setAccessRequestForm((prev) => ({ ...prev, email: event.target.value }))}
            required
          />

          <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
            {loading ? "Enviando..." : "Enviar solicitud"}
          </button>
        </form>
      )}

      <div className="text-center text-sm text-slate-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Iniciar sesión
        </Link>
      </div>
    </div>
  );
}
