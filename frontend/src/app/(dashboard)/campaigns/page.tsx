"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Send, Plus, Play, Pause, BarChart3, Mail, MessageSquare,
  MoreHorizontal, Users, Eye, MousePointerClick, Reply, TrendingUp,
  Loader2, X, Check,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Campaign, Company } from "@/lib/types";

interface CampaignListResponse {
  items: Campaign[];
  total: number;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  sending: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  sent: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Campaign creation form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("email");
  const [newSubject, setNewSubject] = useState("");
  const [creating, setCreating] = useState(false);

  // Lead selection
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [availableLeads, setAvailableLeads] = useState<Company[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [leadsLoading, setLeadsLoading] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
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
  }, [selectedId]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const selectedCampaign = campaigns.find((c) => c.id === selectedId) || campaigns[0];

  // Create campaign
  const createCampaign = async () => {
    if (!newName) return;
    try {
      setCreating(true);
      await api.post("/api/v1/campaigns", {
        name: newName,
        type: newType,
        subject: newSubject,
      });
      setNewName("");
      setNewSubject("");
      setShowNewForm(false);
      fetchCampaigns();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al crear campana");
    } finally {
      setCreating(false);
    }
  };

  // Send campaign
  const sendCampaign = async (campaignId: string) => {
    if (!confirm("Enviar campana a todos los leads?")) return;
    try {
      await api.post(`/api/v1/campaigns/${campaignId}/send`, {});
      alert("Campana enviada!");
      fetchCampaigns();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al enviar");
    }
  };

  // Generate AI messages
  const generateMessages = async (campaignId: string) => {
    try {
      await api.post(`/api/v1/campaigns/${campaignId}/generate`, {
        sender_name: "Sales Rep",
        sender_company: "Mi Agencia",
        sender_services: "desarrollo web y marketing digital",
      });
      alert("Mensajes generados!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al generar mensajes");
    }
  };

  // Load available leads for selection
  const loadLeads = async () => {
    try {
      setLeadsLoading(true);
      const data = await api.get<{ items: Company[] }>("/api/v1/companies", { limit: "100" });
      setAvailableLeads(data.items);
      setShowLeadModal(true);
    } catch (err) {
      alert("Error al cargar empresas");
    } finally {
      setLeadsLoading(false);
    }
  };

  // Add leads to campaign
  const addLeadsToCampaign = async () => {
    if (selectedLeadIds.size === 0 || !selectedId) return;
    try {
      await api.post(`/api/v1/campaigns/${selectedId}/leads`, {
        company_ids: Array.from(selectedLeadIds),
      });
      setShowLeadModal(false);
      setSelectedLeadIds(new Set());
      alert(`${selectedLeadIds.size} leads agregados!`);
      fetchCampaigns();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al agregar leads");
    }
  };

  const toggleLead = (id: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Cargando campanas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive">
        Error: {error}
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

      {/* Campaign Creation Form */}
      {showNewForm && (
        <div className="bg-card rounded-lg border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Nueva Campana</h2>
            <button onClick={() => setShowNewForm(false)} className="p-1 hover:bg-muted rounded">
              <X size={16} />
            </button>
          </div>
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
              <label className="block text-sm font-medium text-foreground mb-1.5">Tipo</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
          </div>
          {newType === "email" && (
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
          )}
          <div className="flex gap-2">
            <button
              onClick={createCampaign}
              disabled={creating || !newName}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {creating ? <><Loader2 size={14} className="animate-spin mr-1" /> Creando...</> : "Crear Campana"}
            </button>
            <button onClick={() => setShowNewForm(false)} className="px-4 py-2 rounded-md border text-muted-foreground hover:bg-accent transition-colors">
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
              No hay campanas. Crea una para comenzar.
            </div>
          )}
        </div>

        {/* Stats Panel */}
        {selectedCampaign && (
          <div className="bg-card rounded-lg border p-4 space-y-4">
            <h2 className="font-semibold text-foreground text-sm">Estadisticas</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-md bg-muted/30">
                <p className="text-2xl font-bold text-foreground">{selectedCampaign.stats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Leads</p>
              </div>
              <div className="text-center p-3 rounded-md bg-muted/30">
                <p className="text-2xl font-bold text-blue-600">{selectedCampaign.stats?.sent || 0}</p>
                <p className="text-xs text-muted-foreground">Enviados</p>
              </div>
              <div className="text-center p-3 rounded-md bg-muted/30">
                <p className="text-2xl font-bold text-green-600">{selectedCampaign.stats?.opened || 0}</p>
                <p className="text-xs text-muted-foreground">Abiertos</p>
              </div>
              <div className="text-center p-3 rounded-md bg-muted/30">
                <p className="text-2xl font-bold text-purple-600">{selectedCampaign.stats?.replied || 0}</p>
                <p className="text-xs text-muted-foreground">Respuestas</p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t">
              {selectedCampaign.status === "draft" && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); loadLeads(); }}
                    disabled={leadsLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Users size={16} />
                    Agregar Leads
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); generateMessages(selectedCampaign.id); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
                  >
                    <Mail size={16} />
                    Generar Mensajes AI
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); sendCampaign(selectedCampaign.id); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
                  >
                    <Play size={16} />
                    Iniciar Envio
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lead Selection Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Agregar Leads a Campana</h3>
              <button onClick={() => setShowLeadModal(false)} className="p-1 hover:bg-muted rounded">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {availableLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => toggleLead(lead.id)}
                  className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-all ${
                    selectedLeadIds.has(lead.id)
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                    selectedLeadIds.has(lead.id) ? "bg-primary border-primary" : "border-muted-foreground"
                  }`}>
                    {selectedLeadIds.has(lead.id) && <Check size={12} className="text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.domain || lead.phone || "Sin contacto"}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{selectedLeadIds.size} seleccionados</span>
              <div className="flex gap-2">
                <button onClick={() => setShowLeadModal(false)} className="px-4 py-2 rounded-md border text-muted-foreground hover:bg-accent">
                  Cancelar
                </button>
                <button
                  onClick={addLeadsToCampaign}
                  disabled={selectedLeadIds.size === 0}
                  className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
