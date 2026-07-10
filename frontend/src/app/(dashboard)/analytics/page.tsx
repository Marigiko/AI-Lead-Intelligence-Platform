"use client";

import { useEffect, useState } from "react";
import {
  BarChart3, TrendingUp, DollarSign, Users, Target, Globe, Building2,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { api } from "@/lib/api-client";

interface PipelineItem {
  stage: string;
  count: number;
  value: number;
  color: string;
}

interface IndustryItem {
  name: string;
  count: number;
  score: number;
}

interface GeoItem {
  city: string;
  province: string;
  count: number;
}

const STAGE_COLORS: Record<string, string> = {
  prospeccion: "#94a3b8",
  Contacto: "#60a5fa",
  Calificado: "#a78bfa",
  propuesta: "#fbbf24",
  Negociacion: "#f97316",
  Ganado: "#22c55e",
  Perdido: "#ef4444",
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30d");
  const [pipelineData, setPipelineData] = useState<PipelineItem[]>([]);
  const [industryData, setIndustryData] = useState<IndustryItem[]>([]);
  const [geoData, setGeoData] = useState<GeoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [pipeline, industries, geography] = await Promise.all([
          api.get<{ stage: string; count: number; value: number }[]>("/api/v1/analytics/pipeline"),
          api.get<IndustryItem[]>("/api/v1/analytics/industries"),
          api.get<GeoItem[]>("/api/v1/analytics/geography"),
        ]);
        setPipelineData(
          pipeline.map((p) => ({
            ...p,
            color: STAGE_COLORS[p.stage] || "#94a3b8",
          }))
        );
        setIndustryData(industries);
        setGeoData(geography);
      } catch (err: any) {
        setError(err.error?.message || err.message || "Failed to load analytics");
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
        <span className="ml-3 text-muted-foreground">Cargando analyticas...</span>
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

  const maxCount = Math.max(...pipelineData.map((d) => d.count), 1);
  const totalRevenue = pipelineData.find((d) => d.stage === "Ganado")?.value || 0;
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
          <p className="text-2xl font-bold text-foreground mt-2">${totalPipeline.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Pipeline Total</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Chart */}
        <div className="bg-card rounded-lg border p-4">
          <h2 className="font-semibold text-foreground mb-4">Pipeline por Etapa</h2>
          <div className="space-y-3">
            {pipelineData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos de pipeline</p>
            ) : (
              pipelineData.map((d) => (
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
              ))
            )}
          </div>
        </div>

        {/* Industry Breakdown */}
        <div className="bg-card rounded-lg border p-4">
          <h2 className="font-semibold text-foreground mb-4">Por Industria</h2>
          <div className="space-y-2">
            {industryData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos de industria</p>
            ) : (
              industryData.map((ind) => (
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
              ))
            )}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-card rounded-lg border p-4">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Globe size={16} />
            Distribucion Geografica
          </h2>
          <div className="space-y-2">
            {geoData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos geograficos</p>
            ) : (
              geoData.map((loc) => (
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
              ))
            )}
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
              <p className="text-2xl font-bold text-foreground">${totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Ingresos Totales</p>
            </div>
            <div className="p-3 rounded-md bg-muted/30 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">847%</p>
              <p className="text-xs text-muted-foreground">ROI</p>
            </div>
            <div className="p-3 rounded-md bg-muted/30 text-center">
              <p className="text-2xl font-bold text-foreground">{pipelineData.find(d => d.stage === "Ganado")?.count ?? 0}</p>
              <p className="text-xs text-muted-foreground">Negocios Ganados</p>
            </div>
            <div className="p-3 rounded-md bg-muted/30 text-center">
              <p className="text-2xl font-bold text-foreground">${totalPipeline.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Pipeline Total</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
