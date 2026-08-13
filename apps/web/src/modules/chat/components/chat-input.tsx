import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Smile, X } from 'lucide-react';
import { useChatStore } from '../../../app/stores/use-chat.store';
import { MentionPopup, MentionCandidate, buildCandidates } from './mention-popup';

interface ChatInputProps {
  channelName: string;
  onSendMessage: (content: string, attachments?: any[]) => void;
}

const EMOJI_LIST = ['👍', '❤️', '🔥', '🚀', '👀', '🎉', '💯', '🙌', '💡', '✅'];

// ── @mention detection helpers ─────────────────────────────────────────────

/**
 * Given the full textarea value and the cursor position, find the active
 * @mention token being typed.
 *
 * Returns { query, atIndex } when cursor is inside an @mention word,
 * or null when there is no active trigger.
 *
 *  Examples (| = cursor):
 *   "hello @al|ice"   → { query: "al", atIndex: 6 }   (mid-word)
 *   "hello @|"        → { query: "",   atIndex: 6 }   (just typed @)
 *   "hello @alice |"  → null                           (space after name)
 *   "email@foo|"      → null                           (no space before @)
 */
function getActiveMentionToken(
  text: string,
  cursorPos: number,
): { query: string; atIndex: number } | null {
  // Scan backwards from cursor to find the nearest @
  let i = cursorPos - 1;
  while (i >= 0) {
    const ch = text[i];
    if (ch === '@') {
      // Valid trigger: @ must be at start of string OR preceded by whitespace
      const before = text[i - 1];
      if (i === 0 || before === ' ' || before === '\n') {
        const query = text.slice(i + 1, cursorPos);
        // Only activate if the query has no spaces (still one token)
        if (!query.includes(' ') && !query.includes('\n')) {
          return { query, atIndex: i };
        }
      }
      // @ found but not a valid trigger position
      return null;
    }
    // Stop scanning at whitespace — no @ found in this token
    if (ch === ' ' || ch === '\n') return null;
    i--;
  }
  return null;
}

// ── component ──────────────────────────────────────────────────────────────

