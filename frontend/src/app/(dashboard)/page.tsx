"use client";

import { useEffect, useState } from "react";
import {
  Building2, Users, Send, Briefcase, TrendingUp, Zap,
  ArrowUpRight, ArrowDownRight, DollarSign, Target, MessageSquare,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { AnalyticsOverview, CompanyDetail, CompanyListResponse } from "@/lib/types";

interface TopOpportunity {
  name: string;
  score: number;
  industry: string;
  value: string;
}

type CompanyWithDetail = CompanyListResponse & { items: CompanyDetail[] };

interface PipelineStage {
  stage: string;
  count: number;
  color: string;
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

export default function DashboardPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [topCompanies, setTopCompanies] = useState<CompanyDetail[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [overviewData, companiesData, pipelineData] = await Promise.all([
          api.get<AnalyticsOverview>("/api/v1/analytics/dashboard"),
          api.get<CompanyWithDetail>("/api/v1/companies", { limit: "5", sort_by: "opportunity_score" }),
          api.get<{ stage: string; count: number }[]>("/api/v1/analytics/pipeline"),
        ]);
        setOverview(overviewData);
        setTopCompanies(companiesData.items);
        setPipeline(
          pipelineData.map((p) => ({
            stage: p.stage,
            count: p.count,
            color: STAGE_COLORS[p.stage] || "#94a3b8",
          }))
        );
      } catch (err: any) {
        setError(err.error?.message || err.message || "Failed to load dashboard");
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
        <span className="ml-3 text-muted-foreground">Cargando dashboard...</span>
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

  const topOpportunities: TopOpportunity[] = topCompanies.map((c) => ({
    name: c.name,
    score: c.opportunity_score,
    industry: c.industry || "",
    value: c.estimated_deal_value ? `$${c.estimated_deal_value.toLocaleString()}` : "—",
  }));

  const maxPipelineCount = Math.max(...pipeline.map((p) => p.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Resumen de tu plataforma de inteligencia comercial</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Building2 size={18} className="text-blue-500" />
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-0.5">
              <ArrowUpRight size={12} /> +{overview?.companies_this_week ?? 0}
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{overview?.total_companies ?? 0}</p>
          <p className="text-xs text-muted-foreground">Empresas</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Users size={18} className="text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{overview?.total_contacts ?? 0}</p>
          <p className="text-xs text-muted-foreground">Contactos</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Send size={18} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{overview?.total_campaigns ?? 0}</p>
          <p className="text-xs text-muted-foreground">Campanas</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Briefcase size={18} className="text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{overview?.total_deals ?? 0}</p>
          <p className="text-xs text-muted-foreground">Negocios</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Opportunities */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Zap size={18} className="text-yellow-500" />
              Mejores Oportunidades
            </h2>
            <span className="text-xs text-muted-foreground">Top 5</span>
          </div>
          <div className="p-4 space-y-3">
            {topOpportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin oportunidades disponibles</p>
            ) : (
              topOpportunities.map((opp, i) => (
                <div key={opp.name} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{opp.name}</p>
                    <p className="text-xs text-muted-foreground">{opp.industry}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      opp.score >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {opp.score}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">{opp.value}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pipeline Mini */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Target size={18} className="text-blue-500" />
              Pipeline
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {pipeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos de pipeline</p>
            ) : (
              pipeline.map((s) => (
                <div key={s.stage} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-sm text-foreground flex-1">{s.stage}</span>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(s.count / maxPipelineCount) * 100}%`, backgroundColor: s.color }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground w-6 text-right">{s.count}</span>
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Valor total</span>
              <span className="font-bold text-foreground">${(overview?.pipeline_value ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <TrendingUp size={18} className="text-green-500" />
              Actividad Reciente
            </h2>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">Sin actividad reciente</p>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-green-500" />
            <span className="text-sm font-medium text-foreground">Ingresos Potenciales</span>
          </div>
          <p className="text-2xl font-bold text-foreground">${(overview?.pipeline_value ?? 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">{overview?.total_companies ?? 0} empresas analizadas</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={16} className="text-blue-500" />
            <span className="text-sm font-medium text-foreground">Score Promedio</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{overview?.avg_opportunity_score ?? 0}/100</p>
          <p className="text-xs text-muted-foreground mt-1">{overview?.total_companies ?? 0} empresas analizadas</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-yellow-500" />
            <span className="text-sm font-medium text-foreground">Empresas esta semana</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{overview?.companies_this_week ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">nuevas empresas analizadas</p>
        </div>
      </div>
    </div>
  );
}
