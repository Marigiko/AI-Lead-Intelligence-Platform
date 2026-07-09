"use client";

import {
  Building2, Users, Send, Briefcase, TrendingUp, Zap,
  ArrowUpRight, ArrowDownRight, DollarSign, Target, MessageSquare,
} from "lucide-react";

const stats = [
  { label: "Empresas", value: "247", change: "+32", icon: Building2, color: "text-blue-500" },
  { label: "Contactos", value: "183", change: "+18", icon: Users, color: "text-purple-500" },
  { label: "Campanas", value: "4", change: "+1", icon: Send, color: "text-green-500" },
  { label: "Reuniones", value: "7", change: "+3", icon: Briefcase, color: "text-orange-500" },
];

const topOpportunities = [
  { name: "Constructora Chaco SRL", score: 95, industry: "Construccion", value: "$5,000" },
  { name: "Transporte Pesado del Norte", score: 91, industry: "Logistica", value: "$4,500" },
  { name: "Clinica Dental Sonrisa", score: 88, industry: "Salud", value: "$4,000" },
  { name: "Restaurante La Parrilla", score: 85, industry: "Gastronomia", value: "$3,500" },
  { name: "Estudio Juridico Moreno", score: 82, industry: "Legal", value: "$3,200" },
];

const recentActivity = [
  { company: "Constructora Chaco SRL", action: "Score calculado: 95/100", time: "Hace 5 min", type: "score" },
  { company: "Estudio Juridico Moreno", action: "Email enviado — abierto", time: "Hace 12 min", type: "email" },
  { company: "Hotel Cacique Calchaqui", action: "Respuesta recibida — interesado", time: "Hace 35 min", type: "reply" },
  { company: "Clinica Dental Sonrisa", action: "Reunion agendada para 15/Jun", time: "Hace 1 hora", type: "meeting" },
  { company: "Distribuidora El Norte", action: "Enriquecimiento completado", time: "Hace 2 horas", type: "enrichment" },
];

const pipelineSummary = [
  { stage: "Prospeccion", count: 45, color: "#94a3b8" },
  { stage: "Contacto", count: 28, color: "#60a5fa" },
  { stage: "Calificado", count: 15, color: "#a78bfa" },
  { stage: "Propuesta", count: 8, color: "#fbbf24" },
  { stage: "Negociacion", count: 5, color: "#f97316" },
  { stage: "Ganado", count: 12, color: "#22c55e" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Resumen de tu plataforma de inteligencia comercial</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <stat.icon size={18} className={stat.color} />
              <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-0.5">
                <ArrowUpRight size={12} /> {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Opportunities */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Zap size={18} className="text-yellow-500" />
              Mejores Oportunidades
            </h2>
            <span className="text-xs text-muted-foreground">Top 5</span>
          </div>
          <div className="p-4 space-y-3">
            {topOpportunities.map((opp, i) => (
              <div key={opp.name} className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{opp.name}</p>
                  <p className="text-xs text-muted-foreground">{opp.industry}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    opp.score >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {opp.score}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">{opp.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline Mini */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Target size={18} className="text-blue-500" />
              Pipeline
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {pipelineSummary.map((s) => (
              <div key={s.stage} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-sm text-foreground flex-1">{s.stage}</span>
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(s.count / 45) * 100}%`, backgroundColor: s.color }}
                  />
                </div>
                <span className="text-sm font-medium text-foreground w-6 text-right">{s.count}</span>
              </div>
            ))}
          </div>
          <div className="p-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Valor total</span>
              <span className="font-bold text-foreground">$342,000</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <TrendingUp size={18} className="text-green-500" />
              Actividad Reciente
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {recentActivity.map((activity, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                  activity.type === "score" ? "bg-yellow-500" :
                  activity.type === "email" ? "bg-blue-500" :
                  activity.type === "reply" ? "bg-green-500" :
                  activity.type === "meeting" ? "bg-purple-500" : "bg-gray-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{activity.company}</span>{" "}
                    <span className="text-muted-foreground">{activity.action}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-green-500" />
            <span className="text-sm font-medium text-foreground">Ingresos Potenciales</span>
          </div>
          <p className="text-2xl font-bold text-foreground">$342,000</p>
          <p className="text-xs text-muted-foreground mt-1">113 empresas qualificadas</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={16} className="text-blue-500" />
            <span className="text-sm font-medium text-foreground">Tasa de Respuesta</span>
          </div>
          <p className="text-2xl font-bold text-foreground">24.3%</p>
          <p className="text-xs text-muted-foreground mt-1">18 de 74 emails enviados</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-yellow-500" />
            <span className="text-sm font-medium text-foreground">Score Promedio</span>
          </div>
          <p className="text-2xl font-bold text-foreground">78/100</p>
          <p className="text-xs text-muted-foreground mt-1">247 empresas analizadas</p>
        </div>
      </div>
    </div>
  );
}
