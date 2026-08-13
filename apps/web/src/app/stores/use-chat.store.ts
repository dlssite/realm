import { API_BASE } from '@/lib/api';
import { create } from 'zustand';
import { ChannelDto, ChannelMemberDto, ChatMessageDto, WsEventType, WsMessagePayload } from '@realm/types';
import { useAuthStore } from './auth.store';

const API_V1 = `${API_BASE}/api/v1`;
const WS_BASE = API_BASE.replace(/^http/, 'ws') + '/api/v1/workspaces/ws';

interface ChatState {
  ws: WebSocket | null;
  isConnected: boolean;
  isConnecting: boolean;

  channels: ChannelDto[];
  activeChannelId: string | null;
  messages: Record<string, ChatMessageDto[]>;         // channelId → messages
  typingUsers: Record<string, { userId: string; userName: string }[]>; // channelId → list
  channelMembers: Record<string, ChannelMemberDto[]>; // channelId → members
  isLoadingChannels: boolean;
  isLoadingMessages: boolean;
  isLoadingMembers: boolean;

  // ── Actions ────────────────────────────────────────────────────────────────
  connectWs: () => void;
  disconnectWs: () => void;
  fetchChannels: () => Promise<void>;
  setActiveChannelId: (channelId: string) => void;
  fetchMessages: (channelId: string) => Promise<void>;
  sendMessage: (content: string, attachments?: any[]) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  togglePin: (messageId: string) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  createCustomChannel: (name: string, description?: string) => Promise<ChannelDto | null>;
  enableTeamChannel: (teamId: string) => Promise<ChannelDto | null>;
  enableProjectChannel: (projectId: string) => Promise<ChannelDto | null>;
  sendTyping: (isTyping: boolean) => void;

  // ── Channel management ─────────────────────────────────────────────────────
  fetchChannelMembers: (channelId: string) => Promise<void>;
  grantChannelAdmin: (channelId: string, targetUserId: string) => Promise<boolean>;
  revokeChannelAdmin: (channelId: string, targetUserId: string) => Promise<boolean>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  ws: null,
  isConnected: false,
  isConnecting: false,

  channels: [],
  activeChannelId: null,
  messages: {},
  typingUsers: {},
  channelMembers: {},
  isLoadingChannels: false,
  isLoadingMessages: false,
  isLoadingMembers: false,

  // ── WebSocket ──────────────────────────────────────────────────────────────

