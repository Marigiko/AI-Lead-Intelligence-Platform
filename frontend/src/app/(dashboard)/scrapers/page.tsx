"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Globe,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Zap,
  Key,
  Monitor,
  Gauge,
  Plus,
  Settings,
  ExternalLink,
  Save,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/cn";

/* ─── Types ─── */
interface ScraperPlugin {
  source_name: string;
  source_label: string;
  requires_browser: boolean;
  requires_api_key: boolean;
  default_rpm: number;
}

interface PluginsResponse {
  plugins: ScraperPlugin[];
}

interface ScraperMetric {
  readonly label: string;
  readonly value: string;
  readonly icon: typeof Globe;
  readonly color: string;
}

/* ─── Helpers ─── */
function getMetricsFromPlugins(plugins: ScraperPlugin[]): ScraperMetric[] {
  const withBrowser = plugins.filter((p) => p.requires_browser).length;
  const withApiKey = plugins.filter((p) => p.requires_api_key).length;
  const avgRpm = plugins.length > 0
    ? Math.round(plugins.reduce((sum, p) => sum + p.default_rpm, 0) / plugins.length)
    : 0;

  return [
    { label: "Plugins Activos", value: plugins.length.toString(), icon: Zap, color: "text-electric-400" },
    { label: "Con Browser", value: withBrowser.toString(), icon: Monitor, color: "text-cyan-400" },
    { label: "Req. API Key", value: withApiKey.toString(), icon: Key, color: "text-amber-400" },
    { label: "RPM Promedio", value: avgRpm.toString(), icon: Gauge, color: "text-emerald-400" },
  ];
}

/* ─── Skeleton Card ─── */
function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="p-5 rounded-2xl glass-card animate-pulse"
      style={{ animationDelay: `${delay}ms` }}
      aria-hidden="true"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/5" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-white/5" />
          <div className="h-3 w-1/2 rounded bg-white/5" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-white/5" />
        <div className="h-3 w-5/6 rounded bg-white/5" />
      </div>
    </div>
  );
}

