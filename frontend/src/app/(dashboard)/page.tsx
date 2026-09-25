"use client";

import { useEffect, useState } from "react";
import {
  Building2, Users, Send, Briefcase, TrendingUp, Zap,
  ArrowUpRight, ArrowDownRight, DollarSign, Target,
  Loader2, BarChart3, Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { AnalyticsOverview, CompanyDetail } from "@/lib/types";

/* ─── Types ─── */
interface TopOpportunity {
  name: string;
  score: number;
  industry: string;
  value: string;
}

interface PipelineStage {
  stage: string;
  count: number;
  color: string;
}

interface DashboardError {
  message: string;
}

type CompanyWithDetail = import("@/lib/types").CompanyListResponse & { items: CompanyDetail[] };

/* ─── Constants ─── */
const STAGE_COLORS: Record<string, string> = {
  prospeccion: "#94a3b8",
  Contacto: "#60a5fa",
  Calificado: "#a78bfa",
  propuesta: "#fbbf24",
  Negociacion: "#f97316",
  Ganado: "#22c55e",
  Perdido: "#ef4444",
};

const STAGE_ORDER = [
  "prospeccion",
  "Contacto",
  "Calificado",
  "propuesta",
  "Negociacion",
  "Ganado",
  "Perdido",
];

/* ─── Mock weekly data (until analytics/weekly endpoint exists) ─── */
const generateWeeklyData = (totalCompanies: number) => {
  const weeks = ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6"];
  const base = Math.max(Math.floor(totalCompanies / 8), 5);
  return weeks.map((name, i) => ({
    name,
    empresas: base + Math.floor(Math.random() * base * (i + 1) * 0.4),
    contactos: Math.floor((base + Math.random() * base) * 2.5),
  }));
};

/* ─── Stat Card Configuration ─── */
interface StatCardConfig {
  key: string;
  label: string;
  icon: typeof Building2;
  gradient: string;
  iconBg: string;
  glowClass: string;
  getValue: (overview: AnalyticsOverview) => number;
  getChange?: (overview: AnalyticsOverview) => number | null;
}

const STAT_CARDS: StatCardConfig[] = [
  {
    key: "companies",
    label: "Empresas",
    icon: Building2,
    gradient: "from-electric-500/20 to-cyan-500/10",
    iconBg: "bg-gradient-to-br from-electric-500 to-electric-600",
    glowClass: "shadow-glow-purple",
    getValue: (o) => o.total_companies,
    getChange: (o) => o.companies_this_week,
  },
  {
    key: "contacts",
    label: "Contactos",
    icon: Users,
    gradient: "from-cyan-500/20 to-cyan-400/10",
    iconBg: "bg-gradient-to-br from-cyan-500 to-cyan-600",
    glowClass: "shadow-glow-cyan",
    getValue: (o) => o.total_contacts,
  },
  {
    key: "campaigns",
    label: "Campañas",
    icon: Send,
    gradient: "from-success/20 to-success/5",
    iconBg: "bg-gradient-to-br from-success to-success-dark",
    glowClass: "",
    getValue: (o) => o.total_campaigns,
  },
  {
    key: "deals",
    label: "Negocios",
    icon: Briefcase,
    gradient: "from-warning/20 to-neon-orange/5",
    iconBg: "bg-gradient-to-br from-warning to-neon-orange",
    glowClass: "",
    getValue: (o) => o.total_deals,
  },
];

/* ─── Skeleton Components ─── */
function StatCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="glass-card p-6 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="h-10 w-10 rounded-lg bg-white/5 shimmer" />
        <div className="h-5 w-16 rounded-full bg-white/5 shimmer" />
      </div>
      <div className="h-9 w-24 rounded-md bg-white/5 shimmer mb-2" />
      <div className="h-4 w-20 rounded bg-white/5 shimmer" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="glass-card p-6 h-full">
      <div className="h-6 w-48 rounded bg-white/5 shimmer mb-6" />
      <div className="h-64 w-full rounded-lg bg-white/5 shimmer" />
    </div>
  );
}

/* ─── Score Badge Helper ─── */
function ScoreBadge({ score }: { score: number }) {
  const variant = score >= 80 ? "success" : score >= 50 ? "warning" : "danger";
  return (
    <Badge variant={variant} size="default" dot>
      {score}
    </Badge>
  );
}

