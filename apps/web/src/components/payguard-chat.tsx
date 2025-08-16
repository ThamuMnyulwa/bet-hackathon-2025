'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageAvatar
} from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputSubmit
} from '@/components/ai-elements/prompt-input';
import { Response } from '@/components/ai-elements/response';
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from '@/components/ai-elements/tool';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheckIcon, CreditCardIcon, UserIcon, BotIcon } from 'lucide-react';

export function PayGuardChat() {
  const [input, setInput] = useState('');
  const apiBase = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `${apiBase}/api/agent`,
      credentials: 'include'
    }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        <div className="flex items-center gap-3 px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">PayGuard AI</h1>
              <p className="text-sm text-muted-foreground">
                Autonomous Risk & Payment Assistant
              </p>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <Badge variant="outline" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-accent-foreground" />
              Online
            </Badge>
            <Badge variant="secondary">
              {status === 'streaming' ? 'Processing...' : 'Ready'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden">
        <Conversation className="h-full">
          <ConversationContent className="space-y-4 p-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <BotIcon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  Welcome to PayGuard AI
                </h3>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  I can help you assess payment risks, check authentication status, and process secure transactions.
                </p>
                
                {/* Quick Actions */}
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Card 
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => {
                      setInput("Check my authentication status");
                      sendMessage({ text: "Check my authentication status" });
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <UserIcon className="h-4 w-4" />
                        Auth Check
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-xs">
                        Verify your login status
                      </CardDescription>
                    </CardContent>
                  </Card>

                  <Card 
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => {
                      setInput("Assess risk for R1500 to John Smith");
                      sendMessage({ text: "Assess risk for R1500 to John Smith" });
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <CreditCardIcon className="h-4 w-4" />
                        Risk Assessment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-xs">
                        Analyze payment security
                      </CardDescription>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageAvatar
                  src={message.role === 'user' ? '/user-avatar.png' : '/bot-avatar.png'}
                  name={message.role === 'user' ? 'You' : 'PayGuard'}
                />
                <MessageContent>
                  {message.parts?.map((part, index) => {
                    switch (part.type) {
                      case 'text':
                        return (
                          <Response key={index} className="prose prose-sm max-w-none dark:prose-invert">
                            {part.text}
                          </Response>
                        );

                      case 'reasoning':
                        return (
                          <div key={index} className="mb-3">
                            <Badge variant="outline" className="mb-2 gap-1">
                              <BotIcon className="h-3 w-3" />
                              Reasoning
                            </Badge>
                            <div className="rounded-lg bg-primary/10 p-3 text-sm text-primary-foreground">
                              <Response parseIncompleteMarkdown={false}>
                                {part.reasoning}
                              </Response>
                            </div>
                          </div>
                        );

                      case 'tool-invocation':
                        const { toolInvocation } = part;
                        return (
                          <Tool key={index} defaultOpen>
                            <ToolHeader 
                              type={toolInvocation.toolName}
                              state={toolInvocation.state === 'call' ? 'input-available' : 
                                     toolInvocation.state === 'result' ? 'output-available' : 'input-streaming'}
                            />
                            <ToolContent>
                              {toolInvocation.args && (
                                <ToolInput input={toolInvocation.args} />
                              )}
                              {toolInvocation.state === 'result' && (
                                <ToolOutput 
                                  output={
                                    <div className="p-2">
                                      <Response>
                                        {JSON.stringify(toolInvocation.result, null, 2)}
                                      </Response>
                                    </div>
                                  }
                                  errorText={undefined}
                                />
                              )}
                            </ToolContent>
                          </Tool>
                        );

                      case 'step-start':
                        return index > 0 ? (
                          <div key={index} className="my-4">
                            <hr className="border-border" />
                          </div>
                        ) : null;

                      default:
                        return null;
                    }
                  })}
                </MessageContent>
              </Message>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      {/* Input Area */}
      <div className="border-t bg-background/80 backdrop-blur-sm p-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about payments, risk assessment, or authentication..."
            disabled={status === 'streaming'}
          />
          <PromptInputToolbar>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheckIcon className="h-3 w-3" />
              Secure AI Assistant
            </div>
            <PromptInputSubmit status={status} disabled={status === 'streaming'} />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
}
