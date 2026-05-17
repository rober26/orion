"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      router.push("/login?message=System configured successfully");
    } else {
      alert("Error: Ya existe un administrador o hubo un problema en la configuracion.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div>
        <h2 className="mb-2 text-center text-2xl font-bold dark:text-white">Configuracion Inicial</h2>
        <p className="mb-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Crea la cuenta del administrador para empezar.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input type="email" name="email" required onChange={handleChange} className="input-orion" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Username</label>
            <input type="text" name="username" required onChange={handleChange} className="input-orion" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <input type="password" name="password" required onChange={handleChange} className="input-orion" />
          </div>
          <button className="btn-primary w-full py-2">Crear administrador</button>
        </form>
      </div>
    </div>
  );
}
