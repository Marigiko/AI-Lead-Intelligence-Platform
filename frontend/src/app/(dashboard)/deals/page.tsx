"use client";

import { useState } from "react";
import { GripVertical, Plus, DollarSign, Calendar, Building2, MoreHorizontal } from "lucide-react";

const stages = [
  { name: "Prospeccion", color: "#94a3b8", deals: [
    { id: "d1", title: "Constructora Chaco — Web nueva", value: 5000, company: "Constructora Chaco SRL", date: "2026-07-15" },
    { id: "d2", title: "Distribuidora El Norte — SEO", value: 3000, company: "Distribuidora El Norte", date: "2026-07-20" },
  ]},
  { name: "Contacto", color: "#60a5fa", deals: [
    { id: "d3", title: "Clinica Dental — Chatbot + CRM", value: 4500, company: "Clinica Dental Sonrisa", date: "2026-07-10" },
  ]},
  { name: "Calificado", color: "#a78bfa", deals: [
    { id: "d4", title: "Hotel Cacique — Booking online", value: 6000, company: "Hotel Cacique Calchaqui", date: "2026-07-08" },
  ]},
  { name: "Propuesta", color: "#fbbf24", deals: [
    { id: "d5", title: "La Parrilla — Rediseño web +Delivery", value: 3500, company: "Restaurante La Parrilla", date: "2026-07-05" },
  ]},
  { name: "Negociacion", color: "#f97316", deals: [
    { id: "d6", title: "Estudio Moreno — Automatización", value: 3200, company: "Estudio Juridico Moreno", date: "2026-07-01" },
  ]},
  { name: "Ganado", color: "#22c55e", deals: [
    { id: "d7", title: "Frigorifico Chaco — Website", value: 4800, company: "Frigorifico Chaco S.A.", date: "2026-06-28" },
  ]},
  { name: "Perdido", color: "#ef4444", deals: [] },
];

const totalValue = stages.reduce((acc, s) => acc + s.deals.reduce((a, d) => a + d.value, 0), 0);
const wonValue = stages.find(s => s.name === "Ganado")?.deals.reduce((a, d) => a + d.value, 0) || 0;

export default function DealsPage() {
  const [selectedDeal, setSelectedDeal] = useState<string | null>(null);

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
          <p className="text-xl font-bold text-foreground">
            {stages.filter(s => !s.deals.length || s.name === "Perdido" ? 0 : s.deals.length).reduce((a, s) => a + s.deals.length, 0)}
          </p>
        </div>
        <div className="bg-card rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Tasa de Cierre</p>
          <p className="text-xl font-bold text-foreground">
            {stages.find(s => s.name === "Ganado")?.deals.length || 0} / {stages.reduce((a, s) => a + s.deals.length, 0)}
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
                      ${deal.value.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 size={12} />
                      {deal.company.split(" ").slice(0, 2).join(" ")}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar size={12} />
                    {deal.date}
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
                Total: ${stage.deals.reduce((a, d) => a + d.value, 0).toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
