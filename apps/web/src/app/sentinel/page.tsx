"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { ProtectedRoute } from "@/components/protected-route"
import { SentinelDashboard } from "@/components/sentinel-dashboard"
import { useDashboard } from "@/hooks/use-dashboard"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function SentinelPage() {
  const { refreshData } = useDashboard()

  const handleDataUpdate = () => {
    refreshData()
  }

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
          <div className="flex-1 space-y-4 p-4 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Security Monitoring</h1>
                <p className="text-muted-foreground">
                  Monitor security threats and manage risk alerts
                </p>
              </div>
            </div>
            <SentinelDashboard onDataUpdate={handleDataUpdate} />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}
