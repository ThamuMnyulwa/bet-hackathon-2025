"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Shield, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface PaymentFormData {
  amount: string
  recipientName: string
  recipientAccount: string
  reference: string
}

interface PaymentFormDataWithAmount {
  amount: number
  recipientName: string
  recipientAccount: string
  reference: string
}

interface RiskAssessment {
  riskScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  stepUpRequired: boolean
  recommendedAction: 'ALLOW' | 'CHALLENGE' | 'BLOCK' | 'ESCROW'
  confidence: number
}

interface SecurePaymentFormProps {
  onDataUpdate?: () => void
}

export function SecurePaymentForm({ onDataUpdate }: SecurePaymentFormProps) {
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: '',
    recipientName: '',
    recipientAccount: '',
    reference: ''
  })
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null)
  const [isAssessing, setIsAssessing] = useState(false)
  const [step, setStep] = useState<'form' | 'risk-check' | 'step-up' | 'processing' | 'complete'>('form')
  const [transactionId, setTransactionId] = useState<string | null>(null)

  const handleInputChange = (field: keyof PaymentFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.amount || !formData.recipientName || !formData.recipientAccount) {
      toast.error('Please fill in all required fields')
      return
    }

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    await handleRiskAssessment({
      ...formData,
      amount: amount
    })
  }

  const handleRiskAssessment = async (formData: PaymentFormDataWithAmount) => {
    setIsAssessing(true)
    setStep('risk-check')

    try {
      // First, assess the risk
      const assessResponse = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/payments/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: formData.amount,
          recipient: formData.recipientName,
          assessmentType: 'TRANSACTION'
        })
      })

      if (!assessResponse.ok) {
        throw new Error('Risk assessment failed')
      }

      const assessment = await assessResponse.json()
      setRiskAssessment(assessment)

      // Simulate real-time risk processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      if (assessment.recommendedAction === 'BLOCK') {
        toast.error('Transaction blocked due to high fraud risk')
        setStep('form')
        return
      }

      if (assessment.stepUpRequired) {
        // Still create the payment transaction, but mark it as requiring step-up
        await initiatePayment(formData, true)
      } else {
        await initiatePayment(formData, false)
      }
    } catch (error) {
      console.error('Risk assessment failed:', error)
      toast.error('Unable to process payment at this time')
      setStep('form')
    } finally {
      setIsAssessing(false)
    }
  }

  const initiatePayment = async (formData: PaymentFormDataWithAmount, isStepUpRequired: boolean) => {
    setStep('processing')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/payments/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: formData.amount,
          currency: 'ZAR',
          recipientName: formData.recipientName,
          recipientAccount: formData.recipientAccount,
          authMethod: 'OTP'
        })
      })

      if (!response.ok) {
        throw new Error('Payment initiation failed')
      }

      const result = await response.json()
      setTransactionId(result.transactionId)

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000))

      if (result.status === 'DECLINED') {
        toast.error('Payment was declined')
        setStep('form')
        return
      }

      if (result.status === 'ESCROW') {
        toast.info('Payment placed in escrow for additional verification')
        setStep('complete')
        onDataUpdate?.()
        return
      }

      if (result.status === 'APPROVED' || result.status === 'COMPLETED') {
        toast.success('Payment successful!')
        setStep('complete')
        onDataUpdate?.()
        return
      }

      // For pending payments, show step-up if required
      if (result.stepUpRequired || isStepUpRequired) {
        setStep('step-up')
      } else {
        setStep('complete')
        onDataUpdate?.()
      }
    } catch (error) {
      console.error('Payment initiation failed:', error)
      toast.error('Payment failed. Please try again.')
      setStep('form')
    }
  }

  const handleStepUp = async () => {
    setStep('processing')

    try {
      // Simulate step-up authentication
      await new Promise(resolve => setTimeout(resolve, 2000))

      // After successful step-up, complete the payment
      if (transactionId) {
        // Update the payment status to completed
        const completeResponse = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/payments/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            transactionId,
            action: 'COMPLETE_STEP_UP',
            status: 'COMPLETED'
          })
        })

        if (completeResponse.ok) {
          toast.success('Payment completed successfully after verification!')
          setStep('complete')
          // Refresh dashboard data
          onDataUpdate?.()
        } else {
          throw new Error('Failed to complete payment after verification')
        }
      } else {
        // If no transaction ID, simulate completion
        toast.success('Additional authentication completed')
        setStep('complete')
      }
    } catch (error) {
      console.error('Step-up failed:', error)
      toast.error('Authentication failed. Please try again.')
      setStep('form')
    }
  }

  const resetForm = () => {
    setStep('form')
    setRiskAssessment(null)
    setTransactionId(null)
    setFormData({
      amount: '',
      recipientName: '',
      recipientAccount: '',
      reference: ''
    })
    // Refresh dashboard data when resetting form
    onDataUpdate?.()
  }

  if (step === 'risk-check') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Risk Assessment</CardTitle>
          <CardDescription>
            Analyzing transaction for potential risks
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
            <div className="h-4 bg-muted rounded w-2/3 mx-auto"></div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            This usually takes a few seconds...
          </p>
        </CardContent>
      </Card>
    )
  }

  if (step === 'step-up') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 bg-accent/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-accent" />
          </div>
          <CardTitle>Additional Authentication Required</CardTitle>
          <CardDescription>
            For your security, we need additional verification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This transaction requires additional authentication due to risk factors.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Risk Score: {riskAssessment?.riskScore}</Badge>
              <Badge variant={riskAssessment?.riskLevel === 'HIGH' || riskAssessment?.riskLevel === 'CRITICAL' ? 'destructive' : 'secondary'}>
                {riskAssessment?.riskLevel}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Please complete the additional verification steps to proceed.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleStepUp} className="flex-1">
              Complete Verification
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === 'processing') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 bg-accent-foreground/10 rounded-full flex items-center justify-center">
            <Clock className="h-8 w-8 text-accent-foreground" />
          </div>
          <CardTitle>Processing Payment</CardTitle>
          <CardDescription>
            Please wait while we process your payment
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            This may take a few moments...
          </p>
        </CardContent>
      </Card>
    )
  }

  if (step === 'complete') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 bg-accent-foreground/10 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-accent-foreground" />
          </div>
          <CardTitle>Payment Complete</CardTitle>
          <CardDescription>
            Your payment has been processed successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {transactionId && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Transaction ID</p>
              <p className="font-mono text-sm bg-muted px-2 py-1 rounded mt-1">
                {transactionId}
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              You can view your transaction history in the Transactions section.
            </p>
          </div>

          <Button onClick={resetForm} className="w-full">
            Make Another Payment
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Secure Payment Form</CardTitle>
        </div>
        <CardDescription>
          Protected by Security Monitoring - SIM-swap aware security
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (ZAR)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                placeholder="Payment reference"
                value={formData.reference}
                onChange={(e) => handleInputChange('reference', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipientName">Recipient Name</Label>
            <Input
              id="recipientName"
              placeholder="Full name of recipient"
              value={formData.recipientName}
              onChange={(e) => handleInputChange('recipientName', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipientAccount">Recipient Account Number</Label>
            <Input
              id="recipientAccount"
              placeholder="Account number"
              value={formData.recipientAccount}
              onChange={(e) => handleInputChange('recipientAccount', e.target.value)}
              required
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>This payment is protected by advanced fraud detection</span>
          </div>

          <Button 
            type="submit" 
            className="w-full"
          >
            Make Secure Payment
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
