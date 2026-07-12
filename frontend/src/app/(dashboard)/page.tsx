"use client";

import { useState, useEffect } from "react";
import {
  Building2, Users, Send, Briefcase, TrendingUp, Zap,
  ArrowUpRight, DollarSign, Target, MessageSquare, Loader2,
} from "lucide-react";
import { api } from "@/lib/api-client";

interface Overview {
  total_companies: number;
  companies_this_week: number;
  avg_opportunity_score: number;
  total_campaigns: number;
  total_deals: number;
  pipeline_value: number;
  won_value: number;
}

interface Company {
  id: string;
  name: string;
  industry: string | null;
  opportunity_score: number;
  domain: string | null;
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [ov, comp] = await Promise.all([
          api.get<Overview>("/api/v1/analytics/overview"),
          api.get<{ items: Company[] }>("/api/v1/companies", { limit: "5", sort_by: "opportunity_score", sort_order: "desc" }),
        ]);
        setOverview(ov);
        setCompanies(comp.items);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = [
    { label: "Empresas", value: overview?.total_companies || 0, change: `+${overview?.companies_this_week || 0}`, icon: Building2, color: "text-blue-500" },
    { label: "Score Promedio", value: overview?.avg_opportunity_score || 0, change: "", icon: Zap, color: "text-yellow-500" },
    { label: "Campanas", value: overview?.total_campaigns || 0, change: "", icon: Send, color: "text-green-500" },
    { label: "Pipeline", value: `$${(overview?.pipeline_value || 0).toLocaleString()}`, change: "", icon: DollarSign, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Resumen de tu plataforma de inteligencia comercial</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <stat.icon size={18} className={stat.color} />
              {stat.change && (
                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-0.5">
                  <ArrowUpRight size={12} /> {stat.change}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            {companies.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No hay empresas aun</p>
            ) : (
              companies.map((company, i) => (
                <div key={company.id} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{company.name}</p>
                    <p className="text-xs text-muted-foreground">{company.industry || "Sin industria"}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    company.opportunity_score >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {company.opportunity_score}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <TrendingUp size={18} className="text-green-500" />
              Metricas Rapidas
            </h2>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div className="p-3 rounded-md bg-muted/30 text-center">
              <p className="text-2xl font-bold text-foreground">{overview?.total_companies || 0}</p>
              <p className="text-xs text-muted-foreground">Empresas Totales</p>
            </div>
            <div className="p-3 rounded-md bg-muted/30 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">${(overview?.won_value || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Ganados</p>
            </div>
            <div className="p-3 rounded-md bg-muted/30 text-center">
              <p className="text-2xl font-bold text-foreground">{overview?.avg_opportunity_score || 0}/100</p>
              <p className="text-xs text-muted-foreground">Score Promedio</p>
            </div>
            <div className="p-3 rounded-md bg-muted/30 text-center">
              <p className="text-2xl font-bold text-foreground">{overview?.total_deals || 0}</p>
              <p className="text-xs text-muted-foreground">Negocios</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
