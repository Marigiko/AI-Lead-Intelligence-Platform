"use client";

import { useEffect, useState } from "react";
import { Zap, TrendingUp, Globe, Search, Share2, Bot, Server } from "lucide-react";
import { api } from "@/lib/api-client";
import { CompanyDetail, CompanyListResponse } from "@/lib/types";

type CompanyWithDetail = CompanyListResponse & { items: CompanyDetail[] };

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : score >= 40 ? "#f97316" : "#ef4444";

  return (
    <div className="relative w-20 h-20">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
        <circle
          cx="40" cy="40" r="36" fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

function BreakdownBar({ label, value, max, icon: Icon }: { label: string; value: number; max: number; icon: any }) {
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className="text-muted-foreground flex-shrink-0" />
      <span className="text-xs text-muted-foreground w-20">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-foreground w-6 text-right">{value}</span>
    </div>
  );
}

export default function ScoringPage() {
  const [companies, setCompanies] = useState<CompanyDetail[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const data = await api.get<CompanyWithDetail>("/api/v1/companies", {
          sort_by: "opportunity_score",
          limit: "20",
        });
        setCompanies(data.items);
        if (data.items.length > 0) {
          setSelectedCompany(data.items[0]);
        }
      } catch (err: any) {
        setError(err.error?.message || err.message || "Failed to load scores");
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
        <span className="ml-3 text-muted-foreground">Cargando scores...</span>
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

  const breakdown = selectedCompany?.opportunity_breakdown || {};
  const services = selectedCompany?.recommended_services || [];
  const dealValue = selectedCompany?.estimated_deal_value ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Opportunity Scoring</h1>
        <p className="text-muted-foreground">Analisis automatico de oportunidades de negocio</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total Analizadas</p>
          <p className="text-2xl font-bold text-foreground">{companies.length}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Alta Oportunidad (80+)</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {companies.filter((c) => c.opportunity_score >= 80).length}
          </p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Valor Potencial</p>
          <p className="text-2xl font-bold text-foreground">
            ${companies.reduce((a, c) => a + (c.estimated_deal_value ?? 0), 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company List */}
        <div className="lg:col-span-2 bg-card rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-foreground">Ranking por Oportunidad</h2>
          </div>
          <div className="divide-y">
            {companies.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">Sin empresas disponibles</div>
            ) : (
              companies.map((company, i) => (
                <div
                  key={company.id}
                  onClick={() => setSelectedCompany(company)}
                  className={`flex items-center gap-4 p-4 cursor-pointer transition-colors ${
                    selectedCompany?.id === company.id ? "bg-primary/5" : "hover:bg-muted/30"
                  }`}
                >
                  <span className="text-sm font-medium text-muted-foreground w-6">{i + 1}</span>
                  <ScoreRing score={company.opportunity_score} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{company.name}</p>
                    <p className="text-xs text-muted-foreground">{company.domain || "Sin sitio web"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">
                      ${(company.estimated_deal_value ?? 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">valor estimado</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedCompany && (
          <div className="bg-card rounded-lg border p-4 space-y-4">
            <div className="text-center">
              <ScoreRing score={selectedCompany.opportunity_score} />
              <h3 className="mt-2 font-semibold text-foreground">{selectedCompany.name}</h3>
              <p className="text-xs text-muted-foreground">{selectedCompany.domain || "Sin sitio web"}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Desglose</p>
              <BreakdownBar label="Web" value={breakdown.web_presence || 0} max={25} icon={Globe} />
              <BreakdownBar label="SEO" value={breakdown.seo || 0} max={25} icon={Search} />
              <BreakdownBar label="Social" value={breakdown.social || 0} max={15} icon={Share2} />
              <BreakdownBar label="Automat." value={breakdown.automation || 0} max={20} icon={Bot} />
              <BreakdownBar label="Tecnico" value={breakdown.technical || 0} max={15} icon={Server} />
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Servicios Recomendados
              </p>
              <div className="flex flex-wrap gap-1.5">
                {services.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Sin recomendaciones</span>
                ) : (
                  services!.map((s: string) => (
                    <span key={s} className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                      {s}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Valor estimado:{" "}
                <span className="font-bold text-foreground">
                  ${dealValue.toLocaleString()}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
