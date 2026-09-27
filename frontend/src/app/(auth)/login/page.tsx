"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-xl border p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-foreground">Lead Intelligence</h1>
        <p className="text-muted-foreground mt-2">Inicia sesion en tu cuenta</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="admin@demo.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Contrasena
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Ingresando..." : "Iniciar Sesion"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        No tienes cuenta?{" "}
        <Link href="/register" className="text-primary hover:underline font-medium">
          Registrate
        </Link>
      </div>
    </div>
  );
}
