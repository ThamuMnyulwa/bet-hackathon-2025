import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface DashboardData {
  overview: {
    totalTransactions: number
    securityScore: number
    activeAlerts: number
    activeDevices: number
  }
  transactions: {
    summary: {
      pending: number
      approved: number
      completed: number
      declined: number
      escrow: number
    }
    recent: Array<{
      id: string
      amount: number
      currency: string
      recipient: string
      status: string
      timestamp: string
    }>
    highRisk: Array<{
      id: string
      amount: number
      currency: string
      recipient: string
      riskScore: number
      status: string
      timestamp: string
    }>
  }
  security: {
    alerts: {
      total: number
      critical: number
      unresolved: number
      recent: number
    }
    riskAssessment: {
      averageScore: number
      recentAssessments: Array<{
        id: string
        riskScore: number
        riskLevel: string
        assessmentType: string
        timestamp: string
      }>
    }
    systemHealth: {
      uptime: string
      threatLevel: string
      lastUpdated: string
    }
  }
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboardData = async () => {
    try {
      setError(null)
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/dashboard`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const dashboardData = await response.json()
      setData(dashboardData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard data'
      setError(errorMessage)
      toast.error('Failed to load dashboard data')
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await fetchDashboardData()
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  return {
    data,
    loading,
    error,
    refreshing,
    refreshData,
    fetchDashboardData
  }
}
