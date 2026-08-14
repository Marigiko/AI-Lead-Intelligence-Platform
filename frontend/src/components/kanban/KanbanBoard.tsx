"use client";

import { useState, useCallback } from "react";
import {
  GripVertical,
  DollarSign,
  Calendar,
  Building2,
  ChevronRight,
  ChevronLeft,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Deal } from "@/lib/types";

interface Stage {
  id: string;
  name: string;
  color: string;
  deals: Deal[];
}

interface KanbanBoardProps {
  stages: Stage[];
  onMoveDeal: (dealId: string, fromStage: string, toStage: string) => Promise<void>;
  onDealClick?: (deal: Deal) => void;
}

export function KanbanBoard({ stages, onMoveDeal, onDealClick }: KanbanBoardProps) {
  const [draggedDeal, setDraggedDeal] = useState<{ deal: Deal; fromStage: string } | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback((e: React.DragEvent, deal: Deal, stageName: string) => {
    setDraggedDeal({ deal, fromStage: stageName });
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", deal.id);
    // Make the drag image slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setIsDragging(false);
    setDraggedDeal(null);
    setDragOverStage(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stageName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageName);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverStage(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, toStage: string) => {
      e.preventDefault();
      setDragOverStage(null);

      if (!draggedDeal) return;
      if (draggedDeal.fromStage === toStage) return;

      await onMoveDeal(draggedDeal.deal.id, draggedDeal.fromStage, toStage);
      setDraggedDeal(null);
      setIsDragging(false);
    },
    [draggedDeal, onMoveDeal]
  );

  const getStageValue = (deals: Deal[]) =>
    deals.reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-thin">
      {stages.map((stage) => (
        <div
          key={stage.id}
          className={cn(
            "flex-shrink-0 w-72 rounded-2xl border transition-all duration-300",
            dragOverStage === stage.id
              ? "border-electric-500/50 bg-electric-500/5 shadow-glow-sm scale-[1.02]"
              : "border-white/5 bg-glass"
          )}
          onDragOver={(e) => handleDragOver(e, stage.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, stage.id)}
        >
          {/* Stage Header */}
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <h3 className="text-sm font-semibold text-foreground">{stage.name}</h3>
                <span className="px-2 py-0.5 text-xs rounded-full bg-white/5 text-muted-foreground">
                  {stage.deals.length}
                </span>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                ${getStageValue(stage.deals).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Deals */}
          <div className="p-2 space-y-2 min-h-[200px]">
            {stage.deals.length === 0 ? (
              <div
                className={cn(
                  "h-24 rounded-xl border-2 border-dashed flex items-center justify-center transition-colors",
                  dragOverStage === stage.id
                    ? "border-electric-500/30 text-electric-400"
                    : "border-white/10 text-muted-foreground/50"
                )}
              >
                <p className="text-xs">Arrastra aqui</p>
              </div>
            ) : (
              stage.deals.map((deal) => (
                <div
                  key={deal.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, deal, stage.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onDealClick?.(deal)}
                  className={cn(
                    "group p-3 rounded-xl bg-white/[0.03] border border-white/5 cursor-grab active:cursor-grabbing transition-all hover:bg-white/[0.06] hover:border-white/10 hover:shadow-glow-sm",
                    draggedDeal?.deal.id === deal.id && "opacity-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {deal.title}
                      </p>
                      {deal.value && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <DollarSign className="w-3 h-3 text-emerald-400" />
                          <span className="text-xs font-mono text-emerald-400">
                            ${deal.value.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <GripVertical className="w-4 h-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      {deal.company_id && (
                        <Building2 className="w-3 h-3 text-muted-foreground/50" />
                      )}
                      <span className="text-[10px] text-muted-foreground/50 font-mono">
                        {deal.id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-electric-500/30 to-cyan-500/30 flex items-center justify-center">
                        <span className="text-[8px] text-electric-400 font-medium">
                          {deal.probability}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default KanbanBoard;
