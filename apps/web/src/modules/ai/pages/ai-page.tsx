import { API_BASE } from '@/lib/api';
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../app/stores/auth.store';
import {
  Sparkles, Send, User, RefreshCw, AlertCircle, Plus,
  MessageSquare, Clock, ChevronDown, Zap, Lock, Trash2,
  Check, PanelLeftClose, PanelLeftOpen, Copy, ThumbsUp,
  ThumbsDown, RotateCcw, Wand2, Compass, Code, FileText,
  ChevronRight, Sparkle, Terminal, Wrench
} from 'lucide-react';

type Message = { id: string; role: 'user' | 'assistant'; content: string };
type Conversation = { id: string; title: string; updatedAt: string; activeModelName?: string; messages: Message[] };
type AvailableModel = { id: string; name: string; isFree: boolean; isToolCapable: boolean };

/**
 * Models confirmed to support OpenAI-compatible tool/function calling
 * (both `tools` + `tool_choice` in their supported_parameters on OpenRouter).
 * This covers all major providers — free and paid — that Emberlyn's agentic
 * loop can use. The list is derived from the live OpenRouter /api/v1/models
 * response and updated here as new models are confirmed.
 *
 * Free-tier tool-capable models are marked with :free suffix.
 */
const TOOL_CAPABLE_MODEL_IDS = new Set([
  // ── Free tier ─────────────────────────────────────────────────────────────
  'liquid/lfm-2.5-2.6b:free',
  'nvidia/nemotron-3.5-lightning:free',
  'inclusionai/ling-3.0-tiny:free',
  'poolside/laguna-s-2.1:free',
  'poolside/laguna-xs-2.1:free',
  'cohere/north-mini-code:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'nvidia/nemotron-nano-9b-v2:free',
  'openai/gpt-oss-20b:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
  // ── Paid — Anthropic ──────────────────────────────────────────────────────
  'anthropic/claude-opus-5',
  'anthropic/claude-fable-5',
  'anthropic/claude-sonnet-5',
  'anthropic/claude-opus-4.8',
  'anthropic/claude-opus-4.7',
  'anthropic/claude-opus-4.6',
  'anthropic/claude-sonnet-4.6',
  'anthropic/claude-haiku-4.5',
  'anthropic/claude-opus-4.5',
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-opus-4.1',
  'anthropic/claude-sonnet-4',
  'anthropic/claude-opus-4',
  'anthropic/claude-3-haiku',
  // ── Paid — OpenAI ─────────────────────────────────────────────────────────
  'openai/gpt-5.6-sol',
  'openai/gpt-5.6-terra',
  'openai/gpt-5.6-luna',
  'openai/gpt-5.5',
  'openai/gpt-5.4',
  'openai/gpt-5.4-mini',
  'openai/gpt-5.4-nano',
  'openai/gpt-5.3-codex',
  'openai/gpt-5.2',
  'openai/gpt-5.2-codex',
  'openai/gpt-5.1',
  'openai/gpt-5.1-codex',
  'openai/gpt-5.1-codex-max',
  'openai/gpt-5.1-codex-mini',
  'openai/gpt-5',
  'openai/gpt-5-mini',
  'openai/gpt-5-nano',
  'openai/gpt-4.1',
  'openai/gpt-4.1-mini',
  'openai/gpt-4.1-nano',
  'openai/gpt-4o',
  'openai/gpt-4o-2024-11-20',
  'openai/gpt-4o-2024-08-06',
  'openai/gpt-4o-mini',
  'openai/o4-mini',
  'openai/o4-mini-high',
  'openai/o3',
  'openai/o3-mini',
  'openai/o3-mini-high',
  'openai/o3-pro',
  'openai/o1',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'openai/gpt-chat-latest',
  // ── Paid — Google ─────────────────────────────────────────────────────────
  'google/gemini-3.6-flash',
  'google/gemini-3.5-flash',
  'google/gemini-3.5-flash-lite',
  'google/gemini-3.1-flash-lite',
  'google/gemini-3.1-pro-preview',
  'google/gemini-3.1-flash-lite-preview',
  'google/gemini-2.5-pro',
  'google/gemini-2.5-flash',
  'google/gemini-2.5-flash-lite',
  'google/gemma-4-31b-it',
  'google/gemma-4-26b-a4b-it',
  'google/gemma-3-12b-it',
  'google/gemma-3-27b-it',
  // ── Paid — DeepSeek ───────────────────────────────────────────────────────
  'deepseek/deepseek-v4-flash-0731',
  'deepseek/deepseek-v4-flash',
  'deepseek/deepseek-v4-pro',
  'deepseek/deepseek-v3.2',
  'deepseek/deepseek-v3.2-exp',
  'deepseek/deepseek-v3.1-terminus',
  'deepseek/deepseek-chat-v3.1',
  'deepseek/deepseek-r1-0528',
  'deepseek/deepseek-r1',
  'deepseek/deepseek-r1-distill-llama-70b',
  'deepseek/deepseek-chat-v3-0324',
  // ── Paid — Qwen ───────────────────────────────────────────────────────────
  'qwen/qwen3.8-max',
  'qwen/qwen3.7-flash',
  'qwen/qwen3.7-max',
  'qwen/qwen3.7-plus',
  'qwen/qwen3.6-flash',
  'qwen/qwen3.6-plus',
  'qwen/qwen3.6-max-preview',
  'qwen/qwen3.6-27b',
  'qwen/qwen3.6-35b-a3b',
  'qwen/qwen3.5-plus-20260420',
  'qwen/qwen3.5-397b-a17b',
  'qwen/qwen3.5-35b-a3b',
  'qwen/qwen3.5-27b',
  'qwen/qwen3.5-122b-a10b',
  'qwen/qwen3.5-flash-02-23',
  'qwen/qwen3.5-9b',
  'qwen/qwen3-235b-a22b',
  'qwen/qwen3-30b-a3b',
  'qwen/qwen3-32b',
  'qwen/qwen3-14b',
  'qwen/qwen3-8b',
  'qwen/qwen3-max',
  'qwen/qwen3-max-thinking',
  'qwen/qwen3-coder',
  'qwen/qwen3-coder-plus',
  'qwen/qwen3-coder-flash',
  'qwen/qwen3-coder-30b-a3b-instruct',
  'qwen/qwen3-vl-235b-a22b-thinking',
  'qwen/qwen3-vl-235b-a22b-instruct',
  'qwen/qwen3-vl-32b-instruct',
  'qwen/qwen3-vl-30b-a3b-thinking',
  'qwen/qwen3-vl-30b-a3b-instruct',
  'qwen/qwen3-vl-8b-thinking',
  'qwen/qwen-plus',
  'qwen/qwen-plus-2025-07-28',
  'qwen/qwen2.5-vl-72b-instruct',
  'qwen/qwen2.5-7b-instruct',
  'qwen/qwen2.5-72b-instruct',
  'qwen/qwen-2.5-coder-32b-instruct',
  'qwen/qwen-2.5-7b-instruct',
  // ── Paid — Mistral ────────────────────────────────────────────────────────
  'mistralai/mistral-medium-3.5',
  'mistralai/mistral-medium-3',
  'mistralai/mistral-medium-3.1',
  'mistralai/mistral-small-2603',
  'mistralai/mistral-small-3.2-24b-instruct',
  'mistralai/mistral-small-24b-instruct-2501',
  'mistralai/mistral-large-2512',
  'mistralai/mistral-large-2407',
  'mistralai/mistral-large',
  'mistralai/mistral-nemo',
  'mistralai/mixtral-8x22b-instruct',
  'mistralai/codestral-2508',
  'mistralai/ministral-14b-2512',
  'mistralai/ministral-8b-2512',
  'mistralai/ministral-3b-2512',
  'mistralai/mistral-saba',
  'mistralai/voxtral-small-24b-2507',
  // ── Paid — Meta ───────────────────────────────────────────────────────────
  'meta-llama/llama-3.3-70b-instruct',
  'meta-llama/llama-3.1-70b-instruct',
  'meta-llama/llama-3.1-8b-instruct',
  'meta-llama/llama-4-maverick',
  'meta-llama/llama-4-scout',
  // ── Paid — Others ─────────────────────────────────────────────────────────
  'moonshotai/kimi-k3',
  'moonshotai/kimi-k2.7-code',
  'moonshotai/kimi-k2.6',
  'moonshotai/kimi-k2.5',
  'moonshotai/kimi-k2-thinking',
  'moonshotai/kimi-k2-0905',
  'moonshotai/kimi-k2',
  'google/gemini-2.5-pro',
  'x-ai/grok-4.5',
  'x-ai/grok-4.20',
  'x-ai/grok-4.3',
  'x-ai/grok-build-0.1',
  'inclusionai/ling-3.0-flash',
  'inclusionai/ling-2.6-1t',
  'inclusionai/ling-2.6-flash',
  'inclusionai/ring-2.6-1t',
  'tencent/hy3',
  'tencent/hy3-preview',
  'minimax/minimax-m3',
  'minimax/minimax-m2.7',
  'minimax/minimax-m2.5',
  'minimax/minimax-m2.1',
  'minimax/minimax-m2',
  'minimax/minimax-m1',
  'minimax/minimax-m1',
  'z-ai/glm-5.2',
  'z-ai/glm-5.1',
  'z-ai/glm-5',
  'z-ai/glm-5-turbo',
  'z-ai/glm-5v-turbo',
  'z-ai/glm-4.7',
  'z-ai/glm-4.7-flash',
  'z-ai/glm-4.6',
  'z-ai/glm-4.6v',
  'z-ai/glm-4.5',
  'z-ai/glm-4.5-air',
  'z-ai/glm-4.5v',
  'poolside/laguna-s-2.1',
  'poolside/laguna-xs-2.1',
  'bytedance-seed/seed-2.0-lite',
  'bytedance-seed/seed-2.0-mini',
  'bytedance-seed/seed-2.0-code',
  'bytedance-seed/seed-1.6',
  'bytedance-seed/seed-1.6-flash',
  'nvidia/nemotron-3.5-lightning',
  'nvidia/nemotron-3-ultra-550b-a55b',
  'nvidia/nemotron-3-super-120b-a12b',
  'nvidia/nemotron-3-nano-30b-a3b',
  'nex-agi/nex-n2-pro',
  'nex-agi/nex-n2-mini',
  'rekaai/reka-edge',
  'aion-labs/aion-3.0',
  'aion-labs/aion-3.0-mini',
  'aion-labs/aion-2.0',
  'openai/gpt-5.6-sol-pro',
  'openai/gpt-5.6-terra-pro',
  'openai/gpt-5.6-luna-pro',
  'openai/gpt-5.5-pro',
  'cohere/north-mini-code',
  'xiaomi/mimo-v2.5-pro',
  'xiaomi/mimo-v2.5',
  'stepfun/step-3.7-flash',
  'stepfun/step-3.5-flash',
  'arcee-ai/trinity-large-thinking',
  'arcee-ai/virtuoso-large',
  'sao10k/l3.1-euryale-70b',
  'sakana/fugu-ultra',
  'meituan/longcat-2.0',
  'upstage/solar-pro4',
  'upstage/solar-pro-3',
  'kwaipilot/kat-coder-pro-v2.5',
  'kwaipilot/kat-coder-air-v2.5',
  'kwaipilot/kat-coder-pro-v2',
  'baidu/ernie-4.5-vl-424b-a47b',
  'deepcogito/cogito-v2.1-671b',
  'thinkingmachines/inkling',
  'thinkingmachines/inkling-small',
  'nousresearch/hermes-3-llama-3.1-70b',
  'nousresearch/hermes-3-llama-3.1-405b',
  'nousresearch/hermes-4-70b',
  'nousresearch/hermes-4-405b',
  'openai/gpt-3.5-turbo',
  'openai/gpt-3.5-turbo-0613',
  'openai/gpt-4',
  'openai/gpt-4-turbo',
  'google/gemini-3-flash-preview',
  'qwen/qwen3.5-plus-02-15',
  'qwen/qwen3-235b-a22b-2507',
  'qwen/qwen3-235b-a22b-thinking-2507',
  'qwen/qwen3-30b-a3b-thinking-2507',
  'qwen/qwen3-30b-a3b-instruct-2507',
  'qwen/qwen3-next-80b-a3b-thinking',
  'qwen/qwen3-next-80b-a3b-instruct',
  'google/gemma-3-12b-it',
  'google/gemma-3-27b-it',
  'openai/gpt-oss-safeguard-20b',
  'sakana/sakana-namazu',
  'amazon/nova-2-lite-v1',
  'thedrummer/unslopnemo-12b',
  'mistralai/mistral-small-3.1-24b-instruct',
  'liquid/lfm-2.5-2.6b',
  'inclusionai/ling-3.0-tiny',
  'inception/mercury-2',
  'ibm-granite/granite-4.1-8b',
  'relace/relace-search',
  'sao10k/l3.1-euryale-70b',
  'qwen3-vl-8b-instruct',
  'microsoft/phi-4',
]);

