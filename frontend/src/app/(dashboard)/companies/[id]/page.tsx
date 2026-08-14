"use client";

import { useState, useEffect } from "react";
import {
  Building2, Phone, Mail, Globe, MapPin, Star, ExternalLink,
  Linkedin, Facebook, Instagram, Shield, MessageSquare, ShoppingCart,
  Bot, Loader2, ArrowLeft, AlertTriangle, CheckCircle, TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { CompanyDetail } from "@/lib/types";
import Link from "next/link";

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : score >= 40 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return <span className={`px-3 py-1 rounded-full text-sm font-bold ${color}`}>{score}/100</span>;
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = { discovered: "Descubierto", enriched: "Enriquecido", scored: "Puntuado" };
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">{labels[status] || status}</span>;
}

function ConfidenceBadge({ type }: { type: "verified" | "inferred" | "unverified" }) {
  const config = {
    verified: { icon: CheckCircle, label: "Verificado", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    inferred: { icon: AlertTriangle, label: "Inferido", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
    unverified: { icon: AlertTriangle, label: "Sin verificar", cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  };
  const { icon: Icon, label, cls } = config[type];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cls}`}><Icon size={10} /> {label}</span>;
}

export default function CompanyDetailPage({ params }: { params: { id: string } }) {
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCompany() {
      try {
        setLoading(true);
        const data = await api.get<CompanyDetail>(`/api/v1/companies/${params.id}`);
        setCompany(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar empresa");
      } finally {
        setLoading(false);
      }
    }
    fetchCompany();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive">
        <p className="font-medium">Error</p>
        <p className="text-sm mt-1">{error || "Empresa no encontrada"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/companies" className="p-2 rounded-md hover:bg-muted transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{company.name}</h1>
            <StatusBadge status={company.status} />
          </div>
          {company.industry && <p className="text-muted-foreground">{company.industry}</p>}
        </div>
        <ScoreBadge score={company.opportunity_score} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Contact + Web */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contact Info */}
          <div className="bg-card rounded-lg border p-5">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Phone size={16} /> Datos de Contacto
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {company.phone && (
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
                  <Phone size={16} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Telefono</p>
                    <a href={`tel:${company.phone}`} className="text-sm font-medium text-foreground hover:text-primary">{company.phone}</a>
                  </div>
                  <ConfidenceBadge type="verified" />
                </div>
              )}
              {company.email && (
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
                  <Mail size={16} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <a href={`mailto:${company.email}`} className="text-sm font-medium text-foreground hover:text-primary">{company.email}</a>
                  </div>
                  <ConfidenceBadge type="inferred" />
                </div>
              )}
              {company.domain && (
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
                  <Globe size={16} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Sitio Web</p>
                    <a href={`https://${company.domain}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                      {company.domain} <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              )}
              {company.address && (
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
                  <MapPin size={16} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Direccion</p>
                    <p className="text-sm font-medium text-foreground">{company.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Social Media */}
          {(company.linkedin_url || company.facebook_url || company.instagram_url) && (
            <div className="bg-card rounded-lg border p-5">
              <h2 className="font-semibold text-foreground mb-4">Redes Sociales</h2>
              <div className="flex flex-wrap gap-3">
                {company.linkedin_url && (
                  <a href={company.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 text-sm">
                    <Linkedin size={14} /> LinkedIn
                  </a>
                )}
                {company.facebook_url && (
                  <a href={company.facebook_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 text-sm">
                    <Facebook size={14} /> Facebook
                  </a>
                )}
                {company.instagram_url && (
                  <a href={company.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-md bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400 text-sm">
                    <Instagram size={14} /> Instagram
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Tech Stack */}
          {company.tech_stack && company.tech_stack.length > 0 && (
            <div className="bg-card rounded-lg border p-5">
              <h2 className="font-semibold text-foreground mb-4">Stack Tecnologico</h2>
              <div className="flex flex-wrap gap-2">
                {company.tech_stack.map((tech) => (
                  <span key={tech} className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 text-xs font-medium">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {company.opportunity_analysis && (
            <div className="bg-card rounded-lg border p-5">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp size={16} /> Analisis IA de Oportunidad
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{company.opportunity_analysis}</p>
              {company.recommended_services && company.recommended_services.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-foreground mb-2">Servicios Recomendados:</p>
                  <div className="flex flex-wrap gap-2">
                    {company.recommended_services.map((s) => (
                      <span key={s} className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 text-xs">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Score Breakdown + Quick Info */}
        <div className="space-y-4">
          {/* Score Breakdown */}
          {company.opportunity_breakdown && Object.keys(company.opportunity_breakdown).length > 0 && (
            <div className="bg-card rounded-lg border p-5">
              <h2 className="font-semibold text-foreground mb-4">Desglose de Score</h2>
              <div className="space-y-3">
                {Object.entries(company.opportunity_breakdown).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                      <span className="font-medium">{value}pts</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Digital Presence */}
          <div className="bg-card rounded-lg border p-5">
            <h2 className="font-semibold text-foreground mb-4">Presencia Digital</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground"><Shield size={14} /> SSL</span>
                <span className={company.has_ssl ? "text-green-600" : "text-red-600"}>{company.has_ssl ? "Si" : "No"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground"><MessageSquare size={14} /> Chatbot</span>
                <span className={company.has_chatbot ? "text-green-600" : "text-red-600"}>{company.has_chatbot ? "Si" : "No"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground"><ShoppingCart size={14} /> E-commerce</span>
                <span className="text-muted-foreground">--</span>
              </div>
            </div>
          </div>

          {/* SEO Score */}
          {company.seo_score !== null && (
            <div className="bg-card rounded-lg border p-5">
              <h2 className="font-semibold text-foreground mb-2">SEO Score</h2>
              <div className="text-3xl font-bold text-primary">{company.seo_score}<span className="text-lg text-muted-foreground">/100</span></div>
            </div>
          )}

          {/* Google Business */}
          {company.google_rating && (
            <div className="bg-card rounded-lg border p-5">
              <h2 className="font-semibold text-foreground mb-2">Google Business</h2>
              <div className="flex items-center gap-2">
                <Star size={16} className="text-yellow-500 fill-yellow-500" />
                <span className="font-medium">{company.google_rating}</span>
                {company.google_review_count && <span className="text-xs text-muted-foreground">({company.google_review_count} resenas)</span>}
              </div>
            </div>
          )}

          {/* Estimated Deal */}
          {company.estimated_deal_value && (
            <div className="bg-card rounded-lg border p-5">
              <h2 className="font-semibold text-foreground mb-2">Valor Estimado</h2>
              <p className="text-2xl font-bold text-green-600">${company.estimated_deal_value.toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
