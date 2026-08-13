export type ChannelType = 'GENERAL' | 'TEAM' | 'PROJECT' | 'CUSTOM';

/** Role a user holds specifically within a channel (separate from workspace role) */
export type ChannelRole = 'ADMIN' | 'LEADER' | 'MEMBER';

export interface ChatAttachment {
  url: string;
  filename: string;
  type: string; // e.g. "image/png", "application/pdf"
  size: number;
}

export interface MessageReactionDto {
  id: string;
  emoji: string;
  userId: string;
  userName?: string;
}

export interface ChatMessageDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  channelId: string;
  senderId: string;
  parentId?: string | null;
  content: string;
  attachments?: ChatAttachment[];
  isPinned: boolean;
  isEdited: boolean;
  sender: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  reactions?: MessageReactionDto[];
  replyCount?: number;
}

/** A member of a specific channel with their channel-level role */
export interface ChannelMemberDto {
  id: string;
  userId: string;
  channelId: string;
  role: ChannelRole;
  lastReadAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface ChannelDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  createdById: string;
  teamId?: string | null;
  projectId?: string | null;
  name: string;
  description?: string | null;
  type: ChannelType;
  isArchived: boolean;
  team?: {
    id: string;
    name: string;
  } | null;
  project?: {
    id: string;
    name: string;
    identifier: string;
  } | null;
  membersCount?: number;
  unreadCount?: number;
  lastMessage?: ChatMessageDto | null;
  /** The current user's channel-level role (resolved server-side) */
  currentUserRole?: ChannelRole | null;
}

// WebSocket Event Types
export enum WsEventType {
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  NEW_MESSAGE = 'new_message',
  DELETE_MESSAGE = 'delete_message',
  PIN_TOGGLE = 'pin_toggle',
  REACTION_TOGGLE = 'reaction_toggle',
  TYPING_START = 'typing_start',
  TYPING_STOP = 'typing_stop',
  PRESENCE = 'presence',
  MEMBER_ROLE_UPDATED = 'member_role_updated',
  ERROR = 'error',
}

export interface WsMessagePayload {
  event: WsEventType;
  channelId?: string;
  data?: any;
}
