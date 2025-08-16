'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputButton,
} from '@/components/ai-elements/prompt-input';
import { Response } from '@/components/ai-elements/response';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning';
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from '@/components/ai-elements/tool';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle, CheckCircle, Clock, Zap, User, Bot, Sparkles, Activity, BarChart3 } from 'lucide-react';

export function AgentChat() {
  const apiBase = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
  console.log('AgentChat: API base URL:', apiBase);
  
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

  const [input, setInput] = React.useState('');

  console.log('AgentChat: Status:', status, 'Messages count:', messages.length, 'Error:', error);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage({ text: suggestion });
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

    // Handle errors
    if (result.error) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Error</span>
          </div>
          <Response>{result.message || result.error}</Response>
          {result.nextStep && (
            <div className="text-sm text-muted-foreground bg-destructive/10 p-2 rounded">
              <strong>Next Step:</strong> {result.nextStep}
            </div>
          )}
        </div>
      );
    }

    // Handle specific tool outputs
    switch (toolName) {
      case 'getSessionUser':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {result.authenticated ? (
                <CheckCircle className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-medium">
                {result.authenticated ? 'Authentication Verified' : 'Authentication Required'}
              </span>
            </div>
            {result.authenticated && (
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
                <div className="text-sm">
                  <strong>User ID:</strong> {result.user?.id}<br />
                  <strong>Email:</strong> {result.user?.email}
                </div>
              </div>
            )}
            {result.message && <Response>{result.message}</Response>}
            {result.nextStep && (
              <div className="text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 p-2 rounded">
                <strong>Next:</strong> {result.nextStep}
              </div>
            )}
          </div>
        );

      case 'parsePaymentRequest':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <span className="font-medium">Payment Request Parsed</span>
            </div>
            {result.parsed && (
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Amount:</strong> R{result.parsed.amount}</div>
                  <div><strong>Currency:</strong> {result.parsed.currency}</div>
                  <div><strong>Recipient:</strong> {result.parsed.recipient}</div>
                  <div><strong>Account:</strong> {result.parsed.account || 'Not provided'}</div>
                </div>
                <div className="mt-2 text-xs">
                  <strong>Confidence:</strong> {result.parsed.confidence}
                </div>
              </div>
            )}
            {result.message && <Response>{result.message}</Response>}
            {result.nextStep && (
              <div className="text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 p-2 rounded">
                <strong>Next:</strong> {result.nextStep}
              </div>
            )}
          </div>
        );

      case 'assessPaymentRisk':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <span className="font-medium">Risk Assessment Complete</span>
            </div>
            {result.result && (
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Risk Score:</strong> {result.result.riskScore}/100</div>
                  <div><strong>Risk Level:</strong> 
                    <span className={`ml-1 px-2 py-1 rounded text-xs ${
                      result.result.riskLevel === 'LOW' ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200' :
                      result.result.riskLevel === 'MEDIUM' ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200' :
                      result.result.riskLevel === 'HIGH' ? 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200' :
                      'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    }`}>
                      {result.result.riskLevel}
                    </span>
                  </div>
                  <div><strong>Action:</strong> {result.result.recommendedAction}</div>
                  <div><strong>Step Up:</strong> {result.result.stepUpRequired ? 'Required' : 'Not Required'}</div>
                </div>
              </div>
            )}
            {result.message && <Response>{result.message}</Response>}
            {result.recommendation && (
              <div className="text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 p-2 rounded">
                <strong>Recommendation:</strong> {result.recommendation}
              </div>
            )}
            {result.nextStep && (
              <div className="text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 p-2 rounded">
                <strong>Next:</strong> {result.nextStep}
              </div>
            )}
            {result.canProceed && (
              <div className="text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 p-2 rounded">
                <strong>Status:</strong> Ready to proceed with payment
              </div>
            )}
          </div>
        );

      case 'initiatePayment':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <span className="font-medium">Payment Initiated</span>
            </div>
            {result.transactionDetails && (
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Transaction ID:</strong> {result.transactionDetails.id}</div>
                  <div><strong>Status:</strong> {result.transactionDetails.status}</div>
                  <div><strong>Risk Score:</strong> {result.transactionDetails.riskScore}</div>
                  <div><strong>Step Up:</strong> {result.transactionDetails.stepUpRequired ? 'Required' : 'Not Required'}</div>
                </div>
              </div>
            )}
            {result.message && <Response>{result.message}</Response>}
            {result.nextStep && (
              <div className="text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 p-2 rounded">
                <strong>Next:</strong> {result.nextStep}
              </div>
            )}
          </div>
        );

      default:
        return <Response>{JSON.stringify(result, null, 2)}</Response>;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'ready':
        return <Shield className="w-4 h-4 text-muted-foreground" />;
      case 'submitted':
        return <Clock className="w-4 h-4 text-primary animate-pulse" />;
      case 'streaming':
        return <Zap className="w-4 h-4 text-accent-foreground animate-pulse" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      default:
        return <Shield className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'ready':
        return 'bg-muted text-muted-foreground';
      case 'submitted':
        return 'bg-primary/10 text-primary';
      case 'streaming':
        return 'bg-accent-foreground/10 text-accent-foreground';
      case 'error':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'ready':
        return 'Ready';
      case 'submitted':
        return 'Thinking';
      case 'streaming':
        return 'Processing';
      case 'error':
        return 'Error';
      default:
        return 'Ready';
    }
  };

  const suggestions = [
    "Send R1250 to Jane Doe 1234567890",
    "Transfer R5000 to Business C",
    "Check my recent transactions",
    "Analyze security risks for my account",
    "Show me fraud alerts",
    "What's my current security score?",
    "Help me understand a suspicious transaction",
    "Monitor my device security",
    "Explain payment protection features",
    "Check system health status",
    "Review my risk assessment",
    "Help with payment verification"
  ];

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-gray-100 to-gray-200 dark:from-black dark:to-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 dark:from-gray-700 dark:to-gray-800 rounded-xl flex items-center justify-center shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              Sentinel AI
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Your intelligent security and payment assistant
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            System Online
          </Badge>
          <Badge variant="outline" className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600">
            <Zap className="w-3 h-3 mr-1" />
            AI Powered
          </Badge>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
        <Conversation className="flex-1">
          <ConversationContent>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-600 dark:text-gray-300">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Shield className="w-10 h-10 text-gray-600 dark:text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-white">
                  Welcome to Sentinel AI
                </h3>
                <p className="text-sm max-w-lg leading-relaxed mb-4 text-gray-700 dark:text-gray-200">
                  I'm your intelligent security and payment assistant. I can help you with:
                </p>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 mb-6 max-w-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                    <span>Process secure payments and transfers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                    <span>Monitor fraud alerts and security threats</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                    <span>Analyze device security and risk assessments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                    <span>Provide transaction insights and analytics</span>
                  </div>
                </div>
                
                {/* Quick Suggestions */}
                <div className="mt-8 w-full max-w-4xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">Try these examples:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {suggestions.map((suggestion) => (
                      <Suggestion
                        key={suggestion}
                        onClick={handleSuggestionClick}
                        suggestion={suggestion}
                        className="hover:scale-105 transition-transform"
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map(message => (
                <Message key={message.id} from={message.role}>
                  <MessageContent>
                    {message.parts?.map((part, index) => renderMessagePart(part, index))}
                  </MessageContent>
                </Message>
              ))
            )}
            {status === 'submitted' && (
              <Message from="assistant">
                <MessageContent>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Input Area */}
        <div className="border-t bg-gradient-to-r from-gray-50 to-gray-100 dark:from-black dark:to-gray-900 p-4">
          <PromptInput onSubmit={handleSubmit} className="w-full shadow-sm">
            <PromptInputTextarea
              value={input}
              placeholder="Ask me about payment security, fraud detection, system health, or anything else..."
              onChange={(e) => setInput(e.currentTarget.value)}
              className="min-h-[60px] max-h-[120px] resize-none border-0 focus-visible:ring-2 focus-visible:ring-gray-500 dark:focus-visible:ring-gray-400"
              disabled={status !== 'ready'}
            />
            <PromptInputToolbar>
              <PromptInputSubmit
                status={status === 'streaming' ? 'streaming' : 'ready'}
                disabled={!input.trim() || status !== 'ready'}
                className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}


