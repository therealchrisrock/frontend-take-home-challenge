export interface Friend {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
}

export interface FriendRequest {
  id: string;
  sender: Friend;
}

export interface BlockedUser {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
}

export interface Message {
  id: string;
  content: string;
  createdAt: Date;
  senderId: string;
  receiverId: string;
  read: boolean;
  sender: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  };
  receiver: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  };
}

export interface Conversation {
  userId: string;
  user: Friend;
  lastMessage: Message;
  unreadCount: number;
}

export interface SocialPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export type SocialTab = 'friends' | 'messages';