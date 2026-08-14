"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Search, MapPin, Target, Loader2, CheckCircle2, List, Map as MapIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import LeadCard from "@/components/leads/LeadCard";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full rounded-lg border flex items-center justify-center bg-muted/20">
      <p className="text-muted-foreground">Cargando mapa...</p>
    </div>
  ),
});

const intentExamples = [
  "Empresas que necesiten una pagina web",
  "Empresas con sitios web obsoletos",
  "Empresas sin presencia digital",
  "Empresas con malas resenas",
  "Empresas sin Google Business",
  "Restaurantes",
  "Hoteles",
  "Clinicas dentales",
];

interface CompanyLead {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  opportunity_score: number;
  status: string;
  recommended_services: string[] | null;
  has_ssl: boolean | null;
  created_at: string;
}

interface SearchResult {
  search_id: string;
  status: string;
  companies_found: number;
  companies_new: number;
  sources_used: string[];
  error: string | null;
}

export default function DiscoveryPage() {
  const [location, setLocation] = useState("Resistencia, Chaco, Argentina");
  const [radius, setRadius] = useState("10");
  const [intent, setIntent] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [leads, setLeads] = useState<CompanyLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<CompanyLead | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-27.4513, -58.9866]); // Resistencia
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"split" | "map" | "list">("split");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !intent) return;

    setIsSearching(true);
    setError("");
    setResult(null);
    setLeads([]);
    setSelectedLead(null);

    try {
      // Run discovery search
      const searchData = await api.post<SearchResult>("/api/v1/discovery/search", {
        location,
        radius_km: parseInt(radius),
        intent,
        max_results: 50,
        sources: ["google_maps", "openstreetmap", "paginas_amarillas"],
      });
      setResult(searchData);

      // Fetch all companies (they will show in list; map shows search area)
      const companiesData = await api.get<{ items: CompanyLead[] }>("/api/v1/companies", {
        limit: "100",
      });
      // Show newest companies first (most recent discoveries)
      const sorted = companiesData.items.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setLeads(sorted.slice(0, 20));
    } catch (err: any) {
      setError(err.message || "Error en la busqueda");
    } finally {
      setIsSearching(false);
    }
  };

  const leadsWithCoords = leads.filter((l) => l.latitude && l.longitude);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Descubrimiento</h1>
        <p className="text-muted-foreground">Encuentra empresas automaticamente con IA</p>
      </div>

      {/* Search Form */}
      <div className="bg-card rounded-lg border p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <MapPin size={14} className="inline mr-1" />
                Ubicacion
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej: Resistencia, Chaco, Argentina"
                className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Radio (km)</label>
              <select
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="3">3 km</option>
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="25">25 km</option>
                <option value="50">50 km</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              <Target size={14} className="inline mr-1" />
              Que buscas? (La IA interpreta tu intencion)
            </label>
            <textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="Ej: restaurantes, hoteles, clinicas, empresas sin web..."
              className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
              required
            />
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Ejemplos:</p>
            <div className="flex flex-wrap gap-2">
              {intentExamples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setIntent(example)}
                  className="px-3 py-1 rounded-full text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isSearching ? (
              <><Loader2 size={16} className="animate-spin" /> Buscando...</>
            ) : (
              <><Search size={16} /> Buscar Empresas</>
            )}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-md p-4">{error}</div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Stats */}
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-500" />
                  <span className="text-sm font-medium">{result.companies_found} encontradas</span>
                </div>
                <span className="text-sm text-muted-foreground">{result.companies_new} nuevas</span>
                <span className="text-xs text-muted-foreground">
                  Fuentes: {result.sources_used.join(", ")}
                </span>
              </div>
              <div className="flex items-center gap-1 border rounded-md p-0.5">
                <button
                  onClick={() => setViewMode("split")}
                  className={`p-1.5 rounded ${viewMode === "split" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                  title="Vista split"
                >
                  <List size={14} />
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={`p-1.5 rounded ${viewMode === "map" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                  title="Solo mapa"
                >
                  <MapIcon size={14} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                  title="Solo lista"
                >
                  <List size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Map + Leads Split View */}
          <div className={`grid gap-4 ${viewMode === "split" ? "lg:grid-cols-5" : "grid-cols-1"}`}>
            {/* Map */}
            {(viewMode === "split" || viewMode === "map") && (
              <div className={viewMode === "split" ? "lg:col-span-3" : ""}>
                <MapView
                  center={mapCenter}
                  radiusKm={parseInt(radius)}
                  leads={leadsWithCoords.map((l) => ({
                    id: l.id,
                    name: l.name,
                    latitude: l.latitude!,
                    longitude: l.longitude!,
                    opportunity_score: l.opportunity_score,
                    phone: l.phone,
                    email: l.email,
                    domain: l.domain,
                    address: l.address,
                    industry: l.industry,
                    status: l.status,
                  }))}
                  onMarkerClick={(lead) => {
                    const fullLead = leads.find((l) => l.id === lead.id);
                    if (fullLead) setSelectedLead(fullLead);
                  }}
                />
              </div>
            )}

            {/* Leads List */}
            {(viewMode === "split" || viewMode === "list") && (
              <div className={`space-y-3 ${viewMode === "split" ? "lg:col-span-2" : ""}`}>
                <p className="text-sm text-muted-foreground">{leads.length} leads encontrados</p>
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {leads.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Haz una busqueda para ver los resultados
                    </p>
                  ) : (
                    leads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        selected={selectedLead?.id === lead.id}
                        onClick={() => {
                          setSelectedLead(lead);
                          if (lead.latitude && lead.longitude) {
                            setMapCenter([lead.latitude, lead.longitude]);
                          }
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty state */}
      {!result && !isSearching && (
        <div className="bg-card rounded-lg border p-12 text-center">
          <MapPin size={48} className="mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            Define tu busqueda y encuentra leads en tu zona
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Usa el mapa para ver donde estan y la lista para ver sus datos de contacto
          </p>
        </div>
      )}
    </div>
  );
}
