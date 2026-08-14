"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Search,
  Plus,
  Phone,
  Mail,
  Globe,
  MapPin,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  Filter,
  X,
} from "lucide-react";
import { api } from "@/lib/api-client";
import type { Company, CompanyListResponse } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { Badge } from "@/components/ui";
import { Button } from "@/components/ui";

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface ApiError {
  message: string;
}

function toApiError(err: unknown): ApiError {
  if (err instanceof Error) return { message: err.message };
  if (typeof err === "string") return { message: err };
  return { message: "Error inesperado al cargar empresas" };
}

/* ═══════════════════════════════════════════════════════════
   PAGINATION CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const PAGE_SIZE = 12;

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════ */

/** Premium score circle with semantic color coding */
function ScoreIndicator({ score }: { score: number }) {
  const { color, ring, label } = useMemo(() => {
    if (score >= 80)
      return {
        color: "text-success-light",
        ring: "border-success/40",
        label: "Alto",
      };
    if (score >= 60)
      return {
        color: "text-warning-light",
        ring: "border-warning/40",
        label: "Medio",
      };
    return {
      color: "text-danger-light",
      ring: "border-danger/40",
      label: "Bajo",
    };
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "relative flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-300",
          ring,
          "bg-gradient-to-br from-white/5 to-transparent"
        )}
      >
        <span className={cn("text-sm font-bold tabular-nums", color)}>
          {score}
        </span>
        <svg
          className="absolute inset-0 -rotate-90"
          viewBox="0 0 44 44"
          aria-hidden="true"
        >
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${(score / 100) * 113} 113`}
            className={cn("opacity-20", color)}
          />
        </svg>
      </div>
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

/** Localized status badge with premium styling */
function StatusBadge({ status }: { status: string }) {
  const config = useMemo(() => {
    switch (status) {
      case "enriched":
        return { label: "Enriquecido", variant: "cyan" as const, dot: true };
      case "scored":
        return { label: "Puntuado", variant: "success" as const, dot: true };
      case "discovered":
        return { label: "Descubierto", variant: "info" as const, dot: true };
      case "contacted":
        return { label: "Contactado", variant: "warning" as const, dot: true };
      default:
        return { label: status, variant: "default" as const, dot: false };
    }
  }, [status]);

  return (
    <Badge variant={config.variant} size="sm" dot={config.dot}>
      {config.label}
    </Badge>
  );
}

/** Colorful avatar with company initials */
function CompanyAvatar({ name }: { name: string }) {
  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }, [name]);

  const gradients = [
    "from-electric-500 to-cyan-400",
    "from-cyan-400 to-electric-500",
    "from-electric-600 to-cyan-500",
    "from-cyan-500 to-electric-400",
    "from-electric-400 to-cyan-300",
  ];

  const gradient = gradients[name.length % gradients.length];

  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br shadow-glow-sm",
        gradient
      )}
    >
      <span className="text-xs font-bold text-white">{initials}</span>
    </div>
  );
}

/** Skeleton row with shimmer effect */
function TableSkeletonRow({ index }: { index: number }) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 border-b border-border/30 px-6 py-4",
        index % 2 === 0 ? "bg-white/[0.02]" : ""
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex h-10 w-10 shrink-0 animate-pulse rounded-lg bg-white/5" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-40 animate-pulse rounded bg-white/5" />
        <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
      </div>
      <div className="hidden h-4 w-20 animate-pulse rounded bg-white/5 md:block" />
      <div className="hidden h-8 w-8 animate-pulse rounded-full bg-white/5 lg:block" />
      <div className="hidden h-6 w-16 animate-pulse rounded-full bg-white/5 sm:block" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function CompaniesPage() {
  const router = useRouter();

  // ── State ──
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  // ── Debounced search ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Data fetching ──
  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      };
      if (search) params.search = search;
      const data = await api.get<CompanyListResponse>("/api/v1/companies", params);
      setCompanies(data.items);
      setTotal(data.total);
    } catch (err) {
      const apiErr = toApiError(err);
      setError(apiErr.message);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // ── Derived values ──
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startItem = page * PAGE_SIZE + 1;
  const endItem = Math.min((page + 1) * PAGE_SIZE, total);

  // ── Industry filter options from current data ──
  const industries = useMemo(
    () => [...new Set(companies.map((c) => c.industry).filter(Boolean))] as string[],
    [companies]
  );

  /* ═══════════════════════════════════════════════════════
     LOADING STATE
     ═══════════════════════════════════════════════════════ */
  if (loading && companies.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-white/5" />
            <div className="h-4 w-64 animate-pulse rounded bg-white/5" />
          </div>
          <div className="h-11 w-40 animate-pulse rounded-lg bg-white/5" />
        </div>

        {/* Search skeleton */}
        <div className="h-11 w-full animate-pulse rounded-xl bg-white/5" />

        {/* Table skeleton */}
        <div className="glass-card overflow-hidden">
          <div className="border-b border-border/30 px-6 py-3">
            <div className="h-4 w-32 animate-pulse rounded bg-white/5" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <TableSkeletonRow key={i} index={i} />
          ))}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     ERROR STATE
     ═══════════════════════════════════════════════════════ */
  if (error && companies.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center animate-fade-in-up">
        <Card variant="bordered" padding="lg" className="max-w-md text-center">
          <CardContent className="space-y-4 pt-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10">
              <AlertTriangle className="h-8 w-8 text-danger-light" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Error al cargar empresas
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
            <Button
              variant="primary"
              size="default"
              onClick={loadCompanies}
              className="w-full"
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     MAIN RENDER
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Premium Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Empresas
            </h1>
            {total > 0 && (
              <Badge variant="gradient" size="sm" animated>
                {total} total
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona y analiza todas las empresas de tu pipeline
          </p>
        </div>
        <Button
          variant="primary"
          size="default"
          leftIcon={<Plus size={16} />}
          onClick={() => router.push("/companies/new")}
          className="shadow-glow-sm"
        >
          Nueva Empresa
        </Button>
      </div>

      {/* ── Search & Filters ── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60"
          />
          <input
            type="text"
            placeholder="Buscar por nombre, dominio o industria..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={cn(
              "w-full rounded-xl border border-border/50 bg-white/[0.03] py-2.5 pl-11 pr-10",
              "text-sm text-foreground placeholder:text-muted-foreground/50",
              "backdrop-blur-sm transition-all duration-200",
              "focus:border-electric-500/50 focus:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-electric-500/20"
            )}
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground/60 hover:bg-white/5 hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {industries.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground" />
            <div className="flex flex-wrap gap-1.5">
              {industries.slice(0, 4).map((ind) => (
                <Badge
                  key={ind}
                  variant="outline"
                  size="sm"
                  className="cursor-pointer hover:bg-electric-500/10 transition-colors"
                >
                  {ind}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Companies Grid / Table ── */}
      <Card
        variant="default"
        padding="none"
        className="overflow-hidden animate-fade-in-up"
      >
        {/* Desktop Header (hidden on mobile) */}
        <div className="hidden border-b border-border/30 bg-white/[0.02] px-6 py-3 md:block">
          <div className="grid grid-cols-12 gap-4 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
            <div className="col-span-5">Empresa</div>
            <div className="col-span-2">Contacto</div>
            <div className="col-span-2">Ubicacion</div>
            <div className="col-span-1 text-center">Score</div>
            <div className="col-span-2 text-center">Estado</div>
          </div>
        </div>

        {/* Company Rows */}
        <CardContent className="p-0">
          {companies.length > 0 ? (
            <div className="divide-y divide-border/20">
              {companies.map((company, index) => (
                <div
                  key={company.id}
                  className={cn(
                    "group relative transition-all duration-300",
                    "hover:bg-electric-500/[0.03] hover:shadow-[inset_0_0_30px_rgba(139,92,246,0.05)]",
                    index % 2 === 0 ? "bg-white/[0.01]" : ""
                  )}
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  {/* Main row content */}
                  <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-12 md:items-center md:gap-4 md:px-6 md:py-4">
                    {/* Company Info */}
                    <div className="col-span-1 flex items-center gap-3 md:col-span-5">
                      <CompanyAvatar name={company.name} />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/companies/${company.id}`}
                          className="group/link flex items-center gap-1.5"
                        >
                          <span className="truncate text-sm font-semibold text-foreground transition-colors group-hover/link:text-electric-400">
                            {company.name}
                          </span>
                          <ArrowUpRight
                            size={12}
                            className="shrink-0 text-muted-foreground/0 transition-all group-hover/link:text-electric-400 group-hover/link:opacity-100 opacity-0"
                          />
                        </Link>
                        {company.domain && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <Globe size={10} />
                            <span className="truncate">{company.domain}</span>
                          </p>
                        )}
                        {company.industry && (
                          <Badge variant="purple" size="sm" className="mt-1.5 md:hidden">
                            {company.industry}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="col-span-1 hidden space-y-1.5 md:col-span-2 md:block">
                      {company.phone && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone size={10} className="shrink-0" />
                          <span className="truncate">{company.phone}</span>
                        </p>
                      )}
                      {company.email && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail size={10} className="shrink-0" />
                          <span className="truncate">{company.email}</span>
                        </p>
                      )}
                      {!company.phone && !company.email && (
                        <span className="text-xs text-muted-foreground/40">Sin contacto</span>
                      )}
                    </div>

                    {/* Location */}
                    <div className="col-span-1 hidden items-center gap-1.5 md:col-span-2 md:flex">
                      <MapPin size={12} className="shrink-0 text-muted-foreground/50" />
                      <span className="truncate text-sm text-muted-foreground">
                        {company.city || "N/A"}
                        {company.country ? `, ${company.country}` : ""}
                      </span>
                    </div>

                    {/* Score */}
                    <div className="col-span-1 flex items-center justify-between md:justify-center md:col-span-1">
                      <span className="text-xs text-muted-foreground md:hidden">Score</span>
                      <ScoreIndicator score={company.opportunity_score} />
                    </div>

                    {/* Status + Actions */}
                    <div className="col-span-1 flex items-center justify-between gap-3 md:col-span-2 md:justify-center">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={company.status} />
                        {company.industry && (
                          <Badge variant="purple" size="sm" className="hidden lg:inline-flex">
                            {company.industry}
                          </Badge>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <Link href={`/companies/${company.id}`}>
                          <Button variant="ghost" size="icon-sm" title="Ver detalle">
                            <Eye size={14} />
                          </Button>
                        </Link>
                        <Link href={`/companies/${company.id}/edit`}>
                          <Button variant="ghost" size="icon-sm" title="Editar">
                            <Pencil size={14} />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Eliminar"
                          className="hover:text-danger-light hover:bg-danger/10"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── Empty State ── */
            <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
              <div className="relative mb-6">
                <div className="absolute inset-0 animate-pulse-glow rounded-full bg-electric-500/20 blur-xl" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-electric-500/20 bg-gradient-to-br from-electric-500/10 to-cyan-500/10">
                  <Building2 className="h-10 w-10 text-electric-400" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {search ? "Sin resultados" : "Sin empresas aun"}
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {search
                  ? `No encontramos empresas para "${search}". Intenta con otro termino.`
                  : "Comienza agregando empresas a tu pipeline para analizar oportunidades de negocio."}
              </p>
              <div className="mt-6 flex items-center gap-3">
                {search && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchInput("")}
                    leftIcon={<X size={14} />}
                  >
                    Limpiar busqueda
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push("/companies/new")}
                  leftIcon={<Plus size={14} />}
                  className="shadow-glow-sm"
                >
                  Nueva Empresa
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Pagination ── */}
      {total > PAGE_SIZE && (
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row animate-fade-in-up">
          <p className="text-sm text-muted-foreground">
            Mostrando{" "}
            <span className="font-medium text-foreground">
              {total === 0 ? 0 : startItem}–{endItem}
            </span>{" "}
            de <span className="font-medium text-foreground">{total}</span> empresas
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              aria-label="Pagina anterior"
            >
              <ChevronLeft size={16} />
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i;
                } else if (page < 3) {
                  pageNum = i;
                } else if (page > totalPages - 4) {
                  pageNum = totalPages - 5 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-all duration-200",
                      page === pageNum
                        ? "bg-gradient-to-r from-electric-600 to-cyan-500 text-white shadow-glow-sm"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
            </div>

            <Button
              variant="ghost"
              size="icon-sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              aria-label="Pagina siguiente"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* ── Quick Stats Footer ── */}
      {companies.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <div className="glass-subtle rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-electric-400">
              {companies.filter((c) => c.opportunity_score >= 80).length}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Alto score</p>
          </div>
          <div className="glass-subtle rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-cyan-400">
              {companies.filter((c) => c.status === "enriched").length}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Enriquecidas</p>
          </div>
          <div className="glass-subtle rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-success-light">
              {companies.filter((c) => c.status === "scored").length}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Puntuadas</p>
          </div>
          <div className="glass-subtle rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-warning-light">
              {industries.length}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Industrias</p>
          </div>
        </div>
      )}
    </div>
  );
}