  connectWs: () => {
    const { token, workspace } = useAuthStore.getState();
    if (!token || get().ws) return;

    set({ isConnecting: true });

    const wsUrl = `${WS_BASE}?token=${encodeURIComponent(token)}&workspaceId=${encodeURIComponent(workspace?.id || '')}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      set({ ws: socket, isConnected: true, isConnecting: false });
      const activeId = get().activeChannelId;
      if (activeId) {
        socket.send(JSON.stringify({ event: WsEventType.SUBSCRIBE, channelId: activeId }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const payload: WsMessagePayload = JSON.parse(event.data);
        const { event: evt, channelId, data } = payload;

        if (!channelId) return;

        if (evt === WsEventType.NEW_MESSAGE && data) {
          const current = get().messages[channelId] || [];
          if (!current.some(m => m.id === data.id)) {
            set({ messages: { ...get().messages, [channelId]: [...current, data] } });
          }
        } else if (evt === WsEventType.DELETE_MESSAGE && data?.messageId) {
          const current = get().messages[channelId] || [];
          set({ messages: { ...get().messages, [channelId]: current.filter(m => m.id !== data.messageId) } });
        } else if (evt === WsEventType.PIN_TOGGLE && data?.messageId) {
          const current = get().messages[channelId] || [];
          set({
            messages: {
              ...get().messages,
              [channelId]: current.map(m => m.id === data.messageId ? { ...m, isPinned: data.isPinned } : m),
            },
          });
        } else if (evt === WsEventType.REACTION_TOGGLE && data?.messageId) {
          const current = get().messages[channelId] || [];
          set({
            messages: {
              ...get().messages,
              [channelId]: current.map(m => m.id === data.messageId ? { ...m, reactions: data.reactions } : m),
            },
          });
        } else if (evt === WsEventType.TYPING_START && data?.userId) {
          const current = get().typingUsers[channelId] || [];
          if (!current.some(u => u.userId === data.userId)) {
            set({
              typingUsers: {
                ...get().typingUsers,
                [channelId]: [...current, { userId: data.userId, userName: data.userName }],
              },
            });
          }
        } else if (evt === WsEventType.TYPING_STOP && data?.userId) {
          const current = get().typingUsers[channelId] || [];
          set({
            typingUsers: {
              ...get().typingUsers,
              [channelId]: current.filter(u => u.userId !== data.userId),
            },
          });
        } else if (evt === WsEventType.MEMBER_ROLE_UPDATED && data?.userId) {
          // Update the in-memory channelMembers list if loaded
          const currentMembers = get().channelMembers[channelId];
          if (currentMembers) {
            set({
              channelMembers: {
                ...get().channelMembers,
                [channelId]: currentMembers.map(m =>
                  m.userId === data.userId ? { ...m, role: data.role } : m
                ),
              },
            });
          }
          // Also refresh channels list so currentUserRole is up-to-date for the current user
          const { user } = useAuthStore.getState();
          if (user && data.userId === user.id) {
            get().fetchChannels();
          }
        }
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    socket.onclose = () => {
      set({ ws: null, isConnected: false, isConnecting: false });
    };

    socket.onerror = (err) => {
      console.error('Chat WebSocket Error', err);
    };
  },

  disconnectWs: () => {
    const ws = get().ws;
    if (ws) {
      ws.close();
      set({ ws: null, isConnected: false, isConnecting: false });
    }
  },

  // ── Channels ───────────────────────────────────────────────────────────────

  fetchChannels: async () => {
    const { token, workspace } = useAuthStore.getState();
    if (!token || !workspace) return;

    set({ isLoadingChannels: true });
    try {
      const res = await fetch(`${API_V1}/workspaces/${workspace.id}/channels`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const channels: ChannelDto[] = await res.json();
        set({ channels });

        if (!get().activeChannelId && channels.length > 0) {
          const general = channels.find(c => c.type === 'GENERAL') || channels[0];
          if (general) get().setActiveChannelId(general.id);
        }
      }
    } finally {
      set({ isLoadingChannels: false });
    }
  },

  setActiveChannelId: (channelId: string) => {
    const prevChannelId = get().activeChannelId;
    const ws = get().ws;

    if (prevChannelId && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event: WsEventType.UNSUBSCRIBE, channelId: prevChannelId }));
    }

    set({ activeChannelId: channelId });

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event: WsEventType.SUBSCRIBE, channelId }));
    }

    if (!get().messages[channelId]) {
      get().fetchMessages(channelId);
    }
    // Always (re)fetch channel members so @mention list is up-to-date
    get().fetchChannelMembers(channelId);
  },

  // ── Messages ───────────────────────────────────────────────────────────────

  fetchMessages: async (channelId: string) => {
    const { token, workspace } = useAuthStore.getState();
    if (!token || !workspace) return;

    set({ isLoadingMessages: true });
    try {
      const res = await fetch(`${API_V1}/workspaces/${workspace.id}/channels/${channelId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const msgs: ChatMessageDto[] = await res.json();
        set({ messages: { ...get().messages, [channelId]: msgs } });
      }
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  sendMessage: async (content: string, attachments = []) => {
    const { activeChannelId, ws, isConnected } = get();
    const { token, workspace } = useAuthStore.getState();
    if (!activeChannelId || !token || !workspace) return;

    if (ws && isConnected && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        event: WsEventType.NEW_MESSAGE,
        channelId: activeChannelId,
        data: { content, attachments },
      }));
    } else {
      const res = await fetch(`${API_V1}/workspaces/${workspace.id}/channels/${activeChannelId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content, attachments }),
      });
      if (res.ok) {
        const newMsg: ChatMessageDto = await res.json();
        const current = get().messages[activeChannelId] || [];
        set({ messages: { ...get().messages, [activeChannelId]: [...current, newMsg] } });
      }
    }
  },

  deleteMessage: async (messageId: string) => {
    const { activeChannelId } = get();
    const { token, workspace } = useAuthStore.getState();
    if (!activeChannelId || !token || !workspace) return;

    await fetch(`${API_V1}/workspaces/${workspace.id}/channels/${activeChannelId}/messages/${messageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  togglePin: async (messageId: string) => {
    const { activeChannelId } = get();
    const { token, workspace } = useAuthStore.getState();
    if (!activeChannelId || !token || !workspace) return;

    await fetch(`${API_V1}/workspaces/${workspace.id}/channels/${activeChannelId}/messages/${messageId}/pin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  toggleReaction: async (messageId: string, emoji: string) => {
    const { activeChannelId } = get();
    const { token, workspace } = useAuthStore.getState();
    if (!activeChannelId || !token || !workspace) return;

    await fetch(`${API_V1}/workspaces/${workspace.id}/channels/${activeChannelId}/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ emoji }),
    });
  },

  sendTyping: (isTyping: boolean) => {
    const { activeChannelId, ws, isConnected } = get();
    if (!activeChannelId || !ws || !isConnected || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({
      event: isTyping ? WsEventType.TYPING_START : WsEventType.TYPING_STOP,
      channelId: activeChannelId,
      data: {},
    }));
  },

  // ── Channel creation ───────────────────────────────────────────────────────

  createCustomChannel: async (name: string, description?: string) => {
    const { token, workspace } = useAuthStore.getState();
    if (!token || !workspace) return null;

    const res = await fetch(`${API_V1}/workspaces/${workspace.id}/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, description }),
    });
    if (res.ok) {
      const channel: ChannelDto = await res.json();
      await get().fetchChannels();
      get().setActiveChannelId(channel.id);
      return channel;
    }
    return null;
  },

  enableTeamChannel: async (teamId: string) => {
    const { token, workspace } = useAuthStore.getState();
    if (!token || !workspace) return null;

    const res = await fetch(`${API_V1}/workspaces/${workspace.id}/teams/${teamId}/channel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const channel: ChannelDto = await res.json();
      await get().fetchChannels();
      get().setActiveChannelId(channel.id);
      return channel;
    }
    return null;
  },

  enableProjectChannel: async (projectId: string) => {
    const { token, workspace } = useAuthStore.getState();
    if (!token || !workspace) return null;

    const res = await fetch(`${API_V1}/workspaces/${workspace.id}/projects/${projectId}/channel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const channel: ChannelDto = await res.json();
      await get().fetchChannels();
      get().setActiveChannelId(channel.id);
      return channel;
    }
    return null;
  },

  // ── Channel management ─────────────────────────────────────────────────────

  fetchChannelMembers: async (channelId: string) => {
    const { token, workspace } = useAuthStore.getState();
    if (!token || !workspace) return;

    set({ isLoadingMembers: true });
    try {
      const res = await fetch(`${API_V1}/workspaces/${workspace.id}/channels/${channelId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const members: ChannelMemberDto[] = await res.json();
        set({ channelMembers: { ...get().channelMembers, [channelId]: members } });
      }
    } finally {
      set({ isLoadingMembers: false });
    }
  },

  grantChannelAdmin: async (channelId: string, targetUserId: string) => {
    const { token, workspace } = useAuthStore.getState();
    if (!token || !workspace) return false;

    const res = await fetch(
      `${API_V1}/workspaces/${workspace.id}/channels/${channelId}/members/${targetUserId}/admin`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
    );

    if (res.ok) {
      // Refresh the members list for this channel
      await get().fetchChannelMembers(channelId);
      return true;
    }
    return false;
  },

  revokeChannelAdmin: async (channelId: string, targetUserId: string) => {
    const { token, workspace } = useAuthStore.getState();
    if (!token || !workspace) return false;

    const res = await fetch(
      `${API_V1}/workspaces/${workspace.id}/channels/${channelId}/members/${targetUserId}/admin`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
    );

    if (res.ok) {
      await get().fetchChannelMembers(channelId);
      return true;
    }
    return false;
  },
}));
