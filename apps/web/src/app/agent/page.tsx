"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { ProtectedRoute } from "@/components/protected-route"
import { AgentChat } from "@/components/agent-chat"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function AgentPage() {
  return (
    <ProtectedRoute>
      <SidebarProvider
        style={{
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties}
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex-1 flex flex-col h-[calc(100vh-var(--header-height))]">
            <div className="flex-1 w-full h-full">
              <AgentChat />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}
