"use client";

import { useState } from "react";
import { Zap, TrendingUp, Globe, Search, Share2, Bot, Server } from "lucide-react";

const mockScores = [
  {
    id: "1",
    name: "Constructora Chaco SRL",
    domain: null,
    score: 95,
    breakdown: { web_presence: 25, seo: 25, social: 15, automation: 18, technical: 12 },
    services: ["Desarrollo de pagina web", "SEO", "Google Business", "CRM"],
    dealValue: 5000,
  },
  {
    id: "2",
    name: "Transporte Pesado del Norte",
    domain: null,
    score: 91,
    breakdown: { web_presence: 25, seo: 22, social: 14, automation: 17, technical: 13 },
    services: ["Pagina web", "Automatizacion con IA"],
    dealValue: 4500,
  },
  {
    id: "3",
    name: "Clinica Dental Sonrisa",
    domain: null,
    score: 88,
    breakdown: { web_presence: 22, seo: 20, social: 12, automation: 18, technical: 16 },
    services: ["Pagina web", "Chatbot", "CRM"],
    dealValue: 4000,
  },
  {
    id: "4",
    name: "Restaurante La Parrilla del Norte",
    domain: "laparrilladelnorte.com.ar",
    score: 85,
    breakdown: { web_presence: 18, seo: 22, social: 10, automation: 18, technical: 17 },
    services: ["Rediseño web", "SEO", "E-commerce"],
    dealValue: 3500,
  },
  {
    id: "5",
    name: "Estudio Juridico Moreno & Asoc.",
    domain: "moreno-abogados.com.ar",
    score: 82,
    breakdown: { web_presence: 15, seo: 20, social: 12, automation: 18, technical: 17 },
    services: ["Rediseño web", "SEO", "Automatización"],
    dealValue: 3000,
  },
];

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : score >= 40 ? "#f97316" : "#ef4444";

  return (
    <div className="relative w-20 h-20">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
        <circle
          cx="40" cy="40" r="36" fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

function BreakdownBar({ label, value, max, icon: Icon }: { label: string; value: number; max: number; icon: any }) {
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className="text-muted-foreground flex-shrink-0" />
      <span className="text-xs text-muted-foreground w-20">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-foreground w-6 text-right">{value}</span>
    </div>
  );
}

export default function ScoringPage() {
  const [selectedCompany, setSelectedCompany] = useState(mockScores[0]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Opportunity Scoring</h1>
        <p className="text-muted-foreground">Analisis automatico de oportunidades de negocio</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total Analizadas</p>
          <p className="text-2xl font-bold text-foreground">247</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Alta Oportunidad (80+)</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">89</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Valor Potencial</p>
          <p className="text-2xl font-bold text-foreground">$342,000</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company List */}
        <div className="lg:col-span-2 bg-card rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-foreground">Ranking por Oportunidad</h2>
          </div>
          <div className="divide-y">
            {mockScores.map((company, i) => (
              <div
                key={company.id}
                onClick={() => setSelectedCompany(company)}
                className={`flex items-center gap-4 p-4 cursor-pointer transition-colors ${
                  selectedCompany.id === company.id ? "bg-primary/5" : "hover:bg-muted/30"
                }`}
              >
                <span className="text-sm font-medium text-muted-foreground w-6">{i + 1}</span>
                <ScoreRing score={company.score} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{company.name}</p>
                  <p className="text-xs text-muted-foreground">{company.domain || "Sin sitio web"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">${company.dealValue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">valor estimado</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="bg-card rounded-lg border p-4 space-y-4">
          <div className="text-center">
            <ScoreRing score={selectedCompany.score} />
            <h3 className="mt-2 font-semibold text-foreground">{selectedCompany.name}</h3>
            <p className="text-xs text-muted-foreground">{selectedCompany.domain || "Sin sitio web"}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Desglose</p>
            <BreakdownBar label="Web" value={selectedCompany.breakdown.web_presence} max={25} icon={Globe} />
            <BreakdownBar label="SEO" value={selectedCompany.breakdown.seo} max={25} icon={Search} />
            <BreakdownBar label="Social" value={selectedCompany.breakdown.social} max={15} icon={Share2} />
            <BreakdownBar label="Automat." value={selectedCompany.breakdown.automation} max={20} icon={Bot} />
            <BreakdownBar label="Tecnico" value={selectedCompany.breakdown.technical} max={15} icon={Server} />
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Servicios Recomendados
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedCompany.services.map((s) => (
                <span key={s} className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Valor estimado:{" "}
              <span className="font-bold text-foreground">
                ${selectedCompany.dealValue.toLocaleString()}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