/* ─── Main Component ─── */
export default function DashboardPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [topCompanies, setTopCompanies] = useState<CompanyDetail[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DashboardError | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [overviewData, companiesData, pipelineData] = await Promise.all([
          api.get<AnalyticsOverview>("/api/v1/analytics/overview"),
          api.get<CompanyWithDetail>("/api/v1/companies", { limit: "5", sort_by: "opportunity_score" }),
          api.get<{ stages: { stage: string; count: number }[] }>("/api/v1/analytics/pipeline"),
        ]);

        setOverview(overviewData);
        setTopCompanies(companiesData.items);

        const pipelineItems = pipelineData.stages || [];
        const sortedPipeline = pipelineItems.sort(
          (a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)
        );
        setPipeline(
          sortedPipeline.map((p) => ({
            stage: p.stage,
            count: p.count,
            color: STAGE_COLORS[p.stage] || "#94a3b8",
          }))
        );
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Error al cargar el dashboard";
        setError({ message: errorMessage });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  /* ─── Loading State ─── */
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-lg bg-white/5 shimmer" />
          <div className="h-4 w-72 rounded bg-white/5 shimmer" />
        </div>

        {/* Stats grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton delay={0} />
          <StatCardSkeleton delay={100} />
          <StatCardSkeleton delay={200} />
          <StatCardSkeleton delay={300} />
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartSkeleton />
          </div>
          <div className="glass-card p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/5 shimmer" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-white/5 shimmer" />
                  <div className="h-3 w-1/2 rounded bg-white/5 shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Error State ─── */
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass-card p-8 max-w-md text-center animate-scale-in">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-danger/10 flex items-center justify-center">
            <Target className="text-danger" size={32} />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Error al cargar datos
          </h2>
          <p className="text-muted-foreground text-sm mb-6">{error.message}</p>
          <Button
            variant="primary"
            onClick={() => window.location.reload()}
            leftIcon={<Loader2 size={16} />}
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  /* ─── Derived Data ─── */
  const topOpportunities: TopOpportunity[] = topCompanies.map((c) => ({
    name: c.name,
    score: c.opportunity_score,
    industry: c.industry || "Sin industria",
    value: c.estimated_deal_value
      ? `$${c.estimated_deal_value.toLocaleString()}`
      : "—",
  }));

  const maxPipelineCount = Math.max(...pipeline.map((p) => p.count), 1);
  const weeklyData = generateWeeklyData(overview?.total_companies ?? 0);

  /* ─── Render ─── */
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <span className="gradient-text">Dashboard</span>
          <Sparkles size={20} className="text-electric-400 animate-pulse-glow" />
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Resumen de tu plataforma de inteligencia comercial
        </p>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((stat, index) => {
          const Icon = stat.icon;
          const value = overview ? (stat.getValue(overview) ?? 0) : 0;
          const change = overview && stat.getChange ? (stat.getChange(overview) ?? null) : null;

          return (
            <div
              key={stat.key}
              className={cn(
                "glass-card p-6 hover-lift animate-fade-in-up",
                stat.glowClass
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center",
                    stat.iconBg
                  )}
                >
                  <Icon size={20} className="text-white" />
                </div>
                {change !== null && change > 0 && (
                  <span className="flex items-center gap-0.5 text-xs font-medium text-success">
                    <ArrowUpRight size={14} />
                    +{change}
                  </span>
                )}
              </div>
              <p className="text-3xl font-mono font-bold text-foreground">
                {value.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Chart Section ── */}
        <div
          className="lg:col-span-2 glass-card p-6 animate-fade-in-up"
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <BarChart3 size={18} className="text-electric-400" />
                Empresas por Semana
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Ultimas 6 semanas de actividad
              </p>
            </div>
            <Badge variant="electric" size="default" dot>
              Semanal
            </Badge>
          </div>

          {overview && overview.total_companies > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={weeklyData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorEmpresas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorContactos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15, 15, 30, 0.9)",
                      border: "1px solid rgba(139, 92, 246, 0.2)",
                      borderRadius: "8px",
                      backdropFilter: "blur(16px)",
                    }}
                    labelStyle={{ color: "#fff" }}
                    itemStyle={{ color: "#a78bfa" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="empresas"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorEmpresas)"
                  />
                  <Area
                    type="monotone"
                    dataKey="contactos"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorContactos)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              icon={<BarChart3 size={32} className="text-muted-foreground" />}
              message="Sin datos suficientes para mostrar el grafico"
              cta={
                <Link href="/discovery">
                  <Button variant="outline" size="sm">
                    Explorar empresas
                  </Button>
                </Link>
              }
            />
          )}
        </div>

        {/* ── Top Opportunities ── */}
        <div
          className="glass-card p-6 animate-fade-in-up"
          style={{ animationDelay: "300ms" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Zap size={18} className="text-warning" />
              Mejores Oportunidades
            </h2>
            <Badge variant="electric" size="sm">
              Top 5
            </Badge>
          </div>

          {topOpportunities.length === 0 ? (
            <EmptyState
              icon={<Target size={32} className="text-muted-foreground" />}
              message="No hay oportunidades disponibles"
              cta={
                <Link href="/scoring">
                  <Button variant="outline" size="sm">
                    Ejecutar scoring
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {topOpportunities.map((opp, i) => (
                <div
                  key={opp.name}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-smooth",
                    "bg-white/[0.02] hover:bg-white/[0.05] border border-transparent",
                    "hover:border-electric-500/20 animate-fade-in-up"
                  )}
                  style={{ animationDelay: `${(i + 3) * 80}ms` }}
                >
                  <span className="text-sm font-mono font-bold text-electric-400 w-6 text-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {opp.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{opp.industry}</p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <ScoreBadge score={opp.score} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Pipeline Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Pipeline Visual ── */}
        <div
          className="glass-card p-6 animate-fade-in-up"
          style={{ animationDelay: "400ms" }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Target size={18} className="text-cyan-400" />
              Pipeline
            </h2>
            <span className="text-sm font-mono text-foreground">
              <span className="text-muted-foreground">Total:</span>{" "}
              <span className="gradient-text font-bold">
                ${(overview?.pipeline_value ?? 0).toLocaleString()}
              </span>
            </span>
          </div>

          {pipeline.length === 0 ? (
            <EmptyState
              icon={<Briefcase size={32} className="text-muted-foreground" />}
              message="Sin datos de pipeline"
              cta={
                <Link href="/deals">
                  <Button variant="outline" size="sm">
                    Crear negocio
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-4">
              {pipeline.map((stage, i) => {
                const percentage = (stage.count / maxPipelineCount) * 100;
                return (
                  <div key={stage.stage} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="text-sm text-foreground">{stage.stage}</span>
                      </div>
                      <span className="text-sm font-mono font-medium text-foreground">
                        {stage.count}
                      </span>
                    </div>
                    <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-1000 ease-out",
                          "animate-slide-up"
                        )}
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: stage.color,
                          animationDelay: `${(i + 5) * 100}ms`,
                          boxShadow: `0 0 12px ${stage.color}40`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Quick Metrics ── */}
        <div
          className="glass-card p-6 animate-fade-in-up"
          style={{ animationDelay: "500ms" }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <TrendingUp size={18} className="text-success" />
              Metricas Rapidas
            </h2>
            <Badge variant="success" size="sm" dot>
              Live
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <MetricTile
              icon={<DollarSign size={18} className="text-success" />}
              value={`$${(overview?.pipeline_value ?? 0).toLocaleString()}`}
              label="Valor Pipeline"
              variant="success"
            />
            <MetricTile
              icon={<TrendingUp size={18} className="text-electric-400" />}
              value={`${(overview?.avg_opportunity_score ?? 0)}/100`}
              label="Score Promedio"
              variant="electric"
            />
            <MetricTile
              icon={<Building2 size={18} className="text-cyan-400" />}
              value={`${(overview?.companies_this_week ?? 0)}`}
              label="Nuevas esta semana"
              variant="cyan"
            />
            <MetricTile
              icon={<Briefcase size={18} className="text-warning" />}
              value={`${(overview?.total_deals ?? 0)}`}
              label="Total Negocios"
              variant="warning"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function EmptyState({
  icon,
  message,
  cta,
}: {
  icon: React.ReactNode;
  message: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
      <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center mb-4">
        {icon}
      </div>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {cta}
    </div>
  );
}

function MetricTile({
  icon,
  value,
  label,
  variant = "electric",
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  variant?: "success" | "electric" | "cyan" | "warning";
}) {
  const iconBgClass = {
    success: "bg-success/10",
    electric: "bg-electric-500/10",
    cyan: "bg-cyan-500/10",
    warning: "bg-warning/10",
  }[variant];

  return (
    <div
      className={cn(
        "p-4 rounded-lg transition-smooth border border-white/5",
        "hover:border-white/10 hover:bg-white/[0.03] bg-white/[0.02]"
      )}
    >
      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center mb-3", iconBgClass)}>
        {icon}
      </div>
      <p className="text-xl font-mono font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
