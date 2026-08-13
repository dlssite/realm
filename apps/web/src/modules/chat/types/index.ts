export type ChannelType = 'GENERAL' | 'TEAM' | 'PROJECT' | 'CUSTOM';

export interface MessageSender {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface MessageReaction {
  id: string;
  emoji: string;
  userId: string;
  userName: string;
}

export interface MessageAttachment {
  url: string;
  filename: string;
  type: string;
  size: number;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  parentId: string | null;
  content: string;
  attachments: MessageAttachment[];
  isPinned: boolean;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  sender: MessageSender;
  reactions: MessageReaction[];
}

export interface Channel {
  id: string;
  workspaceId: string;
  createdById: string;
  teamId: string | null;
  projectId: string | null;
  name: string;
  description: string | null;
  type: ChannelType;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  team?: { id: string; name: string } | null;
  project?: { id: string; name: string; identifier: string } | null;
  membersCount?: number;
  lastMessage?: Partial<ChatMessage> | null;
}

export interface CreateChannelPayload {
  name: string;
  description?: string;
}

export interface SendMessagePayload {
  content: string;
  attachments?: MessageAttachment[];
  parentId?: string;
}
