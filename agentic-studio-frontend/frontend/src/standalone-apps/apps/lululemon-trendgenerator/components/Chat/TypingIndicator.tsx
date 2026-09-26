import React from 'react';
import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  messages?: string[];
}

const defaultMessages = [
  'Fetching the best answer for you…',
  'Gathering the info you need…',
  'Almost ready — making sure it\'s accurate.'
];

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  messages = defaultMessages 
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = React.useState(0);

  React.useEffect(() => {
    if (messages.length <= 1) return;

    const timer1 = setTimeout(() => {
      setCurrentMessageIndex(1);
    }, 3000);

    const timer2 = setTimeout(() => {
      setCurrentMessageIndex(2);
    }, 8000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [messages.length]);

  return (
    <motion.div
      className="processing-indicator"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
    >
      <div className="processing-avatar">
        <div className="avatar-icon">
          <i className="fas fa-robot"></i>
        </div>
      </div>
      <div className="processing-content">
        <div className="spinner" />
        <div className="processing-text">
          <motion.div
            className="processing-main"
            key={currentMessageIndex}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {messages[currentMessageIndex] || messages[0]}
          </motion.div>
          <div className="processing-sub">
            Please wait a moment...
          </div>
        </div>
      </div>
    </motion.div>
  );
};


