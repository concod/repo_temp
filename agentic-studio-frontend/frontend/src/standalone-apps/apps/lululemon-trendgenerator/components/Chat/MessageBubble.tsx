import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Message } from '../../types/chat.types';
import { SourceReferences } from '../UI/SourceReferences.tsx';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [showExtras] = useState(true);
  const [showTiming] = useState(true);

  return (
    <motion.div
      className={`lululemon-message ${message.isUser ? 'user-message' : 'bot-message'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="message-avatar">
        <div className="avatar-icon">
          <i className={message.isUser ? 'fas fa-user' : 'fas fa-robot'}></i>
        </div>
      </div>
      
      <div className="message-content">
        {false && !message.isUser && message.timing && (
          <motion.div
            className="response-timing"
            initial={{ opacity: 0 }}
            animate={{ opacity: showTiming ? 1 : 0 }}
            transition={{ duration: 0.5 }}
          >
            <i className="fas fa-clock" style={{ marginRight: '4px', fontSize: '10px' }}></i>
            Response generated in {message.timing}
          </motion.div>
        )}

        <div className="message-text">
          {message.isUser ? (
            <span dangerouslySetInnerHTML={{ __html: (message.text || '').replace(/\n/g, '<br>') }} />
          ) : message.isTyping ? (
            <div 
              className="html-content"
              dangerouslySetInnerHTML={{ __html: message.text || '' }}
            />
          ) : (
            <div 
              className="html-content"
              dangerouslySetInnerHTML={{ __html: message.text || '' }}
            />
          )}
        </div>

        {!message.isUser && showExtras && message.sources && (
          <SourceReferences sources={message.sources} />
        )}

        <div className="message-time">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  );
};


