import React from "react";
import { motion } from "framer-motion";
import welcomeLogo from "../../assets/welcome-avatar.svg";
import { ChatInput } from "./Input/ChatInput";

interface WelcomeScreenProps {
  isVisible: boolean;
  onSendMessage: (message: string) => Promise<void>;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  isVisible,
  onSendMessage,
}) => {
  if (!isVisible) return null;

  return (
    <motion.div
      className="psp-storehub-welcome"
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
          <img src={welcomeLogo} alt="Pet Supplies Plus" />
        </motion.div>

        <motion.h1
          className="welcome-title"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          AI Powered Store Data Analyst
        </motion.h1>

        <motion.p
          className="welcome-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          Your AI assistant for understanding store data instantly
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
