import React from 'react';
import { motion } from 'framer-motion';
import pspLogo from '../../assets/psp.png';
import { ChatInput } from '../Input/ChatInput';
import { SAMPLE_QUESTIONS } from '../../constants';

interface WelcomeScreenProps {
  isVisible: boolean;
  onSendMessage: (message: string) => Promise<void>;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ isVisible, onSendMessage }) => {
  if (!isVisible) return null;

  return (
    <motion.div
      className="psp-sop-welcome"
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
          <img src={pspLogo} alt="Pet Supplies Plus" />
        </motion.div>

        <motion.h1
          className="welcome-title"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Pet Supplies Plus - AI Powered SOP Navigator
        </motion.h1>

        <motion.p
          className="welcome-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          Your AI assistant to help you navigate through informations in Standard Operating Procedures (SOPs).
        </motion.p>

        <motion.div
          className="welcome-sample-questions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="welcome-sample-questions-title">Suggestions to get you started &mdash; click any to ask</div>
          <div className="welcome-sample-questions-list">
            {SAMPLE_QUESTIONS.map((question, index) => (
              <motion.button
                key={question}
                type="button"
                className="welcome-sample-question"
                onClick={() => void onSendMessage(question)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.3, delay: 0.45 + index * 0.08 }}
              >
                <span className="welcome-sample-question-text">{question}</span>
                <i className="fas fa-arrow-right welcome-sample-question-icon"></i>
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="welcome-chat-input"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <ChatInput onSendMessage={onSendMessage} />
        </motion.div>
      </div>
    </motion.div>
  );
};
