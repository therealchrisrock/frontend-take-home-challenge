export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  type: "general" | "dm";
  channelId?: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  type: "general" | "dm";
  participantId?: string; // For DM channels
  participantName?: string; // For DM channels
  unreadCount: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "friend_request" | "message" | "system" | "game_invite";
  timestamp: Date;
  read: boolean;
  actionData?: { userId?: string; gameId?: string };
}

export interface ThemeSettings {
  theme: "light" | "dark" | "system";
  chatOpacity: number;
  fontSize: "small" | "medium" | "large";
  soundEnabled: boolean;
}

export interface FloatingChatProps {
  initialPosition?: { x: number; y: number };
  defaultChannel?: string;
}
