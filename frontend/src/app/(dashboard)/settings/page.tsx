"use client";

import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";

interface Settings {
  language: string;
  timezone: string;
  ai_model: string;
  email_signature: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    language: "es",
    timezone: "America/Argentina/Buenos_Aires",
    ai_model: "gpt-4o-mini",
    email_signature: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await api.get<Settings>("/api/v1/settings");
        setSettings(data);
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const saveSettings = async () => {
    try {
      setSaving(true);
      setSaved(false);
      const data = await api.patch<Settings>("/api/v1/settings", settings);
      setSettings(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert("Error al guardar configuracion");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuracion</h1>
          <p className="text-muted-foreground">Configura tu cuenta y preferencias</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saved ? "Guardado!" : "Guardar"}
        </button>
      </div>
      <div className="bg-card rounded-lg border p-6 max-w-2xl">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Idioma</h2>
            <select
              value={settings.language}
              onChange={(e) => setSettings({ ...settings, language: e.target.value })}
              className="w-full px-3 py-2 rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Zona Horaria</h2>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="w-full px-3 py-2 rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="America/Argentina/Buenos_Aires">Argentina (GMT-3)</option>
              <option value="America/Sao_Paulo">Brasil (GMT-3)</option>
              <option value="America/Mexico_City">Mexico (GMT-6)</option>
            </select>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Modelo de IA</h2>
            <select
              value={settings.ai_model}
              onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })}
              className="w-full px-3 py-2 rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="gpt-4o-mini">GPT-4o Mini (Rápido, económico)</option>
              <option value="gpt-4o">GPT-4o (Mayor calidad)</option>
              <option value="claude-sonnet">Claude Sonnet (Creativo)</option>
            </select>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Firma de Email</h2>
            <textarea
              value={settings.email_signature || ""}
              onChange={(e) => setSettings({ ...settings, email_signature: e.target.value })}
              placeholder="Tu nombre&#10;Tu empresa&#10;Teléfono"
              rows={4}
              className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
