// src/components/oracle/ChatConversation.tsx
import React, { useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { SendHorizonal, Check, Bot, User, Loader2 } from 'lucide-react';
import { ChatMessage, MessageSource } from '@/hooks/useOracleChat';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const chatFormSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty.'),
});

interface ChatConversationProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  className?: string;
}

const AIMessage = ({ text, sources }: { text: string | null, sources?: MessageSource[] }) => (
    <div className="flex items-start gap-3">
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-neutral-700 flex items-center justify-center">
            <Bot className="h-5 w-5 text-neutral-300" />
        </div>
        <div className="flex-grow rounded-lg p-3 bg-neutral-800 border border-neutral-700">
            <p className="text-sm text-neutral-200 whitespace-pre-wrap">{text || '...'}</p>
            {sources && sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {sources.map((source, index) => (
                        <TooltipProvider key={index} delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Badge variant="secondary" className="bg-neutral-700/80 text-neutral-300 hover:bg-neutral-600 border border-neutral-600/50">
                                        <Check className="h-3 w-3 mr-1.5" />
                                        {source.file_name?.substring(0, 20) || 'Source'}...
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{source.file_name}</p>
                                    {source.page_number && <p className="text-xs text-muted-foreground">Page: {source.page_number}</p>}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                </div>
            )}
        </div>
    </div>
);

const UserMessage = ({ text }: { text: string | null }) => (
    <div className="flex items-start gap-3 justify-end">
        <div className="flex-grow rounded-lg p-3 bg-blue-950/70 border border-blue-500/30 text-right">
            <p className="text-sm text-neutral-200 whitespace-pre-wrap">{text}</p>
        </div>
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-neutral-700 flex items-center justify-center">
            <User className="h-5 w-5 text-neutral-300" />
        </div>
    </div>
);

export const ChatConversation: React.FC<ChatConversationProps> = ({ messages, isLoading, onSendMessage, className }) => {
  const form = useForm<z.infer<typeof chatFormSchema>>({
    resolver: zodResolver(chatFormSchema),
    defaultValues: { message: '' },
  });

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);
  
  const handleSubmit = (values: z.infer<typeof chatFormSchema>) => {
    onSendMessage(values.message);
    form.reset();
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
        {/* Chat Messages Area */}
        <div
            ref={scrollAreaRef}
            className="flex-grow overflow-y-auto p-4 space-y-6 [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]"
        >
            {messages.map((msg, index) => (
                msg.sender === 'ai'
                    ? <AIMessage key={msg.id || index} text={msg.message_text} sources={msg.sources} />
                    : <UserMessage key={msg.id || index} text={msg.message_text} />
            ))}
            {isLoading && messages.length > 0 && messages[messages.length - 1].sender === 'user' && (
                 <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-neutral-700 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 text-neutral-300 animate-spin" />
                    </div>
                    <div className="flex-grow rounded-lg p-3 bg-neutral-800 border border-neutral-700">
                        <p className="text-sm text-neutral-400">Thinking...</p>
                    </div>
                </div>
            )}
        </div>

        {/* Chat Input Area */}
        <div className="p-4 border-t border-neutral-700/50">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="relative">
                    <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Ask a question..."
                                        className="bg-neutral-900 border-neutral-700 min-h-0 pr-12"
                                        rows={1}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                form.handleSubmit(handleSubmit)();
                                            }
                                        }}
                                        disabled={isLoading}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <Button type="submit" size="icon" className="absolute top-1.5 right-1.5 h-7 w-7" disabled={isLoading}>
                        <SendHorizonal className="h-4 w-4" />
                    </Button>
                </form>
            </Form>
        </div>
    </div>
  );
};