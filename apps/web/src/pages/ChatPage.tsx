import { getAssetUrl, getSocketUrl } from '../api/client';
import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import NewConversationModal from '../components/chat/NewConversationModal';

const ChatPage = () => {
  const { user } = useAuth();
  const { t, isRtl } = useLanguage();
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
    <div className="flex h-[calc(100vh-8rem)] min-h-[500px] bg-white/50 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/20 relative animate-fadeIn">
      {/* Sidebar - hidden on mobile when active conversation is open */}
      <div className={`${activeConversation ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 ${isRtl ? 'border-l' : 'border-r'} border-gray-200/50 flex-col bg-gray-50/50 h-full`}>
        <div className="p-4 border-b border-gray-200/50 flex justify-between items-center bg-white/40">
          <h2 className="text-xl font-bold text-gray-800">
            {isRtl ? 'المحادثات' : 'Messages'}
          </h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors shadow-md"
            title={isRtl ? 'محادثة جديدة' : 'New Conversation'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              {isRtl ? 'لا توجد محادثات سابقة' : 'No conversations yet.'}
            </div>
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
                    <h3 className="font-semibold text-gray-800 truncate">{conv.title || (isRtl ? 'مستخدم' : 'User')}</h3>
                    {conv.lastMessage && (
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-1" dir="ltr">
                        {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`} dir="auto">
                    {conv.lastMessage?.content || (isRtl ? 'بدأ محادثة' : 'Started a conversation')}
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
                <svg className={`w-6 h-6 ${isRtl ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <h3 className="font-semibold text-gray-800 truncate">{activeConvDetails?.title || (isRtl ? 'مستخدم' : 'User')}</h3>
                {isPartnerTyping && <p className="text-xs text-blue-500 font-medium animate-pulse">{isRtl ? 'جاري الكتابة...' : 'Typing...'}</p>}
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
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" dir="auto">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${isRtl ? 'text-left' : 'text-right'} ${isMe ? 'text-blue-100' : 'text-gray-400'}`} dir="ltr">
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
                  placeholder={t('chat_type_message')}
                  className="flex-1 rounded-full px-4 sm:px-5 py-2.5 sm:py-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-inner bg-white/80 text-sm text-gray-900"
                  dir="auto"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-full px-4 sm:px-6 py-2.5 sm:py-2 transition-all font-medium shadow-md flex items-center gap-1.5 text-sm flex-shrink-0"
                >
                  <span className="hidden sm:inline">{t('chat_send')}</span>
                  <svg className={`w-4 h-4 transform ${isRtl ? '-rotate-90' : 'rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden bg-slate-950/70">
            {/* Ambient Background Lights */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* COOL WOODEN PLANK BOARD WITH NAILS & X-MARK */}
            <div className="relative max-w-lg w-full p-8 sm:p-10 rounded-2xl shadow-2xl border-4 border-amber-900/80 bg-gradient-to-b from-amber-900/90 via-amber-950 to-stone-950 space-y-6 text-amber-100 transform hover:scale-[1.01] transition-transform">
              
              {/* Four Corner Metallic Nails */}
              <div className="absolute top-3 left-3 w-4 h-4 rounded-full bg-gradient-to-br from-slate-300 via-slate-500 to-slate-800 border border-slate-900 shadow-md flex items-center justify-center">
                <div className="w-1.5 h-0.5 bg-slate-900 rotate-45" />
              </div>
              <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-gradient-to-br from-slate-300 via-slate-500 to-slate-800 border border-slate-900 shadow-md flex items-center justify-center">
                <div className="w-1.5 h-0.5 bg-slate-900 -rotate-45" />
              </div>
              <div className="absolute bottom-3 left-3 w-4 h-4 rounded-full bg-gradient-to-br from-slate-300 via-slate-500 to-slate-800 border border-slate-900 shadow-md flex items-center justify-center">
                <div className="w-1.5 h-0.5 bg-slate-900 -rotate-45" />
              </div>
              <div className="absolute bottom-3 right-3 w-4 h-4 rounded-full bg-gradient-to-br from-slate-300 via-slate-500 to-slate-800 border border-slate-900 shadow-md flex items-center justify-center">
                <div className="w-1.5 h-0.5 bg-slate-900 rotate-45" />
              </div>

              {/* Wooden X-Mark Crossbars Background Effect */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl opacity-15">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-12 bg-amber-800 border-t-2 border-b-2 border-amber-600 rotate-45" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-12 bg-amber-800 border-t-2 border-b-2 border-amber-600 -rotate-45" />
              </div>

              {/* Yellow/Black Caution Stripes Top & Bottom Bar */}
              <div className="h-3 w-full bg-[repeating-linear-gradient(45deg,#eab308,#eab308_15px,#000_15px,#000_30px)] rounded-md border border-amber-600/50 shadow-inner" />

              {/* Board Header Icon */}
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-900/60 border-2 border-amber-600/60 flex items-center justify-center text-3xl shadow-xl text-amber-300 animate-pulse">
                🚧
              </div>

              {/* Wooden Board Typography */}
              <div className="space-y-2 relative z-10">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-300 tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  UNDER CONSTRUCTION
                </h2>
                <h3 className="text-lg font-bold text-amber-200 drop-shadow-md">
                  {isRtl ? 'قيد الإنشاء والتطوير 🛠️' : 'Under Active Development 🛠️'}
                </h3>
                <p className="text-xs text-amber-200/80 max-w-sm mx-auto leading-relaxed pt-2">
                  {isRtl
                    ? 'نعتذر، ميزة المحادثات والدردشة المباشرة قيد الصيانة والتطوير الفني ولن تكون متاحة حالياً حتى الانتهاء من التحديثات.'
                    : 'The real-time messaging platform is currently under active construction and technical refinement.'}
                </p>
              </div>

              {/* Yellow/Black Caution Stripes Bottom Bar */}
              <div className="h-3 w-full bg-[repeating-linear-gradient(45deg,#eab308,#eab308_15px,#000_15px,#000_30px)] rounded-md border border-amber-600/50 shadow-inner" />
            </div>
          </div>
        )}
      </div>

      {isModalOpen && <NewConversationModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};

export default ChatPage;
