"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sliders,
  Zap,
  Play,
  Globe,
  Search,
  Share2,
  Bot,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  RotateCcw,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

/* ─── Types ─── */
interface Weights {
  web_presence: number;
  seo: number;
  social: number;
  automation: number;
  technical: number;
}

interface Criterion {
  key: keyof Weights;
  label: string;
  description: string;
  max: number;
  icon: typeof Globe;
  color: string;
  bgColor: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

/* ─── Constants ─── */
const DEFAULT_WEIGHTS: Weights = {
  web_presence: 25,
  seo: 25,
  social: 15,
  automation: 20,
  technical: 15,
};

const CRITERIA: Criterion[] = [
  {
    key: "web_presence",
    label: "Presencia Web",
    description: "No tiene web, web lenta, sin SSL",
    max: 40,
    icon: Globe,
    color: "text-electric-400",
    bgColor: "bg-electric-500/10",
  },
  {
    key: "seo",
    label: "SEO",
    description: "Score SEO bajo, sin meta tags",
    max: 40,
    icon: Search,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
  },
  {
    key: "social",
    label: "Redes Sociales",
    description: "Sin presencia social, pocas redes",
    max: 30,
    icon: Share2,
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
  },
  {
    key: "automation",
    label: "Automatizacion",
    description: "Sin chatbot, sin CRM, sin e-commerce",
    max: 30,
    icon: Bot,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  {
    key: "technical",
    label: "Tecnico",
    description: "Tech antigua, sin SSL, hosting pobre",
    max: 30,
    icon: Cpu,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
];

/* ─── Skeleton Component ─── */
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-lg bg-gradient-to-r from-transparent via-white/10 to-transparent bg-[length:200%_100%]",
        className
      )}
      aria-hidden="true"
    />
  );
}

/* ─── Slider Component ─── */
interface SliderProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  color: string;
  label: string;
}

