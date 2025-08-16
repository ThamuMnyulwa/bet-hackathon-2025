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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Shield, AlertTriangle, CheckCircle, Clock, Zap, User, Bot, Mic, Search, Sparkles, MessageSquare } from 'lucide-react';

interface AgentDialogProps {
  children?: React.ReactNode;
}

export function AgentDialog({ children }: AgentDialogProps) {
  const [open, setOpen] = React.useState(false);
  const apiBase = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
  
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: `${apiBase}/api/agent`,
      credentials: 'include'
    }),
    onError: (error) => {
      console.error('Chat error:', error);
    },
    onFinish: (message) => {
      console.log('Chat finished:', message);
    }
  });

  const [input, setInput] = React.useState('');

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
                    <Response>
                      {typeof part.result === 'string' 
                        ? part.result 
                        : JSON.stringify(part.result, null, 2)
                      }
                    </Response>
                  </div>
                }
                errorText={part.error}
              />
            </ToolContent>
          </Tool>
        );
      case 'image':
        return (
          <div key={index} className="my-2">
            <img 
              src={part.imageUrl} 
              alt={part.alt || 'AI generated image'} 
              className="max-w-full rounded-lg border"
            />
          </div>
        );
      case 'error':
        return (
          <div key={index} className="my-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
            <Response>
              **Error:** {part.error}
            </Response>
          </div>
        );
      default:
        return null;
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
    '**Assess R1250** to Jane Doe 1234567890, then proceed if safe',
    '**Show me** the system health status',
    '**Analyze** my device security',
    '**What fraud alerts** are active?',
    '**Get transaction analytics** for the last 7 days'
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            AI Agent
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[95vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <div className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                PayGuard Agent
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-secondary-foreground" />
                AI-powered security & payments assistant
              </div>
            </div>
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className={`${getStatusColor()} border-0`}>
              <div className="flex items-center gap-1">
                {getStatusIcon()}
                <span className="capitalize font-medium">{getStatusText()}</span>
              </div>
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {messages.length} messages
            </Badge>
            {error && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Error
              </Badge>
            )}
          </div>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col h-[700px] overflow-hidden">
          {/* Chat Interface */}
          <div className="flex-1 flex flex-col border-0 bg-background overflow-hidden">
            <Conversation className="flex-1">
              <ConversationContent>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl flex items-center justify-center mb-6">
                      <Shield className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      Welcome to PayGuard
                    </h3>
                    <div className="text-sm max-w-md leading-relaxed">
                      <Response>
                        I'm your **AI security assistant**. I can help you:
                        
                        • **Assess payment risks** and transaction security
                        • **Monitor fraud alerts** and security threats  
                        • **Analyze device security** and trust scores
                        • **Review transaction history** and patterns
                        • **Generate compliance reports** and insights
                      </Response>
                    </div>
                    
                    {/* Quick Suggestions */}
                    <div className="mt-8 w-full max-w-lg">
                      <p className="text-xs text-muted-foreground mb-3 font-medium">Try these examples:</p>
                      <Suggestions>
                        {suggestions.map((suggestion) => (
                          <Suggestion
                            key={suggestion}
                            onClick={handleSuggestionClick}
                            suggestion={suggestion}
                            className="hover:scale-105 transition-transform"
                          />
                        ))}
                      </Suggestions>
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
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </MessageContent>
                  </Message>
                )}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            {/* Input Area */}
            <div className="border-t bg-gradient-to-r from-muted to-muted/50 p-4">
              <PromptInput onSubmit={handleSubmit} className="w-full">
                <PromptInputTextarea
                  value={input}
                  placeholder="Ask me about payment security, fraud detection, system health, or anything else..."
                  onChange={(e) => setInput(e.currentTarget.value)}
                  className="min-h-[60px] max-h-[120px] resize-none border-0 focus-visible:ring-2 focus-visible:ring-primary"
                  disabled={status !== 'ready'}
                />
                <PromptInputToolbar>
                  <PromptInputTools>
                    <PromptInputButton className="hover:bg-primary/10">
                      <Mic className="w-4 h-4" />
                    </PromptInputButton>
                    <PromptInputButton className="hover:bg-secondary/10">
                      <Search className="w-4 h-4" />
                      <span>Search</span>
                    </PromptInputButton>
                  </PromptInputTools>
                  <PromptInputSubmit
                    status={status === 'streaming' ? 'streaming' : 'ready'}
                    disabled={!input.trim() || status !== 'ready'}
                    className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground"
                  />
                </PromptInputToolbar>
              </PromptInput>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
