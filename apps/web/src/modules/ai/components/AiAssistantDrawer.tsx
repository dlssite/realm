import { API_BASE } from '@/lib/api';
import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useAuthStore } from '../../../app/stores/auth.store';
import { Bot, X, Send, Sparkles, User, RefreshCw, AlertCircle, MessageSquare } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: string;
};

export function AiAssistantDrawer({ isOpen, onClose }: Props) {
  const { workspace, token } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim() || isLoading || !workspace || !token) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    setErrorMsg(null);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/workspaces/${workspace!.id}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          conversationId,
          message: userText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to generate AI response');
      }

      setConversationId(data.conversationId);
      if (data.message) {
        setMessages((prev) => [
          ...prev,
          {
            id: data.message.id || Date.now().toString(),
            role: 'assistant',
            content: data.message.content,
          },
        ]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'AI request failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg bg-[#0c0c0e] border-l border-[#1f1f23] shadow-2xl transition-transform duration-200">
      <div className="flex flex-col w-full h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1f1f23] bg-[#09090b]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#7c3aed]/10 text-[#7c3aed]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#fafafa]">Realm AI Assistant</h2>
              <p className="text-[11px] text-[#a1a1aa]">Powered by OpenRouter / Workspace AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#1f1f23] text-[#a1a1aa] hover:text-[#fafafa] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-[#7c3aed]/10 border border-[#7c3aed]/20 flex items-center justify-center text-[#7c3aed] mb-3">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-[#fafafa] mb-1">How can I assist your workspace?</h3>
              <p className="text-xs text-[#a1a1aa] max-w-xs mb-6">
                Ask questions about your projects, task priorities, architecture RFCs, or draft new documentation.
              </p>
              <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
                {[
                  'Summarize our active workspace tasks',
                  'Draft an RFC proposal for our backend API',
                  'What are the key priorities this week?',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputMessage(prompt);
                    }}
                    className="p-2.5 rounded-lg bg-[#121215] border border-[#1f1f23] hover:border-[#7c3aed]/50 text-left text-xs text-[#a1a1aa] hover:text-white transition"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex space-x-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-[#7c3aed]/15 border border-[#7c3aed]/30 flex items-center justify-center text-[#7c3aed] flex-shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] p-3.5 rounded-xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-[#7c3aed] text-white rounded-br-none font-medium'
                        : 'bg-[#121215] border border-[#1f1f23] text-[#e4e4e7] rounded-bl-none'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                          p: ({ children }) => <p className="text-[#e4e4e7] leading-relaxed mb-1.5 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                          em: ({ children }) => <em className="italic text-[#d4d4d8]">{children}</em>,
                          br: () => <br />,
                          code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) =>
                            inline ? (
                              <code className="px-1 py-0.5 rounded bg-[#18181b] border border-[#27272a] font-mono text-[11px] text-[#c084fc]">
                                {children}
                              </code>
                            ) : (
                              <pre className="p-2.5 rounded-lg bg-[#08080a] border border-[#27272a] font-mono text-[11px] text-[#e4e4e7] overflow-x-auto my-1.5">
                                <code>{children}</code>
                              </pre>
                            ),
                          pre: ({ children }) => <>{children}</>,
                          ul: ({ children }) => <ul className="space-y-0.5 my-1.5 ml-1">{children}</ul>,
                          ol: ({ children }) => <ol className="space-y-0.5 my-1.5 ml-1">{children}</ol>,
                          li: ({ children }) => (
                            <li className="flex items-start space-x-1.5 text-[#e4e4e7]">
                              <span className="w-1 h-1 rounded-full bg-[#c084fc] mt-[0.4rem] flex-shrink-0" />
                              <span>{children}</span>
                            </li>
                          ),
                          h1: ({ children }) => <h1 className="text-sm font-bold text-[#fafafa] mt-2 mb-1">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xs font-semibold text-[#fafafa] mt-2 mb-0.5">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-xs font-semibold text-[#c084fc] mt-1.5 mb-0.5">{children}</h3>,
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-2 rounded-lg border border-[#27272a]">
                              <table className="w-full text-[11px] border-collapse">{children}</table>
                            </div>
                          ),
                          thead: ({ children }) => <thead className="bg-[#121215] border-b border-[#27272a]">{children}</thead>,
                          tbody: ({ children }) => <tbody className="divide-y divide-[#1f1f23]">{children}</tbody>,
                          tr: ({ children }) => <tr className="hover:bg-[#121215]/60 transition-colors">{children}</tr>,
                          th: ({ children }) => <th className="px-2 py-1.5 text-left font-semibold text-[#a1a1aa] uppercase tracking-wider text-[10px]">{children}</th>,
                          td: ({ children }) => <td className="px-2 py-1.5 text-[#e4e4e7]">{children}</td>,
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#c084fc] hover:underline">
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-lg bg-[#1f1f23] flex items-center justify-center text-[#a1a1aa] flex-shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="flex space-x-3 items-center">
              <div className="w-7 h-7 rounded-lg bg-[#7c3aed]/15 flex items-center justify-center text-[#7c3aed]">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-[#121215] border border-[#1f1f23] p-3 rounded-xl text-xs text-[#a1a1aa] flex items-center space-x-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#7c3aed]" />
                <span>Thinking...</span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/40 text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 border-t border-[#1f1f23] bg-[#09090b]">
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask Workspace AI... (Enter to send)"
              className="w-full bg-[#121215] border border-[#1f1f23] rounded-lg pl-3 pr-10 py-2 text-xs text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#7c3aed] transition"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="absolute right-1.5 p-1.5 rounded-md bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AiAssistantDrawer;