function PremiumSlider({ value, max, onChange, color, label }: SliderProps) {
  const percentage = (value / max) * 100;

  return (
    <div className="relative">
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/5 accent-electric-500
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-5
          [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-electric-500
          [&::-webkit-slider-thumb]:shadow-glow-sm
          [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-electric-300
          [&::-webkit-slider-thumb]:transition-all
          [&::-webkit-slider-thumb]:hover:scale-110
          [&::-webkit-slider-thumb]:hover:shadow-glow-purple
          [&::-moz-range-thumb]:w-5
          [&::-moz-range-thumb]:h-5
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-electric-500
          [&::-moz-range-thumb]:shadow-glow-sm
          [&::-moz-range-thumb]:border-2
          [&::-moz-range-thumb]:border-electric-300
          [&::-moz-range-thumb]:transition-all"
      />
      <div
        className={cn("absolute top-0 left-0 h-2 rounded-full pointer-events-none", color)}
        style={{ width: `${percentage}%` }}
        aria-hidden="true"
      />
    </div>
  );
}

/* ─── Main Page Component ─── */
export default function ScoringPage() {
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  /* Load weights from API */
  useEffect(() => {
    let cancelled = false;

    async function loadWeights() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get<Weights>("/api/v1/scoring/weights");
        if (!cancelled) {
          setWeights(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar los pesos");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadWeights();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Save weights to API */
  const saveWeights = useCallback(async () => {
    try {
      setSaveStatus("saving");
      await api.patch("/api/v1/scoring/weights", weights);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (err) {
      setSaveStatus("error");
      setError(err instanceof Error ? err.message : "Error al guardar");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [weights]);

  /* Reset to defaults */
  const resetWeights = useCallback(() => {
    setWeights(DEFAULT_WEIGHTS);
    setSaveStatus("idle");
  }, []);

  /* Update single criterion weight */
  const updateWeight = useCallback((key: keyof Weights, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
    setSaveStatus("idle");
  }, []);

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const isValid = total === 100;
  const totalColor = isValid ? "text-emerald-400" : total > 100 ? "text-danger" : "text-warning";

  /* ─── Loading State ─── */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>

        <Card variant="glow" padding="lg">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-24" />
            </div>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </Card>

        <Card variant="subtle" padding="default">
          <Skeleton className="h-5 w-40 mb-4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </Card>
      </div>
    );
  }

  /* ─── Main Render ─── */
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-electric-600 to-cyan-500 flex items-center justify-center shadow-glow-sm">
              <Sliders className="w-5 h-5 text-white" />
            </div>
            Scoring Parametrico
          </h1>
          <p className="text-muted-foreground mt-1 ml-[52px]">
            Ajusta el peso de cada criterio para calificar leads
          </p>
        </div>

        <div className="flex items-center gap-3 ml-[52px] sm:ml-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetWeights}
            aria-label="Restablecer valores por defecto"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button
            variant="primary"
            size="default"
            onClick={saveWeights}
            isLoading={saveStatus === "saving"}
            disabled={saveStatus === "saving"}
            leftIcon={
              saveStatus === "saved" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : saveStatus === "error" ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <Zap className="w-4 h-4" />
              )
            }
          >
            {saveStatus === "saved"
              ? "Guardado!"
              : saveStatus === "error"
              ? "Error al guardar"
              : "Guardar Pesos"}
          </Button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl bg-danger/10 border border-danger/25 animate-fade-in-up"
          role="alert"
          aria-live="polite"
        >
          <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* ── Total Score Card ── */}
      <Card
        variant="gradient"
        padding="default"
        className="animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-electric-500/20 to-cyan-500/20 border border-electric-500/30 flex items-center justify-center">
              <TrendingUp className={cn("w-7 h-7", totalColor)} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Puntos</p>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-4xl font-bold font-mono", totalColor)}>
                  {total}
                </span>
                <span className="text-lg text-muted-foreground font-mono">/100</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isValid ? (
              <Badge variant="success" size="lg" dot>
                Configuracion valida
              </Badge>
            ) : total > 100 ? (
              <Badge variant="danger" size="lg" dot>
                Excede por {total - 100} pts
              </Badge>
            ) : (
              <Badge variant="warning" size="lg" dot>
                Faltan {100 - total} pts
              </Badge>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                isValid
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                  : total > 100
                  ? "bg-gradient-to-r from-danger to-danger-light"
                  : "bg-gradient-to-r from-warning to-warning-light"
              )}
              style={{ width: `${Math.min(total, 100)}%` }}
              role="progressbar"
              aria-valuenow={total}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Total: ${total} de 100 puntos`}
            />
          </div>
        </div>
      </Card>

      {/* ── Criteria Card ── */}
      <Card
        variant="glow"
        padding="lg"
        className="animate-fade-in-up"
        style={{ animationDelay: "200ms" }}
      >
        <CardHeader className="px-0 pt-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-electric-400" />
                Criterios de Evaluacion
              </CardTitle>
              <CardDescription className="mt-1">
                Define cuanto aporta cada factor al score final de oportunidad
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-0 space-y-6">
          {CRITERIA.map((criterion, index) => {
            const value = weights[criterion.key];
            const Icon = criterion.icon;

            return (
              <div
                key={criterion.key}
                className="group p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-electric-500/20 hover:bg-white/[0.04] transition-all duration-300"
                style={{ animationDelay: `${(index + 3) * 100}ms` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Icon + Info */}
                  <div className="flex items-center gap-3 sm:w-1/3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110",
                        criterion.bgColor
                      )}
                    >
                      <Icon className={cn("w-5 h-5", criterion.color)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {criterion.label}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {criterion.description}
                      </p>
                    </div>
                  </div>

                  {/* Slider */}
                  <div className="flex-1 flex items-center gap-4">
                    <PremiumSlider
                      value={value}
                      max={criterion.max}
                      onChange={(v) => updateWeight(criterion.key, v)}
                      color={cn(
                        "bg-gradient-to-r",
                        criterion.color === "text-electric-400"
                          ? "from-electric-600 to-electric-400"
                          : criterion.color === "text-cyan-400"
                          ? "from-cyan-600 to-cyan-400"
                          : criterion.color === "text-pink-400"
                          ? "from-pink-600 to-pink-400"
                          : criterion.color === "text-amber-400"
                          ? "from-amber-600 to-amber-400"
                          : "from-emerald-600 to-emerald-400"
                      )}
                      label={`Peso de ${criterion.label}`}
                    />
                  </div>

                  {/* Value Badge */}
                  <div className="sm:w-20 text-right">
                    <span className="inline-flex items-center justify-center min-w-[60px] px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                      <span className="text-lg font-bold font-mono text-foreground">
                        {value}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">pts</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ── How It Works Card ── */}
      <Card
        variant="subtle"
        padding="default"
        className="animate-fade-in-up"
        style={{ animationDelay: "500ms" }}
      >
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-4 h-4 text-cyan-400" />
            Como funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { step: 1, text: 'El usuario busca: "empresas sin web en Resistencia"', color: "text-electric-400" },
              { step: 2, text: "El sistema encuentra empresas y evalua cada criterio", color: "text-cyan-400" },
              { step: 3, text: `Si una empresa NO tiene web, recibe ${weights.web_presence} puntos`, color: "text-pink-400" },
              { step: 4, text: `Si tiene SEO pobre, recibe ${weights.seo} puntos adicionales`, color: "text-amber-400" },
              { step: 5, text: "El score final (0-100) indica cuan buena oportunidad es", color: "text-emerald-400" },
              { step: 6, text: "La IA genera una justificacion personalizada", color: "text-purple-400" },
            ].map((item) => (
              <div
                key={item.step}
                className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
              >
                <span
                  className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full bg-white/5 text-xs font-bold shrink-0",
                    item.color
                  )}
                  aria-hidden="true"
                >
                  {item.step}
                </span>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Quick Preview Card ── */}
      <Card
        variant="bordered"
        padding="default"
        hover
        className="animate-fade-in-up"
        style={{ animationDelay: "600ms" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <Play className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Vista previa activa</p>
              <p className="text-xs text-muted-foreground">
                Los cambios se reflejan en tiempo real en la pagina de Discovery
              </p>
            </div>
          </div>
          <Badge variant="cyan" dot animated>
            Live
          </Badge>
        </div>
      </Card>
    </div>
  );
}
