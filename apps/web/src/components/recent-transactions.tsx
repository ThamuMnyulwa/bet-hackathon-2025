"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DollarSign, Clock, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Transaction {
  id: string
  amount: number
  currency: string
  recipientName: string
  recipientAccount: string
  status: string
  riskScore?: number
  authMethod?: string
  stepUpRequired: boolean
  escrowReleaseTime?: string
  createdAt: string
  updatedAt: string
  timeAgo: string
}

export function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/payments/transactions?limit=5`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          setError('Please log in to view transactions')
          return
        }
        throw new Error('Failed to fetch transactions')
      }

      const data = await response.json()
      setTransactions(data.transactions || [])
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  // Fetch transactions on component mount
  useEffect(() => {
    fetchTransactions()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-accent-foreground" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-accent" />
      case 'ESCROW':
        return <Shield className="h-4 w-4 text-primary" />
      case 'DECLINED':
      case 'BLOCKED':
        return <XCircle className="h-4 w-4 text-destructive" />
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'APPROVED':
        return 'default'
      case 'PENDING':
        return 'secondary'
      case 'ESCROW':
        return 'outline'
      case 'DECLINED':
      case 'BLOCKED':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getRiskBadgeColor = (riskScore?: number) => {
    if (!riskScore) return 'secondary'
    if (riskScore >= 80) return 'destructive'
    if (riskScore >= 60) return 'outline'
    if (riskScore >= 30) return 'secondary'
    return 'default'
  }

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const simulateStatusUpdate = async (transactionId: string) => {
    // Simulate real-time status updates for demo purposes
    const statusProgression = ['PENDING', 'APPROVED', 'COMPLETED'];
    const currentTransaction = transactions.find(t => t.id === transactionId);
    if (!currentTransaction) return;

    const currentIndex = statusProgression.indexOf(currentTransaction.status);
    if (currentIndex < statusProgression.length - 1) {
      const nextStatus = statusProgression[currentIndex + 1];
      
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/payments/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            transactionId,
            status: nextStatus
          })
        });

        if (response.ok) {
          // Update local state immediately for better UX
          setTransactions(prev => prev.map(t => 
            t.id === transactionId 
              ? { ...t, status: nextStatus, timeAgo: 'Just updated' }
              : t
          ));
          toast.success(`Transaction ${nextStatus.toLowerCase()}`);
        }
      } catch (error) {
        console.error('Failed to update status:', error);
        toast.error('Failed to update transaction status');
      }
    } else {
      toast.info('Transaction is already completed');
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Loading your latest payments...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Unable to load transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchTransactions} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your payment history will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No transactions yet</p>
            <p className="text-sm text-muted-foreground">Make your first secure payment to get started</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Protected by Security Monitoring</CardDescription>
        </div>
        <Button onClick={fetchTransactions} variant="ghost" size="sm">
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {getStatusIcon(transaction.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="font-semibold text-lg">
                      {formatAmount(transaction.amount, transaction.currency)}
                    </p>
                    <Badge variant={getStatusColor(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    to {transaction.recipientName}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {transaction.timeAgo}
                    </p>
                    {transaction.riskScore !== null && transaction.riskScore !== undefined && (
                      <Badge variant={getRiskBadgeColor(transaction.riskScore)} className="text-xs">
                        Risk: {Math.round(transaction.riskScore)}
                      </Badge>
                    )}
                    {transaction.stepUpRequired && (
                      <Badge variant="outline" className="text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        Step-up
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {transaction.authMethod || 'Standard'}
                  </p>
                  {transaction.escrowReleaseTime && (
                    <p className="text-xs text-primary">
                      Escrow release: {new Date(transaction.escrowReleaseTime).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {(transaction.status === 'PENDING' || transaction.status === 'APPROVED') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => simulateStatusUpdate(transaction.id)}
                    className="text-xs"
                  >
                    ⚡ Update
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {transactions.length >= 5 && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm">
              View All Transactions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
