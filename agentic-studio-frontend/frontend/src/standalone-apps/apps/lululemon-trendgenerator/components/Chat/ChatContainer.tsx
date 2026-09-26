import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useChatStore, useThemeStore } from '../../store';
import { useChat } from '../../hooks/useChat';
import { WelcomeScreen } from './WelcomeScreen.tsx';
import { ChatMessages } from './ChatMessages.tsx';
import { ChatInput } from '../Input/ChatInput.tsx';

export const ChatContainer: React.FC = () => {
  const { messages, clearMessages } = useChatStore();
  const { theme, toggleTheme } = useThemeStore();
  const { sendMessage } = useChat();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const hasMessages = messages.length > 0;

  const handleResetChat = () => {
    clearMessages();
    setShowDropdown(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  if (!hasMessages) {
    return (
      <div className="lululemon-container">
        <div className="lululemon-top-avatar">
          <motion.button
            className="header-button"
            onClick={toggleTheme}
            title="Toggle Theme"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <motion.i
              className={theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'}
              key={theme}
              initial={{ rotate: -180, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          </motion.button>

          {/* Simple dropdown for actions */}
          <div className="avatar-container" ref={dropdownRef}>
            <motion.button
              className="header-button avatar-button"
              title="Actions"
              onClick={() => setShowDropdown(!showDropdown)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <i className="fas fa-ellipsis-h"></i>
            </motion.button>

            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  className="avatar-dropdown"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="dropdown-arrow"></div>
                  <div className="dropdown-content">
                    <div className="dropdown-item logout-item" onClick={handleResetChat}>
                      <i className="fas fa-redo"></i>
                      <span>Reset chat</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="lululemon-main">
          <WelcomeScreen onSendMessage={sendMessage} />
        </div>
      </div>
    );
  }

  return (
    <div className="lululemon-chat-layout">
      <div className="lululemon-sidenav">
        <div className="sidenav-content">
          <div className="sidenav-items">
            <motion.button
              className="sidenav-button"
              onClick={handleResetChat}
              title="Reset Chat"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <i className="fas fa-redo"></i>
            </motion.button>
            <motion.button
              className="sidenav-button"
              onClick={toggleTheme}
              title="Toggle Theme"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.i
                className={theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'}
                key={theme}
                initial={{ rotate: -180, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </div>
        </div>
      </div>

      <div className="lululemon-main-content">
        <div className="lululemon-chat-header">
          <div className="chat-header-title">
            <h1>Lululemon — Trend Generator</h1>
          </div>
        </div>

        <div className="lululemon-chat-area">
          <ChatMessages />
          <ChatInput onSendMessage={sendMessage} />
        </div>
      </div>
    </div>
  );
};


