"use client";

import { useState, useEffect } from "react";
import { Building2, Search, Filter, ExternalLink, Phone, Mail } from "lucide-react";
import { api } from "@/lib/api-client";
import { Company, CompanyListResponse } from "@/lib/types";

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : score >= 60
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{score}</span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    discovered: "Descubierto",
    enriched: "Enriquecido",
    scored: "Puntuado",
  };
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
      {labels[status] || status}
    </span>
  );
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");

  useEffect(() => {
    async function fetchCompanies() {
      try {
        setLoading(true);
        setError(null);
        const params: Record<string, string> = { limit: "50" };
        if (search) params.search = search;
        if (industryFilter) params.industry = industryFilter;
        const data = await api.get<CompanyListResponse>("/api/v1/companies", params);
        setCompanies(data.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar empresas");
      } finally {
        setLoading(false);
      }
    }
    fetchCompanies();
  }, [search, industryFilter]);

  const filtered = companies.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (industryFilter && c.industry !== industryFilter) return false;
    return true;
  });

  const industries = [...new Set(companies.map((c) => c.industry).filter(Boolean))] as string[];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
          <p className="text-muted-foreground">Todas las empresas descubiertas y enriquecidas</p>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-card rounded-lg border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
          <p className="text-muted-foreground">Todas las empresas descubiertas y enriquecidas</p>
        </div>
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive">
          <p className="font-medium">Error al cargar empresas</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
        <p className="text-muted-foreground">Todas las empresas descubiertas y enriquecidas</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar empresas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          className="px-3 py-2 rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todas las industrias</option>
          {industries.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>
      </div>

      {/* Companies Table */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Empresa</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground hidden md:table-cell">Industria</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground hidden lg:table-cell">Ubicacion</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground">Score</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground hidden sm:table-cell">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((company) => (
              <tr
                key={company.id}
                className="border-b last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <Building2 size={14} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{company.name}</p>
                      {company.domain && (
                        <p className="text-xs text-muted-foreground">{company.domain}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                  {company.industry}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                  {company.city}
                </td>
                <td className="px-4 py-3 text-center">
                  <ScoreBadge score={company.opportunity_score} />
                </td>
                <td className="px-4 py-3 text-center hidden sm:table-cell">
                  <StatusBadge status={company.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No se encontraron empresas
          </div>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        Mostrando {filtered.length} de {companies.length} empresas
      </div>
    </div>
  );
}
