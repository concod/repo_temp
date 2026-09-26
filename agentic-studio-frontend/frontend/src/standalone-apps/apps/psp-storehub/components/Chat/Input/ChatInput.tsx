import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useChatStore } from '../../../store';

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  hasMessages: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, hasMessages }) => {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { isWaitingForResponse } = useChatStore();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      if (hasMessages) {
        // Compact mode: fixed height, no auto-resize
        textareaRef.current.style.height = '36px';
      } else {
        // Full mode: auto-resize
        textareaRef.current.style.height = 'auto';
        const newHeight = Math.min(textareaRef.current.scrollHeight, 150);
        textareaRef.current.style.height = `${newHeight}px`;
      }
    }
  }, [inputValue, hasMessages]);

  const handleSubmit = async () => {
    const message = inputValue.trim();
    if (!message || isWaitingForResponse || isSubmitting) return;

    setIsSubmitting(true);
    setInputValue('');

    try {
      await onSendMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isDisabled = isWaitingForResponse || isSubmitting;

  return (
    <div className="psp-storehub-input-container">
      <div className={`psp-storehub-chat-input ${hasMessages ? 'compact-input' : ''}`}>
        <textarea
          ref={textareaRef}
          className="message-input"
          placeholder="Hi tell me about the store status"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isDisabled}
          rows={1}
          aria-label="Message input"
        />
        
        <motion.button
          className="send-button"
          onClick={handleSubmit}
          disabled={isDisabled || !inputValue.trim()}
          whileHover={!isDisabled ? { scale: 1.05 } : {}}
          whileTap={!isDisabled ? { scale: 0.95 } : {}}
          aria-label="Send message"
        >
          {isSubmitting ? (
            <div className="spinner" style={{ width: '16px', height: '16px' }} />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7.64453 5.5C7.68901 5.50002 7.72287 5.50916 7.75684 5.53223L7.79102 5.55957L12.4424 9.99512C12.4427 9.99823 12.4443 10.0022 12.4443 10.0068C12.4443 10.0107 12.4426 10.0138 12.4424 10.0166L7.77734 14.4531C7.74698 14.482 7.71378 14.5 7.64453 14.5C7.58462 14.5 7.54344 14.4844 7.49707 14.4404C7.45101 14.3966 7.44433 14.3682 7.44433 14.334C7.44438 14.3006 7.45097 14.2733 7.49707 14.2295L11.5566 10.3691L11.9375 10.0068L11.5566 9.64453L7.48242 5.77051C7.45629 5.74558 7.44434 5.72431 7.44434 5.67188C7.44434 5.62998 7.4537 5.6008 7.49707 5.55957C7.54344 5.51561 7.58462 5.5 7.64453 5.5Z" fill="#1F2B4D" stroke="white"/>
            </svg>
          )}
        </motion.button>
      </div>

      <div className="psp-storehub-copyright">
        A product of{' '}
        <a href="https://impact-agents.ai" target="_blank" rel="noopener noreferrer">
        Agentic Retail Automation Platform
        </a>
      </div>
    </div>
  );
};
