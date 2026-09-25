"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Search,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpCircle,
  Calendar,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api-client";
import { Conversation } from "@/lib/types";

interface ConversationListResponse {
  items: Conversation[];
  total: number;
  offset: number;
  limit: number;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "contact";
  content: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  interested: { label: "Interesado", color: "text-emerald-400", icon: CheckCircle2 },
  objection: { label: "Objecion", color: "text-amber-400", icon: AlertTriangle },
  meeting_scheduled: { label: "Reunion", color: "text-blue-400", icon: Calendar },
  escalated: { label: "Escalado", color: "text-red-400", icon: ArrowUpCircle },
  follow_up: { label: "Seguimiento", color: "text-muted-foreground", icon: Clock },
  active: { label: "Activo", color: "text-emerald-400", icon: CheckCircle2 },
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<ConversationListResponse>("/api/v1/conversations", {
        limit: "50",
      });
      setConversations(data.items);
      if (data.items.length > 0 && !selectedId) {
        setSelectedId(data.items[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar conversaciones");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch messages when conversation selected
  useEffect(() => {
    if (!selectedId) return;
    async function fetchMessages() {
      try {
        const data = await api.get<{ items: Message[] }>(
          `/api/v1/conversations/${selectedId}/messages`
        );
        setMessages(data.items || []);
      } catch {
        // Silently fail for messages
      }
    }
    fetchMessages();
  }, [selectedId]);

  // WebSocket connection for real-time messages
  useEffect(() => {
    if (!selectedId) return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/v1/conversations/${selectedId}/ws`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      setWsConnected(false);
      return;
    }

    ws.onopen = () => {
      setWsConnected(true);
      // Send token for auth
      ws.send(JSON.stringify({ token }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message") {
          setMessages((prev) => [...prev, data.message]);
        } else if (data.type === "auth_error") {
          ws.close();
        }
      } catch {
        // Ignore invalid messages
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    ws.onerror = () => {
      setWsConnected(false);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [selectedId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !selectedId) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setSending(true);

    // Optimistic update
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "assistant",
      content: messageContent,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      await api.post(`/api/v1/conversations/${selectedId}/messages`, {
        content: messageContent,
        role: "assistant",
      });
    } catch {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.summary && c.summary.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-2xl overflow-hidden glass border border-white/10 shadow-glass">
      {/* Sidebar - Conversation List */}
      <div className="w-80 border-r border-white/5 flex flex-col glass-sidebar">
        {/* Header */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-electric-400" />
              Conversaciones
            </h2>
            <div
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px]",
                wsConnected
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-white/5 text-muted-foreground border border-white/10"
              )}
            >
              {wsConnected ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              {wsConnected ? "En vivo" : "Offline"}
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar conversaciones..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-electric-500/50 transition-colors"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-xl bg-white/5 animate-pulse">
                  <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Sin conversaciones</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredConversations.map((conv) => {
                const config = statusConfig[conv.status] || statusConfig.active;
                const StatusIcon = config.icon;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className={cn(
                      "w-full p-3 rounded-xl text-left transition-all",
                      selectedId === conv.id
                        ? "bg-electric-500/10 border border-electric-500/20 shadow-glow-sm"
                        : "hover:bg-white/5 border border-transparent"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={cn("w-4 h-4", config.color)} />
                        <span className="text-sm font-medium text-foreground truncate max-w-[140px]">
                          {conv.summary || conv.id.slice(0, 12)}
                        </span>
                      </div>
                      {conv.sentiment && (
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full",
                            conv.sentiment === "positive"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : conv.sentiment === "negative"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-white/5 text-muted-foreground"
                          )}
                        >
                          {conv.sentiment}
                        </span>
                      )}
                    </div>
                    {conv.next_action && (
                      <p className="text-[11px] text-muted-foreground mt-1 truncate pl-6">
                        {conv.next_action}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-electric-500/20 to-cyan-500/20 border border-electric-500/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-electric-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {selectedConversation.summary || `Conversacion ${selectedConversation.id.slice(0, 8)}`}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Estado: {statusConfig[selectedConversation.status]?.label || selectedConversation.status}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-electric-500/20 to-cyan-500/20 border border-electric-500/30 flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8 text-electric-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Inicia la conversacion enviando un mensaje
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3",
                      msg.role === "assistant" || msg.role === "user"
                        ? "flex-row-reverse"
                        : "flex-row"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        msg.role === "assistant" || msg.role === "user"
                          ? "bg-gradient-to-br from-electric-500 to-cyan-500"
                          : "bg-gradient-to-br from-electric-500/20 to-cyan-500/20 border border-electric-500/30"
                      )}
                    >
                      {msg.role === "contact" ? (
                        <User className="w-4 h-4 text-electric-400" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-3 text-sm",
                        msg.role === "assistant" || msg.role === "user"
                          ? "bg-gradient-to-r from-electric-600 to-cyan-500 text-white rounded-tr-sm"
                          : "glass-subtle text-foreground rounded-tl-sm"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-electric-500/50 focus:ring-2 focus:ring-electric-500/20 transition-all"
                  disabled={sending}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="h-10 px-4 rounded-xl bg-gradient-to-r from-electric-600 to-cyan-500 text-white hover:brightness-110 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Selecciona una conversacion para comenzar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
