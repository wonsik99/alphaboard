import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useI18n } from '@/hooks/useI18n';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export function StockChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { locale } = useI18n();
  const { toast } = useToast();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const chatMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke('stock-chat', {
        body: {
          messages: chatMessages,
          watchlist: watchlist.map(w => ({ symbol: w.symbol, name: w.name })),
        },
      });

      if (error) throw new Error(error.message);

      // Handle watchlist actions
      if (data?.watchlistActions?.length > 0) {
        for (const action of data.watchlistActions) {
          if (action.action === 'add') {
            addToWatchlist({ symbol: action.symbol, name: action.name });
          } else if (action.action === 'remove') {
            removeFromWatchlist(action.symbol);
          }
        }
      }

      // Handle error responses
      if (data?.error) {
        const errorMsg = data.error === 'rate_limit'
          ? '⚠️ 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'
          : data.error === 'payment_required'
          ? '⚠️ AI 크레딧이 부족합니다.'
          : `⚠️ 오류: ${data.message || '알 수 없는 오류'}`;

        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: errorMsg,
          timestamp: new Date(),
        }]);
        return;
      }

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data?.content || '응답을 받지 못했습니다.',
        timestamp: new Date(),
      }]);
    } catch (err) {
      console.error('Chat error:', err);
      toast({
        title: '오류',
        description: '메시지 전송에 실패했습니다.',
        variant: 'destructive',
      });
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '⚠️ 메시지 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = locale === 'ko'
    ? ['내 관심종목 현재 시세 알려줘', 'NVDA 최근 뉴스 요약해줘', '애플과 마이크로소프트 비교해줘']
    : ['Show my watchlist quotes', 'Summarize NVDA news', 'Compare AAPL vs MSFT'];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 rounded-full p-4 shadow-lg transition-all duration-300",
          "bg-primary text-primary-foreground hover:scale-105 active:scale-95",
          isOpen && "rotate-90 opacity-0 pointer-events-none"
        )}
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Chat panel */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl border border-border shadow-xl transition-all duration-300 overflow-hidden",
          "bg-card w-[380px] h-[560px]",
          isOpen ? "scale-100 opacity-100" : "scale-90 opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm text-foreground">
              {locale === 'ko' ? '주식 AI 어시스턴트' : 'Stock AI Assistant'}
            </span>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <Bot className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {locale === 'ko'
                  ? '주식 관련 질문을 해보세요!\n시세 조회, 뉴스 요약, 관심종목 관리가 가능합니다.'
                  : 'Ask me about stocks!\nI can check quotes, summarize news, and manage your watchlist.'}
              </p>
              <div className="flex flex-col gap-2 w-full">
                {quickActions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    className="text-xs text-left px-3 py-2 rounded-lg bg-muted hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex gap-2", msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                )}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_table]:text-xs [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center mt-0.5">
                  <User className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2 items-start">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="bg-muted rounded-xl rounded-bl-sm px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={locale === 'ko' ? '메시지를 입력하세요...' : 'Type a message...'}
              rows={1}
              className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-h-24"
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="h-9 w-9 rounded-lg flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
