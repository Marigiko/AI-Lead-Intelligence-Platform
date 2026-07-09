"use client";

import { useState } from "react";
import {
  BarChart3, TrendingUp, DollarSign, Users, Target, Globe, Building2,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";

const pipelineData = [
  { stage: "Prospeccion", count: 45, value: 135000, color: "#94a3b8" },
  { stage: "Contacto", count: 28, value: 98000, color: "#60a5fa" },
  { stage: "Calificado", count: 15, value: 72000, color: "#a78bfa" },
  { stage: "Propuesta", count: 8, value: 48000, color: "#fbbf24" },
  { stage: "Negociacion", count: 5, value: 25000, color: "#f97316" },
  { stage: "Ganado", count: 12, value: 56000, color: "#22c55e" },
];

const industryData = [
  { name: "Construccion", count: 34, score: 88 },
  { name: "Gastronomia", count: 28, score: 82 },
  { name: "Salud", count: 22, score: 75 },
  { name: "Legal", count: 18, score: 72 },
  { name: "Hoteleria", count: 15, score: 68 },
  { name: "Educacion", count: 12, score: 65 },
  { name: "Logistica", count: 10, score: 85 },
];

const geoData = [
  { city: "Resistencia", province: "Chaco", count: 156, lat: -27.45, lng: -59.00 },
  { city: "Corrientes", province: "Corrientes", count: 45, lat: -27.47, lng: -58.83 },
  { city: "Fontana", province: "Chaco", count: 23, lat: -27.42, lng: -59.03 },
  { city: "Barranqueras", province: "Chaco", count: 18, lat: -27.48, lng: -58.94 },
  { city: "Villa Allende", province: "Cordoba", count: 5, lat: -31.29, lng: -64.29 },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30d");

  const maxCount = Math.max(...pipelineData.map(d => d.count));
  const totalRevenue = pipelineData.find(d => d.stage === "Ganado")?.value || 0;
  const totalPipeline = pipelineData.reduce((a, d) => a + d.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analiticas</h1>
          <p className="text-muted-foreground">Dashboards, reportes y KPIs de tu operacion</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-3 py-2 rounded-md border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="7d">Ultimos 7 dias</option>
          <option value="30d">Ultimos 30 dias</option>
          <option value="90d">Ultimos 90 dias</option>
          <option value="all">Todo</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Users size={18} className="text-muted-foreground" />
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-0.5">
              <ArrowUpRight size={12} /> +32
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">247</p>
          <p className="text-xs text-muted-foreground">Empresas</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <DollarSign size={18} className="text-muted-foreground" />
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-0.5">
              <ArrowUpRight size={12} /> +$8k
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">${totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Ingresos</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Target size={18} className="text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">42%</p>
          <p className="text-xs text-muted-foreground">Tasa de Cierre</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <BarChart3 size={18} className="text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">$11.20</p>
          <p className="text-xs text-muted-foreground">CAC</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Chart */}
        <div className="bg-card rounded-lg border p-4">
          <h2 className="font-semibold text-foreground mb-4">Pipeline por Etapa</h2>
          <div className="space-y-3">
            {pipelineData.map((d) => (
              <div key={d.stage} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-24 truncate">{d.stage}</span>
                <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-500 flex items-center px-2"
                    style={{ width: `${(d.count / maxCount) * 100}%`, backgroundColor: d.color }}
                  >
                    <span className="text-xs font-medium text-white">{d.count}</span>
                  </div>
                </div>
                <span className="text-xs font-medium text-foreground w-16 text-right">
                  ${d.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Industry Breakdown */}
        <div className="bg-card rounded-lg border p-4">
          <h2 className="font-semibold text-foreground mb-4">Por Industria</h2>
          <div className="space-y-2">
            {industryData.map((ind) => (
              <div key={ind.name} className="flex items-center justify-between p-2 rounded hover:bg-muted/30">
                <div className="flex items-center gap-3">
                  <Building2 size={14} className="text-muted-foreground" />
                  <span className="text-sm text-foreground">{ind.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{ind.count} empresas</span>
                  <span className={`text-xs font-bold ${
                    ind.score >= 80 ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"
                  }`}>
                    {ind.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-card rounded-lg border p-4">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Globe size={16} />
            Distribucion Geografica
          </h2>
          <div className="space-y-2">
            {geoData.map((loc) => (
              <div key={loc.city} className="flex items-center justify-between p-2 rounded hover:bg-muted/30">
                <div>
                  <p className="text-sm font-medium text-foreground">{loc.city}</p>
                  <p className="text-xs text-muted-foreground">{loc.province}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{loc.count}</span>
                  <span className="text-xs text-muted-foreground">empresas</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ROI Summary */}
        <div className="bg-card rounded-lg border p-4">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp size={16} />
            ROI y Metricas
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-md bg-muted/30 text-center">
              <p className="text-2xl font-bold text-foreground">$56,000</p>
              <p className="text-xs text-muted-foreground">Ingresos Totales</p>
            </div>
            <div className="p-3 rounded-md bg-muted/30 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">847%</p>
              <p className="text-xs text-muted-foreground">ROI</p>
            </div>
            <div className="p-3 rounded-md bg-muted/30 text-center">
              <p className="text-2xl font-bold text-foreground">12</p>
              <p className="text-xs text-muted-foreground">Negocios Ganados</p>
            </div>
            <div className="p-3 rounded-md bg-muted/30 text-center">
              <p className="text-2xl font-bold text-foreground">$6,232</p>
              <p className="text-xs text-muted-foreground">Ticket Promedio</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
