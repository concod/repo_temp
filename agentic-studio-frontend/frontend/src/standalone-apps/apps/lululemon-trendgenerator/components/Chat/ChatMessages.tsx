import React, { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../store';
import { MessageBubble } from './MessageBubble.tsx';
import { TypingIndicator } from './TypingIndicator.tsx';

export const ChatMessages: React.FC = () => {
  const { messages, isTyping } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  return (
    <div className="lululemon-messages">
      <AnimatePresence mode="popLayout">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
          />
        ))}
        
        {isTyping && (
          <TypingIndicator key="typing-indicator" />
        )}
      </AnimatePresence>
      
      <div ref={messagesEndRef} />
    </div>
  );
};


