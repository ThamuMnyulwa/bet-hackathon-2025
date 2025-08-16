"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { ProtectedRoute } from "@/components/protected-route"
import { AgentDialog } from "@/components/agent-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Sparkles, CreditCard, Shield, TrendingUp, Receipt, BarChart3, Activity, RefreshCw, AlertTriangle, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { useDashboard } from "@/hooks/use-dashboard"
import { toast } from "sonner"
import { DotLoader } from "@/components/ui/dot-loader"

export default function Page() {
  const searchParams = useSearchParams()
  const { data, loading, error, refreshing, refreshData } = useDashboard()

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!refreshing) {
        refreshData()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [refreshing, refreshData])

  // Function to handle data refresh from child components
  const handleDataUpdate = () => {
    refreshData()
  }

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return "text-accent-foreground"
    if (score >= 60) return "text-accent"
    if (score >= 40) return "text-muted-foreground"
    return "text-destructive"
  }

  const getSecurityScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-accent-foreground/10 text-accent-foreground">Excellent</Badge>
    if (score >= 60) return <Badge className="bg-accent/10 text-accent-foreground">Good</Badge>
    if (score >= 40) return <Badge className="bg-muted text-muted-foreground">Fair</Badge>
    return <Badge className="bg-destructive/10 text-destructive">Poor</Badge>
  }

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'NORMAL': return "text-accent-foreground"
      case 'ELEVATED': return "text-accent"
      case 'HIGH': return "text-muted-foreground"
      case 'CRITICAL': return "text-destructive"
      default: return "text-muted-foreground"
    }
  }

  const getThreatLevelBadge = (level: string) => {
    switch (level) {
      case 'NORMAL': return <Badge className="bg-accent-foreground/10 text-accent-foreground">Normal</Badge>
      case 'ELEVATED': return <Badge className="bg-accent/10 text-accent-foreground">Elevated</Badge>
      case 'HIGH': return <Badge className="bg-muted text-muted-foreground">High</Badge>
      case 'CRITICAL': return <Badge className="bg-destructive/10 text-destructive">Critical</Badge>
      default: return <Badge className="bg-muted text-muted-foreground">Unknown</Badge>
    }
  }

  if (loading) {
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
              <DashboardPageSkeleton />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ProtectedRoute>
    )
  }

  if (error) {
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
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <AlertCircle className="h-32 w-32 text-destructive mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Error Loading Dashboard</h2>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={refreshData} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ProtectedRoute>
    )
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
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                  Welcome back! Here's an overview of your account activity and security status.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={refreshData}
                  variant="outline"
                  size="sm"
                  disabled={refreshing}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>

            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data?.overview.totalTransactions || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    All time payment transactions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Security Score</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <span className={getSecurityScoreColor(data?.overview.securityScore || 0)}>
                      {data?.overview.securityScore || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {getSecurityScoreBadge(data?.overview.securityScore || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data?.overview.activeAlerts || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Security alerts requiring attention
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data?.overview.activeDevices || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Trusted devices connected
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Transaction Summary */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-accent-foreground">
                    {data?.transactions.summary.pending || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved</CardTitle>
                  <CheckCircle className="h-4 w-4 text-accent-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-accent-foreground">
                    {data?.transactions.summary.approved || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle className="h-4 w-4 text-accent-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-accent-foreground">
                    {data?.transactions.summary.completed || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Escrow</CardTitle>
                  <Shield className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {data?.transactions.summary.escrow || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Declined</CardTitle>
                  <XCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {data?.transactions.summary.declined || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Transactions */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Recent Transactions
                  </CardTitle>
                  <CardDescription>
                    Latest payment activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data?.transactions.recent.slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <Receipt className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{transaction.recipient}</p>
                            <p className="text-xs text-muted-foreground">{transaction.timestamp}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {new Intl.NumberFormat('en-ZA', {
                              style: 'currency',
                              currency: transaction.currency,
                            }).format(transaction.amount)}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Security Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Security Status
                  </CardTitle>
                  <CardDescription>
                    Current threat level and system health
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Threat Level:</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${getThreatLevelColor(data?.security.systemHealth.threatLevel || 'NORMAL')}`}>
                          {data?.security.systemHealth.threatLevel || 'NORMAL'}
                        </span>
                        {data?.security.systemHealth.threatLevel && getThreatLevelBadge(data.security.systemHealth.threatLevel)}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">System Uptime:</span>
                      <span className="font-semibold text-accent-foreground">{data?.security.systemHealth.uptime || '99.97%'}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Avg Risk Score:</span>
                      <span className="font-semibold">{data?.security.riskAssessment.averageScore || 0}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Critical Alerts:</span>
                      <span className="font-semibold text-destructive">{data?.security.alerts.critical || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Floating Action Button for AI Agent */}
            <div className="fixed bottom-6 right-6 z-50">
              <AgentDialog>
                <Button 
                  size="lg" 
                  className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110"
                >
                  <MessageSquare className="w-8 h-8" />
                </Button>
              </AgentDialog>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}

function DashboardPageSkeleton() {
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
