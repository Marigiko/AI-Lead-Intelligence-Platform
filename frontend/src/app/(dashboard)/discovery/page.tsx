"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Search,
  MapPin,
  Target,
  Zap,
  Globe,
  Phone,
  Mail,
  BookmarkPlus,
  Sparkles,
  AlertCircle,
  ChevronRight,
  SlidersHorizontal,
  Building2,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// Types from @/lib/types
import type { CompanyDetail } from "@/lib/types/index";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full rounded-xl border border-border/30 glass-card flex items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-electric-500 border-t-transparent" />
        <span className="text-sm">Cargando mapa...</span>
      </div>
    </div>
  ),
});

// ─── Types ───
type SearchStatus = "idle" | "loading" | "results" | "error";

interface DiscoverySearchResult {
  search_id: string;
  status: string;
  companies_found: number;
  companies_new: number;
  sources_used: string[];
  error: string | null;
}

interface ApiError {
  error?: {
    message?: string;
  };
}

// ─── Constants ───
const INTENT_EXAMPLES = [
  "Empresas que necesiten una pagina web",
  "Empresas con sitios web obsoletos",
  "Empresas sin presencia digital",
  "Empresas con malas resenas",
  "Empresas sin Google Business",
  "Restaurantes",
  "Hoteles",
  "Clinicas dentales",
];

const SOURCE_CONFIG: Record<string, { label: string; icon: typeof Globe }> = {
  google_maps: { label: "Google Maps", icon: MapPin },
  openstreetmap: { label: "OpenStreetMap", icon: Globe },
  paginas_amarillas: { label: "Paginas Amarillas", icon: Building2 },
};

// ─── Score Ring Component ───
function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (score / 100) * circumference;
  const colorClass =
    score >= 70
      ? "stroke-success"
      : score >= 40
        ? "stroke-warning"
        : "stroke-danger";
  const bgClass =
    score >= 70
      ? "bg-success/10"
      : score >= 40
        ? "bg-warning/10"
        : "bg-danger/10";

  return (
    <div className={cn("relative h-12 w-12 flex items-center justify-center rounded-full", bgClass)}>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44">
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-border/30"
        />
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(colorClass, "transition-all duration-700")}
        />
      </svg>
      <span className={cn("text-sm font-bold", colorClass.replace("stroke-", "text-"))}>
        {score}
      </span>
    </div>
  );
}

// ─── Skeleton Card ───
function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="glass-card p-5 animate-pulse"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-full bg-muted/30 shimmer" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-3/4 rounded-lg bg-muted/30 shimmer" />
          <div className="h-3 w-1/2 rounded-lg bg-muted/20 shimmer" />
          <div className="flex gap-2 mt-3">
            <div className="h-6 w-16 rounded-full bg-muted/20 shimmer" />
            <div className="h-6 w-20 rounded-full bg-muted/20 shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───
