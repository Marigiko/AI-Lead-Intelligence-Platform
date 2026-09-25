"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings as SettingsIcon,
  Save,
  User,
  Globe,
  Cpu,
  Mail,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Shield,
  Bell,
  Palette,
  Key,
  Webhook,
  Link,
  Send,
  Eye,
  EyeOff,
  Check,
  X,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

/* ─── Types ─── */
interface Settings {
  language: string;
  timezone: string;
  ai_model: string;
  email_signature: string | null;
  api_keys?: {
    openai: string;
    google_places: string;
    hunter_io: string;
    sendgrid: string;
  };
  notifications?: {
    email: boolean;
    new_company: boolean;
    weekly_reports: boolean;
    scoring_complete: boolean;
  };
  webhook?: {
    url: string;
    events: string[];
  };
  theme?: {
    accent: "purple" | "cyan" | "rose" | "amber";
    compact: boolean;
  };
}

type SaveStatus = "idle" | "success" | "error";

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

/* ─── Constants ─── */
const SECTIONS: SettingsSection[] = [
  {
    id: "general",
    title: "General",
    description: "Idioma y preferencias regionales",
    icon: Globe,
    iconColor: "text-cyan-400",
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
  },
  {
    id: "ai",
    title: "Modelo de IA",
    description: "Configuración del motor de lenguaje",
    icon: Cpu,
    iconColor: "text-electric-400",
    iconBg: "bg-electric-500/10 border-electric-500/20",
  },
  {
    id: "email",
    title: "Firma de Email",
    description: "Personaliza tu firma de salida",
    icon: Mail,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "api_keys",
    title: "Claves API",
    description: "Gestiona tus claves de servicios externos",
    icon: Key,
    iconColor: "text-rose-400",
    iconBg: "bg-rose-500/10 border-rose-500/20",
  },
  {
    id: "notifications",
    title: "Notificaciones",
    description: "Configura alertas y reportes automáticos",
    icon: Bell,
    iconColor: "text-cyan-400",
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
  },
  {
    id: "webhooks",
    title: "Webhooks",
    description: "Integraciones y eventos externos",
    icon: Webhook,
    iconColor: "text-electric-400",
    iconBg: "bg-electric-500/10 border-electric-500/20",
  },
  {
    id: "theme",
    title: "Apariencia",
    description: "Personaliza colores y densidad visual",
    icon: Palette,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/20",
  },
];

const LANGUAGES = [
  { value: "es", label: "Español", flag: "🇦🇷" },
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "pt", label: "Português", flag: "🇧🇷" },
];

const TIMEZONES = [
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (GMT-3)", city: "Buenos Aires" },
  { value: "America/Sao_Paulo", label: "Brasil (GMT-3)", city: "São Paulo" },
  { value: "America/Mexico_City", label: "México (GMT-6)", city: "CDMX" },
  { value: "America/Bogota", label: "Colombia (GMT-5)", city: "Bogotá" },
  { value: "America/Santiago", label: "Chile (GMT-4)", city: "Santiago" },
];

const AI_MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini", tag: "Rápido", color: "success" as const, description: "Bajo costo, respuestas instantáneas" },
  { value: "gpt-4o", label: "GPT-4o", tag: "Calidad", color: "electric" as const, description: "Máxima precisión y razonamiento" },
  { value: "claude-sonnet", label: "Claude Sonnet", tag: "Creativo", color: "cyan" as const, description: "Ideal para contenido y copywriting" },
  { value: "claude-opus", label: "Claude Opus", tag: "Premium", color: "electric" as const, description: "El modelo más potente de Anthropic" },
  { value: "gemini-pro", label: "Gemini Pro", tag: "Multimodal", color: "cyan" as const, description: "Procesamiento de texto, imagen y audio" },
  { value: "llama-3", label: "Llama 3", tag: "Open Source", color: "success" as const, description: "Código abierto, ejecuta donde quieras" },
];

const API_KEY_FIELDS = [
  { key: "openai", label: "OpenAI API Key", placeholder: "sk-..." },
  { key: "google_places", label: "Google Places API Key", placeholder: "AIza..." },
  { key: "hunter_io", label: "Hunter.io API Key", placeholder: "..." },
  { key: "sendgrid", label: "SendGrid API Key", placeholder: "SG...." },
] as const;

