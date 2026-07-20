import { getAssetUrl, getSocketUrl } from '../api/client';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string; photoUrl: string | null };
}

interface Conversation {
  id: string;
  title: string | null;
  isGroup: boolean;
  photoUrl: string | null;
  customStatus: string | null;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  lastReadAt: string | null;
  updatedAt: string;
  partnerId: string | null;
}

interface ChatContextType {
  socket: Socket | null;
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  activeConversation: string | null;
  setActiveConversation: (id: string | null) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  sendMessage: (content: string) => void;
  startTyping: () => void;
  stopTyping: () => void;
  typingUsers: Record<string, string[]>; // conversationId -> userIds
  unreadTotal: number;
  fetchConversations: () => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const token = localStorage.getItem('hrms_token');
    if (!token) return;

    const newSocket = io(getSocketUrl('/chat'), {
      auth: { token },
      transports: ['websocket'],
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to chat namespace');
    });

    newSocket.on('new_message', (msg: ChatMessage) => {
      setMessages((prev) => {
        // Only append if it belongs to the active conversation OR if we are handling global state
        if (msg.conversationId === activeConversation) {
          return [...prev, msg];
        }
        return prev;
      });

      // Update conversations list with the new message
      setConversations((prev) => {
        const updated = [...prev];
        const idx = updated.findIndex((c) => c.id === msg.conversationId);
        if (idx !== -1) {
          updated[idx].lastMessage = msg;
          updated[idx].updatedAt = new Date().toISOString();
          if (msg.conversationId !== activeConversation && msg.senderId !== user.id) {
            updated[idx].unreadCount = (updated[idx].unreadCount || 0) + 1;
          }
          // Move to top
          const [moved] = updated.splice(idx, 1);
          updated.unshift(moved);
        }
        return updated;
      });
    });

    newSocket.on('conversation_updated', (data: { conversationId: string; lastMessage: ChatMessage }) => {
      // Used when a new conversation is created that we haven't fetched yet
      fetchConversations();
    });

    newSocket.on('user_typing', ({ conversationId, userId, isTyping }) => {
      setTypingUsers((prev) => {
        const users = prev[conversationId] || [];
        if (isTyping && !users.includes(userId)) {
          return { ...prev, [conversationId]: [...users, userId] };
        } else if (!isTyping) {
          return { ...prev, [conversationId]: users.filter((id) => id !== userId) };
        }
        return prev;
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user, activeConversation]);

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('hrms_token');
      const res = await fetch(getSocketUrl('/chat/conversations'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const markAsRead = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('hrms_token');
      await fetch(getSocketUrl(`/chat/conversations/${conversationId}/read`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const sendMessage = (content: string) => {
    if (socket && activeConversation) {
      socket.emit('send_message', { conversationId: activeConversation, content });
    }
  };

  const startTyping = () => {
    if (socket && activeConversation) {
      socket.emit('typing', { conversationId: activeConversation, isTyping: true });
    }
  };

  const stopTyping = () => {
    if (socket && activeConversation) {
      socket.emit('typing', { conversationId: activeConversation, isTyping: false });
    }
  };

  const unreadTotal = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <ChatContext.Provider
      value={{
        socket,
        conversations,
        setConversations,
        activeConversation,
        setActiveConversation,
        messages,
        setMessages,
        sendMessage,
        startTyping,
        stopTyping,
        typingUsers,
        unreadTotal,
        fetchConversations,
        markAsRead,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
