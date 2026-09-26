import React from 'react';
import { motion } from 'framer-motion';
import { ChatInput } from '../Input/ChatInput';
import lululemonLogo from '../../assets/Lululemon-symbol-1536x1273.png';

interface WelcomeScreenProps {
  onSendMessage: (message: string) => Promise<void>;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSendMessage }) => {
  return (
    <motion.div
      className="lululemon-welcome"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="welcome-content">
        <motion.div
          className="welcome-logo"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <img src={lululemonLogo} alt="Lululemon" />
        </motion.div>
        <motion.h1
          className="welcome-title"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Lululemon — Trend Report Generator
        </motion.h1>
        
        <motion.p
          className="welcome-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          Ask for product, customer and market trend insights.
        </motion.p>

        <motion.div
          className="welcome-chat-input"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <ChatInput onSendMessage={onSendMessage} />
        </motion.div>
      </div>
    </motion.div>
  );
};


