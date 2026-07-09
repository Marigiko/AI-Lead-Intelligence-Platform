"use client";

import { Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuracion</h1>
        <p className="text-muted-foreground">Configura tu cuenta y preferencias</p>
      </div>
      <div className="bg-card rounded-lg border p-6 max-w-2xl">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Idioma</h2>
            <select className="w-full px-3 py-2 rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="es">Espanol</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Zona Horaria</h2>
            <select className="w-full px-3 py-2 rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="America/Argentina/Buenos_Aires">Argentina (GMT-3)</option>
              <option value="America/Sao_Paulo">Brasil (GMT-3)</option>
              <option value="America/Mexico_City">Mexico (GMT-6)</option>
            </select>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Modelo de IA</h2>
            <select className="w-full px-3 py-2 rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="gpt-4o-mini">GPT-4o Mini (Rapido, economico)</option>
              <option value="gpt-4o">GPT-4o (Mayor calidad)</option>
              <option value="claude-sonnet">Claude Sonnet (Creativo)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
