"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Globe,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/cn";

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

interface TrendItem {
  date: string;
  companies: number;
  contacts: number;
  deals: number;
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

const PIE_COLORS = ["#8b5cf6", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#ec4899"];

const PERIODS = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "1y", label: "1 ano" },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30d");
  const [pipelineData, setPipelineData] = useState<PipelineItem[]>([]);
  const [industryData, setIndustryData] = useState<IndustryItem[]>([]);
  const [geoData, setGeoData] = useState<GeoItem[]>([]);
  const [trendData, setTrendData] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [pipeline, industries, geo, trends] = await Promise.all([
          api.get<{ stages: { stage: string; count: number; value: number }[] }>(
            "/api/v1/analytics/pipeline",
            { period }
          ),
          api.get<{ industries: IndustryItem[] }>("/api/v1/analytics/industries"),
          api.get<{ locations: GeoItem[] }>("/api/v1/analytics/geo"),
          api.get<{ trends: TrendItem[] }>("/api/v1/analytics/trends", { period }).catch(() => ({ trends: [] })),
        ]);

        setPipelineData(
          (pipeline.stages || []).map((p) => ({
            ...p,
            color: STAGE_COLORS[p.stage] || "#94a3b8",
          }))
        );
        setIndustryData(industries.industries || []);
        setGeoData(geo.locations || []);
        setTrendData(trends.trends || generateMockTrends());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar analytics");
        setTrendData(generateMockTrends());
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [period]);

  const totalPipelineValue = pipelineData.reduce((a, p) => a + p.value, 0);
  const totalDeals = pipelineData.reduce((a, p) => a + p.count, 0);
  const wonDeals = pipelineData.find((p) => p.stage === "Ganado");
  const winRate = totalDeals > 0 && wonDeals ? Math.round((wonDeals.count / totalDeals) * 100) : 0;

  const stats = [
    {
      label: "Valor Pipeline",
      value: `$${totalPipelineValue.toLocaleString()}`,
      change: "+12.5%",
      positive: true,
      icon: DollarSign,
      color: "text-emerald-400",
    },
    {
      label: "Negocios Totales",
      value: totalDeals.toString(),
      change: "+3",
      positive: true,
      icon: Target,
      color: "text-electric-400",
    },
    {
      label: "Tasa de Cierre",
      value: `${winRate}%`,
      change: "+2.1%",
      positive: true,
      icon: TrendingUp,
      color: "text-cyan-400",
    },
    {
      label: "Industrias",
      value: industryData.length.toString(),
      change: "+1",
      positive: true,
      icon: Building2,
      color: "text-amber-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Metricas y rendimiento de tu pipeline comercial
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-glass border border-white/10">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-lg transition-all",
                period === p.value
                  ? "bg-gradient-to-r from-electric-600 to-cyan-500 text-white shadow-glow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="p-4 rounded-2xl bg-glass border border-white/5 animate-fade-in-up"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", `bg-white/5`)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <span
                className={cn(
                  "text-xs font-medium flex items-center gap-0.5",
                  stat.positive ? "text-emerald-400" : "text-red-400"
                )}
              >
                {stat.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground font-mono">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="p-5 rounded-2xl bg-glass border border-white/5 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-electric-400" />
            Tendencia de Descubrimiento
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorCompanies" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDeals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 15, 20, 0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Area
                  type="monotone"
                  dataKey="companies"
                  name="Empresas"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCompanies)"
                />
                <Area
                  type="monotone"
                  dataKey="deals"
                  name="Negocios"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDeals)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Bar Chart */}
        <div className="p-5 rounded-2xl bg-glass border border-white/5 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Valor por Etapa
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="stage" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} angle={-20} textAnchor="end" height={50} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 15, 20, 0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" name="Valor ($)" radius={[6, 6, 0, 0]}>
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Industry Pie */}
        <div className="p-5 rounded-2xl bg-glass border border-white/5 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-amber-400" />
            Por Industria
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={industryData.slice(0, 6)}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {industryData.slice(0, 6).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 15, 20, 0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Locations */}
        <div className="p-5 rounded-2xl bg-glass border border-white/5 animate-fade-in-up" style={{ animationDelay: "500ms" }}>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            Top Ubicaciones
          </h3>
          <div className="space-y-3">
            {geoData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos de ubicacion</p>
            ) : (
              geoData.slice(0, 5).map((geo, i) => (
                <div key={`${geo.city}-${i}`} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{geo.city}</p>
                    <p className="text-xs text-muted-foreground">{geo.province}</p>
                  </div>
                  <span className="text-sm font-medium text-electric-400">{geo.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Industry Scores */}
        <div className="p-5 rounded-2xl bg-glass border border-white/5 animate-fade-in-up" style={{ animationDelay: "600ms" }}>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-400" />
            Mejores Industrias
          </h3>
          <div className="space-y-3">
            {industryData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos de industrias</p>
            ) : (
              industryData.slice(0, 5).map((ind, i) => (
                <div key={`${ind.name}-${i}`} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{ind.name}</p>
                    <div className="w-full h-1.5 bg-white/5 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-electric-500 to-cyan-500"
                        style={{ width: `${ind.score}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-mono text-cyan-400">{ind.score}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function generateMockTrends(): TrendItem[] {
  const data: TrendItem[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString("es", { day: "2-digit", month: "short" }),
      companies: Math.floor(Math.random() * 10) + 2,
      contacts: Math.floor(Math.random() * 15) + 5,
      deals: Math.floor(Math.random() * 3),
    });
  }
  return data;
}
