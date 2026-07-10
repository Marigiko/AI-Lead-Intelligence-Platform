"use client";

import { useState, useEffect } from "react";
import {
  Send, Plus, Play, Pause, BarChart3, Mail, MessageSquare,
  MoreHorizontal, Users, Eye, MousePointerClick, Reply, TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Campaign } from "@/lib/types";

interface CampaignListResponse {
  items: Campaign[];
  total: number;
  offset: number;
  limit: number;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  sending: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  sent: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get<CampaignListResponse>("/api/v1/campaigns", { limit: "50" });
        setCampaigns(data.items);
        if (data.items.length > 0 && !selectedId) {
          setSelectedId(data.items[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar campanas");
      } finally {
        setLoading(false);
      }
    }
    fetchCampaigns();
  }, []);

  const selectedCampaign = campaigns.find((c) => c.id === selectedId) || campaigns[0];

  const sent = selectedCampaign?.stats?.sent || 0;
  const opened = selectedCampaign?.stats?.opened || 0;
  const replied = selectedCampaign?.stats?.replied || 0;
  const total = selectedCampaign?.stats?.total || 0;

  const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
  const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Campanas</h1>
            <p className="text-muted-foreground">Gestiona tus campanas de outreach multicanal</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-card rounded-lg border animate-pulse" />
            ))}
          </div>
          <div className="bg-card rounded-lg border p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-md bg-muted/50 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Campanas</h1>
            <p className="text-muted-foreground">Gestiona tus campanas de outreach multicanal</p>
          </div>
        </div>
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive">
          <p className="font-medium">Error al cargar campanas</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campanas</h1>
          <p className="text-muted-foreground">Gestiona tus campanas de outreach multicanal</p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          Nueva Campana
        </button>
      </div>

      {/* New Campaign Form */}
      {showNewForm && (
        <div className="bg-card rounded-lg border p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Nueva Campana</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Nombre</label>
              <input
                type="text"
                placeholder="Ej: Empresas Res web obsoleta"
                className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Canal</label>
              <select className="w-full px-3 py-2 rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="linkedin">LinkedIn</option>
                <option value="multi">Multicanal</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Instrucciones para IA (opcional)
              </label>
              <textarea
                placeholder="Ej: Enfocarse en que su web es vieja y necesitan actualizacion. Tono amigable pero profesional."
                className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[60px]"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
              Crear Campana
            </button>
            <button
              onClick={() => setShowNewForm(false)}
              className="px-4 py-2 rounded-md border text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign List */}
        <div className="lg:col-span-2 space-y-3">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              onClick={() => setSelectedId(campaign.id)}
              className={`bg-card rounded-lg border p-4 cursor-pointer transition-all ${
                selectedCampaign?.id === campaign.id
                  ? "ring-2 ring-primary"
                  : "hover:border-primary/50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {campaign.type === "email" ? (
                    <Mail size={16} className="text-blue-500" />
                  ) : (
                    <MessageSquare size={16} className="text-green-500" />
                  )}
                  <h3 className="font-medium text-foreground text-sm">{campaign.name}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[campaign.status] || ""}`}>
                  {campaign.status === "draft" ? "Borrador" :
                   campaign.status === "sending" ? "Enviando" :
                   campaign.status === "sent" ? "Enviado" : campaign.status}
                </span>
              </div>

              {campaign.stats && (campaign.stats.sent > 0 || campaign.stats.total > 0) && (
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{(campaign.stats.sent || 0)} enviados</span>
                  <span>{(campaign.stats.opened || 0)} abiertos</span>
                  <span>{(campaign.stats.replied || 0)} respuestas</span>
                </div>
              )}
            </div>
          ))}
          {campaigns.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No hay campanas
            </div>
          )}
        </div>

        {/* Stats Panel */}
        {selectedCampaign && (
          <div className="bg-card rounded-lg border p-4 space-y-4">
            <h2 className="font-semibold text-foreground text-sm">Estadisticas</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-md bg-muted/30">
                <p className="text-2xl font-bold text-foreground">{total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-3 rounded-md bg-muted/30">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{sent}</p>
                <p className="text-xs text-muted-foreground">Enviados</p>
              </div>
              <div className="text-center p-3 rounded-md bg-muted/30">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{openRate}%</p>
                <p className="text-xs text-muted-foreground">Apertura</p>
              </div>
              <div className="text-center p-3 rounded-md bg-muted/30">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{replyRate}%</p>
                <p className="text-xs text-muted-foreground">Respuesta</p>
              </div>
            </div>

            {/* Progress bars */}
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Abiertos</span>
                  <span className="text-foreground">{opened}/{sent}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${openRate}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Respuestas</span>
                  <span className="text-foreground">{replied}/{sent}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${replyRate}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t">
              {selectedCampaign.status === "draft" && (
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white font-medium hover:bg-green-700 transition-colors">
                  <Play size={16} />
                  Iniciar Envio
                </button>
              )}
              {selectedCampaign.status === "sending" && (
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-yellow-600 text-white font-medium hover:bg-yellow-700 transition-colors">
                  <Pause size={16} />
                  Pausar
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
