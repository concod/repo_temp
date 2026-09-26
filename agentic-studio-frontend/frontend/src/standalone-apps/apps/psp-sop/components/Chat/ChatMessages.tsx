import React, { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../store';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';

interface ChatMessagesProps {
  onSuggestionClick: (suggestion: string) => void;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ onSuggestionClick }) => {
  const { messages, isTyping } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Find the last bot message index
  const lastBotMessageIndex = messages.map((msg, index) => ({ msg, index }))
    .filter(({ msg }) => !msg.isUser)
    .pop()?.index ?? -1;

  return (
    <div className="psp-sop-messages">
      <AnimatePresence mode="popLayout">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            onSuggestionClick={onSuggestionClick}
            isLastBotMessage={!message.isUser && index === lastBotMessageIndex}
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
