'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  X,
  Sparkles,
  Eye,
  FileText,
  TrendingUp,
  MapPin,
  Smartphone,
  RefreshCw,
  User
} from 'lucide-react';
import { Response } from '@/components/ai-elements/response';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning';
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from '@/components/ai-elements/tool';

interface TransactionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: {
    id: string;
    amount: number;
    currency: string;
    recipient: string;
    riskScore: number;
    status: string;
    timestamp: string;
  } | null;
}

export function TransactionReviewModal({ isOpen, onClose, transaction }: TransactionReviewModalProps) {
  const apiBase = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
  
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: `${apiBase}/api/agent`,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    }),
    onError: (error) => {
      console.error('Chat error:', error);
    },
    onFinish: (message) => {
      console.log('Chat finished:', message);
    }
  });

  const [isGenerating, setIsGenerating] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && transaction && messages.length === 0) {
      // Auto-generate review when modal opens
      generateReview();
    }
  }, [isOpen, transaction]);

  const generateReview = async () => {
    if (!transaction) return;
    
    setIsGenerating(true);
    
    const prompt = `Please review this high-risk transaction and provide a comprehensive analysis:

Transaction ID: ${transaction.id}
Amount: ${transaction.currency} ${transaction.amount.toLocaleString()}
Recipient: ${transaction.recipient}
Risk Score: ${Math.round(transaction.riskScore)}
Status: ${transaction.status}
Timestamp: ${transaction.timestamp}

Please:
1. Analyze why this transaction was deemed high-risk
2. Assess the current risk factors
3. Provide security recommendations
4. Suggest next steps for handling this transaction
5. Use the getTransactionStatus tool to get detailed information about this transaction

Be thorough and provide actionable insights.`;

    sendMessage({ text: prompt });
  };

  const renderMessagePart = (part: any, index: number) => {
    switch (part.type) {
      case 'text':
        return (
          <Response key={index}>
            {part.text}
          </Response>
        );
      case 'reasoning':
        return (
          <Reasoning
            key={index}
            className="w-full"
            isStreaming={status === 'streaming'}
          >
            <ReasoningTrigger title="AI Reasoning" />
            <ReasoningContent>{part.text}</ReasoningContent>
          </Reasoning>
        );
      case 'tool-call':
        return (
          <Tool key={index} defaultOpen>
            <ToolHeader 
              type={part.toolName || 'tool'}
              state="input-available"
            />
            <ToolContent>
              <ToolInput input={part.args || {}} />
            </ToolContent>
          </Tool>
        );
      case 'tool-result':
        return (
          <Tool key={index} defaultOpen>
            <ToolHeader 
              type={part.toolName || 'tool'}
              state="output-available"
            />
            <ToolContent>
              <ToolOutput 
                output={
                  <div className="p-2">
                    {renderToolOutput(part.result, part.toolName)}
                  </div>
                }
                errorText={part.error}
              />
            </ToolContent>
          </Tool>
        );
      default:
        return null;
    }
  };

  const renderToolOutput = (result: any, toolName?: string) => {
    if (!result) return <Response>No output available</Response>;

    if (result.error) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Error</span>
          </div>
          <Response>{result.message || result.error}</Response>
        </div>
      );
    }

    switch (toolName) {
      case 'getTransactionStatus':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <span className="font-medium">Transaction Status Retrieved</span>
            </div>
            {result.currentState && (
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Amount:</strong> {result.currentState.currency} {result.currentState.amount}</div>
                  <div><strong>Recipient:</strong> {result.currentState.recipientName}</div>
                  <div><strong>Risk Score:</strong> {result.currentState.riskScore || 'N/A'}</div>
                  <div><strong>Step Up:</strong> {result.currentState.stepUpRequired ? 'Required' : 'Not Required'}</div>
                </div>
              </div>
            )}
            {result.nextSteps && (
              <div className="text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 p-2 rounded">
                <strong>Next Steps:</strong>
                <ul className="mt-1 space-y-1">
                  {result.nextSteps.map((step: string, i: number) => (
                    <li key={i} className="flex items-start gap-1">
                      <span>•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      default:
        return <Response>{JSON.stringify(result, null, 2)}</Response>;
    }
  };

  const getRiskLevel = (riskScore: number) => {
    if (riskScore >= 80) return { level: 'CRITICAL', color: 'destructive', icon: AlertTriangle };
    if (riskScore >= 60) return { level: 'HIGH', color: 'destructive', icon: AlertTriangle };
    if (riskScore >= 40) return { level: 'MEDIUM', color: 'outline', icon: Shield };
    return { level: 'LOW', color: 'secondary', icon: CheckCircle };
  };

  if (!transaction) return null;

  const riskInfo = getRiskLevel(transaction.riskScore);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl! max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-800 dark:text-white">
                  Transaction Review
                </DialogTitle>
                <DialogDescription>
                  AI-powered analysis of high-risk transaction
                </DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transaction Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                Transaction Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Transaction ID:</span>
                    <span className="font-mono text-sm">{transaction.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Amount:</span>
                    <span className="font-semibold text-lg">
                      {transaction.currency} {transaction.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Recipient:</span>
                    <span className="font-medium">{transaction.recipient}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Timestamp:</span>
                    <span className="text-sm">{transaction.timestamp}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Risk Level:</span>
                    <Badge variant={riskInfo.color as any} className="flex items-center gap-1">
                      <riskInfo.icon className="h-3 w-3" />
                      {riskInfo.level}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Risk Score:</span>
                    <span className="font-semibold text-lg text-red-600 dark:text-red-400">
                      {Math.round(transaction.riskScore)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-red-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${transaction.riskScore}%` }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge variant="outline">{transaction.status}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  AI Security Analysis
                </CardTitle>
                <div className="flex items-center gap-2">
                  {status === 'streaming' && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <span className="text-sm text-gray-600 dark:text-gray-300">Analyzing...</span>
                    </div>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={generateReview}
                    disabled={status === 'streaming'}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${status === 'streaming' ? 'animate-spin' : ''}`} />
                    Refresh Analysis
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">No analysis generated yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">Click "Refresh Analysis" to start</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map(message => (
                    <div key={message.id} className={`p-3 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-gray-100 dark:bg-gray-800' 
                        : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {message.role === 'user' ? (
                          <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                        )}
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          {message.role === 'user' ? 'Your Request' : 'AI Analysis'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {message.parts?.map((part, index) => renderMessagePart(part, index))}
                      </div>
                    </div>
                  ))}
                  
                  {status === 'streaming' && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 p-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <span className="text-sm">Generating analysis...</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View Related
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button variant="outline" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                Risk History
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button 
                variant="destructive"
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0"
              >
                <Shield className="h-4 w-4 mr-2" />
                Take Action
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
