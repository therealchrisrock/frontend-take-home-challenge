"use client";

import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import type { ChatMessage, ThemeSettings } from "./types";

interface ChatMessagesProps {
  messages: ChatMessage[];
  currentUserId: string;
  theme: ThemeSettings['theme'];
  fontSize: ThemeSettings['fontSize'];
}

export function ChatMessages({ messages, currentUserId, theme, fontSize }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getFontSize = () => {
    switch (fontSize) {
      case 'small': return 'text-xs';
      case 'large': return 'text-sm';
      default: return 'text-xs';
    }
  };

  const getThemeClasses = () => {
    return theme === 'dark' 
      ? 'text-gray-200 bg-gray-800/30' 
      : 'text-gray-800 bg-gray-50/30';
  };

  const getMessageBubbleClasses = (isOwnMessage: boolean) => {
    if (theme === 'dark') {
      return isOwnMessage 
        ? 'bg-blue-600 text-white' 
        : 'bg-gray-700 text-gray-100';
    }
    return isOwnMessage 
      ? 'bg-blue-500 text-white' 
      : 'bg-gray-200 text-gray-800';
  };

  return (
    <div className={`h-64 overflow-y-auto p-3 space-y-2 ${getThemeClasses()}`}>
      {messages.map((message, index) => {
        const isOwnMessage = message.senderId === currentUserId;
        const isSystem = message.senderId === 'system';
        const showAvatar = index === 0 || messages[index - 1]?.senderId !== message.senderId;
        
        if (isSystem) {
          return (
            <div key={message.id} className="text-center">
              <span className={`
                text-xs opacity-75 px-2 py-1 rounded
                ${theme === 'dark' ? 'text-gray-400 bg-gray-800/50' : 'text-gray-600 bg-gray-100'}
              `}>
                {message.content}
              </span>
            </div>
          );
        }

        return (
          <div key={message.id} className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
            {showAvatar && !isOwnMessage && (
              <Avatar className="h-6 w-6 mt-1">
                <AvatarImage src={`/avatars/${message.senderId}.jpg`} />
                <AvatarFallback className="text-xs">
                  {message.senderName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            {!showAvatar && !isOwnMessage && <div className="w-6" />}
            
            <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[80%]`}>
              {showAvatar && (
                <div className="flex items-center gap-2 mb-1">
                  {!isOwnMessage && (
                    <span className={`
                      text-xs font-medium
                      ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}
                    `}>
                      {message.senderName}
                    </span>
                  )}
                  <span className={`
                    text-xs opacity-60
                    ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
                  `}>
                    {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                  </span>
                </div>
              )}
              
              <div className={`
                px-3 py-2 rounded-lg max-w-full break-words
                ${getFontSize()}
                ${getMessageBubbleClasses(isOwnMessage)}
                ${isOwnMessage ? 'rounded-br-sm' : 'rounded-bl-sm'}
              `}>
                {message.content}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}