export function ChatInput({ channelName, onSendMessage }: ChatInputProps) {
  const [content, setContent]     = useState('');
  const [attachments, setAttachments] = useState<
    { filename: string; url: string; type: string; size: number }[]
  >([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // ── mention state ──────────────────────────────────────────────────────
  /** null  → popup closed.  string → the text after @ being typed */
  const [mentionQuery, setMentionQuery]   = useState<string | null>(null);
  /** char index of the @ character in `content` */
  const [mentionAtIndex, setMentionAtIndex] = useState<number>(0);
  const [mentionActiveIdx, setMentionActiveIdx] = useState<number>(0);

  const sendTyping    = useChatStore(s => s.sendTyping);
  const activeId      = useChatStore(s => s.activeChannelId);
  const channelMembersMap = useChatStore(s => s.channelMembers);

  const allMembers    = activeId ? (channelMembersMap[activeId] ?? []) : [];
  const allCandidates = buildCandidates(allMembers);

  // Filter by current query (case-insensitive prefix/contains match on name or email)
  const filteredCandidates: MentionCandidate[] =
    mentionQuery === null
      ? []
      : mentionQuery === ''
      ? allCandidates.slice(0, 8)          // show up to 8 when query is empty
      : allCandidates
          .filter(c =>
            c.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
            c.email.toLowerCase().includes(mentionQuery.toLowerCase()),
          )
          .slice(0, 8);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const wrapperRef       = useRef<HTMLDivElement>(null);
  // Height of the whole input wrapper — used to position the popup above it
  const [wrapperHeight, setWrapperHeight] = useState(0);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const obs = new ResizeObserver(entries => {
      const h = entries[0]?.contentRect.height ?? 0;
      setWrapperHeight(h);
    });
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, []);

  // Reset active index whenever the filtered list changes
  useEffect(() => {
    setMentionActiveIdx(0);
  }, [mentionQuery]);

  // ── mention insertion ────────────────────────────────────────────────

  const insertMention = useCallback(
    (candidate: MentionCandidate) => {
      if (mentionQuery === null) return;

      const handle = candidate.name.replace(/\s+/g, '');  // e.g. "JohnDoe"
      const before = content.slice(0, mentionAtIndex);     // text before the @
      const after  = content.slice(mentionAtIndex + 1 + mentionQuery.length); // text after query

      // Insert "@Name " (trailing space so user can keep typing)
      const newContent = `${before}@${handle} ${after}`;
      setContent(newContent);
      setMentionQuery(null);

      // Move cursor to just after the inserted mention + space
      const newCursorPos = mentionAtIndex + handle.length + 2; // @ + handle + space
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (ta) {
          ta.focus();
          ta.setSelectionRange(newCursorPos, newCursorPos);
        }
      });
    },
    [content, mentionAtIndex, mentionQuery],
  );

  // ── text change ──────────────────────────────────────────────────────

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val    = e.target.value;
    const cursor = e.target.selectionStart ?? val.length;
    setContent(val);

    // Auto-resize textarea
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`;
    }

    // Typing indicator
    sendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTyping(false), 2000);

    // @mention detection
    const token = getActiveMentionToken(val, cursor);
    if (token) {
      setMentionQuery(token.query);
      setMentionAtIndex(token.atIndex);
    } else {
      setMentionQuery(null);
    }
  };

  // ── keyboard handling ────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If popup is open, intercept navigation keys
    if (mentionQuery !== null && filteredCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionActiveIdx(i => (i + 1) % filteredCandidates.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionActiveIdx(i => (i - 1 + filteredCandidates.length) % filteredCandidates.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const chosen = filteredCandidates[mentionActiveIdx];
        if (chosen) insertMention(chosen);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    // Normal Enter → send
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Track cursor movement (arrow keys, click) to re-evaluate active token
  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const cursor = ta.selectionStart ?? 0;
    const token  = getActiveMentionToken(ta.value, cursor);
    if (token) {
      setMentionQuery(token.query);
      setMentionAtIndex(token.atIndex);
    } else {
      setMentionQuery(null);
    }
  };

  // ── send ─────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!content.trim() && attachments.length === 0) return;
    onSendMessage(content.trim(), attachments);
    setContent('');
    setAttachments([]);
    setShowEmojiPicker(false);
    setMentionQuery(null);
    sendTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    const ta = textareaRef.current;
    if (ta) ta.style.height = 'auto';
  };

  // ── file attachment ───────────────────────────────────────────────────

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachments(prev => [
      ...prev,
      {
        filename: file.name,
        url: URL.createObjectURL(file),
        type: file.type || 'application/octet-stream',
        size: file.size,
      },
    ]);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const removeAttachment = (idx: number) =>
    setAttachments(prev => prev.filter((_, i) => i !== idx));

  const insertEmoji = (emoji: string) => {
    setContent(prev => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  // ── render ────────────────────────────────────────────────────────────

  const popupOpen = mentionQuery !== null && filteredCandidates.length > 0;

  return (
    <div ref={wrapperRef} className="relative px-3 pb-3 pt-0 bg-[#09090b] border-t border-[#1f1f23]">

      {/* ── @mention popup (renders above the input) ── */}
      {popupOpen && (
        <MentionPopup
          candidates={filteredCandidates}
          activeIndex={mentionActiveIdx}
          onSelect={insertMention}
          onClose={() => setMentionQuery(null)}
          bottomOffset={wrapperHeight + 4}
        />
      )}

      {/* ── Emoji picker ────────────────────────────────── */}
      {showEmojiPicker && (
        <div className="absolute left-4 bottom-full mb-1 bg-[#0c0c0e] border border-[#27272a]
          rounded-xl p-2 shadow-2xl flex items-center gap-1 z-30
          animate-in fade-in zoom-in-95 duration-100">
          {EMOJI_LIST.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => insertEmoji(emoji)}
              className="hover:bg-[#1f1f23] p-1.5 rounded-lg text-base
                transition-transform hover:scale-125 leading-none"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* ── Staged attachments ─────────────────────────── */}
      {attachments.length > 0 && (
        <div className="pt-2 pb-1 flex flex-wrap gap-2">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 bg-[#141417] border border-[#27272a]
                text-xs text-[#a78bfa] px-2.5 py-1 rounded-md"
            >
              <Paperclip className="w-3 h-3 text-[#71717a]" />
              <span className="truncate max-w-[12rem]">{att.filename}</span>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="text-[#71717a] hover:text-[#ef4444] p-0.5 rounded transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Input row ──────────────────────────────────── */}
      <div className="flex items-end gap-1.5 bg-[#0c0c0e] border border-[#1f1f23]
        focus-within:border-[#7c3aed] rounded-xl p-2 transition-colors mt-2">

        {/* File attach */}
        <input
          type="file"
          id="chat-file-upload"
          className="hidden"
          onChange={handleFileUpload}
        />
        <label
          htmlFor="chat-file-upload"
          className="p-1.5 text-[#71717a] hover:text-[#fafafa] hover:bg-[#18181b]
            rounded-lg cursor-pointer transition-colors flex-shrink-0"
          title="Attach file"
        >
          <Paperclip className="w-4 h-4" />
        </label>

        {/* Emoji */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(v => !v)}
          className="p-1.5 text-[#71717a] hover:text-[#fafafa] hover:bg-[#18181b]
            rounded-lg transition-colors flex-shrink-0"
          title="Add emoji"
        >
          <Smile className="w-4 h-4" />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onSelect={handleSelect}
          rows={1}
          placeholder={`Message #${channelName}… (@ to mention)`}
          className="flex-1 bg-transparent text-[13px] text-[#fafafa]
            placeholder-[#3f3f46] focus:outline-none resize-none py-1
            leading-relaxed max-h-32"
        />

        {/* Send */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!content.trim() && attachments.length === 0}
          className="p-1.5 bg-[#7c3aed] hover:bg-[#6d28d9]
            disabled:opacity-30 disabled:cursor-not-allowed
            text-white rounded-lg transition-colors flex-shrink-0"
          title="Send (Enter)"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Mention hint when @ is active but no results */}
      {mentionQuery !== null && filteredCandidates.length === 0 && mentionQuery.length > 0 && (
        <p className="text-[10px] text-[#52525b] mt-1 px-1">
          No members match <span className="text-[#a78bfa]">@{mentionQuery}</span>
        </p>
      )}
    </div>
  );
}
