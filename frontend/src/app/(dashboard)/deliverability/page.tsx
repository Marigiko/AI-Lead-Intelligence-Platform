"use client";

import { useState, useEffect, useCallback } from "react";
import { Server, Shield, AlertTriangle, CheckCircle, Plus, Trash2, Mail } from "lucide-react";
import { api } from "@/lib/api-client";

interface Inbox {
  id: string;
  username: string;
  daily_limit: number;
  sent_today: number;
  reputation_score: number;
  is_active: boolean;
}

export default function DeliverabilityPage() {
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInbox, setNewInbox] = useState({ host: "", port: 587, username: "", password: "", daily_limit: 30 });
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);

  const fetchInboxes = useCallback(async () => {
    try {
      const data = await api.get<{ inboxes: Inbox[] }>("/api/v1/deliverability/inboxes");
      setInboxes(data.inboxes);
    } catch {
      // Not configured yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInboxes(); }, [fetchInboxes]);

  const addInbox = async () => {
    if (!newInbox.host || !newInbox.username) return;
    try {
      await api.post("/api/v1/deliverability/inboxes", newInbox);
      setNewInbox({ host: "", port: 587, username: "", password: "", daily_limit: 30 });
      setShowAddForm(false);
      fetchInboxes();
    } catch (err) {
      alert("Error al agregar inbox");
    }
  };

  const verifyEmailBtn = async () => {
    if (!verifyEmail) return;
    try {
      const result = await api.post("/api/v1/deliverability/verify-email", { email: verifyEmail });
      setVerifyResult(result);
    } catch {
      setVerifyResult({ valid: false, reason: "verification_failed" });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Entregabilidad</h1>
          <p className="text-muted-foreground">Gestiona buzones, verifica emails, monitorea reputacion</p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90">
          <Plus size={16} /> Agregar Inbox
        </button>
      </div>

      {/* Inboxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inboxes.map((inbox) => (
          <div key={inbox.id} className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Server size={16} className="text-blue-500" />
                <span className="font-medium text-sm">{inbox.username}</span>
              </div>
              {inbox.is_active ? <CheckCircle size={14} className="text-green-500" /> : <AlertTriangle size={14} className="text-yellow-500" />}
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Enviados hoy:</span>
                <span className="font-medium">{inbox.sent_today}/{inbox.daily_limit}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${(inbox.sent_today / inbox.daily_limit) * 100}%` }} />
              </div>
              <div className="flex justify-between">
                <span>Reputacion:</span>
                <span className="font-medium">{inbox.reputation_score}/100</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {inboxes.length === 0 && (
        <div className="bg-card rounded-lg border p-8 text-center text-muted-foreground">
          <Server size={32} className="mx-auto mb-2 opacity-50" />
          <p>No hay buzones configurados</p>
          <p className="text-xs mt-1">Agrega un SMTP para comenzar a enviar campanas</p>
        </div>
      )}

      {/* Verify Email */}
      <div className="bg-card rounded-lg border p-4">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Mail size={16} /> Verificar Email
        </h3>
        <div className="flex gap-2">
          <input
            type="email"
            value={verifyEmail}
            onChange={(e) => setVerifyEmail(e.target.value)}
            placeholder="email@ejemplo.com"
            className="flex-1 px-3 py-2 rounded-md border bg-background text-foreground text-sm"
          />
          <button onClick={verifyEmailBtn} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">
            Verificar
          </button>
        </div>
        {verifyResult && (
          <div className={`mt-3 p-3 rounded-md text-sm ${verifyResult.valid ? "bg-green-50 dark:bg-green-900/20 text-green-700" : "bg-red-50 dark:bg-red-900/20 text-red-700"}`}>
            {verifyResult.valid ? "Email valido" : `Invalido: ${verifyResult.reason}`}
            {verifyResult.disposable && " (desechable)"}
            {verifyResult.role_address && " (rol)"}
          </div>
        )}
      </div>

      {/* Add Inbox Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Agregar Inbox SMTP</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Host SMTP</label>
              <input value={newInbox.host} onChange={(e) => setNewInbox({ ...newInbox, host: e.target.value })} placeholder="smtp.gmail.com" className="w-full px-3 py-2 rounded-md border bg-background text-foreground text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Puerto</label>
                <input type="number" value={newInbox.port} onChange={(e) => setNewInbox({ ...newInbox, port: parseInt(e.target.value) })} className="w-full px-3 py-2 rounded-md border bg-background text-foreground text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Limite diario</label>
                <input type="number" value={newInbox.daily_limit} onChange={(e) => setNewInbox({ ...newInbox, daily_limit: parseInt(e.target.value) })} className="w-full px-3 py-2 rounded-md border bg-background text-foreground text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input value={newInbox.username} onChange={(e) => setNewInbox({ ...newInbox, username: e.target.value })} placeholder="tu@email.com" className="w-full px-3 py-2 rounded-md border bg-background text-foreground text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input type="password" value={newInbox.password} onChange={(e) => setNewInbox({ ...newInbox, password: e.target.value })} className="w-full px-3 py-2 rounded-md border bg-background text-foreground text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={addInbox} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">Agregar</button>
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-md border text-muted-foreground text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
