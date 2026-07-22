import { getAssetUrl, getSocketUrl } from '../api/client';
import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import NewConversationModal from '../components/chat/NewConversationModal';

const ChatPage = () => {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    sendMessage,
    startTyping,
    stopTyping,
    typingUsers,
    markAsRead,
  } = useChat();

  const [newMessage, setNewMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (activeConversation) {
      markAsRead(activeConversation);
    }
  }, [activeConversation, messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;

    sendMessage(newMessage);
    setNewMessage('');
    stopTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    startTyping();

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  };

  const activeConvDetails = conversations.find((c) => c.id === activeConversation);
  const isPartnerTyping = activeConversation && typingUsers[activeConversation]?.length > 0;

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[500px] bg-white/50 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/20 relative">
      {/* Sidebar - hidden on mobile when active conversation is open */}
      <div className={`${activeConversation ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r border-gray-200/50 flex-col bg-gray-50/50 h-full`}>
        <div className="p-4 border-b border-gray-200/50 flex justify-between items-center bg-white/40">
          <h2 className="text-xl font-bold text-gray-800">Messages</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors shadow-md"
            aria-label="New Conversation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No conversations yet.</div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setActiveConversation(conv.id)}
                className={`p-4 border-b border-gray-100/50 cursor-pointer transition-all duration-200 hover:bg-blue-50/50 flex items-center gap-3 ${
                  activeConversation === conv.id ? 'bg-blue-50/80 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="relative flex-shrink-0">
                  {conv.photoUrl ? (
                    <img src={getAssetUrl(conv.photoUrl)} alt="" className="w-12 h-12 rounded-full object-cover shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                      {conv.title?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  {conv.customStatus === 'online' && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-semibold text-gray-800 truncate">{conv.title || 'User'}</h3>
                    {conv.lastMessage && (
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-1">
                        {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                    {conv.lastMessage?.content || 'Started a conversation'}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold animate-pulse flex-shrink-0">
                    {conv.unreadCount}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area - hidden on mobile when no conversation is active */}
      <div className={`${!activeConversation ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-slate-50/30 h-full min-w-0`}>
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="p-4 bg-white/60 border-b border-gray-200/50 flex items-center gap-3 shadow-sm backdrop-blur-md z-10">
              {/* Mobile back button */}
              <button
                onClick={() => setActiveConversation(null)}
                className="md:hidden p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200/50 transition-colors"
                aria-label="Back to conversations"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {activeConvDetails?.photoUrl ? (
                <img src={getAssetUrl(activeConvDetails.photoUrl)} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  {activeConvDetails?.title?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-800 truncate">{activeConvDetails?.title || 'User'}</h3>
                {isPartnerTyping && <p className="text-xs text-blue-500 font-medium animate-pulse">Typing...</p>}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
              {messages.map((msg, index) => {
                const isMe = msg.senderId === user?.id;
                const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId !== msg.senderId);
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                    {!isMe && (
                      <div className="w-8 flex-shrink-0">
                        {showAvatar && (
                          msg.sender.photoUrl ? (
                            <img src={getAssetUrl(msg.sender.photoUrl)} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs text-white">
                              {msg.sender.name.charAt(0).toUpperCase()}
                            </div>
                          )
                        )}
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm ${
                        isMe
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-none'
                          : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-3 sm:p-4 bg-white/60 border-t border-gray-200/50 backdrop-blur-md">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full px-4 sm:px-5 py-2.5 sm:py-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-inner bg-white/80 text-sm"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-full px-4 sm:px-6 py-2.5 sm:py-2 transition-all font-medium shadow-md flex items-center gap-1.5 text-sm flex-shrink-0"
                >
                  <span className="hidden sm:inline">Send</span>
                  <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4 p-4 text-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center shadow-inner">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-base sm:text-lg font-medium text-gray-500">Select a conversation to start chatting</p>
          </div>
        )}
      </div>

      {isModalOpen && <NewConversationModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};

export default ChatPage;
