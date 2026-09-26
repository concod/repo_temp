import React from "react";
import { motion } from "framer-motion";
import iaLogo from "../../assets/ia-logo.svg";
import { ChatInput } from "../Input/ChatInput";

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
      className="psp-sop-welcome"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="welcome-content">
        <motion.div
          className="welcome-logo"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          whileHover={{ scale: 1.06, y: -4 }}
          whileTap={{ scale: 0.96 }}
        >
          <motion.img
            src={iaLogo}
            alt="SOP Navigator"
            animate={{ y: [0, -6, 0] }}
          />
        </motion.div>

        <motion.h1
          className="welcome-title"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          AI Powered SOP Navigator
        </motion.h1>

        <motion.p
          className="welcome-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          Your AI assistant to help you navigate through informations in
          Standard Operating Procedures (SOPs).
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