/* ─── Plugin Card ─── */
function PluginCard({ plugin, index, onConfigure }: { plugin: ScraperPlugin; index: number; onConfigure: () => void }) {
  return (
    <Card
      variant="gradient"
      hover
      animated
      className="animate-fade-in-up"
      style={{ animationDelay: `${index * 80}ms` }}
      role="article"
      aria-label={`Plugin ${plugin.source_label}`}
    >
      <CardContent padding="none" className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-electric-500/20 to-cyan-500/20 border border-electric-500/30 flex items-center justify-center">
              <Globe className="w-5 h-5 text-electric-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">{plugin.source_label}</h3>
              <p className="text-xs text-muted-foreground font-mono">{plugin.source_name}</p>
            </div>
          </div>
          <Badge variant="success" dot>
            Activo
          </Badge>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
            <div className="flex items-center gap-1.5 mb-1">
              <Gauge className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Rate Limit</span>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">{plugin.default_rpm}</p>
            <p className="text-[10px] text-muted-foreground">req/min</p>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
            <div className="flex items-center gap-1.5 mb-1">
              <Monitor className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Browser</span>
            </div>
            <p className={cn(
              "text-lg font-bold font-mono",
              plugin.requires_browser ? "text-amber-400" : "text-emerald-400"
            )}>
              {plugin.requires_browser ? "Sí" : "No"}
            </p>
          </div>
        </div>

        {/* Requirements */}
        <div className="flex items-center gap-2 flex-wrap">
          {plugin.requires_api_key ? (
            <Badge variant="warning" size="sm">
              <Key className="w-3 h-3" />
              API Key requerida
            </Badge>
          ) : (
            <Badge variant="info" size="sm">
              <Key className="w-3 h-3" />
              Sin API Key
            </Badge>
          )}
          {plugin.requires_browser ? (
            <Badge variant="cyan" size="sm">
              <Monitor className="w-3 h-3" />
              Headless browser
            </Badge>
          ) : (
            <Badge variant="default" size="sm">
              Requests directos
            </Badge>
          )}
        </div>

        {/* Configure Button */}
        <div className="mt-4 pt-4 border-t border-white/5">
          <Button variant="outline" size="sm" className="w-full" onClick={onConfigure} leftIcon={<Settings className="w-3.5 h-3.5" />}>
            Configurar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Empty State ─── */
function EmptyState() {
  return (
    <Card variant="subtle" className="col-span-full" padding="lg">
      <CardContent padding="none" className="py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-electric-500/20 to-cyan-500/20 border border-electric-500/30 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-electric-400" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Sin plugins activos</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
          No se encontraron plugins de scraping registrados. Configura una fuente de datos para comenzar a descubrir empresas.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="glow" leftIcon={<ExternalLink className="w-4 h-4" />}>
            Ver Documentacion
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Error State ─── */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card variant="subtle" className="col-span-full" padding="lg">
      <CardContent padding="none" className="py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Error al cargar plugins</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">{message}</p>
        <Button variant="outline" onClick={onRetry} leftIcon={<RefreshCw className="w-4 h-4" />}>
          Reintentar
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─── Plugin Config Modal ─── */
function PluginConfigModal({ plugin, onClose, onSaved }: { plugin: ScraperPlugin; onClose: () => void; onSaved: () => void }) {
  const [apiKey, setApiKey] = useState("");
  const [rpm, setRpm] = useState(plugin.default_rpm.toString());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.patch("/api/v1/plugins/config", {
        source_name: plugin.source_name,
        api_key: apiKey.trim() || undefined,
        rpm: parseInt(rpm, 10) || plugin.default_rpm,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Configurar ${plugin.source_label}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md glass-card p-6 rounded-2xl border border-white/10 shadow-glass animate-scale-in">
        <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
          <Settings className="w-5 h-5 text-electric-400" />
          Configurar {plugin.source_label}
        </h2>
        <p className="text-xs text-muted-foreground font-mono mb-4">{plugin.source_name}</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger-light" role="alert">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor={`api-key-${plugin.source_name}`} className="text-sm font-medium text-foreground flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-muted-foreground" />
              API Key
            </label>
            <input
              id={`api-key-${plugin.source_name}`}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={plugin.requires_api_key ? "Requerida para funcionar" : "Opcional"}
              className="w-full h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-electric-500/50 focus:ring-2 focus:ring-electric-500/20 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`rpm-${plugin.source_name}`} className="text-sm font-medium text-foreground flex items-center gap-2">
              <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
              Rate Limit (req/min)
            </label>
            <input
              id={`rpm-${plugin.source_name}`}
              type="number"
              min="1"
              max="600"
              value={rpm}
              onChange={(e) => setRpm(e.target.value)}
              className="w-full h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-electric-500/50 focus:ring-2 focus:ring-electric-500/20 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" size="sm" onClick={handleSave} isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page Component ─── */
export default function ScrapersPage() {
  const [plugins, setPlugins] = useState<ScraperPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlugin, setSelectedPlugin] = useState<ScraperPlugin | null>(null);

  const fetchPlugins = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<PluginsResponse>("/api/v1/plugins");
      setPlugins(data.plugins ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido al cargar plugins";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  const metrics = getMetricsFromPlugins(plugins);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="w-6 h-6 text-electric-400" />
            Scrapers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fuentes de datos activas para descubrimiento de empresas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={fetchPlugins}
            isLoading={loading}
            aria-label="Recargar plugins"
            title="Recargar"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => plugins.length > 0 && setSelectedPlugin(plugins[0])}>
            Configurar Plugins
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, i) => (
          <div
            key={metric.label}
            className="p-4 rounded-2xl glass-card animate-fade-in-up hover-lift"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <metric.icon className={cn("w-5 h-5", metric.color)} />
              </div>
              <CheckCircle className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            </div>
            <p className="text-3xl font-bold font-mono text-foreground">{metric.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{metric.label}</p>
          </div>
        ))}
      </div>

      {/* Plugins Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Search className="w-4 h-4 text-cyan-400" />
            Plugins Disponibles
          </h2>
          {!loading && !error && plugins.length > 0 && (
            <Badge variant="electric" animated>
              {plugins.length} {plugins.length === 1 ? "plugin" : "plugins"}
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} delay={i * 80} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchPlugins} />
        ) : plugins.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plugins.map((plugin, i) => (
              <PluginCard key={plugin.source_name} plugin={plugin} index={i} onConfigure={() => setSelectedPlugin(plugin)} />
            ))}
          </div>
        )}
      </div>

      {/* Info Banner */}
      {!loading && !error && plugins.length > 0 && (
        <Card variant="cyan" className="animate-fade-in-up" style={{ animationDelay: "400ms" }}>
          <CardContent padding="none" className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Configuracion de API Keys</p>
              <p className="text-xs text-muted-foreground">
                Algunos plugins requieren credenciales para funcionar. Visita la seccion de configuracion para agregar tus API keys.
              </p>
            </div>
            <Button variant="cyan" size="sm" className="hidden sm:flex" onClick={() => plugins.length > 0 && setSelectedPlugin(plugins[0])}>
              Configurar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Plugin Config Modal */}
      {selectedPlugin && (
        <PluginConfigModal plugin={selectedPlugin} onClose={() => setSelectedPlugin(null)} onSaved={fetchPlugins} />
      )}
    </div>
  );
}
