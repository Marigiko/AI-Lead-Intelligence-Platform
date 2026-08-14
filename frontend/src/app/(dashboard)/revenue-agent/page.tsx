"use client";

import { RevenueAgentChat } from "@/components/revenue-agent/RevenueAgentChat";

export default function RevenueAgentPage() {
  return (
    <div className="h-[calc(100vh-8rem)]">
      <RevenueAgentChat embedded />
    </div>
  );
}
