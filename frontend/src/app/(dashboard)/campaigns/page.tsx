"use client";

import { useState, useEffect } from "react";
import { Send, Plus, Play, Pause, Mail, MessageSquare, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  subject: string | null;
  stats: Record<string, number>;
  created_at: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  sending: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  sent: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    try {
      const data = await api.get<{ items: Campaign[]; total: number }>("/api/v1/campaigns");
      setCampaigns(data.items);
    } catch (err) {
      console.error("Failed to load campaigns:", err);
    } finally {
      setLoading(false);
    }
  }

  async function createCampaign() {
    if (!newName) return;
    setCreating(true);
    try {
      await api.post("/api/v1/campaigns", { name: newName, type: "email", subject: newSubject });
      setShowNewForm(false);
      setNewName("");
      setNewSubject("");
      await loadCampaigns();
    } catch (err) {
      console.error("Failed to create campaign:", err);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campanas</h1>
          <p className="text-muted-foreground">{campaigns.length} campanas creadas</p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          Nueva Campana
        </button>
      </div>

      {showNewForm && (
        <div className="bg-card rounded-lg border p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Nueva Campana</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Nombre</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Empresas Resistencia - Web"
                className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Asunto del email</label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Ej: Su pagina web necesita una actualizacion"
                className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createCampaign}
              disabled={creating || !newName}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {creating ? "Creando..." : "Crear Campana"}
            </button>
            <button onClick={() => setShowNewForm(false)} className="px-4 py-2 rounded-md border text-muted-foreground hover:bg-accent transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="bg-card rounded-lg border p-12 text-center">
          <Send size={48} className="mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Sin campanas aun</h2>
          <p className="text-muted-foreground">Crea tu primera campana para empezar a contactar leads.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const stats = campaign.stats || {};
            const sent = stats.sent || 0;
            const opened = stats.opened || 0;
            const replied = stats.replied || 0;
            const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;

            return (
              <div key={campaign.id} className="bg-card rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {campaign.type === "email" ? <Mail size={16} className="text-blue-500" /> : <MessageSquare size={16} className="text-green-500" />}
                    <h3 className="font-medium text-foreground text-sm">{campaign.name}</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[campaign.status] || ""}`}>
                    {campaign.status === "draft" ? "Borrador" : campaign.status === "sending" ? "Enviando" : campaign.status === "sent" ? "Enviado" : campaign.status}
                  </span>
                </div>
                {sent > 0 && (
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{sent} enviados</span>
                    <span>{opened} abiertos ({openRate}%)</span>
                    <span>{replied} respuestas</span>
                  </div>
                )}
                {campaign.status === "draft" && (
                  <div className="mt-3">
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors">
                      <Play size={12} />
                      Iniciar Envio
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
