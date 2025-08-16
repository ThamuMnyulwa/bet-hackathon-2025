"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { DotLoader } from '@/components/ui/dot-loader'
import { TransactionReviewModal } from '@/components/transaction-review-modal'
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Smartphone,
  MapPin,
  DollarSign,
  Users,
  RefreshCw,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  Sparkles,
  FileText,
  BookOpen
} from 'lucide-react'
import { toast } from 'sonner'

interface FraudMetrics {
  totalTransactions: number
  blockedTransactions: number
  escrowTransactions: number
  fraudBlocked: number
  falsePositiveRate: number
  averageLatency: number
  stepUpConversionRate: number
  averageRiskScore: number
}

interface AlertData {
  id: string
  alertType: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  timeAgo: string
  userIdMasked: string
  isResolved: boolean
  resolvedBy?: string
  resolvedAt?: string
  metadata?: any
  aiAnalysis?: {
    patternRecognition: {
      alertFrequency: number
      geographicClustering: boolean
      timePatterns: boolean
      amountPatterns: boolean
      devicePatterns: boolean
      riskScoreTrends: boolean
    }
    riskAssessment: {
      threatLevel: string
      confidenceScore: number
      falsePositiveRisk: string
      riskFactors: string[]
    }
    recommendations: {
      immediate: string[]
      shortTerm: string[]
      longTerm: string[]
    }
    humanReadableSummary: string
    analysisTimestamp: string
    confidenceScore: number
  }
}

interface RiskTransaction {
  id: string
  amount: number
  currency: string
  recipient: string
  riskScore: number
  status: string
  timestamp: string
}

interface AnalyticsData {
  metrics: FraudMetrics
  alerts: {
    total: number
    critical: number
    unresolved: number
    recent: number
  }
  highRiskTransactions: RiskTransaction[]
  riskFactorDistribution: Array<{
    name: string
    percentage: number
    count: number
  }>
  systemHealth: {
    uptime: string
    processingTime: string
    threatLevel: string
  }
}

interface SentinelDashboardProps {
  onDataUpdate?: () => void
}

