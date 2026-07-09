"use client";

import { Plug } from "lucide-react";

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integraciones</h1>
        <p className="text-muted-foreground">Conecta con servicios externos</p>
      </div>
      <div className="bg-card rounded-lg border p-12 text-center">
        <Plug size={48} className="mx-auto text-indigo-500 mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">Integraciones</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Se habilitara en la Fase 8. Conecta con HubSpot, Pipedrive, n8n, Make,
          Slack, Telegram, y mas servicios externos.
        </p>
      </div>
    </div>
  );
}
