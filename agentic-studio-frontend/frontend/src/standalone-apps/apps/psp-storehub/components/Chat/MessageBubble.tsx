import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import type { Message } from '../../types/chat.types';
import { TypingAnimation } from '../Utils/TypingAnimation';
import { MarkdownRenderer } from '../../utils/markdownRenderer';
import avatarIcon from "../../assets/welcome-avatar.svg"

interface MessageBubbleProps {
  message: Message;
  isLastBotMessage?: boolean;
}


export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
}) => {
  // Sanitize HTML content for bot messages (similar to AgentChatInterface)
  const sanitizedHtml = useMemo(() => {
    if (!message.htmlContent) return '';
    
    // Process any remaining markdown syntax in the HTML
    let processedHtml = message.htmlContent;
    
    // Convert markdown headers that weren't converted
    processedHtml = processedHtml.replace(/### \*\*(.*?)\*\*/g, '<h3><strong>$1</strong></h3>');
    processedHtml = processedHtml.replace(/### (.*?)(<br>|$)/g, '<h3>$1</h3>$2');
    processedHtml = processedHtml.replace(/## \*\*(.*?)\*\*/g, '<h2><strong>$1</strong></h2>');
    processedHtml = processedHtml.replace(/## (.*?)(<br>|$)/g, '<h2>$1</h2>$2');
    processedHtml = processedHtml.replace(/# \*\*(.*?)\*\*/g, '<h1><strong>$1</strong></h1>');
    processedHtml = processedHtml.replace(/# (.*?)(<br>|$)/g, '<h1>$1</h1>$2');
    
    // Convert remaining bold text
    processedHtml = processedHtml.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert remaining italic text
    processedHtml = processedHtml.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert bullet points that use • to proper list items
    processedHtml = processedHtml.replace(/((?:^|\n)• .*(?:\n• .*)*)/gm, (match) => {
      const items = match.split(/\n?• /).filter(item => item.trim());
      const listItems = items.map(item => `<li>${item.trim()}</li>`).join('');
      return `<ul>${listItems}</ul>`;
    });
    
    // Clean up any double line breaks
    processedHtml = processedHtml.replace(/<br>\s*<br>/g, '<br>');
    
    // Sanitize with DOMPurify (same config as AgentChatInterface)
    return DOMPurify.sanitize(processedHtml, {
      ALLOWED_TAGS: [
        'div', 'p', 'br', 'a', 'strong', 'em', 'b', 'i', 'u', 
        'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'pre', 'code', 'blockquote', 'span', 'table', 'thead', 
        'tbody', 'tr', 'td', 'th', 'hr', 'img'
      ],
      ALLOWED_ATTR: [
        'href', 'target', 'rel', 'style', 'class', 'id', 'border',
        'cellpadding', 'cellspacing', 'width', 'height', 'align',
        'src', 'alt', 'onerror'
      ]
    });
  }, [message.htmlContent]);

  return (
    <motion.div
      className={`psp-storehub-message ${message.isUser ? 'user-message' : 'bot-message'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {
        message.isUser ? <></> : 
        <div className="message-avatar">
          <div className="avatar-icon">
            <img src={avatarIcon} alt="avatar" />
          </div>
      </div>
      }
      
      
      <div className="message-content">
        {/* Response timing */}
        {!message.isUser && message.timing && (
          <motion.div
            className="response-timing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <i className="fas fa-clock" style={{ marginRight: '4px', fontSize: '10px' }}></i>
            Response generated in {message.timing}
          </motion.div>
        )}

        <div className="message-text">
          {message.isUser ? (
            // User messages - show immediately
            <span dangerouslySetInnerHTML={{ __html: (message.text || '').replace(/\n/g, '<br>') }} />
          ) : message.isTyping ? (
            // Bot messages with typing animation (only for text, not HTML)
            message.htmlContent ? (
              // For HTML content during typing, show sanitized HTML directly
              <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
            ) : (
              <TypingAnimation text={message.text || ''} speed={500} className="markdown-content" />
            )
          ) : (
            // Bot messages without typing (e.g., from history)
            message.htmlContent ? (
              // Render HTML content with sanitization (preferred)
              <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
            ) : (
              // Fallback to markdown/text rendering
              <MarkdownRenderer content={message.text || ''} />
            )
          )}
        </div>

        <div className="message-time">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  );
};
