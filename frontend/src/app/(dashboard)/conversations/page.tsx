"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare, Send, Bot, User, ArrowUpCircle, Clock,
  CheckCircle2, XCircle, Calendar, AlertTriangle, MoreHorizontal,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Conversation } from "@/lib/types";

interface ConversationListResponse {
  items: Conversation[];
  total: number;
  offset: number;
  limit: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  interested: { label: "Interesado", color: "text-green-600 dark:text-green-400", icon: CheckCircle2 },
  objection: { label: "Objecion", color: "text-yellow-600 dark:text-yellow-400", icon: AlertTriangle },
  meeting_scheduled: { label: "Reunion", color: "text-blue-600 dark:text-blue-400", icon: Calendar },
  escalated: { label: "Escalado", color: "text-red-600 dark:text-red-400", icon: ArrowUpCircle },
  follow_up: { label: "Seguimiento", color: "text-gray-600 dark:text-gray-400", icon: Clock },
  active: { label: "Activo", color: "text-green-600 dark:text-green-400", icon: CheckCircle2 },
};

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return null;
  const color =
    sentiment === "positive"
      ? "text-green-600 dark:text-green-400"
      : sentiment === "negative"
      ? "text-red-600 dark:text-red-400"
      : "text-gray-600 dark:text-gray-400";
  return <span className={`text-xs font-medium ${color}`}>{sentiment}</span>;
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    async function fetchConversations() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get<ConversationListResponse>("/api/v1/conversations", { limit: "50" });
        setConversations(data.items);
        if (data.items.length > 0 && !selectedId) {
          setSelectedId(data.items[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar conversaciones");
      } finally {
        setLoading(false);
      }
    }
    fetchConversations();
  }, []);

  const selectedConv = conversations.find((c) => c.id === selectedId) || conversations[0];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conversaciones</h1>
          <p className="text-muted-foreground">SDR Autonomo — gestiona conversaciones con leads</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
          <div className="bg-card rounded-lg border p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-md bg-muted/50 animate-pulse" />
            ))}
          </div>
          <div className="lg:col-span-2 bg-card rounded-lg border p-4">
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Cargando conversaciones...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conversaciones</h1>
          <p className="text-muted-foreground">SDR Autonomo — gestiona conversaciones con leads</p>
        </div>
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive">
          <p className="font-medium">Error al cargar conversaciones</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Conversaciones</h1>
        <p className="text-muted-foreground">SDR Autonomo — gestiona conversaciones con leads</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
        {/* Conversation List */}
        <div className="bg-card rounded-lg border flex flex-col">
          <div className="p-3 border-b">
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              className="w-full px-3 py-1.5 rounded-md border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => {
              const status = statusConfig[conv.status] || statusConfig.active;
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`p-3 border-b cursor-pointer transition-colors ${
                    selectedConv?.id === conv.id ? "bg-primary/5" : "hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground truncate">{conv.id}</span>
                    <status.icon size={14} className={status.color} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-1">{conv.summary}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                    <SentimentBadge sentiment={conv.sentiment} />
                  </div>
                </div>
              );
            })}
            {conversations.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No hay conversaciones
              </div>
            )}
          </div>
        </div>

        {/* Conversation Detail */}
        {selectedConv ? (
          <div className="lg:col-span-2 bg-card rounded-lg border flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{selectedConv.id}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="capitalize">{selectedConv.channel}</span>
                  <span>&middot;</span>
                  <span className={statusConfig[selectedConv.status]?.color}>
                    {statusConfig[selectedConv.status]?.label}
                  </span>
                  <span>&middot;</span>
                  <SentimentBadge sentiment={selectedConv.sentiment} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors">
                  <ArrowUpCircle size={16} />
                </button>
                <button className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors">
                  <MoreHorizontal size={16} />
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="rounded-lg px-4 py-3 bg-muted text-foreground">
                <p className="text-xs font-medium text-muted-foreground mb-1">Resumen</p>
                <p className="text-sm">{selectedConv.summary || "Sin resumen"}</p>
              </div>
              {selectedConv.next_action && (
                <div className="rounded-lg px-4 py-3 bg-yellow-50 dark:bg-yellow-900/10">
                  <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-1">Proxima accion</p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">{selectedConv.next_action}</p>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribir como humano (intervencion)..."
                  className="flex-1 px-3 py-2 rounded-md border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
                  <Send size={14} />
                  Enviar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-card rounded-lg border flex items-center justify-center text-muted-foreground">
            Selecciona una conversacion
          </div>
        )}
      </div>
    </div>
  );
}
