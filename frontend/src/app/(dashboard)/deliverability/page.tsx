"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Server,
  Shield,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  Mail,
  Activity,
  TrendingUp,
  Inbox,
  Sparkles,
  ArrowUpRight,
  Loader2,
  Search,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/* ─── Types ─── */
interface Inbox {
  id: string;
  username: string;
  daily_limit: number;
  sent_today: number;
  reputation_score: number;
  is_active: boolean;
}

interface VerifyResult {
  valid: boolean;
  reason?: string;
  disposable?: boolean;
  role_address?: boolean;
}

interface DeliverabilityError {
  message: string;
}

/* ─── Helpers ─── */
function getReputationVariant(score: number): "success" | "warning" | "danger" {
  if (score >= 70) return "success";
  if (score >= 40) return "warning";
  return "danger";
}

function getUsagePercentage(sent: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(Math.round((sent / limit) * 100), 100);
}

/* ─── Skeleton Components ─── */
function StatCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="glass-card p-6 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="h-10 w-10 rounded-lg bg-white/5 shimmer" />
        <div className="h-5 w-16 rounded-full bg-white/5 shimmer" />
      </div>
      <div className="h-9 w-24 rounded-md bg-white/5 shimmer mb-2" />
      <div className="h-4 w-20 rounded bg-white/5 shimmer" />
    </div>
  );
}

function InboxCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="glass-card p-5 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/5 shimmer" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-white/5 shimmer" />
            <div className="h-3 w-20 rounded bg-white/5 shimmer" />
          </div>
        </div>
        <div className="h-6 w-16 rounded-full bg-white/5 shimmer" />
      </div>
      <div className="space-y-3">
        <div className="h-2 w-full rounded-full bg-white/5 shimmer" />
        <div className="h-4 w-24 rounded bg-white/5 shimmer" />
      </div>
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState({
  icon,
  title,
  message,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in-up">
      <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-5">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{message}</p>
      {cta}
    </div>
  );
}