/** Returns true if the model ID (or any of its version aliases) is tool-capable */
function checkToolCapable(id: string): boolean {
  if (TOOL_CAPABLE_MODEL_IDS.has(id)) return true;
  // Strip version/date suffixes for alias matching (e.g. ~anthropic/claude-sonnet-latest)
  const base = id.replace(/^~/, '').replace(/-\d{8}$/, '').replace(/:.*$/, '');
  return TOOL_CAPABLE_MODEL_IDS.has(base);
}

const EMBERLYN_SUGGESTIONS = [
  {
    icon: Wand2,
    title: 'Analyze Project Health',
    subtitle: 'Review active tasks & identify blockers',
    prompt: 'Emberlyn, please review our active workspace tasks and highlight any potential blockers or risks.',
  },
  {
    icon: Code,
    title: 'Draft Technical RFC',
    subtitle: 'Architecture & technical design proposal',
    prompt: 'Emberlyn, help me draft a clean architecture proposal RFC for a scalable new feature module.',
  },
  {
    icon: Compass,
    title: 'Strategic Velocity Roadmap',
    subtitle: 'Optimize sprint planning & milestones',
    prompt: 'Emberlyn, what strategic steps should our team take to optimize current milestone velocity?',
  },
  {
    icon: FileText,
    title: 'Generate Onboarding Docs',
    subtitle: 'Clear developer guidelines & standards',
    prompt: 'Emberlyn, generate concise onboarding documentation for a new engineer joining our workspace.',
  },
];

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl border border-[#27272a] bg-[#0c0c0e] overflow-hidden text-xs shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-[#121215] border-b border-[#1f1f23] text-[#a1a1aa] font-mono text-[11px]">
        <div className="flex items-center space-x-1.5">
          <Terminal className="w-3.5 h-3.5 text-[#c084fc]" />
          <span className="uppercase font-semibold tracking-wider text-[#71717a]">{language || 'code'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 hover:text-white transition px-2 py-1 rounded bg-[#18181b] border border-[#27272a]"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-sans">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span className="font-sans">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 font-mono text-[13px] text-[#e4e4e7] overflow-x-auto leading-relaxed bg-[#08080a]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Shared markdown component map — reused by FormattedMessageContent
// Defined outside the component so it's not recreated on every render.
const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-lg font-bold text-[#fafafa] mt-4 mb-1.5 leading-snug">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-[#fafafa] mt-3.5 mb-1 leading-snug">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-[#c084fc] mt-3 mb-1 leading-snug">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-medium text-[#a78bfa] mt-2.5 mb-0.5">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="text-[#e4e4e7] leading-relaxed mb-2 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => <ul className="space-y-1 my-2 ml-1">{children}</ul>,
  ol: ({ children }) => <ol className="space-y-1 my-2 ml-1">{children}</ol>,
  li: ({ children }) => (
    <li className="flex items-start space-x-2 text-[#e4e4e7]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#c084fc] mt-[0.45rem] flex-shrink-0" />
      <span className="flex-1 min-w-0">{children}</span>
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#7c3aed] pl-3 py-1 text-[#a1a1aa] italic bg-[#7c3aed]/5 rounded-r-lg my-2">
      {children}
    </blockquote>
  ),
  // code handles both inline spans and fenced blocks.
  // react-markdown v8 passes className="language-xxx" for fenced blocks; inline spans have no className.
  code: (props) => {
    const { className, children } = props as { className?: string; children?: React.ReactNode };
    const isBlock = Boolean(className?.startsWith('language-'));
    if (!isBlock) {
      return (
        <code className="px-1.5 py-0.5 rounded bg-[#18181b] border border-[#27272a] font-mono text-[12px] text-[#c084fc]">
          {children}
        </code>
      );
    }
    const language = (className ?? '').replace('language-', '');
    return <CodeBlock language={language} code={String(children).replace(/\n$/, '')} />;
  },
  pre: ({ children }) => <>{children}</>,
  hr: () => <hr className="border-[#27272a] my-4" />,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#c084fc] hover:text-[#e879f9] underline underline-offset-2 transition-colors"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic text-[#d4d4d8]">{children}</em>,
  // Render <br> tags (often injected by the LLM inside table cells) as real line breaks
  br: () => <br />,
  // GFM tables
  table: ({ children }) => (
    <div className="overflow-x-auto my-3 rounded-xl border border-[#27272a]">
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[#121215] border-b border-[#27272a]">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-[#1f1f23]">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-[#121215]/60 transition-colors">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2.5 text-left font-semibold text-[#a1a1aa] uppercase tracking-wider text-[10px] whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2.5 text-[#e4e4e7] align-top">{children}</td>
  ),
};

function FormattedMessageContent({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
      {content}
    </ReactMarkdown>
  );
}

export default function AiPage() {
  const { workspace, token, user } = useAuthStore();
  const location = useLocation();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');

  useEffect(() => {
    if (location.state && (location.state as any).prompt) {
      setInputMessage((location.state as any).prompt);
    }
  }, [location.state]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoadingConvs, setIsLoadingConvs] = useState(false);
  // Sidebar closed by default on mobile (< md), open on desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  // Model Selector
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);

  // Copy & feedback states
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, 'up' | 'down'>>({});

  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!workspace || !token) return;
    fetchConversations();
    fetchAvailableModels();
  }, [workspace, token]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchAvailableModels = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/workspaces/${workspace!.id}/ai/available-models`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setIsConfigured(data.configured ?? false);
        const modelsList: AvailableModel[] = (data.models || []).map((m: Omit<AvailableModel, 'isToolCapable'>) => ({
          ...m,
          isToolCapable: checkToolCapable(m.id),
        }));
        setAvailableModels(modelsList);

        // RULE: The default model MUST be the first model of the allowed AI list!
        const defaultModelId = modelsList.length > 0 ? modelsList[0]?.id : data.defaultModel;
        if (defaultModelId) {
          setSelectedModel(defaultModelId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch models', err);
    }
  };

  const fetchConversations = async () => {
    setIsLoadingConvs(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/workspaces/${workspace!.id}/ai/conversations`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) setConversations(await res.json());
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setIsLoadingConvs(false);
    }
  };

  const startNewConversation = () => {
    setActiveConvId(undefined);
    setMessages([]);
    setErrorMsg(null);
    if (availableModels.length > 0 && availableModels[0]?.id) {
      setSelectedModel(availableModels[0].id);
    }
  };

  const openConversation = (conv: Conversation) => {
    setActiveConvId(conv.id);
    setMessages(conv.messages || []);
    if (conv.activeModelName) setSelectedModel(conv.activeModelName);
    setErrorMsg(null);
  };

  const deleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (!workspace || !token) return;
    try {
      await fetch(
        `${API_BASE}/api/v1/workspaces/${workspace!.id}/ai/conversations/${convId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      );
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) startNewConversation();
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  };

  const handleSend = async (text?: string) => {
    const userText = (text ?? inputMessage).trim();
    if (!userText || isLoading || !workspace || !token) return;

    setInputMessage('');
    setErrorMsg(null);

    const userMsg: Message = { id: `tmp-${Date.now()}`, role: 'user', content: userText };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/workspaces/${workspace!.id}/ai/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            conversationId: activeConvId,
            message: userText,
            modelName: selectedModel || undefined,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Emberlyn encountered an issue processing your request.');

      setActiveConvId(data.conversationId);
      if (data.message) {
        setMessages((prev) => [
          ...prev,
          { id: data.message.id || `bot-${Date.now()}`, role: 'assistant', content: data.message.content },
        ]);
      }
      await fetchConversations();
    } catch (err: any) {
      setErrorMsg(err.message || 'Emberlyn is currently unavailable.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyMessageText = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(msgId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const toggleFeedback = (msgId: string, type: 'up' | 'down') => {
    setFeedbackState((prev) => ({
      ...prev,
      [msgId]: prev[msgId] === type ? (undefined as any) : type,
    }));
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const selectedModelInfo = availableModels.find((m) => m.id === selectedModel);

  return (
    <div className="flex h-[calc(100vh-5rem)] -m-4 sm:-m-6 bg-[#09090b] text-[#e4e4e7] font-sans antialiased overflow-hidden selection:bg-[#7c3aed]/30 selection:text-[#d8b4fe]">
      
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Collapsible History Sidebar ──
           Desktop: static, collapses to w-0
           Mobile:  fixed slide-over from left */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0'}
          transition-all duration-300 ease-in-out flex-shrink-0
          bg-[#0c0c0e]/95 backdrop-blur-md border-r border-[#1f1f23]
          flex flex-col overflow-hidden
          h-[calc(100vh-5rem)] md:h-auto
        `}
      >
        {/* Sidebar Header */}
        <div className="px-4 h-14 border-b border-[#1f1f23]/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-full ring-2 ring-[#7c3aed]/60 ring-offset-1 ring-offset-[#0c0c0e] shadow-md shadow-[#7c3aed]/30 overflow-hidden flex-shrink-0">
              <img src="/Rember.png" alt="Emberlyn" className="w-full h-full object-cover" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-[#fafafa]">Emberlyn AI</span>
          </div>

          <button
            onClick={startNewConversation}
            className="p-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-white border border-[#27272a] transition flex items-center space-x-1"
            title="New Chat"
          >
            <Plus className="w-4 h-4 text-[#c084fc]" />
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1 custom-scrollbar">
          <div className="px-3 py-1 text-[10px] font-semibold text-[#52525b] uppercase tracking-wider">
            Conversations
          </div>

          {isLoadingConvs ? (
            <div className="text-xs text-[#52525b] text-center py-6">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="text-xs text-[#52525b] text-center py-8 px-4 leading-relaxed">
              No recent chats with Emberlyn yet. Start typing to begin.
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = activeConvId === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => openConversation(conv)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition group relative cursor-pointer flex items-center justify-between ${
                    isActive
                      ? 'bg-[#18181b] border border-[#27272a] text-[#fafafa]'
                      : 'hover:bg-[#121215] text-[#a1a1aa] hover:text-[#fafafa] border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 overflow-hidden min-w-0 pr-2">
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-[#c084fc]' : 'text-[#52525b] group-hover:text-[#a1a1aa]'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{conv.title}</div>
                      {conv.activeModelName && (
                        <div className="text-[10px] text-[#52525b] truncate font-mono mt-0.5">
                          {conv.activeModelName.split('/').pop()}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => deleteConversation(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition rounded"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#1f1f23]/60 bg-[#09090b]/50">
          <div className="flex items-center space-x-2 text-[11px] text-[#71717a]">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Emberlyn Kernel • Active</span>
          </div>
        </div>
      </aside>

      {/* ── Main Chat Area ── */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#09090b] relative">

        {/* Top Header Bar */}
        <header className="h-14 border-b border-[#1f1f23]/80 px-3 sm:px-6 flex items-center justify-between bg-[#09090b]/80 backdrop-blur-md z-10 gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-[#18181b] text-[#a1a1aa] hover:text-white transition flex-shrink-0"
              title="Toggle sidebar"
            >
              {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>

            {/* Model Selector Pill — truncates on narrow screens */}
            <div className="relative min-w-0" ref={modelDropdownRef}>
              <button
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-[#121215] border border-[#27272a] hover:border-[#3f3f46] text-xs font-medium text-[#fafafa] transition group shadow-sm max-w-[200px] sm:max-w-none"
              >
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#c084fc] shadow-sm flex-shrink-0" />
                <span className="font-semibold text-sm tracking-tight text-[#fafafa] hidden sm:inline">Emberlyn</span>
                <span className="text-[#a1a1aa] text-xs font-mono font-normal truncate max-w-[80px] sm:max-w-[160px]">
                  {selectedModel ? selectedModel.split('/').pop() : 'Select Model'}
                </span>
                {selectedModelInfo?.isFree && (
                  <span className="text-[10px] text-emerald-400 font-bold px-1.5 py-0.2 rounded bg-emerald-950/40 border border-emerald-800/40 hidden sm:inline">
                    FREE
                  </span>
                )}
                {selectedModelInfo?.isToolCapable && (
                  <span className="hidden sm:flex items-center space-x-0.5 text-[9px] text-[#a78bfa] bg-[#7c3aed]/15 border border-[#7c3aed]/30 px-1.5 py-0.5 rounded font-semibold">
                    <Wrench className="w-2.5 h-2.5" />
                    <span>Tools</span>
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-[#a1a1aa] group-hover:text-white transition-transform duration-200 flex-shrink-0" />
              </button>

              {/* Model Dropdown Menu */}
              {isModelDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-[min(320px,calc(100vw-2rem))] bg-[#121215] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden z-50 p-2 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-[#71717a] uppercase tracking-wider flex items-center justify-between">
                    <span>Allowed Models</span>
                    <span className="text-[#52525b] lowercase">first model = default</span>
                  </div>
                  <div className="space-y-0.5 max-h-72 overflow-y-auto custom-scrollbar">
                    {availableModels.length === 0 ? (
                      <div className="p-4 text-xs text-[#71717a] text-center">
                        No allowed models configured. Add models in Settings → AI Provider.
                      </div>
                    ) : (
                      availableModels.map((m, idx) => {
                        const isSelected = selectedModel === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => {
                              setSelectedModel(m.id);
                              setIsModelDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition ${
                              isSelected
                                ? 'bg-[#7c3aed]/15 text-white font-medium border border-[#7c3aed]/30'
                                : 'hover:bg-[#18181b] text-[#a1a1aa] hover:text-white border border-transparent'
                            }`}
                          >
                            <div className="flex items-center space-x-2 truncate">
                              {m.isFree ? (
                                <Zap className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              ) : (
                                <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              )}
                              <span className="truncate">{m.name || m.id}</span>
                            </div>
                            <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                              {m.isToolCapable && (
                                <span className="flex items-center space-x-0.5 text-[9px] text-[#a78bfa] bg-[#7c3aed]/15 border border-[#7c3aed]/30 px-1.5 py-0.5 rounded font-semibold">
                                  <Wrench className="w-2.5 h-2.5" />
                                  <span>Tools</span>
                                </span>
                              )}
                              {idx === 0 && (
                                <span className="text-[9px] text-[#c084fc] bg-[#7c3aed]/20 px-1.5 py-0.5 rounded font-mono">
                                  Default
                                </span>
                              )}
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#c084fc]" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Desktop: full pill button */}
            <button
              onClick={startNewConversation}
              className="hidden sm:flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#18181b] hover:bg-[#27272a] text-xs font-medium text-[#e4e4e7] border border-[#27272a] transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-[#c084fc]" />
              <span>New Chat</span>
            </button>
            {/* Mobile: icon-only button */}
            <button
              onClick={startNewConversation}
              className="sm:hidden p-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-white border border-[#27272a] transition"
              title="New Chat"
            >
              <Plus className="w-4 h-4 text-[#c084fc]" />
            </button>
          </div>
        </header>

        {/* Messages / Welcome Canvas */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6 flex flex-col items-center">
          <div className="w-full max-w-[1500px] flex-1 flex flex-col justify-between">
            
            {messages.length === 0 ? (
              /* ── Gemini-Style Empty State / Hero Canvas ── */
              <div className="my-auto py-8 flex flex-col items-start space-y-8 animate-in fade-in duration-300 w-full">
                <div className="space-y-3">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#7c3aed]/10 border border-[#7c3aed]/20 text-xs text-[#c084fc] font-medium">
                    <Sparkle className="w-3.5 h-3.5 text-[#c084fc]" />
                    <span>Workspace Intelligence Kernel</span>
                  </div>

                  <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#c084fc] via-[#e879f9] to-[#38bdf8]">
                    {getTimeGreeting()}, {user?.name?.split(' ')[0] || 'Member'}
                  </h1>
                  <p className="text-xl sm:text-2xl text-[#71717a] font-normal tracking-tight max-w-3xl">
                    I am Emberlyn — your wise, mature workspace companion. What would you like to solve today?
                  </p>
                </div>

                {/* 4 Responsive Prompt Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full pt-2">
                  {EMBERLYN_SUGGESTIONS.map((s, idx) => {
                    const IconComp = s.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSend(s.prompt)}
                        className="p-5 rounded-2xl bg-[#121215] border border-[#1f1f23] hover:border-[#7c3aed]/40 hover:bg-[#18181b] text-left transition group duration-200 flex flex-col justify-between min-h-[120px] shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm font-semibold text-[#fafafa] group-hover:text-[#c084fc] transition">
                            {s.title}
                          </span>
                          <div className="p-2 rounded-xl bg-[#18181b] group-hover:bg-[#7c3aed]/20 text-[#a1a1aa] group-hover:text-[#c084fc] transition">
                            <IconComp className="w-4 h-4" />
                          </div>
                        </div>
                        <p className="text-xs text-[#71717a] line-clamp-2 mt-2 leading-relaxed font-normal">
                          {s.prompt}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ── ChatGPT / Gemini Chat Message Stream ── */
              <div className="space-y-7 py-4 w-full">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  const feedback = feedbackState[msg.id];

                  if (isUser) {
                    return (
                      <div key={msg.id} className="flex justify-end w-full my-3">
                        <div className="max-w-[75%] sm:max-w-[65%] bg-[#27272a] border border-[#3f3f46]/50 text-[#fafafa] px-5 py-3.5 rounded-3xl text-sm leading-relaxed shadow-sm font-normal">
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className="flex space-x-4 w-full my-4 group items-start">
                      {/* Emberlyn Avatar */}
                      <div className="w-9 h-9 rounded-full flex-shrink-0 mt-0.5 ring-2 ring-[#7c3aed]/60 ring-offset-2 ring-offset-[#09090b] shadow-md shadow-[#7c3aed]/30 overflow-hidden">
                        <img src="/Rember.png" alt="Emberlyn" className="w-full h-full object-cover" />
                      </div>

                      {/* Emberlyn Response Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1.5">
                          <span className="text-xs font-semibold text-[#fafafa]">Emberlyn</span>
                          {selectedModel && (
                            <span className="text-[10px] text-[#71717a] font-mono">
                              • {selectedModel.split('/').pop()}
                            </span>
                          )}
                        </div>

                        <div className="text-sm text-[#e4e4e7] leading-relaxed font-normal">
                          <FormattedMessageContent content={msg.content} />
                        </div>

                        {/* Action Toolbar (Copy, Thumbs Up / Down) */}
                        <div className="flex items-center space-x-1.5 mt-3 text-[#71717a]">
                          <button
                            onClick={() => copyMessageText(msg.id, msg.content)}
                            className="p-1.5 rounded-lg hover:bg-[#1c1c21] hover:text-white transition flex items-center space-x-1 text-xs"
                            title="Copy response"
                          >
                            {copiedMessageId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400 text-[11px]">Copied</span>
                              </>
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => toggleFeedback(msg.id, 'up')}
                            className={`p-1.5 rounded-lg hover:bg-[#1c1c21] transition ${feedback === 'up' ? 'text-emerald-400' : 'hover:text-white'}`}
                            title="Good response"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleFeedback(msg.id, 'down')}
                            className={`p-1.5 rounded-lg hover:bg-[#1c1c21] transition ${feedback === 'down' ? 'text-rose-400' : 'hover:text-white'}`}
                            title="Bad response"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* ── Emberlyn Reasoning Card ── */}
                {isLoading && (
                  <div className="flex items-start space-x-3.5 my-2">
                    {/* Avatar with slow pulse ring */}
                    <div className="relative flex-shrink-0 mt-0.5">
                      <div className="w-9 h-9 rounded-full ring-2 ring-[#7c3aed]/70 ring-offset-2 ring-offset-[#09090b] shadow-lg shadow-[#7c3aed]/30 overflow-hidden">
                        <img src="/Rember.png" alt="Emberlyn" className="w-full h-full object-cover" />
                      </div>
                      {/* Orbiting glow dot */}
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#7c3aed] border-2 border-[#09090b] animate-pulse" />
                    </div>

                    {/* Reasoning card */}
                    <div className="flex-1 min-w-0 bg-[#0e0e11] border border-[#2a2a35] rounded-2xl rounded-tl-none overflow-hidden shadow-xl shadow-[#7c3aed]/5">

                      {/* Top bar — model badge + status */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1c1c24] bg-[#0c0c10]">
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] font-semibold text-[#fafafa] tracking-tight">Emberlyn</span>
                          {selectedModel && (
                            <span className="text-[10px] font-mono text-[#52525b] bg-[#121215] border border-[#27272a] px-2 py-0.5 rounded-full">
                              {selectedModel.split('/').pop()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-pulse" />
                          <span className="text-[10px] text-[#71717a] font-medium">Reasoning</span>
                        </div>
                      </div>

                      {/* Shimmer lines — fake "thinking" text skeleton */}
                      <div className="px-4 py-4 space-y-2.5">
                        {/* Line 1 — long */}
                        <div className="h-2.5 rounded-full bg-gradient-to-r from-[#1f1f28] via-[#2e2e3d] to-[#1f1f28] bg-[length:300%_100%] animate-[shimmer_2s_ease-in-out_infinite]" style={{ width: '82%' }} />
                        {/* Line 2 — medium */}
                        <div className="h-2.5 rounded-full bg-gradient-to-r from-[#1f1f28] via-[#2e2e3d] to-[#1f1f28] bg-[length:300%_100%] animate-[shimmer_2s_ease-in-out_infinite]" style={{ width: '65%', animationDelay: '0.15s' }} />
                        {/* Line 3 — short */}
                        <div className="h-2.5 rounded-full bg-gradient-to-r from-[#1f1f28] via-[#2e2e3d] to-[#1f1f28] bg-[length:300%_100%] animate-[shimmer_2s_ease-in-out_infinite]" style={{ width: '48%', animationDelay: '0.3s' }} />
                      </div>

                      {/* Bottom bar — pulsing dots + label */}
                      <div className="flex items-center space-x-3 px-4 py-2.5 border-t border-[#1c1c24] bg-[#0c0c10]">
                        <span className="flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#c084fc] animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-bounce" style={{ animationDelay: '140ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#818cf8] animate-bounce" style={{ animationDelay: '280ms' }} />
                        </span>
                        <span className="text-[11px] text-[#52525b]">Processing your request, please wait…</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-300 flex items-start space-x-3">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold mb-0.5">Emberlyn Notice</div>
                      <div>{errorMsg}</div>
                      {errorMsg.includes('configured') && (
                        <a href="/settings" className="text-rose-400 underline mt-1 inline-block">
                          → Go to Settings to add OpenRouter API key
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}

          </div>
        </div>

        {/* ── Input Bar (Gemini Pill Floating Container) ── */}
        <div className="p-4 sm:p-6 bg-gradient-to-t from-[#09090b] via-[#09090b] to-transparent flex justify-center z-10">
          <div className="w-full max-w-[1500px]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="relative flex items-center bg-[#121215] border border-[#27272a] focus-within:border-[#7c3aed] rounded-3xl p-2.5 shadow-2xl transition duration-200 group"
            >
              <textarea
                rows={1}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask Emberlyn anything about your workspace tasks, projects, or docs..."
                className="w-full bg-[#121215] border-none px-4 py-2 text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:ring-0 resize-none custom-scrollbar"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="p-2.5 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#c084fc] hover:opacity-95 text-white transition disabled:opacity-30 shadow-md flex-shrink-0 ml-2 group-hover:scale-105"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="flex items-center justify-between text-[11px] text-[#52525b] mt-2 px-3">
              <span>Emberlyn AI Kernel • {selectedModel ? selectedModel.split('/').pop() : 'Default Model'}</span>
              <span>Press Shift + Enter for new line</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export { AiPage };
