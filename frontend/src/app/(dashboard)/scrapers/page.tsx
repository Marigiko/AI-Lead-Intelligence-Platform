"use client";

import { Globe } from "lucide-react";

export default function ScrapersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Scrapers</h1>
        <p className="text-muted-foreground">Gestiona las fuentes de datos y scrapers activos</p>
      </div>
      <div className="bg-card rounded-lg border p-12 text-center">
        <Globe size={48} className="mx-auto text-cyan-500 mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">Motor de Scraping</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Se habilitara en la Fase 2. Sistema de plugins para agregar nuevas fuentes,
          gestionar proxies, y monitorear el estado de los scrapers.
        </p>
      </div>
    </div>
  );
}
