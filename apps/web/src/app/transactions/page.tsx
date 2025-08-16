"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { ProtectedRoute } from "@/components/protected-route"
import { TransactionsDataTable } from "@/components/transactions-data-table"
import { useDashboard } from "@/hooks/use-dashboard"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { DotLoader } from "@/components/ui/dot-loader"

export default function TransactionsPage() {
  const { refreshData, loading } = useDashboard()

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
                <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
                <p className="text-muted-foreground">
                  View and manage all your payment transactions with detailed analytics
                </p>
              </div>
            </div>
            {loading ? <TransactionsPageSkeleton /> : <TransactionsDataTable onDataUpdate={handleDataUpdate} />}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}

function TransactionsPageSkeleton() {
  return (
    <div className="flex h-full items-center justify-center pt-8">
      <DotLoader
        frames={[
          [21, 22],
          [14, 21, 22, 29],
          [7, 14, 21, 22, 29, 36],
          [0, 7, 14, 21, 22, 29, 36, 43],
          [1, 8, 15, 22, 29, 36, 43],
          [2, 9, 16, 23, 30, 37, 44],
          [3, 10, 17, 24, 31, 38, 45],
          [4, 11, 18, 25, 32, 39, 46],
          [5, 12, 19, 26, 33, 40, 47],
          [6, 13, 20, 27, 34, 41, 48],
          [13, 20, 27, 34, 41, 48],
          [20, 27, 34, 41, 48],
          [27, 34, 41, 48],
          [34, 41],
          [41],
          [],
        ]}
        duration={120}
        dotClassName="bg-muted-foreground/30 [&.active]:bg-primary"
        className="gap-0.5"
      />
    </div>
  )
}
