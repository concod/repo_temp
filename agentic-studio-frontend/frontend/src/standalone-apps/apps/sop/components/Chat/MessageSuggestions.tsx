import React from 'react';
import { motion } from 'framer-motion';

interface MessageSuggestionsProps {
  suggestions: string[];
  onSuggestionClick?: (suggestion: string) => void;
  isVisible?: boolean;
}

export const MessageSuggestions: React.FC<MessageSuggestionsProps> = ({
  suggestions,
  onSuggestionClick,
  isVisible = true
}) => {
  if (!suggestions.length) return null;

  return (
    <motion.div
      className={`message-suggestions ${!isVisible ? 'hidden' : ''}`}
      initial={{ opacity: 0, y: 5 }}
      animate={{ 
        opacity: isVisible ? 1 : 0, 
        y: isVisible ? 0 : -5,
        height: isVisible ? 'auto' : 0
      }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.3 }}
    >
      <div className="suggestions-title">
        Suggested Questions:
      </div>
      <div className="suggestions-buttons">
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={index}
            className="suggestion-button"
            onClick={() => onSuggestionClick?.(suggestion)}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 0.85, x: 0 }}
            whileHover={{ 
              opacity: 1, 
              y: -1,
              transition: { duration: 0.2 }
            }}
            transition={{ 
              duration: 0.3, 
              delay: 0.1 + (index * 0.1) 
            }}
          >
            <span className="suggestion-text">{suggestion}</span>
            <i className="fas fa-paper-plane suggestion-send-icon"></i>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};
