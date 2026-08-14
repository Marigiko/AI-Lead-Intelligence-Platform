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
];

const DEFAULT_SETTINGS: Settings = {
  language: "es",
  timezone: "America/Argentina/Buenos_Aires",
  ai_model: "gpt-4o-mini",
  email_signature: null,
};

/* ─── Skeleton Component ─── */
function SettingsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando configuración">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-white/5 shimmer" />
          <div className="h-4 w-64 rounded-lg bg-white/5 shimmer" />
        </div>
        <div className="h-10 w-28 rounded-lg bg-white/5 shimmer" />
      </div>
      {/* Cards skeleton */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="p-6 rounded-2xl bg-glass border border-white/5 animate-fade-in-up"
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

/* ─── Main Component ─── */
export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [initialSettings, setInitialSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  /* ─── Load Settings ─── */
  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const data = await api.get<Settings>("/api/v1/settings");
        if (!cancelled) {
          setSettings(data);
          setInitialSettings(data);
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
    settings.language !== initialSettings.language ||
    settings.timezone !== initialSettings.timezone ||
    settings.ai_model !== initialSettings.ai_model ||
    settings.email_signature !== initialSettings.email_signature;

  const activeModel = AI_MODELS.find((m) => m.value === settings.ai_model);

  const SectionIcon0 = SECTIONS[0].icon;
  const SectionIcon1 = SECTIONS[1].icon;
  const SectionIcon2 = SECTIONS[2].icon;

  /* ─── Handlers ─── */
  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaveStatus("idle");
  }, []);

  const saveSettings = useCallback(async () => {
    if (!isDirty) return;
    setSaving(true);
    setSaveStatus("idle");
    setError(null);

    try {
      const data = await api.patch<Settings>("/api/v1/settings", settings);
      setSettings(data);
      setInitialSettings(data);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      setSaveStatus("error");
      setError(err instanceof Error ? err.message : "Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  }, [settings, isDirty]);

  const resetSettings = useCallback(() => {
    setSettings(initialSettings);
    setSaveStatus("idle");
    setError(null);
  }, [initialSettings]);

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
  ].filter(Boolean).length;

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
        <div className="p-4 rounded-2xl bg-glass border border-white/5 hover:border-electric-500/20 hover:shadow-glow-sm transition-all duration-300">
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
        <div className="p-4 rounded-2xl bg-glass border border-white/5 hover:border-cyan-500/20 hover:shadow-glow-cyan transition-all duration-300">
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

        {/* Timezone */}
        <div className="p-4 rounded-2xl bg-glass border border-white/5 hover:border-amber-500/20 transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Bell className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-foreground font-mono">
            {settings.timezone.split("/").pop()?.replace(/_/g, " ") ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Zona horaria</p>
        </div>

        {/* Customizations */}
        <div className="p-4 rounded-2xl bg-glass border border-white/5 hover:border-success/20 transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-success/10 border border-success/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-success-light" />
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
          className="p-6 rounded-2xl bg-glass border border-white/5 animate-fade-in-up"
          style={{ animationDelay: "100ms" }}
          aria-labelledby="section-general"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", SECTIONS[0].iconBg)}>
              <SectionIcon0 className={cn("w-5 h-5", SECTIONS[0].iconColor)} />
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
          className="p-6 rounded-2xl bg-glass border border-white/5 animate-fade-in-up"
          style={{ animationDelay: "200ms" }}
          aria-labelledby="section-ai"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", SECTIONS[1].iconBg)}>
              <SectionIcon1 className={cn("w-5 h-5", SECTIONS[1].iconColor)} />
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
                      : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/5"
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
          className="p-6 rounded-2xl bg-glass border border-white/5 animate-fade-in-up"
          style={{ animationDelay: "300ms" }}
          aria-labelledby="section-email"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", SECTIONS[2].iconBg)}>
              <SectionIcon2 className={cn("w-5 h-5", SECTIONS[2].iconColor)} />
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
      </div>

      {/* ═══════════════════════════════════════════════════════════
          FOOTER INFO
          ═══════════════════════════════════════════════════════════ */}
      <footer className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 pb-4 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Tus datos están encriptados y almacenados de forma segura</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="font-mono">{activeFields} de 4 campos personalizados</span>
        </div>
      </footer>
    </div>
  );
}
