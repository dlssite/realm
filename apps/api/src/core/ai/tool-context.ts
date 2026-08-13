import { PrismaClient } from '@prisma/client';

// ─── Execution context injected into every tool call ─────────────────────────
export interface ToolContext {
  /** The workspace all queries must be scoped to */
  workspaceId: string;
  /** The authenticated user — all writes carry this as createdById / authorId */
  userId: string;
  /** Shared Prisma client instance */
  prisma: PrismaClient;
}

// ─── OpenAI-compatible JSON Schema subset used in tool parameter definitions ─
export interface JsonSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export interface ToolParameterSchema {
  type: 'object';
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
}

// ─── Core tool contract ───────────────────────────────────────────────────────
export interface EmberlynTool {
  /** Unique snake_case name — used by the LLM to call this tool */
  name: string;
  /** Human-readable description the LLM reads to decide when to invoke */
  description: string;
  /** JSON Schema for the tool's arguments */
  parameters: ToolParameterSchema;
  /**
   * Server-side executor. Receives parsed arguments and the request context.
   * Returns a plain object that gets serialised into the tool_result message.
   */
  execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
}

// ─── OpenAI function-calling wire format ─────────────────────────────────────
export interface OpenAIToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: ToolParameterSchema;
  };
}

/** Converts an EmberlynTool into the format expected by OpenRouter / OpenAI */
export function toOpenAITool(tool: EmberlynTool): OpenAIToolDefinition {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

// ─── Persisted tool call record (stored in AiMessage.toolCalls JSON) ─────────
export interface PersistedToolCall {
  toolCallId: string;
  name: string;
  arguments: Record<string, unknown>;
  /** Compact summary of the result for audit — not the full payload */
  resultSummary: string;
  executedAt: string; // ISO timestamp
}
