"use client";

import { useState } from "react";
import { Search, MapPin, Target, Loader2, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api-client";

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
  const [radius, setRadius] = useState("5");
  const [intent, setIntent] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !intent) return;

    setIsSearching(true);
    setError("");
    setResult(null);

    try {
      const data = await api.post<SearchResult>("/api/v1/discovery/search", {
        location,
        radius_km: parseInt(radius),
        intent,
        max_results: 50,
        sources: ["openstreetmap"],
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Error en la busqueda");
    } finally {
      setIsSearching(false);
    }
  };

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

      {/* Results */}
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-md p-4">{error}</div>
      )}

      {result && (
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={20} className="text-green-500" />
            <h2 className="font-semibold text-foreground">Busqueda Completada</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-md bg-muted/30 text-center">
              <p className="text-2xl font-bold text-foreground">{result.companies_found}</p>
              <p className="text-xs text-muted-foreground">Encontradas</p>
            </div>
            <div className="p-3 rounded-md bg-muted/30 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.companies_new}</p>
              <p className="text-xs text-muted-foreground">Nuevas</p>
            </div>
            <div className="p-3 rounded-md bg-muted/30 text-center">
              <p className="text-2xl font-bold text-foreground">{result.sources_used.length}</p>
              <p className="text-xs text-muted-foreground">Fuentes</p>
            </div>
            <div className="p-3 rounded-md bg-muted/30 text-center">
              <p className="text-2xl font-bold text-foreground">{result.status}</p>
              <p className="text-xs text-muted-foreground">Estado</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Fuentes: {result.sources_used.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
