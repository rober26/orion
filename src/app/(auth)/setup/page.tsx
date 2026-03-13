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
            className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input 
            type="email" name="email" required
            onChange={handleChange}
            className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input 
            type="password" name="password" required
            onChange={handleChange}
            className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700" 
          />
        </div>
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors">
          Crear administrador
        </button>
      </form>
    </div>
  );
}