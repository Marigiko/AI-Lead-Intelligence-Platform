"use client";

import { useState, useEffect, useCallback } from "react";
import { GripVertical, Plus, DollarSign, Calendar, Building2, MoreHorizontal, X, ChevronRight, ChevronLeft } from "lucide-react";
import { api } from "@/lib/api-client";
import { Deal, Company } from "@/lib/types";

interface Stage {
  name: string;
  color: string;
  deals: Deal[];
}

interface CRMStage {
  id: string;
  name: string;
  color: string | null;
  position: number;
}

const DEFAULT_STAGES: Stage[] = [
  { name: "prospeccion", color: "#94a3b8", deals: [] },
  { name: "Contacto", color: "#60a5fa", deals: [] },
  { name: "Calificado", color: "#a78bfa", deals: [] },
  { name: "propuesta", color: "#fbbf24", deals: [] },
  { name: "Negociacion", color: "#f97316", deals: [] },
  { name: "Ganado", color: "#22c55e", deals: [] },
  { name: "Perdido", color: "#ef4444", deals: [] },
];

export default function DealsPage() {
  const [stages, setStages] = useState<Stage[]>(DEFAULT_STAGES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<string | null>(null);

  // Deal creation modal
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newStage, setNewStage] = useState("prospeccion");
  const [newCompanyId, setNewCompanyId] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dealsData, crmStages] = await Promise.all([
        api.get<{ items: Deal[] }>("/api/v1/deals", { limit: "100" }),
        api.get<CRMStage[]>("/api/v1/crm/stages").catch(() => null),
      ]);

      const deals = dealsData.items || [];
      const stageDefs = crmStages || DEFAULT_STAGES;

      // Group deals by stage
      const stageMap: Record<string, Deal[]> = {};
      for (const def of stageDefs) {
        stageMap[def.name] = [];
      }
      for (const deal of deals) {
        if (!stageMap[deal.stage]) {
          stageMap[deal.stage] = [];
        }
        stageMap[deal.stage].push(deal);
      }

      setStages(
        stageDefs.map((def) => ({
          name: def.name,
          color: def.color || "#94a3b8",
          deals: stageMap[def.name] || [],
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar pipeline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create deal
  const createDeal = async () => {
    if (!newTitle) return;
    try {
      setCreating(true);
      await api.post("/api/v1/deals", {
        title: newTitle,
        value: newValue ? parseFloat(newValue) : null,
        stage: newStage,
        company_id: newCompanyId || undefined,
      });
      setNewTitle("");
      setNewValue("");
      setShowNewForm(false);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al crear negocio");
    } finally {
      setCreating(false);
    }
  };

  // Move deal to next/previous stage
  const moveDeal = async (dealId: string, currentStage: string, direction: "forward" | "backward") => {
    const currentIndex = stages.findIndex((s) => s.name === currentStage);
    const newIndex = direction === "forward" ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= stages.length) return;

    const newStage = stages[newIndex].name;
    try {
      await api.post(`/api/v1/deals/${dealId}/move`, { stage: newStage });
      fetchData();
    } catch (err) {
      alert("Error al mover negocio");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="ml-3 text-muted-foreground">Cargando pipeline...</span>
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

  const totalValue = stages.reduce((acc, s) => acc + s.deals.reduce((a, d) => a + (d.value ?? 0), 0), 0);
  const wonStage = stages.find((s) => s.name === "Ganado");
  const wonValue = wonStage?.deals.reduce((a, d) => a + (d.value ?? 0), 0) ?? 0;
  const activeDeals = stages
    .filter((s) => s.name !== "Perdido" && s.name !== "Ganado")
    .reduce((a, s) => a + s.deals.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline / CRM</h1>
          <p className="text-muted-foreground">Gestiona tu pipeline de ventas y negocios</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          Nuevo Negocio
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Pipeline Total</p>
          <p className="text-xl font-bold text-foreground">${totalValue.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Ganados</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">${wonValue.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Negocios Activos</p>
          <p className="text-xl font-bold text-foreground">{activeDeals}</p>
        </div>
        <div className="bg-card rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Tasa de Cierre</p>
          <p className="text-xl font-bold text-foreground">
            {wonStage?.deals.length ?? 0} / {stages.reduce((a, s) => a + s.deals.length, 0)}
          </p>
        </div>
      </div>

      {/* Deal Creation Modal */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Nuevo Negocio</h3>
              <button onClick={() => setShowNewForm(false)} className="p-1 hover:bg-muted rounded">
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Titulo</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ej: Constructora Chaco - Website nuevo"
                className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Valor (USD)</label>
                <input
                  type="number"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="5000"
                  className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Stage</label>
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {stages.map((s) => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={createDeal}
                disabled={creating || !newTitle}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {creating ? "Creando..." : "Crear Negocio"}
              </button>
              <button onClick={() => setShowNewForm(false)} className="px-4 py-2 rounded-md border text-muted-foreground hover:bg-accent">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage, stageIndex) => (
          <div key={stage.name} className="flex-shrink-0 w-72">
            {/* Stage Header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                <h3 className="text-sm font-medium text-foreground">{stage.name}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {stage.deals.length}
                </span>
              </div>
              <MoreHorizontal size={14} className="text-muted-foreground" />
            </div>

            {/* Deal Cards */}
            <div className="space-y-2 min-h-[100px]">
              {stage.deals.map((deal) => (
                <div
                  key={deal.id}
                  onClick={() => setSelectedDeal(deal.id)}
                  className={`bg-card rounded-lg border p-3 cursor-pointer transition-all hover:border-primary/50 ${
                    selectedDeal === deal.id ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium text-foreground leading-tight">{deal.title}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign size={12} />
                      ${(deal.value ?? 0).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {deal.created_at ? new Date(deal.created_at).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  {/* Move buttons */}
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                    {stageIndex > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); moveDeal(deal.id, stage.name, "backward"); }}
                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                        title="Mover atras"
                      >
                        <ChevronLeft size={14} />
                      </button>
                    )}
                    {stageIndex < stages.length - 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); moveDeal(deal.id, stage.name, "forward"); }}
                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                        title="Mover adelante"
                      >
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {stage.deals.length === 0 && (
                <div className="text-center text-muted-foreground text-xs py-4 border border-dashed rounded">
                  Sin negocios
                </div>
              )}
            </div>

            {/* Stage Total */}
            {stage.deals.length > 0 && (
              <div className="mt-2 px-1 text-xs font-medium text-muted-foreground">
                Total: ${stage.deals.reduce((a, d) => a + (d.value ?? 0), 0).toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
