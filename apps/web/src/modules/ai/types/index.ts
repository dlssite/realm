export type AiProvider = 'OPENROUTER' | 'OLLAMA' | 'OPENAI' | 'ANTHROPIC';

export interface AiConfig {
  workspaceId?: string;
  provider: AiProvider;
  apiKey: string | null;
  baseUrl: string | null;
  modelName: string;
  allowedModels: string[];
  isActive: boolean;
  isConfigured: boolean;
}

export interface UpdateAiConfigPayload {
  provider: AiProvider;
  apiKey?: string | null;
  baseUrl?: string | null;
  modelName: string;
  allowedModels?: string[];
  isActive?: boolean;
}

export interface AiModel {
  id: string;
  name: string;
  isFree: boolean;
}

export interface AvailableModelsResponse {
  configured: boolean;
  provider?: AiProvider;
  defaultModel?: string;
  models: AiModel[];
}

export interface AiMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface AiConversation {
  id: string;
  workspaceId: string;
  createdById: string;
  title: string;
  activeModelName: string;
  createdAt: string;
  updatedAt: string;
  messages: AiMessage[];
}

export interface AiChatPayload {
  conversationId?: string;
  message: string;
  systemPrompt?: string;
  modelName?: string;
}

export interface AiChatResponse {
  conversationId: string;
  modelUsed: string;
  message: AiMessage;
}

export interface SummarizePayload {
  text: string;
  type?: 'WIKI' | 'PROJECT' | 'TASK';
}

export interface SummarizeResponse {
  summary: string;
  takeaways: string[];
}