const NOTIFICATION_OPTIONS = [
  { key: "email", label: "Notificaciones por email", description: "Recibe actualizaciones generales por correo" },
  { key: "new_company", label: "Alertas de nuevas empresas", description: "Cuando se añade una empresa a tu pipeline" },
  { key: "weekly_reports", label: "Reportes semanales", description: "Resumen de actividad cada lunes" },
  { key: "scoring_complete", label: "Scoring completado", description: "Cuando finaliza el análisis de una empresa" },
] as const;

const WEBHOOK_EVENTS = [
  { value: "company.created", label: "Empresa creada" },
  { value: "deal.won", label: "Deal ganado" },
  { value: "campaign.completed", label: "Campaña completada" },
] as const;

const ACCENT_COLORS = [
  { value: "purple", label: "Púrpura", class: "bg-electric-500", ring: "ring-electric-400" },
  { value: "cyan", label: "Cian", class: "bg-cyan-500", ring: "ring-cyan-400" },
  { value: "rose", label: "Rosa", class: "bg-rose-500", ring: "ring-rose-400" },
  { value: "amber", label: "Ámbar", class: "bg-amber-500", ring: "ring-amber-400" },
] as const;

const DEFAULT_SETTINGS: Settings = {
  language: "es",
  timezone: "America/Argentina/Buenos_Aires",
  ai_model: "gpt-4o-mini",
  email_signature: null,
  api_keys: { openai: "", google_places: "", hunter_io: "", sendgrid: "" },
  notifications: { email: true, new_company: true, weekly_reports: false, scoring_complete: true },
  webhook: { url: "", events: [] },
  theme: { accent: "purple", compact: false },
};

/* ─── Skeleton Component ─── */
function SettingsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando configuración">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-white/5 shimmer" />
          <div className="h-4 w-64 rounded-lg bg-white/5 shimmer" />
        </div>
        <div className="h-10 w-28 rounded-lg bg-white/5 shimmer" />
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="p-6 rounded-2xl glass-card animate-fade-in-up"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/5 shimmer" />
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-white/5 shimmer" />
              <div className="h-3 w-40 rounded bg-white/5 shimmer" />
            </div>
          </div>
          <div className="h-11 w-full rounded-xl bg-white/5 shimmer" />
        </div>
      ))}
    </div>
  );
}

