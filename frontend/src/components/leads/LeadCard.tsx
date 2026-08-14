"use client";

import { Building2, Phone, Mail, Globe, MapPin, Star, AlertCircle, CheckCircle, HelpCircle } from "lucide-react";

interface LeadCardProps {
  lead: {
    id: string;
    name: string;
    domain: string | null;
    industry: string | null;
    city: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    whatsapp: string | null;
    opportunity_score: number;
    status: string;
    recommended_services: string[] | null;
    has_ssl: boolean | null;
    website_quality?: "none" | "poor" | "good";
    justification?: string | null;
    match_reason?: string | null;
  };
  onClick?: () => void;
  selected?: boolean;
}

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 70 ? "text-green-600" : score >= 40 ? "text-yellow-600" : "text-red-600";
  const bg = score >= 70 ? "bg-green-50 dark:bg-green-900/20" : score >= 40 ? "bg-yellow-50 dark:bg-yellow-900/20" : "bg-red-50 dark:bg-red-900/20";
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bg}`}>
      <span className={`text-sm font-bold ${color}`}>{score}</span>
    </div>
  );
}

function ConfidenceBadge({ type }: { type: "verified" | "scraped" | "database" | "inferred" | "unverified" }) {
  const config = {
    verified: { icon: CheckCircle, label: "Verificado", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    scraped: { icon: CheckCircle, label: "Scraped", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    database: { icon: CheckCircle, label: "Database", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    inferred: { icon: HelpCircle, label: "Inferido (ultimo recurso)", cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
    unverified: { icon: AlertCircle, label: "Sin datos", cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  };
  const { icon: Icon, label, cls } = config[type] || config.unverified;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>
      <Icon size={10} /> {label}
    </span>
  );
}

export default function LeadCard({ lead, onClick, selected }: LeadCardProps) {
  const needsWebsite = !lead.domain || lead.website_quality === "none" || lead.website_quality === "poor";

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
        selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card hover:border-primary/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <ScoreCircle score={lead.opportunity_score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground truncate">{lead.name}</h3>
            {needsWebsite && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                Necesita web
              </span>
            )}
          </div>
          {lead.industry && <p className="text-xs text-muted-foreground mt-0.5">{lead.industry}</p>}

          {/* Contact Info */}
          <div className="mt-2 space-y-1">
            {lead.phone && (
              <div className="flex items-center gap-2">
                <Phone size={12} className="text-muted-foreground" />
                <span className="text-xs text-foreground">{lead.phone}</span>
                <ConfidenceBadge type="verified" />
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-2">
                <Mail size={12} className="text-muted-foreground" />
                <span className="text-xs text-foreground truncate">{lead.email}</span>
                <ConfidenceBadge type="inferred" />
              </div>
            )}
            {lead.domain && (
              <div className="flex items-center gap-2">
                <Globe size={12} className="text-muted-foreground" />
                <a
                  href={`https://${lead.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-600 hover:underline truncate"
                >
                  {lead.domain}
                </a>
              </div>
            )}
            {lead.address && (
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate">{lead.address}</span>
              </div>
            )}
          </div>

          {/* Recommended Services */}
          {lead.recommended_services && lead.recommended_services.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {lead.recommended_services.slice(0, 3).map((service) => (
                <span
                  key={service}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                >
                  {service}
                </span>
              ))}
            </div>
          )}

          {/* AI Justification - WHY this company matches */}
          {(lead.justification || lead.match_reason) && (
            <div className="mt-2 p-2 rounded-md bg-muted/30 border-l-2 border-primary/50">
              <p className="text-[10px] font-medium text-primary mb-0.5">Por que es lead:</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {lead.justification || lead.match_reason}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
