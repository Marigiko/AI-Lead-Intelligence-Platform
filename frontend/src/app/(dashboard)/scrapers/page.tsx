"use client";

import { useEffect, useState } from "react";
import { Globe, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "@/lib/api-client";

interface ScraperPlugin {
  source_name: string;
  source_label: string;
  requires_browser: boolean;
  requires_api_key: boolean;
  default_rpm: number;
}

export default function ScrapersPage() {
  const [plugins, setPlugins] = useState<ScraperPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlugins() {
      try {
        setLoading(true);
        const data = await api.get<{ plugins: ScraperPlugin[] }>("/api/v1/plugins");
        setPlugins(data.plugins || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar plugins");
      } finally {
        setLoading(false);
      }
    }
    fetchPlugins();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={24} className="animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Cargando scrapers...</span>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Scrapers</h1>
        <p className="text-muted-foreground">Fuentes de datos activas para descubrimiento de empresas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plugins.map((plugin) => (
          <div key={plugin.source_name} className="bg-card rounded-lg border p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-blue-500" />
                <h3 className="font-semibold text-foreground">{plugin.source_label}</h3>
              </div>
              <CheckCircle size={16} className="text-green-500" />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source ID:</span>
                <span className="font-mono text-xs text-foreground">{plugin.source_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rate Limit:</span>
                <span className="text-foreground">{plugin.default_rpm} req/min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Browser:</span>
                <span className={plugin.requires_browser ? "text-yellow-600" : "text-green-600"}>
                  {plugin.requires_browser ? "Requerido" : "No requerido"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">API Key:</span>
                <span className={plugin.requires_api_key ? "text-yellow-600" : "text-green-600"}>
                  {plugin.requires_api_key ? "Requerida" : "No requerida"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {plugins.length === 0 && (
        <div className="bg-card rounded-lg border p-12 text-center">
          <AlertCircle size={48} className="mx-auto text-yellow-500 mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Sin plugins activos</h2>
          <p className="text-muted-foreground">
            No se encontraron plugins de scraping registrados.
          </p>
        </div>
      )}
    </div>
  );
}
