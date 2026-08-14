"use client";

import { useState, useEffect } from "react";
import { Sliders, Zap, Play } from "lucide-react";
import { api } from "@/lib/api-client";

interface Weights {
  web_presence: number;
  seo: number;
  social: number;
  automation: number;
  technical: number;
}

export default function ScoringPage() {
  const [weights, setWeights] = useState<Weights>({
    web_presence: 25,
    seo: 25,
    social: 15,
    automation: 20,
    technical: 15,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<Weights>("/api/v1/scoring/weights");
        setWeights(data);
      } catch {}
    }
    load();
  }, []);

  const saveWeights = async () => {
    try {
      await api.put("/api/v1/scoring/weights", weights);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  const total = Object.values(weights).reduce((a, b) => a + b, 0);

  const criteria = [
    { key: "web_presence", label: "Presencia Web", desc: "No tiene web, web lenta, sin SSL", max: 40 },
    { key: "seo", label: "SEO", desc: "Score SEO bajo, sin meta tags", max: 40 },
    { key: "social", label: "Redes Sociales", desc: "Sin presencia social, pocas redes", max: 30 },
    { key: "automation", label: "Automatizacion", desc: "Sin chatbot, sin CRM, sin e-commerce", max: 30 },
    { key: "technical", label: "Tecnico", desc: "Tech antigua, sin SSL, hosting pobre", max: 30 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Scoring Parametrico</h1>
          <p className="text-muted-foreground">Ajusta el peso de cada criterio para calificar leads</p>
        </div>
        <button onClick={saveWeights} className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90">
          <Sliders size={16} />
          {saved ? "Guardado!" : "Guardar Pesos"}
        </button>
      </div>

      <div className="bg-card rounded-lg border p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-foreground">Criterios de Evaluacion</h2>
          <span className={`text-sm font-bold ${total === 100 ? "text-green-600" : "text-yellow-600"}`}>
            Total: {total}/100
          </span>
        </div>

        <div className="space-y-6">
          {criteria.map((c) => (
            <div key={c.key}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="text-sm font-medium text-foreground">{c.label}</label>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
                <span className="text-sm font-bold text-primary">{weights[c.key as keyof Weights]} pts</span>
              </div>
              <input
                type="range"
                min={0}
                max={c.max}
                value={weights[c.key as keyof Weights]}
                onChange={(e) => setWeights({ ...weights, [c.key]: parseInt(e.target.value) })}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          ))}
        </div>

        {total !== 100 && (
          <div className="mt-4 p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-sm">
            El total deberia ser 100 puntos. Actualmente: {total}
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="bg-card rounded-lg border p-6 max-w-2xl">
        <h3 className="font-semibold text-foreground mb-3">Como funciona</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>1. El usuario busca: "empresas sin web en Resistencia"</p>
          <p>2. El sistema encuentra empresas y evalua cada criterio</p>
          <p>3. Si una empresa NO tiene web, recibe {weights.web_presence} puntos (maximo en Presencia Web)</p>
          <p>4. Si tiene SEO pobre, recibe {weights.seo} puntos adicionales</p>
          <p>5. El score final (0-100) indica cuan buena oportunidad es</p>
          <p>6. La IA genera una justificacion: "Coincide con tu busqueda porque no tiene web..."</p>
        </div>
      </div>
    </div>
  );
}
