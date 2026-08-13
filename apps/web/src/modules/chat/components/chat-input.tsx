import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, X } from 'lucide-react';
import { useChatStore } from '../../../app/stores/use-chat.store';

interface ChatInputProps {
  channelName: string;
  onSendMessage: (content: string, attachments?: any[]) => void;
}

const EMOJI_LIST = ['👍', '❤️', '🔥', '🚀', '👀', '🎉', '💯', '🙌', '💡', '✅'];

export function ChatInput({ channelName, onSendMessage }: ChatInputProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<{ filename: string; url: string; type: string; size: number }[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const sendTyping = useChatStore((state) => state.sendTyping);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Emit typing indicator
    sendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!content.trim() && attachments.length === 0) return;

    onSendMessage(content.trim(), attachments);
    setContent('');
    setAttachments([]);
    setShowEmojiPicker(false);
    sendTyping(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleSimulateFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file) return;

    const dummyUrl = URL.createObjectURL(file);

    setAttachments((prev) => [
      ...prev,
      {
        filename: file.name,
        url: dummyUrl,
        type: file.type || 'application/octet-stream',
        size: file.size,
      },
    ]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const insertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="p-3 bg-[#09090b] border-t border-[#1f1f23] relative">
      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute left-4 bottom-14 bg-[#0c0c0e] border border-[#1f1f23] rounded-lg p-2 shadow-2xl flex items-center space-x-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              onClick={() => insertEmoji(emoji)}
              className="hover:bg-[#1f1f23] p-1.5 rounded text-base transition-transform hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Staged Attachments Preview */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="flex items-center space-x-1.5 bg-[#141417] border border-[#27272a] text-xs text-[#a78bfa] px-2.5 py-1 rounded-md"
            >
              <Paperclip className="w-3 h-3 text-[#71717a]" />
              <span className="truncate max-w-xs">{att.filename}</span>
              <button
                onClick={() => removeAttachment(idx)}
                className="text-[#71717a] hover:text-[#ef4444] p-0.5 rounded transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Field Container */}
      <div className="flex items-end space-x-2 bg-[#0c0c0e] border border-[#1f1f23] focus-within:border-[#7c3aed] rounded-lg p-2 transition-colors">
        {/* Hidden File Input */}
        <input
          type="file"
          id="chat-file-upload"
          className="hidden"
          onChange={handleSimulateFileUpload}
        />

        <label
          htmlFor="chat-file-upload"
          className="p-1.5 text-[#71717a] hover:text-[#fafafa] hover:bg-[#18181b] rounded-md cursor-pointer transition-colors"
          title="Attach File"
        >
          <Paperclip className="w-4 h-4" />
        </label>

        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-1.5 text-[#71717a] hover:text-[#fafafa] hover:bg-[#18181b] rounded-md transition-colors"
          title="Add Emoji"
        >
          <Smile className="w-4 h-4" />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={`Message #${channelName}...`}
          className="flex-1 bg-transparent text-xs text-[#fafafa] placeholder-[#52525b] focus:outline-none resize-none py-1.5 max-h-32"
        />

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!content.trim() && attachments.length === 0}
          className="p-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-30 disabled:hover:bg-[#7c3aed] text-white rounded-md transition-colors"
          title="Send Message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
