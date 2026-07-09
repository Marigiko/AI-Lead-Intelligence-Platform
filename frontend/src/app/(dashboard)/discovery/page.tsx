"use client";

import { useState } from "react";
import { Search, MapPin, Target, Loader2 } from "lucide-react";

const intentExamples = [
  "Empresas que necesiten una pagina web",
  "Empresas con sitios web obsoletos",
  "Empresas que puedan automatizar procesos con IA",
  "Empresas sin presencia digital",
  "Empresas con malas resenas",
  "Empresas sin Google Business",
  "Empresas sin e-commerce",
];

export default function DiscoveryPage() {
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState("50");
  const [intent, setIntent] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    // TODO: Phase 2 — connect to API
    setTimeout(() => setIsSearching(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Descubrimiento</h1>
        <p className="text-muted-foreground">
          Encuentra empresas automaticamente con IA
        </p>
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
                placeholder="Ej: Resistencia, Chaco o 50km de Corrientes Capital"
                className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Radio (km)
              </label>
              <select
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="10">10 km</option>
                <option value="25">25 km</option>
                <option value="50">50 km</option>
                <option value="100">100 km</option>
                <option value="200">200 km</option>
                <option value="500">Todo la provincia</option>
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
              placeholder="Ej: Empresas con pagina web vieja que necesiten actualizacion, o empresas sin presencia digital que puedan necesitar marketing"
              className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
              required
            />
          </div>

          {/* Intent Examples */}
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
              <>
                <Loader2 size={16} className="animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search size={16} />
                Buscar Empresas
              </>
            )}
          </button>
        </form>
      </div>

      {/* Search History */}
      <div className="bg-card rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-foreground">Busquedas Recientes</h2>
        </div>
        <div className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
              <div>
                <p className="text-sm font-medium text-foreground">
                  "Empresas con web obsoleta" en Resistencia, 50km
                </p>
                <p className="text-xs text-muted-foreground">Hace 2 horas &middot; 247 resultados</p>
              </div>
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">Completado</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
              <div>
                <p className="text-sm font-medium text-foreground">
                  "Empresas sin presencia digital" en Corrientes Capital
                </p>
                <p className="text-xs text-muted-foreground">Ayer &middot; 89 resultados</p>
              </div>
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">Completado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