export default function DiscoveryPage() {
  // ─── State ───
  const [location, setLocation] = useState("Resistencia, Chaco, Argentina");
  const [radius, setRadius] = useState(10);
  const [intent, setIntent] = useState("");
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [searchResult, setSearchResult] = useState<DiscoverySearchResult | null>(null);
  const [leads, setLeads] = useState<CompanyDetail[]>([]);
  const [selectedLead, setSelectedLead] = useState<CompanyDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number]>([-27.4513, -58.9866]);
  const [activeSources, setActiveSources] = useState<string[]>([
    "google_maps",
    "openstreetmap",
    "paginas_amarillas",
  ]);

  // ─── Handlers ───
  const toggleSource = useCallback((source: string) => {
    setActiveSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  }, []);

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!location || !intent) return;

      setSearchStatus("loading");
      setErrorMessage("");
      setSearchResult(null);
      setLeads([]);
      setSelectedLead(null);

      try {
        // POST discovery search
        const result = await api.post<DiscoverySearchResult>("/api/v1/discovery/search", {
          location,
          radius_km: radius,
          intent,
          max_results: 50,
          sources: activeSources,
        });
        setSearchResult(result);

        // GET search results
        const { items } = await api.get<{ items: CompanyDetail[] }>(
          `/api/v1/discovery/search/${result.search_id}/results`
        );
        // Sort by newest first (most recent discoveries)
        const sorted = items.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setLeads(sorted);
        setSearchStatus("results");
      } catch (err: unknown) {
        const apiError = err as ApiError;
        setErrorMessage(
          apiError?.error?.message || "Error en la busqueda. Intenta de nuevo."
        );
        setSearchStatus("error");
      }
    },
    [location, radius, intent, activeSources]
  );

  const leadsWithCoords = leads.filter(
    (l): l is CompanyDetail & { latitude: number; longitude: number } =>
      l.latitude !== null && l.longitude !== null
  );

  // ─── Render ───
  return (
    <div className="space-y-6 pb-8">
      {/* ─── Premium Header ─── */}
      <header className="animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow-sm">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Descubrimiento</h1>
            <p className="text-sm text-muted-foreground">
              Encuentra empresas automaticamente con IA
            </p>
          </div>
        </div>
      </header>

      {/* ─── Glassmorphism Search Panel ─── */}
      <Card
        variant="gradient"
        padding="lg"
        className="animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        <form onSubmit={handleSearch} className="space-y-5">
          {/* Location + Radius Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <MapPin className="h-4 w-4 text-electric-400" />
                Ubicacion
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ej: Resistencia, Chaco, Argentina"
                  className="input-premium w-full pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <SlidersHorizontal className="h-4 w-4 text-cyan-400" />
                Radio: <span className="text-electric-400 font-semibold">{radius} km</span>
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="w-full mt-3 h-2 rounded-full appearance-none bg-muted accent-electric-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1km</span>
                <span>25km</span>
                <span>50km</span>
              </div>
            </div>
          </div>

          {/* Intent Input */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Target className="h-4 w-4 text-electric-400" />
              Que buscas?
              <span className="text-xs text-muted-foreground font-normal">
                (La IA interpreta tu intencion)
              </span>
            </label>
            <div className="relative">
              <Target className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <textarea
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                placeholder="Ej: restaurantes, hoteles, clinicas, empresas sin web..."
                className="input-premium w-full pl-10 min-h-[72px] resize-none"
                required
              />
            </div>
          </div>

          {/* Intent Examples */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Ejemplos rapidos:</p>
            <div className="flex flex-wrap gap-2">
              {INTENT_EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setIntent(example)}
                  className="px-3 py-1 rounded-full text-xs bg-muted/50 text-muted-foreground
                             border border-border/50 hover:border-electric-500/40
                             hover:bg-electric-500/10 hover:text-electric-300
                             transition-all duration-200"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Source Chips */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Fuentes de datos:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SOURCE_CONFIG).map(([key, { label, icon: Icon }]) => {
                const isActive = activeSources.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleSource(key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200",
                      isActive
                        ? "bg-electric-500/15 border-electric-500/40 text-electric-300 shadow-glow-sm"
                        : "bg-muted/30 border-border/30 text-muted-foreground hover:border-border"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    {isActive && (
                      <span className="ml-1 h-1.5 w-1.5 rounded-full bg-electric-400 animate-pulse-glow" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={searchStatus === "loading"}
            leftIcon={<Search className="h-5 w-5" />}
            className="w-full md:w-auto"
          >
            Buscar Empresas
          </Button>
        </form>
      </Card>

      {/* ─── Error State ─── */}
      {searchStatus === "error" && (
        <Card
          variant="bordered"
          padding="default"
          className="animate-fade-in border-danger/30 bg-danger/5"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-danger mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-danger">Error en la busqueda</p>
              <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
            </div>
          </div>
        </Card>
      )}

      {/* ─── Loading State ─── */}
      {searchStatus === "loading" && (
        <div className="space-y-4 animate-fade-in">
          {/* Stats skeleton */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-4">
              <div className="h-4 w-32 rounded-lg bg-muted/30 shimmer" />
              <div className="h-4 w-24 rounded-lg bg-muted/20 shimmer" />
              <div className="h-4 w-28 rounded-lg bg-muted/20 shimmer" />
            </div>
          </div>

          {/* Cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} delay={i * 100} />
            ))}
          </div>
        </div>
      )}

      {/* ─── Results ─── */}
      {searchStatus === "results" && searchResult && (
        <div className="space-y-6 animate-fade-in">
          {/* Stats Bar */}
          <Card
            variant="bordered"
            padding="sm"
            className="animate-slide-up"
          >
            <div className="flex flex-wrap items-center gap-4">
              <Badge variant="success" dot size="lg">
                {searchResult.companies_found} encontradas
              </Badge>
              <Badge variant="info" dot>
                {searchResult.companies_new} nuevas
              </Badge>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Fuentes:</span>
                {searchResult.sources_used.map((src) => (
                  <Badge key={src} variant="outline" size="sm">
                    {SOURCE_CONFIG[src]?.label || src}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>

          {/* Map + Results Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Map - 3 cols */}
            <div className="lg:col-span-3 animate-slide-up" style={{ animationDelay: "100ms" }}>
              <Card padding="none" className="overflow-hidden" variant="bordered">
                <CardHeader className="px-4 pt-4 pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-electric-400" />
                    Mapa de descubrimiento
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <MapView
                    center={mapCenter}
                    radiusKm={radius}
                    leads={leadsWithCoords.map((l) => ({
                      id: l.id,
                      name: l.name,
                      latitude: l.latitude,
                      longitude: l.longitude,
                      opportunity_score: l.opportunity_score,
                      phone: l.phone,
                      email: l.email,
                      domain: l.domain,
                      address: `${l.city ?? ""}${l.city && l.province ? ", " : ""}${l.province ?? ""}`,
                      industry: l.industry,
                      status: l.status,
                    }))}
                    onMarkerClick={(marker) => {
                      const fullLead = leads.find((l) => l.id === marker.id);
                      if (fullLead) setSelectedLead(fullLead);
                    }}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Results List - 2 cols */}
            <div className="lg:col-span-2 space-y-3">
              <p className="text-sm text-muted-foreground px-1">
                {leads.length} leads encontrados
              </p>
              <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1 scrollbar-premium">
                {leads.map((lead, index) => (
                  <article
                    key={lead.id}
                    onClick={() => {
                      setSelectedLead(lead);
                      if (lead.latitude && lead.longitude) {
                        setMapCenter([lead.latitude, lead.longitude]);
                      }
                    }}
                    style={{ animationDelay: `${index * 60}ms` }}
                    className={cn(
                      "glass-card p-4 cursor-pointer animate-fade-in-up transition-smooth",
                      selectedLead?.id === lead.id &&
                        "border-electric-500/50 shadow-glow-sm"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Score Ring */}
                      <ScoreRing score={lead.opportunity_score} />

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground truncate">
                            {lead.name}
                          </h3>
                          {lead.industry && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {lead.industry}
                            </p>
                          )}
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-1">
                          {lead.phone && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span className="truncate">{lead.phone}</span>
                            </div>
                          )}
                          {lead.email && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{lead.email}</span>
                            </div>
                          )}
                          {lead.domain && (
                            <div className="flex items-center gap-2 text-xs">
                              <Globe className="h-3 w-3 text-cyan-400" />
                              <span className="truncate text-cyan-400">{lead.domain}</span>
                            </div>
                          )}
                          {lead.city && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">
                                {lead.city}
                                {lead.province && `, ${lead.province}`}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Enrich action placeholder
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium
                                       bg-electric-500/10 text-electric-300 border border-electric-500/20
                                       hover:bg-electric-500/20 hover:border-electric-500/40
                                       transition-all duration-200"
                          >
                            <Sparkles className="h-3 w-3" />
                            Enriquecer
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Save action placeholder
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium
                                       bg-cyan-500/10 text-cyan-300 border border-cyan-500/20
                                       hover:bg-cyan-500/20 hover:border-cyan-500/40
                                       transition-all duration-200"
                          >
                            <BookmarkPlus className="h-3 w-3" />
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              // View details
                            }}
                            className="ml-auto flex items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-medium
                                       text-muted-foreground hover:text-foreground transition-colors duration-200"
                          >
                            Ver
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Empty State (Idle) ─── */}
      {searchStatus === "idle" && (
        <Card
          variant="gradient"
          padding="lg"
          className="animate-fade-in-up py-16 text-center"
          style={{ animationDelay: "200ms" }}
        >
          <div className="max-w-md mx-auto space-y-5">
            {/* Illustration */}
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 rounded-2xl bg-gradient-primary opacity-20 blur-xl animate-pulse-glow" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl glass-card border-electric-500/30">
                <MapPin className="h-10 w-10 text-electric-400" />
              </div>
            </div>

            {/* Text */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">
                Descubre tu proximo cliente
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Define una ubicacion y describe que tipo de empresas buscas.
                Nuestra IA encontrara leads con alto potencial en tu zona.
              </p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {["Analisis con IA", "Fuentes multiples", "Datos verificados"].map((feat) => (
                <Badge key={feat} variant="gradient" size="lg">
                  {feat}
                </Badge>
              ))}
            </div>

            {/* CTA hint */}
            <p className="text-xs text-muted-foreground pt-2 flex items-center justify-center gap-1">
              <Target className="h-3.5 w-3.5 text-electric-400" />
              Escribe tu intencion arriba y presiona{" "}
              <span className="font-medium text-electric-400">Buscar</span>
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