/* ─── Main Component ─── */
export default function DeliverabilityPage() {
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DeliverabilityError | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInbox, setNewInbox] = useState({
    host: "",
    port: 587,
    username: "",
    password: "",
    daily_limit: 30,
  });
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [addingInbox, setAddingInbox] = useState(false);

  const fetchInboxes = useCallback(async () => {
    try {
      setError(null);
      const data = await api.get<{ inboxes: Inbox[] }>("/api/v1/deliverability/inboxes");
      setInboxes(data.inboxes);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al cargar los buzones";
      setError({ message: errorMessage });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInboxes();
  }, [fetchInboxes]);

  const addInbox = async () => {
    if (!newInbox.host || !newInbox.username) return;
    try {
      setAddingInbox(true);
      await api.post("/api/v1/deliverability/inboxes", newInbox);
      setNewInbox({ host: "", port: 587, username: "", password: "", daily_limit: 30 });
      setShowAddForm(false);
      fetchInboxes();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al agregar el buzon";
      setError({ message: errorMessage });
    } finally {
      setAddingInbox(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verifyEmail) return;
    try {
      setVerifying(true);
      const result = await api.post<VerifyResult>("/api/v1/deliverability/verify-email", {
        email: verifyEmail,
      });
      setVerifyResult(result);
    } catch {
      setVerifyResult({ valid: false, reason: "verification_failed" });
    } finally {
      setVerifying(false);
    }
  };

  /* ─── Derived Metrics ─── */
  const totalSent = inboxes.reduce((sum, i) => sum + i.sent_today, 0);
  const totalLimit = inboxes.reduce((sum, i) => sum + i.daily_limit, 0);
  const avgReputation =
    inboxes.length > 0
      ? Math.round(inboxes.reduce((sum, i) => sum + i.reputation_score, 0) / inboxes.length)
      : 0;
  const activeInboxes = inboxes.filter((i) => i.is_active).length;

  const stats = [
    {
      label: "Buzones Activos",
      value: activeInboxes,
      total: inboxes.length,
      icon: Server,
      color: "text-electric-400",
      iconBg: "bg-gradient-to-br from-electric-500 to-electric-600",
    },
    {
      label: "Enviados Hoy",
      value: totalSent,
      total: totalLimit,
      icon: Activity,
      color: "text-cyan-400",
      iconBg: "bg-gradient-to-br from-cyan-500 to-cyan-600",
    },
    {
      label: "Reputacion Promedio",
      value: avgReputation,
      suffix: "/100",
      icon: Shield,
      color: avgReputation >= 70 ? "text-success" : avgReputation >= 40 ? "text-warning" : "text-danger",
      iconBg: "bg-gradient-to-br from-success to-success-dark",
    },
    {
      label: "Tasa de Entrega",
      value: avgReputation >= 70 ? 95 : avgReputation >= 40 ? 78 : 45,
      suffix: "%",
      icon: TrendingUp,
      color: "text-amber-400",
      iconBg: "bg-gradient-to-br from-warning to-neon-orange",
    },
  ];

  /* ─── Loading State ─── */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded-lg bg-white/5 shimmer" />
          <div className="h-4 w-80 rounded bg-white/5 shimmer" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton delay={0} />
          <StatCardSkeleton delay={100} />
          <StatCardSkeleton delay={200} />
          <StatCardSkeleton delay={300} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <InboxCardSkeleton delay={400} />
          <InboxCardSkeleton delay={500} />
          <InboxCardSkeleton delay={600} />
        </div>
      </div>
    );
  }

  /* ─── Error State ─── */
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass-card p-8 max-w-md text-center animate-scale-in">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-danger/10 flex items-center justify-center">
            <AlertTriangle className="text-danger" size={32} />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Error al cargar datos
          </h2>
          <p className="text-muted-foreground text-sm mb-6">{error.message}</p>
          <Button
            variant="primary"
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchInboxes();
            }}
            leftIcon={<Loader2 size={16} />}
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  /* ─── Render ─── */
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <span className="gradient-text">Entregabilidad</span>
            <Sparkles size={20} className="text-electric-400 animate-pulse-glow" />
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona buzones, verifica emails, monitorea reputacion
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowAddForm(true)}
          leftIcon={<Plus size={16} />}
          size="default"
        >
          Agregar Inbox
        </Button>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="glass-card p-6 hover-lift animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center",
                    stat.iconBg
                  )}
                >
                  <Icon size={20} className="text-white" />
                </div>
                <ArrowUpRight size={14} className="text-muted-foreground" />
              </div>
              <p className="text-3xl font-mono font-bold text-foreground">
                {stat.value.toLocaleString()}
                {stat.suffix && (
                  <span className="text-lg text-muted-foreground">{stat.suffix}</span>
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Inboxes Section ── */}
      <div className="animate-fade-in-up" style={{ animationDelay: "400ms" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Inbox size={18} className="text-electric-400" />
            Buzones Configurados
          </h2>
          <Badge variant="electric" size="default" dot>
            {inboxes.length} {inboxes.length === 1 ? "buzone" : "buzones"}
          </Badge>
        </div>

        {inboxes.length === 0 ? (
          <div className="glass-card">
            <EmptyState
              icon={<Server size={32} className="text-muted-foreground" />}
              title="Sin buzones configurados"
              message="Agrega un servidor SMTP para comenzar a enviar campanas y monitorear la entregabilidad."
              cta={
                <Button
                  variant="primary"
                  onClick={() => setShowAddForm(true)}
                  leftIcon={<Plus size={16} />}
                >
                  Agregar mi primer inbox
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inboxes.map((inbox, index) => {
              const usagePercent = getUsagePercentage(inbox.sent_today, inbox.daily_limit);
              const repVariant = getReputationVariant(inbox.reputation_score);

              return (
                <div
                  key={inbox.id}
                  className="glass-card p-5 hover-lift animate-fade-in-up"
                  style={{ animationDelay: `${(index + 4) * 80}ms` }}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center",
                          inbox.is_active
                            ? "bg-gradient-to-br from-electric-500 to-electric-600"
                            : "bg-white/5"
                        )}
                      >
                        <Server size={18} className={inbox.is_active ? "text-white" : "text-muted-foreground"} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {inbox.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Limite: {inbox.daily_limit}/dia
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={inbox.is_active ? "success" : "warning"}
                      size="sm"
                      dot
                    >
                      {inbox.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>

                  {/* Usage Progress */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Enviados hoy</span>
                      <span className="text-xs font-mono text-foreground">
                        {inbox.sent_today}/{inbox.daily_limit}
                      </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-1000 ease-out",
                          usagePercent >= 90
                            ? "bg-gradient-to-r from-danger to-danger-dark"
                            : usagePercent >= 70
                              ? "bg-gradient-to-r from-warning to-neon-orange"
                              : "bg-gradient-to-r from-electric-500 to-cyan-500"
                        )}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Reputation */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Reputacion</span>
                    </div>
                    <Badge variant={repVariant} size="default" dot>
                      {inbox.reputation_score}/100
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Verify Email Section ── */}
      <div
        className="glass-card p-6 animate-fade-in-up"
        style={{ animationDelay: "600ms" }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Mail size={18} className="text-cyan-400" />
              Verificar Email
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Valida la calidad de un email antes de enviar
            </p>
          </div>
          <Badge variant="cyan" size="sm" dot>
            Validacion
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              value={verifyEmail}
              onChange={(e) => setVerifyEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyEmail()}
              placeholder="email@ejemplo.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm placeholder:text-muted-foreground/50 transition-all duration-200 focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 focus:bg-white/[0.03]"
              aria-label="Email para verificar"
            />
          </div>
          <Button
            variant="primary"
            onClick={handleVerifyEmail}
            isLoading={verifying}
            disabled={!verifyEmail}
            leftIcon={<Mail size={16} />}
          >
            Verificar
          </Button>
        </div>

        {/* Verification Result */}
        {verifyResult && (
          <div
            className={cn(
              "mt-4 p-4 rounded-lg border animate-fade-in-up",
              verifyResult.valid
                ? "bg-success/5 border-success/20"
                : "bg-danger/5 border-danger/20"
            )}
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              {verifyResult.valid ? (
                <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                  <CheckCircle size={16} className="text-success" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
                  <AlertTriangle size={16} className="text-danger" />
                </div>
              )}
              <div className="space-y-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    verifyResult.valid ? "text-success" : "text-danger"
                  )}
                >
                  {verifyResult.valid ? "Email valido" : "Email invalido"}
                </p>
                {!verifyResult.valid && verifyResult.reason && (
                  <p className="text-xs text-muted-foreground">
                    Razon: {verifyResult.reason}
                  </p>
                )}
                <div className="flex gap-2 mt-2">
                  {verifyResult.disposable && (
                    <Badge variant="danger" size="sm">
                      Desechable
                    </Badge>
                  )}
                  {verifyResult.role_address && (
                    <Badge variant="warning" size="sm">
                      Direccion de rol
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Inbox Modal ── */}
      {showAddForm && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setShowAddForm(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Agregar inbox SMTP"
        >
          <div className="glass-card w-full max-w-md p-6 space-y-5 animate-scale-in">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Server size={18} className="text-electric-400" />
                Agregar Inbox SMTP
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Configura un nuevo servidor de envio
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Host SMTP
                </label>
                <input
                  value={newInbox.host}
                  onChange={(e) => setNewInbox({ ...newInbox, host: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm placeholder:text-muted-foreground/50 transition-all duration-200 focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20"
                  aria-label="Host SMTP"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Puerto
                  </label>
                  <input
                    type="number"
                    value={newInbox.port}
                    onChange={(e) =>
                      setNewInbox({ ...newInbox, port: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm transition-all duration-200 focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20"
                    aria-label="Puerto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Limite diario
                  </label>
                  <input
                    type="number"
                    value={newInbox.daily_limit}
                    onChange={(e) =>
                      setNewInbox({ ...newInbox, daily_limit: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm transition-all duration-200 focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20"
                    aria-label="Limite diario"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Username
                </label>
                <input
                  value={newInbox.username}
                  onChange={(e) => setNewInbox({ ...newInbox, username: e.target.value })}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm placeholder:text-muted-foreground/50 transition-all duration-200 focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20"
                  aria-label="Username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={newInbox.password}
                  onChange={(e) => setNewInbox({ ...newInbox, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm placeholder:text-muted-foreground/50 transition-all duration-200 focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20"
                  aria-label="Password"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="primary"
                onClick={addInbox}
                isLoading={addingInbox}
                disabled={!newInbox.host || !newInbox.username}
                className="flex-1"
              >
                Agregar
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowAddForm(false)}
                disabled={addingInbox}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
