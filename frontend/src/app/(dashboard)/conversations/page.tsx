"use client";

import { useState } from "react";
import {
  MessageSquare, Send, Bot, User, ArrowUpCircle, Clock,
  CheckCircle2, XCircle, Calendar, AlertTriangle, MoreHorizontal,
} from "lucide-react";

const mockConversations = [
  {
    id: "1",
    company: "Hotel Cacique Calchaqui",
    channel: "email",
    status: "interested",
    intent: "interest",
    sentiment: "positive",
    summary: "Interesado en mejorar su presencia digital y booking online",
    messages: [
      { role: "ai", content: "Hola, soy de Lead Intelligence. Vi que su hotel tiene una calificacion de 4.2 en Google con 89 resenas. Podriamos ayudarles a mejorar su booking online y presencia digital.", time: "10:00" },
      { role: "contact", content: "Hola, si estamos buscando mejorar nuestra pagina web. El sistema de reservas actual es muy basico.", time: "10:15" },
      { role: "ai", content: "Entiendo perfectamente. Un sistema de reservas moderno con integracion a Booking.com y su propio motor de reservas podria aumentar sus reservas directas un 30-40%. Podriamos agendar una llamada de 15 minutos para mostrarle como funciona?", time: "10:16" },
      { role: "contact", content: "Si, me parece bien. Que dias tienen disponibles?", time: "10:30" },
    ],
    next_action: "Agendar reunion",
    updated: "Hace 5 min",
  },
  {
    id: "2",
    company: "Constructora Chaco SRL",
    channel: "email",
    status: "objection",
    intent: "objection",
    sentiment: "neutral",
    summary: "Objecion de precio — necesita ver ROI primero",
    messages: [
      { role: "ai", content: "Buenas tardes, notamos que Constructora Chaco no tiene presencia digital. Una pagina web profesional podria ayudarles a conseguir mas clientes.", time: "09:00" },
      { role: "contact", content: "Ya nos contactaron varias veces por lo mismo. El tema es que no se si nos va a servir de algo.", time: "09:30" },
      { role: "ai", content: "Entiendo su preocupacion. Trabajamos con otra constructora en Corrientes que aumento sus consultas un 45% en 3 meses. Podriamos mostrarle los numeros concretos en una llamada corta?", time: "09:31" },
      { role: "contact", content: "Muestrenme algo concreto primero, no quiero perder tiempo en llamadas.", time: "10:00" },
    ],
    next_action: "Enviar caso de exito",
    updated: "Hace 20 min",
  },
  {
    id: "3",
    company: "Clinica Dental Sonrisa",
    channel: "whatsapp",
    status: "meeting_scheduled",
    intent: "meeting_request",
    sentiment: "positive",
    summary: "Reunion agendada para jueves 15:00",
    messages: [
      { role: "ai", content: "Hola Dr. Martinez! Vi que la clinica tiene 4.8 estrellas en Google. Felicidades! Podriamos ayudarles a automatizar la agenda de turnos.", time: "14:00" },
      { role: "contact", content: "Hola! Si, justo necesitamos algo asi. Los pacientes llaman y no hay quien conteste.", time: "14:20" },
      { role: "ai", content: "Un chatbot con agenda automatica resolveria eso. Los pacientes podrian agendar turnos 24/7 sin llamar. Podemos agendar una reunion para mostrarle como funciona?", time: "14:21" },
      { role: "contact", content: "Si! Quedamos el jueves a las 15hs?", time: "14:30" },
      { role: "ai", content: "Perfecto, quedo agendado para el jueves a las 15:00. Le enviare un recordatorio el martes. Muchas gracias!", time: "14:31" },
    ],
    next_action: "Enviar recordatorio martes",
    updated: "Hace 1 hora",
  },
  {
    id: "4",
    company: "Restaurante La Parrilla del Norte",
    channel: "email",
    status: "escalated",
    intent: "meeting_request",
    sentiment: "positive",
    summary: "Quiere reunirse, necesita intervention humana",
    messages: [
      { role: "ai", content: "Hola! Vi que La Parrilla tiene excelentes resenas (234!) pero la web no refleja eso. Podriamos ayudarles.", time: "11:00" },
      { role: "contact", content: "Si, hablen con el dueño, Don Carlos. El esta interesado pero quiere hablar con alguien directamente.", time: "11:30" },
    ],
    next_action: "Escalar a humano — contacto directo solicitado",
    updated: "Hace 2 horas",
  },
  {
    id: "5",
    company: "Distribuidora El Norte",
    channel: "email",
    status: "follow_up",
    intent: "unclear",
    sentiment: "neutral",
    summary: "Sin respuesta — programar follow-up",
    messages: [
      { role: "ai", content: "Buenos dias! Distribuidora El Norte parece tener potencial de crecimiento con una buena presencia digital. Nos gustaria conversar.", time: "08:00" },
    ],
    next_action: "Follow-up en 3 dias",
    updated: "Ayer",
  },
];

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  interested: { label: "Interesado", color: "text-green-600 dark:text-green-400", icon: CheckCircle2 },
  objection: { label: "Objecion", color: "text-yellow-600 dark:text-yellow-400", icon: AlertTriangle },
  meeting_scheduled: { label: "Reunion", color: "text-blue-600 dark:text-blue-400", icon: Calendar },
  escalated: { label: "Escalado", color: "text-red-600 dark:text-red-400", icon: ArrowUpCircle },
  follow_up: { label: "Seguimiento", color: "text-gray-600 dark:text-gray-400", icon: Clock },
  active: { label: "Activo", color: "text-green-600 dark:text-green-400", icon: CheckCircle2 },
};

export default function ConversationsPage() {
  const [selectedConv, setSelectedConv] = useState(mockConversations[0]);
  const [newMessage, setNewMessage] = useState("");

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
            {mockConversations.map((conv) => {
              const status = statusConfig[conv.status] || statusConfig.active;
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`p-3 border-b cursor-pointer transition-colors ${
                    selectedConv.id === conv.id ? "bg-primary/5" : "hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground truncate">{conv.company}</span>
                    <status.icon size={14} className={status.color} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-1">{conv.summary}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                    <span className="text-xs text-muted-foreground">{conv.updated}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2 bg-card rounded-lg border flex flex-col">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">{selectedConv.company}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="capitalize">{selectedConv.channel}</span>
                <span>&middot;</span>
                <span className={statusConfig[selectedConv.status]?.color}>
                  {statusConfig[selectedConv.status]?.label}
                </span>
                <span>&middot;</span>
                <span>Intent: {selectedConv.intent}</span>
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

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedConv.messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "ai" ? "" : "flex-row-reverse"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === "ai"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {msg.role === "ai" ? <Bot size={14} /> : <User size={14} />}
                </div>
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-2 ${
                    msg.role === "ai"
                      ? "bg-muted text-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs opacity-60 mt-1">{msg.time}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Next Action Bar */}
          {selectedConv.next_action && (
            <div className="px-4 py-2 border-t bg-yellow-50 dark:bg-yellow-900/10">
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                <strong>Proxima accion:</strong> {selectedConv.next_action}
              </p>
            </div>
          )}

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
      </div>
    </div>
  );
}
