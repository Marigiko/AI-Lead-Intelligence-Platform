"use client";

import { useEffect, useState } from "react";
import { GripVertical, Plus, DollarSign, Calendar, Building2, MoreHorizontal } from "lucide-react";
import { api } from "@/lib/api-client";
import { Deal } from "@/lib/types";

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

const DEFAULT_STAGES = ["prospeccion", "Contacto", "Calificado", "propuesta", "Negociacion", "Ganado", "Perdido"];
const STAGE_COLORS: Record<string, string> = {
  prospeccion: "#94a3b8",
  Contacto: "#60a5fa",
  Calificado: "#a78bfa",
  propuesta: "#fbbf24",
  Negociacion: "#f97316",
  Ganado: "#22c55e",
  Perdido: "#ef4444",
};

export default function DealsPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [deals, crmStages] = await Promise.all([
          api.get<Deal[]>("/api/v1/deals"),
          api.get<CRMStage[]>("/api/v1/crm/stages").catch(() => null),
        ]);

        // Build stage list from API or fall back to defaults
        const stageDefinitions: { name: string; color: string }[] = crmStages
          ? crmStages
              .sort((a, b) => a.position - b.position)
              .map((s) => ({ name: s.name, color: s.color || STAGE_COLORS[s.name] || "#94a3b8" }))
          : DEFAULT_STAGES.map((name) => ({ name, color: STAGE_COLORS[name] || "#94a3b8" }));

        // Group deals by stage
        const stageMap: Record<string, Deal[]> = {};
        for (const def of stageDefinitions) {
          stageMap[def.name] = [];
        }
        for (const deal of deals) {
          if (!stageMap[deal.stage]) {
            stageMap[deal.stage] = [];
          }
          stageMap[deal.stage].push(deal);
        }

        setStages(
          stageDefinitions.map((def) => ({
            name: def.name,
            color: def.color,
            deals: stageMap[def.name] || [],
          }))
        );
      } catch (err: any) {
        setError(err.error?.message || err.message || "Failed to load deals");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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
        <button className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
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

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
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
                    <GripVertical size={14} className="text-muted-foreground flex-shrink-0 cursor-grab" />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign size={12} />
                      ${(deal.value ?? 0).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 size={12} />
                      {deal.company_id.slice(0, 8)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar size={12} />
                    {deal.created_at ? new Date(deal.created_at).toLocaleDateString() : "—"}
                  </div>
                </div>
              ))}

              {/* Add Deal Button */}
              <button className="w-full p-2 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted/30 transition-colors">
                + Agregar negocio
              </button>
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
