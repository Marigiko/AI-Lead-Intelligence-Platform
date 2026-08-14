"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Send,
  Plus,
  Play,
  Mail,
  MessageSquare,
  Users,
  TrendingUp,
  Zap,
  Rocket,
  Target,
  X,
  Check,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Campaign, Company } from "@/lib/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

/* ─── Types ─── */
interface CampaignListResponse {
  items: Campaign[];
  total: number;
}

type CampaignStatus = "draft" | "sending" | "sent" | string;

interface ApiError {
  message: string;
}

/* ─── Helpers ─── */
const getStatusVariant = (status: CampaignStatus) => {
  switch (status) {
    case "draft":
      return "outline" as const;
    case "sending":
      return "info" as const;
    case "sent":
      return "success" as const;
    default:
      return "default" as const;
  }
};

const getStatusLabel = (status: CampaignStatus): string => {
  switch (status) {
    case "draft":
      return "Borrador";
    case "sending":
      return "Enviando";
    case "sent":
      return "Enviado";
    default:
      return status;
  }
};

const getCampaignTypeIcon = (type: string) => {
  switch (type) {
    case "email":
      return Mail;
    case "whatsapp":
      return MessageSquare;
    default:
      return Send;
  }
};

const getCampaignTypeLabel = (type: string): string => {
  switch (type) {
    case "email":
      return "Email";
    case "whatsapp":
      return "WhatsApp";
    default:
      return type;
  }
};

const safeApiError = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Error inesperado";
};

const getStatValue = (stats: Record<string, number> | undefined, key: string): number => {
  if (!stats) return 0;
  return stats[key] ?? 0;
};

/* ─── Skeleton Components ─── */
function MetricSkeleton() {
  return (
    <div className="glass-card p-5 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-white/5 overflow-hidden">
          <div className="w-full h-full shimmer" />
        </div>
        <div className="w-12 h-4 rounded-full bg-white/5 overflow-hidden">
          <div className="w-full h-full shimmer" />
        </div>
      </div>
      <div className="h-8 w-20 rounded-lg bg-white/5 mb-2 overflow-hidden">
        <div className="w-full h-full shimmer" />
      </div>
      <div className="h-4 w-24 rounded bg-white/5 overflow-hidden">
        <div className="w-full h-full shimmer" />
      </div>
    </div>
  );
}

function CampaignCardSkeleton() {
  return (
    <div className="glass-card p-5 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/5 overflow-hidden">
            <div className="w-full h-full shimmer" />
          </div>
          <div className="h-4 w-32 rounded bg-white/5 overflow-hidden">
            <div className="w-full h-full shimmer" />
          </div>
        </div>
        <div className="w-16 h-5 rounded-full bg-white/5 overflow-hidden">
          <div className="w-full h-full shimmer" />
        </div>
      </div>
      <div className="flex gap-4">
        <div className="h-3 w-16 rounded bg-white/5 overflow-hidden">
          <div className="w-full h-full shimmer" />
        </div>
        <div className="h-3 w-16 rounded bg-white/5 overflow-hidden">
          <div className="w-full h-full shimmer" />
        </div>
      </div>
    </div>
  );
}

/* ─── Stat Card ─── */
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  change?: string;
  positive?: boolean;
  delay?: number;
}