function SentinelDashboardSkeleton() {
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

export function SentinelDashboard({ onDataUpdate }: SentinelDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [investigatingAlert, setInvestigatingAlert] = useState<AlertData | null>(null)
  const [reviewingTransaction, setReviewingTransaction] = useState<RiskTransaction | null>(null)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)

  const fetchData = async () => {
    try {
      setError(null)
      
      const [analyticsResponse, alertsResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/sentinel/analytics`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }),
        fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/sentinel/alerts?limit=5`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })
      ]);

      if (!analyticsResponse.ok || !alertsResponse.ok) {
        throw new Error('Failed to fetch data')
      }

      const analyticsData = await analyticsResponse.json()
      const alertsData = await alertsResponse.json()

      setAnalytics(analyticsData)
      setAlerts(alertsData.alerts || [])
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load security data')
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const generateSampleAlerts = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/sentinel/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (response.ok) {
        toast.success('Sample alerts generated')
        fetchData() // Refresh to show new alerts
      }
    } catch (error) {
      console.error('Failed to generate sample alerts:', error)
      toast.error('Failed to generate sample alerts')
    }
  }

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/sentinel/alerts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          alertId,
          action: 'resolve'
        })
      });

      if (response.ok) {
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, isResolved: true }
            : alert
        ));
        
        // Notify parent component to refresh data
        if (onDataUpdate) {
          onDataUpdate()
        }
        
        toast.success('Alert resolved')
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error)
      toast.error('Failed to resolve alert')
    }
  }

  const investigateAlert = async (alert: AlertData) => {
    try {
      // Set the alert being investigated
      setInvestigatingAlert(alert)
      
      // Log investigation start
      console.log('Starting investigation for alert:', alert.id)
      
      // In a real application, you might:
      // 1. Create an investigation record
      // 2. Gather additional context
      // 3. Start automated analysis
      // 4. Notify security team
      
      toast.success(`Investigation started for ${alert.alertType} alert`)
      
      // Simulate investigation process
      setTimeout(() => {
        toast.info('Investigation in progress - gathering additional context...')
      }, 1000)
      
    } catch (error) {
      console.error('Failed to start investigation:', error)
      toast.error('Failed to start investigation')
    }
  }

  const startAIAnalysis = async (alert: AlertData) => {
    try {
      // Set the alert being investigated
      setInvestigatingAlert(alert)
      
      toast.success(`AI analysis started for ${alert.alertType} alert`)
      
      // Call the AI analysis API
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/sentinel/ai-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ alertId: alert.id })
      });

      if (response.ok) {
        const analysisData = await response.json();
        
        // Store the AI analysis results
        setInvestigatingAlert(prev => prev ? { ...prev, aiAnalysis: analysisData } : null);
        
        toast.success('AI analysis completed successfully!');
      } else {
        toast.error('Failed to complete AI analysis');
      }
      
    } catch (error) {
      console.error('Failed to start AI analysis:', error);
      toast.error('Failed to start AI analysis');
    }
  }

  const closeInvestigation = () => {
    setInvestigatingAlert(null)
  }

  const openTransactionReview = (transaction: RiskTransaction) => {
    setReviewingTransaction(transaction)
    setIsReviewModalOpen(true)
  }

  const closeTransactionReview = () => {
    setIsReviewModalOpen(false)
    setReviewingTransaction(null)
  }

  useEffect(() => {
    fetchData()
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'destructive'
      case 'HIGH': return 'destructive'
      case 'MEDIUM': return 'outline'
      case 'LOW': return 'secondary'
      default: return 'secondary'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BLOCKED': return 'destructive'
      case 'ESCROW': return 'outline'
      case 'CHALLENGED': return 'secondary'
      case 'APPROVED': return 'default'
      default: return 'secondary'
    }
  }

  if (loading) {
    return <SentinelDashboardSkeleton />
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Security Monitoring</h1>
            <p className="text-destructive">{error}</p>
          </div>
          <Button onClick={refreshData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return null
  }

  // Show investigation modal if an alert is being investigated
  if (investigatingAlert) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Investigation in Progress</h1>
            <p className="text-muted-foreground">Analyzing security alert details</p>
          </div>
          <Button onClick={closeInvestigation} variant="outline">
            <XCircle className="h-4 w-4 mr-2" />
            Close Investigation
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
                              <Search className="h-5 w-5 text-primary" />
              <CardTitle>Alert Investigation: {investigatingAlert.alertType}</CardTitle>
            </div>
            <CardDescription>
              Detailed analysis and investigation steps for this security alert
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Alert Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Alert Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID:</span>
                    <span className="font-mono">{investigatingAlert.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <Badge variant="outline">{investigatingAlert.alertType}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Severity:</span>
                    <Badge variant={getSeverityColor(investigatingAlert.severity)}>
                      {investigatingAlert.severity}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">User:</span>
                    <span>{investigatingAlert.userIdMasked}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span>{investigatingAlert.timeAgo}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Investigation Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-accent-foreground rounded-full"></div>
                    <span className="text-sm">Context gathered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                    <span className="text-sm">Analyzing patterns</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-muted rounded-full"></div>
                    <span className="text-sm text-muted-foreground">Risk assessment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-muted rounded-full"></div>
                    <span className="text-sm text-muted-foreground">Recommendations</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Alert Description</h3>
              <p className="text-sm text-muted-foreground">{investigatingAlert.description}</p>
            </div>

            {/* AI Analysis Section */}
            <div className="border rounded-lg p-4 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-black dark:to-gray-900">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                <h3 className="font-semibold text-gray-800 dark:text-white">AI Security Analysis</h3>
                {investigatingAlert.aiAnalysis && (
                  <Badge variant="outline" className="ml-auto border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                    {investigatingAlert.aiAnalysis.confidenceScore}% Confidence
                  </Badge>
                )}
              </div>
              
              {investigatingAlert.aiAnalysis ? (
                <div className="space-y-4">
                  {/* Human Readable Summary */}
                  <div className="bg-gray-50 dark:bg-black rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2 text-gray-800 dark:text-white">
                      <BookOpen className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      Executive Summary
                    </h4>
                    <div className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                      {investigatingAlert.aiAnalysis.humanReadableSummary || 
                        `This ${investigatingAlert.alertType.toLowerCase()} alert has been analyzed by our AI security system with ${investigatingAlert.aiAnalysis.confidenceScore}% confidence. The analysis indicates a ${investigatingAlert.aiAnalysis.riskAssessment.threatLevel.toLowerCase()} threat level, with ${investigatingAlert.aiAnalysis.patternRecognition.alertFrequency} similar alerts detected in the past 24 hours. Key risk factors include ${investigatingAlert.aiAnalysis.riskAssessment.riskFactors.slice(0, 3).join(', ')}. Our system recommends immediate action to ${investigatingAlert.aiAnalysis.recommendations.immediate[0]?.toLowerCase() || 'review this transaction'} and implement additional verification measures.`}
                    </div>
                  </div>

                  {/* Pattern Recognition */}
                  <div className="bg-gray-50 dark:bg-black rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-gray-800 dark:text-white">
                      <Search className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      Pattern Recognition
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-600 dark:bg-gray-300 rounded-full"></div>
                        <span>Similar alerts in last 24h: <strong className="text-gray-800 dark:text-white">{investigatingAlert.aiAnalysis.patternRecognition.alertFrequency}</strong></span>
                      </div>
                      {investigatingAlert.aiAnalysis.patternRecognition.geographicClustering && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full"></div>
                          <span>Geographic clustering detected</span>
                        </div>
                      )}
                      {investigatingAlert.aiAnalysis.patternRecognition.timePatterns && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-700 dark:bg-gray-200 rounded-full"></div>
                          <span>Unusual time pattern identified</span>
                        </div>
                      )}
                      {investigatingAlert.aiAnalysis.patternRecognition.amountPatterns && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                          <span>Unusual amount patterns detected</span>
                        </div>
                      )}
                      {investigatingAlert.aiAnalysis.patternRecognition.riskScoreTrends && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                          <span>Risk score trends identified</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Risk Assessment */}
                  <div className="bg-gray-50 dark:bg-black rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-gray-800 dark:text-white">
                      <Shield className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      Risk Assessment
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Threat Level:</span>
                        <Badge variant={investigatingAlert.aiAnalysis.riskAssessment.threatLevel === 'CRITICAL' ? 'destructive' : 'outline'} className="border-gray-300 dark:border-gray-600">
                          {investigatingAlert.aiAnalysis.riskAssessment.threatLevel}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Confidence Score:</span>
                        <span className="font-medium text-gray-800 dark:text-white">{investigatingAlert.aiAnalysis.riskAssessment.confidenceScore}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>False Positive Risk:</span>
                        <span className="font-medium text-gray-700 dark:text-gray-200">{investigatingAlert.aiAnalysis.riskAssessment.falsePositiveRisk}</span>
                      </div>
                      {investigatingAlert.aiAnalysis.riskAssessment.riskFactors.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Risk Factors:</span>
                          <div className="mt-1 space-y-1">
                            {investigatingAlert.aiAnalysis.riskAssessment.riskFactors.map((factor, index) => (
                              <div key={index} className="text-xs text-gray-700 dark:text-gray-200 flex items-start gap-1">
                                <span>•</span>
                                <span>{factor}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Recommendations */}
                  <div className="bg-gray-50 dark:bg-black rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-gray-800 dark:text-white">
                      <TrendingUp className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      AI Recommendations
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                      {investigatingAlert.aiAnalysis.recommendations.immediate.map((rec, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-gray-600 dark:bg-gray-300 rounded-full mt-2"></div>
                          <span><strong className="text-gray-800 dark:text-white">Immediate:</strong> {rec}</span>
                        </div>
                      ))}
                      {investigatingAlert.aiAnalysis.recommendations.shortTerm.map((rec, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full mt-2"></div>
                          <span><strong className="text-gray-800 dark:text-white">Short-term:</strong> {rec}</span>
                        </div>
                      ))}
                      {investigatingAlert.aiAnalysis.recommendations.longTerm.map((rec, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-gray-700 dark:bg-gray-200 rounded-full mt-2"></div>
                          <span><strong className="text-gray-800 dark:text-white">Long-term:</strong> {rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 text-gray-400 dark:text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300 mb-2">No AI analysis performed yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Click "AI Analysis" button to get intelligent insights</p>
                </div>
              )}

              {/* AI Analysis Actions */}
              <div className="mt-4 flex gap-2">
                {!investigatingAlert.aiAnalysis && (
                  <Button 
                    size="sm" 
                    onClick={() => startAIAnalysis(investigatingAlert)}
                    className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white border-0"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Start AI Analysis
                  </Button>
                )}
                {investigatingAlert.aiAnalysis && (
                  <>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900"
                      onClick={() => startAIAnalysis(investigatingAlert)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Analysis
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Export Report
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Investigation Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View Related Transactions
              </Button>
              <Button variant="outline" size="sm">
                <MapPin className="h-4 w-4 mr-2" />
                Location Analysis
              </Button>
              <Button variant="outline" size="sm">
                <Smartphone className="h-4 w-4 mr-2" />
                Device History
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => resolveAlert(investigatingAlert.id)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Resolve Alert
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={refreshData} variant="outline" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button onClick={generateSampleAlerts} variant="outline">
            Generate Sample Alerts
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.metrics.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              All time transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fraud Blocked</CardTitle>
            <Shield className="h-4 w-4 text-accent-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent-foreground">{analytics.metrics.fraudBlocked}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.metrics.falsePositiveRate}% false positive rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Escrow Transactions</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{analytics.metrics.escrowTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Requiring verification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent-foreground">{analytics.systemHealth.uptime}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.systemHealth.threatLevel} threat level
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">Alerts ({alerts.length})</TabsTrigger>
          <TabsTrigger value="transactions">High-Risk Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Risk Factor Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Factor Distribution</CardTitle>
                <CardDescription>Top security threats detected</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.riskFactorDistribution.map((factor, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{factor.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${factor.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">
                          {factor.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Performance */}
            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
                <CardDescription>Real-time metrics and health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average Response Time</span>
                    <span className="text-sm font-medium">{analytics.metrics.averageLatency}ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Step-up Conversion</span>
                    <span className="text-sm font-medium">{analytics.metrics.stepUpConversionRate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average Risk Score</span>
                    <span className="text-sm font-medium">{analytics.metrics.averageRiskScore}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Processing Time</span>
                    <span className="text-sm font-medium">{analytics.systemHealth.processingTime}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Alerts</CardTitle>
              <CardDescription>
                Real-time alerts from the Sentinel risk engine - Auto-refreshes every 30s
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No security alerts detected</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">System is operating normally</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <Alert key={alert.id} className="border-l-4 border-l-red-500 bg-gray-50 dark:bg-black border-gray-200 dark:border-gray-600">
                      <AlertTriangle className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      <AlertTitle className="flex items-center justify-between text-gray-800 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{alert.alertType.replace('_', ' ')}</span>
                          <Badge variant={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {alert.timeAgo}
                          </span>
                        </div>
                      </AlertTitle>
                      <AlertDescription className="text-gray-700 dark:text-gray-200">
                        {alert.description}
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => investigateAlert(alert)}
                              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900"
                            >
                              <Search className="h-3 w-3 mr-1" />
                              Investigate
                            </Button>
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => startAIAnalysis(alert)}
                              className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white border-0"
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI Analysis
                            </Button>
                            {!alert.isResolved && (
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => resolveAlert(alert.id)}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Resolve
                              </Button>
                            )}
                            {alert.isResolved && (
                              <Badge variant="default" className="bg-gray-600 dark:bg-gray-400 text-white">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Resolved
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            User: {alert.userIdMasked}
                          </span>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>High-Risk Transactions (Risk Score ≥ 60)</CardTitle>
              <CardDescription>
                Live transactions requiring manual review or additional verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.highRiskTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No high-risk transactions detected</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">Make some payments to see live risk scoring</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analytics.highRiskTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-black transition-colors">
                      <div className="flex items-center space-x-4">
                        <DollarSign className="h-8 w-8 text-gray-600 dark:text-gray-300" />
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white">{transaction.currency} {transaction.amount.toLocaleString()}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">to {transaction.recipient}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{transaction.timestamp}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-800 dark:text-white">Risk Score: {Math.round(transaction.riskScore)}</p>
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                transaction.riskScore >= 80 ? 'bg-red-600' :
                                transaction.riskScore >= 60 ? 'bg-gray-600 dark:bg-gray-400' : 'bg-gray-500 dark:bg-gray-500'
                              }`}
                              style={{ width: `${transaction.riskScore}%` }}
                            />
                          </div>
                        </div>
                        <Badge variant={getStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900"
                          onClick={() => openTransactionReview(transaction)}
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction Review Modal */}
      <TransactionReviewModal
        isOpen={isReviewModalOpen}
        onClose={closeTransactionReview}
        transaction={reviewingTransaction}
      />
    </div>
  )
}