/* ─── Toggle Switch Component ─── */
function Toggle({
  enabled,
  onChange,
  ariaLabel,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        enabled ? "bg-electric-500" : "bg-white/10"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
          enabled ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

/* ─── Main Component ─── */
export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [initialSettings, setInitialSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [keySaveStatus, setKeySaveStatus] = useState<Record<string, "idle" | "success" | "error">>({});
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<"idle" | "success" | "error">("idle");

  /* ─── Load Settings ─── */
  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const data = await api.get<Settings>("/api/v1/settings");
        if (!cancelled) {
          setSettings({ ...DEFAULT_SETTINGS, ...data });
          setInitialSettings({ ...DEFAULT_SETTINGS, ...data });
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setSettings(DEFAULT_SETTINGS);
          setInitialSettings(DEFAULT_SETTINGS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ─── Derived State ─── */
  const isDirty =
    JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const activeModel = AI_MODELS.find((m) => m.value === settings.ai_model);

  /* ─── Handlers ─── */
  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaveStatus("idle");
  }, []);

  const updateApiKey = useCallback((key: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      api_keys: { ...prev.api_keys!, [key]: value },
    }));
    setKeySaveStatus((prev) => ({ ...prev, [key]: "idle" }));
  }, []);

  const updateNotification = useCallback((key: string, value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications!, [key]: value },
    }));
  }, []);

  const toggleWebhookEvent = useCallback((event: string) => {
    setSettings((prev) => {
      const current = prev.webhook?.events ?? [];
      const events = current.includes(event)
        ? current.filter((e) => e !== event)
        : [...current, event];
      return { ...prev, webhook: { ...prev.webhook!, events } };
    });
    setWebhookTestResult("idle");
  }, []);

  const saveSettings = useCallback(async () => {
    if (!isDirty) return;
    setSaving(true);
    setSaveStatus("idle");
    setError(null);

    try {
      const data = await api.patch<Settings>("/api/v1/settings", settings);
      setSettings({ ...DEFAULT_SETTINGS, ...data });
      setInitialSettings({ ...DEFAULT_SETTINGS, ...data });
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      setSaveStatus("error");
      setError(err instanceof Error ? err.message : "Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  }, [settings, isDirty]);

  const saveApiKey = useCallback(async (key: string) => {
    setKeySaveStatus((prev) => ({ ...prev, [key]: "idle" }));
    try {
      await api.patch("/api/v1/settings", {
        api_keys: settings.api_keys,
      });
      setKeySaveStatus((prev) => ({ ...prev, [key]: "success" }));
      setTimeout(() => setKeySaveStatus((prev) => ({ ...prev, [key]: "idle" })), 2000);
    } catch {
      setKeySaveStatus((prev) => ({ ...prev, [key]: "error" }));
    }
  }, [settings.api_keys]);

  const testWebhook = useCallback(async () => {
    if (!settings.webhook?.url) return;
    setWebhookTesting(true);
    setWebhookTestResult("idle");
    try {
      await fetch(settings.webhook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true, source: "nexus-settings" }),
      });
      setWebhookTestResult("success");
    } catch {
      setWebhookTestResult("error");
    } finally {
      setWebhookTesting(false);
    }
  }, [settings.webhook]);

  const resetSettings = useCallback(() => {
    setSettings(initialSettings);
    setSaveStatus("idle");
    setError(null);
  }, [initialSettings]);

  const toggleKeyVisibility = useCallback((key: string) => {
    setVisibleKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  /* ─── Keyboard shortcut: Ctrl+S to save ─── */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (isDirty && !saving) saveSettings();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDirty, saving, saveSettings]);

  /* ─── Loading State ─── */
  if (loading) {
    return <SettingsSkeleton />;
  }

  /* ─── Computed Metrics ─── */
  const activeFields = [
    settings.language !== DEFAULT_SETTINGS.language,
    settings.timezone !== DEFAULT_SETTINGS.timezone,
    settings.ai_model !== DEFAULT_SETTINGS.ai_model,
    settings.email_signature != null && settings.email_signature !== "",
    Object.values(settings.api_keys ?? {}).some((v) => v !== ""),
  ].filter(Boolean).length;

  const notificationCount = Object.values(settings.notifications ?? {}).filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ═══════════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-electric flex items-center justify-center shadow-glow-sm">
            <SettingsIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              Configuración
              <Badge variant="electric" dot className="normal-case">
                Nexus
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestiona tu cuenta, preferencias y modelos de IA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetSettings}
              aria-label="Deshacer cambios"
            >
              Deshacer
            </Button>
          )}
          <Button
            variant="primary"
            size="default"
            onClick={saveSettings}
            isLoading={saving}
            disabled={!isDirty || saving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {saveStatus === "success" ? "¡Guardado!" : "Guardar"}
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          STATUS TOAST
          ═══════════════════════════════════════════════════════════ */}
      {saveStatus === "success" && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20 animate-fade-in-up"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="w-5 h-5 text-success-light shrink-0" />
          <p className="text-sm text-success-light font-medium">
            Configuración guardada exitosamente
          </p>
        </div>
      )}

      {error && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20 animate-fade-in-up"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="w-5 h-5 text-danger-light shrink-0" />
          <p className="text-sm text-danger-light font-medium">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSaveStatus("idle")}
            className="ml-auto text-danger-light hover:bg-danger/10"
            aria-label="Cerrar mensaje de error"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          QUICK STATS
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
        {/* Active Model */}
        <div className="p-4 rounded-2xl glass-card hover:border-electric-500/20 hover:shadow-glow-sm transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-electric-500/10 border border-electric-500/20 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-electric-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground font-mono">
            {activeModel?.label ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Modelo activo</p>
        </div>

        {/* Language */}
        <div className="p-4 rounded-2xl glass-card hover:border-cyan-500/20 hover:shadow-glow-cyan transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Globe className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground font-mono">
            {LANGUAGES.find((l) => l.value === settings.language)?.flag ?? "🌐"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {LANGUAGES.find((l) => l.value === settings.language)?.label ?? "Idioma"}
          </p>
        </div>

        {/* Notifications */}
        <div className="p-4 rounded-2xl glass-card hover:border-success/20 transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-success/10 border border-success/20 flex items-center justify-center">
              <Bell className="w-4 h-4 text-success-light" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground font-mono">
            {notificationCount}/4
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Notificaciones</p>
        </div>

        {/* Customizations */}
        <div className="p-4 rounded-2xl glass-card hover:border-amber-500/20 transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground font-mono">
            {activeFields}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Personalizaciones</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SETTINGS SECTIONS
          ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-5">
        {/* ── General Section ── */}
        <section
          className="p-6 rounded-2xl glass-card animate-fade-in-up"
          style={{ animationDelay: "100ms" }}
          aria-labelledby="section-general"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", SECTIONS[0].iconBg)}>
              {(() => { const Icon = SECTIONS[0].icon; return <Icon className={cn("w-5 h-5", SECTIONS[0].iconColor)} />; })()}
            </div>
            <div>
              <h2 id="section-general" className="text-base font-semibold text-foreground">
                {SECTIONS[0].title}
              </h2>
              <p className="text-xs text-muted-foreground">{SECTIONS[0].description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Language */}
            <div className="space-y-2">
              <label
                htmlFor="language-select"
                className="text-sm font-medium text-foreground flex items-center gap-2"
              >
                <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                Idioma
              </label>
              <div className="relative">
                <select
                  id="language-select"
                  value={settings.language}
                  onChange={(e) => update("language", e.target.value)}
                  className="w-full h-11 px-4 pr-10 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm appearance-none cursor-pointer hover:border-electric-500/30 focus:border-electric-500/50 focus:ring-2 focus:ring-electric-500/20 focus:outline-none transition-all duration-200"
                  aria-label="Seleccionar idioma"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value} className="bg-card">
                      {lang.flag} {lang.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <label
                htmlFor="timezone-select"
                className="text-sm font-medium text-foreground flex items-center gap-2"
              >
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                Zona Horaria
              </label>
              <div className="relative">
                <select
                  id="timezone-select"
                  value={settings.timezone}
                  onChange={(e) => update("timezone", e.target.value)}
                  className="w-full h-11 px-4 pr-10 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm appearance-none cursor-pointer hover:border-electric-500/30 focus:border-electric-500/50 focus:ring-2 focus:ring-electric-500/20 focus:outline-none transition-all duration-200"
                  aria-label="Seleccionar zona horaria"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value} className="bg-card">
                      {tz.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── AI Model Section ── */}
        <section
          className="p-6 rounded-2xl glass-card animate-fade-in-up"
          style={{ animationDelay: "200ms" }}
          aria-labelledby="section-ai"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", SECTIONS[1].iconBg)}>
              {(() => { const Icon = SECTIONS[1].icon; return <Icon className={cn("w-5 h-5", SECTIONS[1].iconColor)} />; })()}
            </div>
            <div>
              <h2 id="section-ai" className="text-base font-semibold text-foreground">
                {SECTIONS[1].title}
              </h2>
              <p className="text-xs text-muted-foreground">{SECTIONS[1].description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Seleccionar modelo de IA">
            {AI_MODELS.map((model) => {
              const isActive = settings.ai_model === model.value;
              return (
                <button
                  key={model.value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => update("ai_model", model.value)}
                  className={cn(
                    "relative flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-300",
                    "hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    isActive
                      ? "bg-electric-500/10 border-electric-500/40 shadow-glow-sm"
                      : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.08]"
                  )}
                >
                  {isActive && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="w-4 h-4 text-electric-400" aria-hidden="true" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-foreground">{model.label}</span>
                    <Badge
                      variant={model.color}
                      size="sm"
                      dot={isActive}
                    >
                      {model.tag}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {model.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Email Signature Section ── */}
        <section
          className="p-6 rounded-2xl glass-card animate-fade-in-up"
          style={{ animationDelay: "300ms" }}
          aria-labelledby="section-email"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", SECTIONS[2].iconBg)}>
              {(() => { const Icon = SECTIONS[2].icon; return <Icon className={cn("w-5 h-5", SECTIONS[2].iconColor)} />; })()}
            </div>
            <div>
              <h2 id="section-email" className="text-base font-semibold text-foreground">
                {SECTIONS[2].title}
              </h2>
              <p className="text-xs text-muted-foreground">{SECTIONS[2].description}</p>
            </div>
          </div>

          <div className="space-y-3">
            <label
              htmlFor="email-signature"
              className="text-sm font-medium text-foreground flex items-center gap-2"
            >
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
              Firma
            </label>
            <textarea
              id="email-signature"
              value={settings.email_signature ?? ""}
              onChange={(e) => update("email_signature", e.target.value)}
              placeholder={"Tu nombre\nTu empresa\nTeléfono de contacto"}
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm placeholder:text-muted-foreground/40 resize-y hover:border-electric-500/30 focus:border-electric-500/50 focus:ring-2 focus:ring-electric-500/20 focus:outline-none transition-all duration-200"
              aria-label="Firma de email"
            />
            <p className="text-xs text-muted-foreground">
              Esta firma se incluirá automáticamente en tus campañas de email salientes.
            </p>
          </div>

          {/* Empty state hint when no signature */}
          {(!settings.email_signature || settings.email_signature === "") && (
            <div className="mt-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs text-amber-300 font-medium">Sin firma configurada</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tus emails se enviarán sin firma personalizada. Agrega una para proyectar más profesionalismo.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ── API Keys Section ── */}
        <section
          className="p-6 rounded-2xl glass-card animate-fade-in-up"
          style={{ animationDelay: "350ms" }}
          aria-labelledby="section-api_keys"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", SECTIONS[3].iconBg)}>
              {(() => { const Icon = SECTIONS[3].icon; return <Icon className={cn("w-5 h-5", SECTIONS[3].iconColor)} />; })()}
            </div>
            <div>
              <h2 id="section-api_keys" className="text-base font-semibold text-foreground">
                {SECTIONS[3].title}
              </h2>
              <p className="text-xs text-muted-foreground">{SECTIONS[3].description}</p>
            </div>
          </div>

          <div className="space-y-4">
            {API_KEY_FIELDS.map((field) => {
              const value = settings.api_keys?.[field.key] ?? "";
              const isVisible = visibleKeys[field.key];
              const status = keySaveStatus[field.key] ?? "idle";

              return (
                <div key={field.key} className="space-y-2">
                  <label
                    htmlFor={`apikey-${field.key}`}
                    className="text-sm font-medium text-foreground flex items-center gap-2"
                  >
                    <Key className="w-3.5 h-3.5 text-muted-foreground" />
                    {field.label}
                    {value && (
                      <Badge variant="success" size="sm" dot>
                        Configurada
                      </Badge>
                    )}
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        id={`apikey-${field.key}`}
                        type={isVisible ? "text" : "password"}
                        value={value}
                        onChange={(e) => updateApiKey(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full h-11 px-4 pr-10 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm placeholder:text-muted-foreground/40 hover:border-electric-500/30 focus:border-electric-500/50 focus:ring-2 focus:ring-electric-500/20 focus:outline-none transition-all duration-200 font-mono"
                        aria-label={field.label}
                      />
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility(field.key)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={isVisible ? "Ocultar clave" : "Mostrar clave"}
                      >
                        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => saveApiKey(field.key)}
                      disabled={!value}
                      aria-label={`Guardar ${field.label}`}
                    >
                      {status === "success" ? (
                        <Check className="w-4 h-4 text-success-light" />
                      ) : status === "error" ? (
                        <X className="w-4 h-4 text-danger-light" />
                      ) : (
                        "Guardar"
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-4 rounded-xl bg-rose-500/5 border border-rose-500/15 flex items-start gap-3">
            <Shield className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-rose-300 font-medium">Almacenamiento seguro</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tus claves se almacenan cifradas y nunca se exponen públicamente.
              </p>
            </div>
          </div>
        </section>

        {/* ── Notifications Section ── */}
        <section
          className="p-6 rounded-2xl glass-card animate-fade-in-up"
          style={{ animationDelay: "400ms" }}
          aria-labelledby="section-notifications"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", SECTIONS[4].iconBg)}>
              {(() => { const Icon = SECTIONS[4].icon; return <Icon className={cn("w-5 h-5", SECTIONS[4].iconColor)} />; })()}
            </div>
            <div>
              <h2 id="section-notifications" className="text-base font-semibold text-foreground">
                {SECTIONS[4].title}
              </h2>
              <p className="text-xs text-muted-foreground">{SECTIONS[4].description}</p>
            </div>
          </div>

          <div className="space-y-4">
            {NOTIFICATION_OPTIONS.map((option) => {
              const isEnabled = settings.notifications?.[option.key] ?? false;

              return (
                <div
                  key={option.key}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/15 transition-all duration-200"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-medium text-foreground">{option.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                  </div>
                  <Toggle
                    enabled={isEnabled}
                    onChange={(value) => updateNotification(option.key, value)}
                    ariaLabel={option.label}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Webhooks Section ── */}
        <section
          className="p-6 rounded-2xl glass-card animate-fade-in-up"
          style={{ animationDelay: "450ms" }}
          aria-labelledby="section-webhooks"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", SECTIONS[5].iconBg)}>
              {(() => { const Icon = SECTIONS[5].icon; return <Icon className={cn("w-5 h-5", SECTIONS[5].iconColor)} />; })()}
            </div>
            <div>
              <h2 id="section-webhooks" className="text-base font-semibold text-foreground">
                {SECTIONS[5].title}
              </h2>
              <p className="text-xs text-muted-foreground">{SECTIONS[5].description}</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Webhook URL */}
            <div className="space-y-2">
              <label
                htmlFor="webhook-url"
                className="text-sm font-medium text-foreground flex items-center gap-2"
              >
                <Link className="w-3.5 h-3.5 text-muted-foreground" />
                URL del Webhook
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="webhook-url"
                  type="url"
                  value={settings.webhook?.url ?? ""}
                  onChange={(e) => setSettings((prev) => ({
                    ...prev,
                    webhook: { ...prev.webhook!, url: e.target.value },
                  }))}
                  placeholder="https://tu-servidor.com/webhook"
                  className="flex-1 h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm placeholder:text-muted-foreground/40 hover:border-electric-500/30 focus:border-electric-500/50 focus:ring-2 focus:ring-electric-500/20 focus:outline-none transition-all duration-200 font-mono"
                  aria-label="URL del webhook"
                />
                <Button
                  variant="outline"
                  size="default"
                  onClick={testWebhook}
                  isLoading={webhookTesting}
                  disabled={!settings.webhook?.url}
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  Probar
                </Button>
              </div>
              {webhookTestResult === "success" && (
                <p className="text-xs text-success-light flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  Webhook respondió correctamente
                </p>
              )}
              {webhookTestResult === "error" && (
                <p className="text-xs text-danger-light flex items-center gap-1.5">
                  <X className="w-3.5 h-3.5" />
                  No se pudo conectar con el webhook
                </p>
              )}
            </div>

            {/* Event Checkboxes */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                Eventos a escuchar
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {WEBHOOK_EVENTS.map((event) => {
                  const isChecked = settings.webhook?.events?.includes(event.value) ?? false;
                  return (
                    <label
                      key={event.value}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200",
                        isChecked
                          ? "bg-electric-500/10 border-electric-500/30"
                          : "bg-white/[0.03] border-white/10 hover:border-white/20"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleWebhookEvent(event.value)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-electric-500 focus:ring-electric-500/30 focus:ring-offset-0 cursor-pointer"
                        aria-label={event.label}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{event.label}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{event.value}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── Theme Section ── */}
        <section
          className="p-6 rounded-2xl glass-card animate-fade-in-up"
          style={{ animationDelay: "500ms" }}
          aria-labelledby="section-theme"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", SECTIONS[6].iconBg)}>
              {(() => { const Icon = SECTIONS[6].icon; return <Icon className={cn("w-5 h-5", SECTIONS[6].iconColor)} />; })()}
            </div>
            <div>
              <h2 id="section-theme" className="text-base font-semibold text-foreground">
                {SECTIONS[6].title}
              </h2>
              <p className="text-xs text-muted-foreground">{SECTIONS[6].description}</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Accent Color Picker */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                Color de acento
              </p>
              <div className="flex items-center gap-3">
                {ACCENT_COLORS.map((color) => {
                  const isActive = settings.theme?.accent === color.value;
                  return (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setSettings((prev) => ({
                        ...prev,
                        theme: { ...prev.theme!, accent: color.value as "purple" | "cyan" | "rose" | "amber" },
                      }))}
                      className={cn(
                        "w-10 h-10 rounded-xl transition-all duration-200 flex items-center justify-center",
                        color.class,
                        isActive
                          ? `ring-2 ring-offset-2 ring-offset-background ${color.ring} scale-110`
                          : "opacity-60 hover:opacity-100 hover:scale-105"
                      )}
                      aria-label={color.label}
                      aria-pressed={isActive}
                    >
                      {isActive && <Check className="w-5 h-5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Compact Mode Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/15 transition-all duration-200">
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-sm font-medium text-foreground">Modo compacto</p>
                <p className="text-xs text-muted-foreground mt-0.5">Reduce el espacio entre elementos para ver más contenido</p>
              </div>
              <Toggle
                enabled={settings.theme?.compact ?? false}
                onChange={(value) => setSettings((prev) => ({
                  ...prev,
                  theme: { ...prev.theme!, compact: value },
                }))}
                ariaLabel="Modo compacto"
              />
            </div>
          </div>
        </section>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          FOOTER INFO
          ═══════════════════════════════════════════════════════════ */}
      <footer className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 pb-4 animate-fade-in-up" style={{ animationDelay: "550ms" }}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Tus datos están encriptados y almacenados de forma segura</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="font-mono">{activeFields} de 5 campos personalizados</span>
        </div>
      </footer>
    </div>
  );
}
