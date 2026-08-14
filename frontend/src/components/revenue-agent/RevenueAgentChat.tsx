"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  Lightbulb,
  X,
  Maximize2,
  Minimize2,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  suggestions?: string[];
  data?: Record<string, unknown>;
}

interface RevenueAgentChatProps {
  embedded?: boolean;
  onAction?: (action: Record<string, unknown>) => void;
}

export function RevenueAgentChat({ embedded = false, onAction }: RevenueAgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await api.post<{
        message: string;
        intent: string;
        data?: Record<string, unknown>;
        suggestions: string[];
        conversation_id: string;
      }>("/api/v1/revenue-agent/chat", {
        message: userMessage.content,
        conversation_id: conversationId || undefined,
      });

      setConversationId(response.conversation_id);

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-response`,
        role: "assistant",
        content: response.message,
        timestamp: new Date(),
        suggestions: response.suggestions,
        data: response.data,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Notify parent if there's an action to execute
      if (response.data?.action && onAction) {
        onAction(response.data);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: "Lo siento, hubo un error procesando tu mensaje. Intenta de nuevo.",
        timestamp: new Date(),
        suggestions: ["Reintentar", "Buscar empresas", "Ayuda"],
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    "Buscar empresas potenciales",
    "Cómo va mi pipeline",
    "Analiza una empresa",
    "Qué puedes hacer",
  ];

  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-electric-500/20 to-cyan-500/20 border border-electric-500/30 flex items-center justify-center shadow-glow-sm">
              <Bot className="w-8 h-8 text-electric-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Nexus AI</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Tu agente de inteligencia revenue
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1.5 text-xs rounded-full border border-electric-500/30 text-electric-400 hover:bg-electric-500/10 hover:border-electric-400 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  msg.role === "user"
                    ? "bg-gradient-to-br from-electric-500 to-cyan-500"
                    : "bg-gradient-to-br from-electric-500/20 to-cyan-500/20 border border-electric-500/30"
                )}
              >
                {msg.role === "user" ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-electric-400" />
                )}
              </div>

              {/* Message bubble */}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                  msg.role === "user"
                    ? "bg-gradient-to-r from-electric-600 to-cyan-500 text-white rounded-tr-sm"
                    : "bg-glass border border-white/10 text-foreground rounded-tl-sm"
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* Suggestions */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/10">
                    {msg.suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSuggestionClick(s)}
                        className="px-2.5 py-1 text-xs rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:text-electric-400 hover:border-electric-500/30 transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-electric-500/20 to-cyan-500/20 border border-electric-500/30 flex items-center justify-center">
              <Bot className="w-4 h-4 text-electric-400" />
            </div>
            <div className="bg-glass border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-electric-400 animate-spin" />
                <span className="text-sm text-muted-foreground">Pensando...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/5">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu consulta..."
            className="flex-1 h-10 px-4 rounded-xl bg-glass border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-electric-500/50 focus:shadow-glow-sm transition-all"
            disabled={isLoading}
          />
          <Button
            variant="primary"
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Embedded mode (full page)
  if (embedded) {
    return (
      <div className="h-[calc(100vh-8rem)] rounded-2xl overflow-hidden bg-glass border border-white/10 shadow-glow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-glass">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-electric-500/20 to-cyan-500/20 border border-electric-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-electric-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Nexus AI</h2>
              <p className="text-xs text-muted-foreground">Agente de inteligencia revenue</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400">Online</span>
            </div>
          </div>
        </div>
        {chatContent}
      </div>
    );
  }

  // Floating widget mode
  return (
    <>
      {/* Floating button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-gradient-to-r from-electric-600 to-cyan-500 text-white shadow-glow-purple hover:shadow-glow-purple-lg hover:brightness-110 active:scale-[0.97] transition-all flex items-center justify-center z-50"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* Chat widget */}
      {isExpanded && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 rounded-2xl overflow-hidden bg-glass border border-white/10 shadow-glow-purple transition-all",
            isExpanded ? "w-96 h-[32rem]" : "w-80 h-96"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-glass">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-electric-400" />
              <span className="text-sm font-semibold text-foreground">Nexus AI</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="h-[calc(100%-3.5rem)]">{chatContent}</div>
        </div>
      )}
    </>
  );
}

export default RevenueAgentChat;