function StatCard({ label, value, icon: Icon, iconColor, iconBg, change, positive, delay = 0 }: StatCardProps) {
  return (
    <div
      className="glass-card p-5 rounded-2xl animate-fade-in-up hover-lift"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconBg)}>
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        {change && (
          <span
            className={cn(
              "text-xs font-medium flex items-center gap-0.5",
              positive ? "text-emerald-400" : "text-red-400"
            )}
          >
            <TrendingUp className="w-3 h-3" />
            {change}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-foreground font-mono tracking-tight">
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

/* ─── Main Page ─── */
export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Campaign creation form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("email");
  const [newSubject, setNewSubject] = useState("");
  const [creating, setCreating] = useState(false);

  // Lead selection
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [availableLeads, setAvailableLeads] = useState<Company[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [leadsLoading, setLeadsLoading] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await api.get<CampaignListResponse>("/api/v1/campaigns", {
        limit: "50",
      });
      setCampaigns(data.items);
      if (data.items.length > 0 && !selectedId) {
        setSelectedId(data.items[0].id);
      }
    } catch (err) {
      setError(safeApiError(err));
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const selectedCampaign =
    campaigns.find((c) => c.id === selectedId) || campaigns[0];

  // Aggregated metrics
  const totals = campaigns.reduce(
    (acc, c) => {
      acc.leads += getStatValue(c.stats, "total");
      acc.sent += getStatValue(c.stats, "sent");
      acc.opened += getStatValue(c.stats, "opened");
      acc.replied += getStatValue(c.stats, "replied");
      return acc;
    },
    { leads: 0, sent: 0, opened: 0, replied: 0 }
  );

  const replyRate = totals.sent > 0 ? ((totals.replied / totals.sent) * 100).toFixed(1) : "0";

  // Create campaign
  const createCampaign = async () => {
    if (!newName.trim()) return;
    try {
      setCreating(true);
      await api.post("/api/v1/campaigns", {
        name: newName,
        type: newType,
        subject: newSubject,
      });
      setNewName("");
      setNewSubject("");
      setShowNewForm(false);
      fetchCampaigns();
    } catch (err) {
      alert(safeApiError(err));
    } finally {
      setCreating(false);
    }
  };

  // Send campaign
  const sendCampaign = async (campaignId: string) => {
    if (!confirm("Enviar campana a todos los leads?")) return;
    try {
      await api.post(`/api/v1/campaigns/${campaignId}/send`, {});
      alert("Campana enviada!");
      fetchCampaigns();
    } catch (err) {
      alert(safeApiError(err));
    }
  };

  // Generate AI messages
  const generateMessages = async (campaignId: string) => {
    try {
      await api.post(`/api/v1/campaigns/${campaignId}/generate`, {
        sender_name: "Sales Rep",
        sender_company: "Mi Agencia",
        sender_services: "desarrollo web y marketing digital",
      });
      alert("Mensajes generados!");
    } catch (err) {
      alert(safeApiError(err));
    }
  };

  // Load available leads for selection
  const loadLeads = async () => {
    try {
      setLeadsLoading(true);
      const data = await api.get<{ items: Company[] }>(
        "/api/v1/companies",
        { limit: "100" }
      );
      setAvailableLeads(data.items);
      setShowLeadModal(true);
    } catch {
      alert("Error al cargar empresas");
    } finally {
      setLeadsLoading(false);
    }
  };

  // Add leads to campaign
  const addLeadsToCampaign = async () => {
    if (selectedLeadIds.size === 0 || !selectedId) return;
    try {
      await api.post(`/api/v1/campaigns/${selectedId}/leads`, {
        company_ids: Array.from(selectedLeadIds),
      });
      setShowLeadModal(false);
      setSelectedLeadIds(new Set());
      alert(`${selectedLeadIds.size} leads agregados!`);
      fetchCampaigns();
    } catch (err) {
      alert(safeApiError(err));
    }
  };

  const toggleLead = (id: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ─── Loading State ─── */
  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 rounded-lg bg-white/5 overflow-hidden">
              <div className="w-full h-full shimmer" />
            </div>
            <div className="h-4 w-32 rounded bg-white/5 overflow-hidden">
              <div className="w-full h-full shimmer" />
            </div>
          </div>
          <div className="h-10 w-36 rounded-lg bg-white/5 overflow-hidden">
            <div className="w-full h-full shimmer" />
          </div>
        </div>

        {/* Metrics skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <MetricSkeleton key={i} />
          ))}
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <CampaignCardSkeleton key={i} />
            ))}
          </div>
          <div className="glass-card p-5 rounded-2xl h-80 overflow-hidden">
            <div className="w-full h-full shimmer" />
          </div>
        </div>
      </div>
    );
  }

  /* ─── Error State ─── */
  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center animate-fade-in-up">
        <Card variant="bordered" padding="lg" className="max-w-md text-center">
          <CardContent className="pt-6">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-bg">
              <AlertTriangle className="h-7 w-7 text-danger" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Error al cargar campanas
            </h3>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <Button
              variant="primary"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={fetchCampaigns}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ─── Main Render ─── */
  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Campanas
            </h1>
            <Badge variant="gradient" size="lg" dot>
              {campaigns.length}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Gestiona tus campanas de outreach y mensajeria
          </p>
        </div>
        <Button
          variant="primary"
          size="default"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setShowNewForm(!showNewForm)}
        >
          Nueva Campana
        </Button>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Leads"
          value={totals.leads}
          icon={Users}
          iconColor="text-electric-400"
          iconBg="bg-electric-500/10"
          change={`${campaigns.length} campanas`}
          positive
          delay={0}
        />
        <StatCard
          label="Enviados"
          value={totals.sent}
          icon={Send}
          iconColor="text-cyan-400"
          iconBg="bg-cyan-500/10"
          delay={100}
        />
        <StatCard
          label="Abiertos"
          value={totals.opened}
          icon={Mail}
          iconColor="text-emerald-400"
          iconBg="bg-success-bg"
          change={`${totals.sent > 0 ? ((totals.opened / totals.sent) * 100).toFixed(0) : 0}% tasa`}
          positive
          delay={200}
        />
        <StatCard
          label="Respuestas"
          value={totals.replied}
          icon={MessageSquare}
          iconColor="text-amber-400"
          iconBg="bg-warning-bg"
          change={`${replyRate}% reply rate`}
          positive
          delay={300}
        />
      </div>

      {/* ── Create Campaign Form ── */}
      {showNewForm && (
        <Card
          variant="gradient"
          padding="default"
          className="animate-scale-in"
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-electric-400" />
                <CardTitle>Crear Nueva Campana</CardTitle>
              </div>
              <button
                onClick={() => setShowNewForm(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Cerrar formulario"
              >
                <X size={18} />
              </button>
            </div>
            <CardDescription>
              Configura tu campana de outreach para comenzar a generar leads
            </CardDescription>
          </CardHeader>
          <CardContent padding="none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Nombre
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: Empresas Resistencia - Web"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-electric-500/50 focus:border-electric-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Tipo
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-foreground focus:outline-none focus:ring-2 focus:ring-electric-500/50 focus:border-electric-500/50 transition-all"
                >
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
            </div>
            {newType === "email" && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Asunto del email
                </label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Ej: Su pagina web necesita una actualizacion"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-electric-500/50 focus:border-electric-500/50 transition-all"
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="gap-3">
            <Button
              variant="primary"
              leftIcon={<Rocket className="h-4 w-4" />}
              onClick={createCampaign}
              disabled={!newName.trim()}
              isLoading={creating}
            >
              Crear Campana
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowNewForm(false)}
            >
              Cancelar
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Campaign List ── */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2 animate-fade-in-up">
            <Target className="w-4 h-4" />
            Tus campanas
          </h2>

          {campaigns.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl text-center animate-fade-in-up">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-electric-500/10">
                <Rocket className="h-8 w-8 text-electric-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Sin campanas aun
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Crea tu primera campana de outreach para comenzar a conectar con leads potenciales.
              </p>
              <Button
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setShowNewForm(true)}
              >
                Crear primera campana
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign, index) => {
                const TypeIcon = getCampaignTypeIcon(campaign.type);
                const isSelected = selectedCampaign?.id === campaign.id;
                return (
                  <article
                    key={campaign.id}
                    onClick={() => setSelectedId(campaign.id)}
                    style={{ animationDelay: `${index * 80}ms` }}
                    className={cn(
                      "glass-card p-5 rounded-2xl cursor-pointer animate-fade-in-up transition-smooth hover-lift",
                      isSelected
                        ? "border-electric-500/50 shadow-glow-sm"
                        : "hover:border-white/20"
                    )}
                    aria-pressed={isSelected}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(campaign.id);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center",
                            campaign.type === "email"
                              ? "bg-cyan-500/10"
                              : "bg-emerald-500/10"
                          )}
                        >
                          <TypeIcon
                            className={cn(
                              "w-4 h-4",
                              campaign.type === "email"
                                ? "text-cyan-400"
                                : "text-emerald-400"
                            )}
                          />
                        </div>
                        <h3 className="font-semibold text-foreground text-sm">
                          {campaign.name}
                        </h3>
                      </div>
                      <Badge
                        variant={getStatusVariant(campaign.status)}
                        dot
                        animated
                      >
                        {getStatusLabel(campaign.status)}
                      </Badge>
                    </div>

                    {/* Mini stats */}
                    {campaign.stats &&
                      (getStatValue(campaign.stats, "sent") > 0 ||
                        getStatValue(campaign.stats, "total") > 0) && (
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Send className="w-3 h-3" />
                            {getStatValue(campaign.stats, "sent")} enviados
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {getStatValue(campaign.stats, "opened")} abiertos
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {getStatValue(campaign.stats, "replied")}{" "}
                            respuestas
                          </span>
                        </div>
                      )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Stats & Actions Panel ── */}
        <div className="space-y-6">
          {selectedCampaign && (
            <>
              {/* Campaign Detail Card */}
              <Card
                variant="glow"
                padding="default"
                className="animate-fade-in-up"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    {(() => {
                      const Icon = getCampaignTypeIcon(selectedCampaign.type);
                      return (
                        <Icon className="w-4 h-4 text-electric-400" />
                      );
                    })()}
                    <Badge
                      variant={getStatusVariant(selectedCampaign.status)}
                      size="sm"
                      dot
                    >
                      {getStatusLabel(selectedCampaign.status)}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">
                    {selectedCampaign.name}
                  </CardTitle>
                  <CardDescription>
                    {getCampaignTypeLabel(selectedCampaign.type)} campana
                  </CardDescription>
                </CardHeader>

                <CardContent padding="none">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        label: "Leads",
                        value: getStatValue(selectedCampaign.stats, "total"),
                        color: "text-foreground",
                      },
                      {
                        label: "Enviados",
                        value: getStatValue(selectedCampaign.stats, "sent"),
                        color: "text-cyan-400",
                      },
                      {
                        label: "Abiertos",
                        value: getStatValue(selectedCampaign.stats, "opened"),
                        color: "text-emerald-400",
                      },
                      {
                        label: "Respuestas",
                        value: getStatValue(selectedCampaign.stats, "replied"),
                        color: "text-electric-400",
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="text-center p-3 rounded-xl bg-white/5 border border-white/5"
                      >
                        <p
                          className={cn(
                            "text-2xl font-bold font-mono",
                            stat.color
                          )}
                        >
                          {stat.value.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Actions Card */}
              <Card
                variant="bordered"
                padding="default"
                className="animate-fade-in-up"
                style={{ animationDelay: "100ms" }}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Acciones</CardTitle>
                </CardHeader>
                <CardContent padding="none" className="space-y-2">
                  {selectedCampaign.status === "draft" && (
                    <>
                      <Button
                        variant="outline"
                        size="default"
                        className="w-full"
                        leftIcon={<Users className="h-4 w-4" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          loadLeads();
                        }}
                        isLoading={leadsLoading}
                      >
                        Agregar Leads
                      </Button>
                      <Button
                        variant="glow"
                        size="default"
                        className="w-full"
                        leftIcon={<Sparkles className="h-4 w-4" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          generateMessages(selectedCampaign.id);
                        }}
                      >
                        Generar Mensajes AI
                      </Button>
                      <Button
                        variant="cyan"
                        size="default"
                        className="w-full"
                        leftIcon={<Play className="h-4 w-4" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          sendCampaign(selectedCampaign.id);
                        }}
                      >
                        Iniciar Envio
                      </Button>
                    </>
                  )}
                  {selectedCampaign.status !== "draft" && (
                    <div className="flex flex-col items-center py-4 text-center">
                      <Zap className="h-8 w-8 text-electric-400/50 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Campana en estado{" "}
                        {getStatusLabel(selectedCampaign.status)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* ── Lead Selection Modal ── */}
      {showLeadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Agregar leads a campana"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLeadModal(false)}
            aria-hidden="true"
          />
          <div className="relative glass-card rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col border border-white/10 shadow-glass animate-scale-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">
                  Agregar Leads a Campana
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Selecciona las empresas que deseas incluir
                </p>
              </div>
              <button
                onClick={() => setShowLeadModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-premium">
              {availableLeads.map((lead) => {
                const isChecked = selectedLeadIds.has(lead.id);
                return (
                  <div
                    key={lead.id}
                    onClick={() => toggleLead(lead.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleLead(lead.id);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                      isChecked
                        ? "border-electric-500/50 bg-electric-500/10"
                        : "border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/5"
                    )}
                    role="checkbox"
                    aria-checked={isChecked}
                    tabIndex={0}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all",
                        isChecked
                          ? "bg-electric-500 border-electric-500"
                          : "border-white/20"
                      )}
                    >
                      {isChecked && (
                        <Check size={12} className="text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {lead.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {lead.domain || lead.phone || "Sin contacto"}
                      </p>
                    </div>
                    {lead.opportunity_score > 0 && (
                      <Badge variant="gradient" size="sm">
                        {lead.opportunity_score}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {selectedLeadIds.size}
                </span>{" "}
                seleccionados
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLeadModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={addLeadsToCampaign}
                  disabled={selectedLeadIds.size === 0}
                >
                  Agregar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
