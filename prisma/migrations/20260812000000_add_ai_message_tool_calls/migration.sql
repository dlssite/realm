-- Migration: add_ai_message_tool_calls
-- Adds the tool_calls JSONB column to ai_messages for Emberlyn agentic tool persistence.
-- Safe to run multiple times (column is added only if it does not already exist).

ALTER TABLE "ai_messages"
  ADD COLUMN IF NOT EXISTS "tool_calls" JSONB;
