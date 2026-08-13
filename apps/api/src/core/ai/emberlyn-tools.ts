import { EmberlynTool, ToolContext, OpenAIToolDefinition, toOpenAITool, PersistedToolCall } from './tool-context';
import { taskTools } from './tools/tasks.tools';
import { projectTools } from './tools/projects.tools';
import { wikiTools } from './tools/wiki.tools';
import { calendarTools } from './tools/calendar.tools';
import { workspaceTools } from './tools/workspace.tools';

// ─── Master tool registry ─────────────────────────────────────────────────────
// All tools are registered here in priority order (highest-value first).
const ALL_TOOLS: EmberlynTool[] = [
  ...taskTools,      // 8  — Tasks: search, get, create, update, comment, subtask, assign, due-date
  ...projectTools,   // 8  — Projects: list, get, create, update, milestone, goal
  ...workspaceTools, // 7  — Workspace: members, teams, files, global search
  ...calendarTools,  // 5  — Calendar: feed, create, update, delete, rsvp
  ...wikiTools,      // 5  — Wiki: search, get, list, create, update
];

// Index by name for O(1) dispatch
const TOOL_MAP = new Map<string, EmberlynTool>(
  ALL_TOOLS.map((t) => [t.name, t])
);

// ─── OpenAI-compatible definitions array (attached to every LLM request) ─────
export const emberlynToolDefinitions: OpenAIToolDefinition[] = ALL_TOOLS.map(toOpenAITool);

// ─── Tool dispatcher ──────────────────────────────────────────────────────────
export interface ToolCallRequest {
  /** The tool_call id returned by the LLM — echoed back in the tool_result message */
  toolCallId: string;
  /** Name of the tool to execute */
  name: string;
  /** Parsed arguments object from the LLM's function_call.arguments JSON */
  arguments: Record<string, unknown>;
}

export interface ToolCallResult {
  toolCallId: string;
  name: string;
  /** The serialised result to send back to the LLM */
  content: string;
  /** Compact summary for audit log storage */
  summary: string;
  /** Whether the tool execution threw an error */
  isError: boolean;
}

/**
 * Executes a single tool call server-side and returns the result.
 * All errors are caught and returned as error content so the LLM
 * can surface them gracefully rather than crashing the loop.
 */
export async function executeToolCall(
  request: ToolCallRequest,
  ctx: ToolContext
): Promise<ToolCallResult> {
  const tool = TOOL_MAP.get(request.name);

  if (!tool) {
    const errorMsg = `Unknown tool: "${request.name}". Available tools: ${[...TOOL_MAP.keys()].join(', ')}.`;
    return {
      toolCallId: request.toolCallId,
      name: request.name,
      content: JSON.stringify({ error: errorMsg }),
      summary: `ERROR: ${errorMsg}`,
      isError: true,
    };
  }

  try {
    const result = await tool.execute(request.arguments, ctx);
    const content = JSON.stringify(result, jsonReplacer, 2);

    // Build a compact summary for the audit log (capped at 200 chars)
    const summary = buildSummary(request.name, result);

    return {
      toolCallId: request.toolCallId,
      name: request.name,
      content,
      summary,
      isError: false,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      toolCallId: request.toolCallId,
      name: request.name,
      content: JSON.stringify({ error: message }),
      summary: `ERROR executing ${request.name}: ${message.slice(0, 150)}`,
      isError: true,
    };
  }
}

/**
 * Builds a PersistedToolCall record for storage in AiMessage.toolCalls.
 */
export function buildPersistedRecord(
  request: ToolCallRequest,
  result: ToolCallResult
): PersistedToolCall {
  return {
    toolCallId: request.toolCallId,
    name: request.name,
    arguments: request.arguments,
    resultSummary: result.summary,
    executedAt: new Date().toISOString(),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** JSON replacer that converts BigInt to string (Prisma returns BigInt for sizeBytes) */
function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

function buildSummary(toolName: string, result: unknown): string {
  try {
    const r = result as Record<string, unknown>;

    if (r.error) return `${toolName}: Error — ${String(r.error).slice(0, 150)}`;
    if (r.success === true) {
      // Describe what was created/updated
      const entity = r.task ?? r.project ?? r.milestone ?? r.goal ?? r.event ?? r.attendee ?? r.comment ?? r.subtask ?? r.page ?? null;
      if (entity && typeof entity === 'object') {
        const e = entity as Record<string, unknown>;
        const label = e.identifier ?? e.title ?? e.name ?? e.id ?? '';
        return `${toolName}: OK — ${label}`.slice(0, 200);
      }
      return `${toolName}: OK`;
    }
    if (typeof r.count === 'number') return `${toolName}: returned ${r.count} items`;
    if (typeof r.totalHits === 'number') return `${toolName}: ${r.totalHits} total hits`;
    return `${toolName}: completed`;
  } catch {
    return `${toolName}: completed`;
  }
}
