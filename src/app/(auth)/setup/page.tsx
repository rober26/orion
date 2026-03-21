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
    <div>
      <h2 className="text-2xl font-bold mb-2 dark:text-white">Configuración Inicial</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
        Crea la cuenta del Super Administrador para empezar.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Username</label>
          <input 
            type="text" name="username" required
            onChange={handleChange}
            className="input-orion" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input 
            type="email" name="email" required
            onChange={handleChange}
            className="input-orion" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input 
            type="password" name="password" required
            onChange={handleChange}
            className="input-orion" 
          />
        </div>
        <button className="btn-primary w-full py-2">
          Crear administrador
        </button>
      </form>
    </div>
  );
}
