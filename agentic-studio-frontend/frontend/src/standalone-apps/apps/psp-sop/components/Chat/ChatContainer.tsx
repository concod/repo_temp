import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useChatStore, useThemeStore } from '../../store';
import { useAuthStore } from '../../store/authStore';
import { useChat } from '../../hooks/useChat';
import { WelcomeScreen } from './WelcomeScreen';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from '../Input/ChatInput';
import { LeftDrawer } from './LeftDrawer';
import pspLogo from '../../assets/psp.png';
import { PspSopService } from '../../services/PspSopService';

// Create service instance to access clearSessionId method
const pspSopService = new PspSopService();

export const ChatContainer: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    messages,
    clearMessages,
    sessions,
    selectedSessionId,
    sessionsError,
    loading,
    fetchSessions,
    selectSession,
    startNewSession,
    setActiveSessionId,
  } = useChatStore();
  const { theme, toggleTheme } = useThemeStore();
  const { logout, userEmail } = useAuthStore();
  const { sendMessage, isWaitingForResponse } = useChat();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLDivElement>(null);
  const hasLoadedSessionsRef = useRef(false);
  const hasInitializedSessionRef = useRef(false);

  const sessionIdFromUrl = searchParams.get('session_id');
  const hasMessages = messages.length > 0;

  // Fetch sessions on mount
  useEffect(() => {
    if (hasLoadedSessionsRef.current) return;
    hasLoadedSessionsRef.current = true;
    void fetchSessions();
  }, [fetchSessions]);

  // Initialize session from URL or start new one
  useEffect(() => {
    if (hasInitializedSessionRef.current) return;
    const targetSessionId = sessionIdFromUrl || selectedSessionId || startNewSession();

    if (!sessionIdFromUrl) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('session_id', targetSessionId);
      setSearchParams(nextParams, { replace: true });
    }

    setActiveSessionId(targetSessionId);
    if (sessionIdFromUrl) {
      void selectSession(targetSessionId);
    }
    hasInitializedSessionRef.current = true;
  }, [sessionIdFromUrl, selectedSessionId, searchParams, setSearchParams, startNewSession, setActiveSessionId, selectSession]);

  const handleSuggestionClick = (suggestion: string) => {
    if (isWaitingForResponse) return;
    sendMessage(suggestion);
  };

  const handleNewChat = () => {
    const newSessionId = startNewSession();
    pspSopService.clearSessionId();

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('session_id', newSessionId);
    setSearchParams(nextParams, { replace: true });
  };

  const handleLogout = () => {
    clearMessages();
    pspSopService.clearSessionId();
    logout();
    navigate('/apps/psp-sop/');
    setShowDropdown(false);
  };

  const handleResetChat = () => {
    handleNewChat();
    setShowDropdown(false);
    setShowHamburgerMenu(false);
  };

  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);
  const closeDrawer = () => setIsDrawerOpen(false);

  const handleToggleTheme = () => {
    toggleTheme();
    setShowHamburgerMenu(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (hamburgerRef.current && !hamburgerRef.current.contains(event.target as Node)) {
        setShowHamburgerMenu(false);
      }
    };

    if (showDropdown || showHamburgerMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, showHamburgerMenu]);

  if (!hasMessages) {
    // Welcome Screen Layout (original)
    return (
      <div className="psp-sop-container">
        {/* Mobile Header - Only visible on mobile/tablet */}
        <div className="psp-sop-mobile-header">
          <div className="mobile-header-left" ref={hamburgerRef}>
            <motion.button
              className="hamburger-button"
              onClick={() => setShowHamburgerMenu(!showHamburgerMenu)}
              whileTap={{ scale: 0.95 }}
            >
              <i className={showHamburgerMenu ? 'fas fa-times' : 'fas fa-bars'}></i>
            </motion.button>

            {/* Hamburger Menu Dropdown */}
            <AnimatePresence>
              {showHamburgerMenu && (
                <motion.div
                  className="hamburger-dropdown"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="hamburger-dropdown-content">
                    <div className="hamburger-item" onClick={() => { toggleDrawer(); setShowHamburgerMenu(false); }}>
                      <i className="fas fa-history"></i>
                      <span>History</span>
                    </div>
                    <div className="hamburger-item" onClick={handleResetChat}>
                      <i className="fas fa-plus"></i>
                      <span>New Chat</span>
                    </div>
                    <div className="hamburger-item" onClick={handleToggleTheme}>
                      <i className={theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'}></i>
                      <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mobile-header-title">
            <span className="mobile-header-title-text">Pet Supplies Plus</span>
          </div>

          <div className="mobile-header-right">
            <div className="avatar-container" ref={dropdownRef}>
              <motion.button
                className="header-button avatar-button"
                title="User Menu"
                onClick={() => setShowDropdown(!showDropdown)}
                whileTap={{ scale: 0.95 }}
              >
                <i className="fas fa-user"></i>
              </motion.button>

              {/* Dropdown Menu */}
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
                      {userEmail && (
                        <div className="dropdown-item user-email-item">
                          <i className="fas fa-envelope"></i>
                          <span>{userEmail}</span>
                        </div>
                      )}
                      <div className="dropdown-item logout-item" onClick={handleLogout}>
                        <i className="fas fa-sign-out-alt"></i>
                        <span>Logout</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Desktop Top Right Controls - Hidden on mobile/tablet */}
        <div className="psp-sop-top-avatar psp-sop-desktop-only">
          {/* History Toggle Button */}
          <motion.button
            className={`header-button ${isDrawerOpen ? 'active' : ''}`}
            onClick={toggleDrawer}
            title="Chat History"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <i className="fas fa-history"></i>
          </motion.button>

          {/* Theme Toggle Button */}
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

          {/* Avatar with Click Dropdown */}
          <div className="avatar-container" ref={dropdownRef}>
            <motion.button
              className="header-button avatar-button"
              title="User Menu"
              onClick={() => setShowDropdown(!showDropdown)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <i className="fas fa-user"></i>
            </motion.button>

            {/* Dropdown Menu */}
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
                    {/* User Email Row */}
                    {userEmail && (
                      <div className="dropdown-item user-email-item">
                        <i className="fas fa-envelope"></i>
                        <span>{userEmail}</span>
                      </div>
                    )}
                    {/* Logout Row */}
                    <div className="dropdown-item logout-item" onClick={handleLogout}>
                      <i className="fas fa-sign-out-alt"></i>
                      <span>Logout</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Left Drawer - Chat History */}
        <LeftDrawer
          isOpen={isDrawerOpen}
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          loading={loading}
          error={sessionsError}
          onRetry={() => void fetchSessions()}
          onSelectSession={(sessionId: string) => {
            void selectSession(sessionId);
            pspSopService.clearSessionId();
            localStorage.setItem('psp-sessionid', sessionId);
            const nextParams = new URLSearchParams(searchParams);
            nextParams.set('session_id', sessionId);
            setSearchParams(nextParams, { replace: true });
            closeDrawer();
          }}
          onNewChat={handleNewChat}
          onClose={closeDrawer}
        />

        <div className="psp-sop-main">
          <WelcomeScreen isVisible={true} onSendMessage={sendMessage} />
        </div>

        {/* Mobile Input - Fixed at bottom, only visible on mobile/tablet */}
        <div className="psp-sop-mobile-input">
          <ChatInput onSendMessage={sendMessage} />
        </div>
      </div>
    );
  }

  // Messages Layout (with side navigation)
  return (
    <div className={`psp-sop-chat-layout ${isDrawerOpen ? 'drawer-open' : ''}`}>
      {/* Mobile Header - Only visible on mobile/tablet */}
      <div className="psp-sop-mobile-header">
        <div className="mobile-header-left" ref={hamburgerRef}>
          <motion.button
            className="hamburger-button"
            onClick={() => setShowHamburgerMenu(!showHamburgerMenu)}
            whileTap={{ scale: 0.95 }}
          >
            <i className={showHamburgerMenu ? 'fas fa-times' : 'fas fa-bars'}></i>
          </motion.button>

          {/* Hamburger Menu Dropdown */}
          <AnimatePresence>
            {showHamburgerMenu && (
              <motion.div
                className="hamburger-dropdown"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className="hamburger-dropdown-content">
                  <div className="hamburger-item" onClick={() => { toggleDrawer(); setShowHamburgerMenu(false); }}>
                    <i className="fas fa-history"></i>
                    <span>History</span>
                  </div>
                  <div className="hamburger-item" onClick={handleResetChat}>
                    <i className="fas fa-plus"></i>
                    <span>New Chat</span>
                  </div>
                  <div className="hamburger-item" onClick={handleToggleTheme}>
                    <i className={theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'}></i>
                    <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mobile-header-title">
          <span className="mobile-header-title-text">Pet Supplies Plus</span>
        </div>

        <div className="mobile-header-right">
          <div className="avatar-container" ref={dropdownRef}>
            <motion.button
              className="header-button avatar-button"
              title="User Menu"
              onClick={() => setShowDropdown(!showDropdown)}
              whileTap={{ scale: 0.95 }}
            >
              <i className="fas fa-user"></i>
            </motion.button>

            {/* Dropdown Menu */}
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
                    {userEmail && (
                      <div className="dropdown-item user-email-item">
                        <i className="fas fa-envelope"></i>
                        <span>{userEmail}</span>
                      </div>
                    )}
                    <div className="dropdown-item logout-item" onClick={handleLogout}>
                      <i className="fas fa-sign-out-alt"></i>
                      <span>Logout</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Side Navigation - Hidden on mobile/tablet */}
      <div className="psp-sop-sidenav psp-sop-desktop-only">
        <div className="sidenav-content">
          {/* Logo */}
          <div className="sidenav-logo">
            <img src={pspLogo} alt="Pet Supplies Plus" />
          </div>

          {/* Navigation Items */}
          <div className="sidenav-items">
            {/* History Toggle Button */}
            <motion.button
              className={`sidenav-button ${isDrawerOpen ? 'active' : ''}`}
              onClick={toggleDrawer}
              title="Chat History"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <i className="fas fa-history"></i>
            </motion.button>

            {/* Reset Chat Button */}
            <motion.button
              className="sidenav-button"
              onClick={handleResetChat}
              title="New Chat"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <i className="fas fa-plus"></i>
            </motion.button>

            {/* Theme Toggle Button */}
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

      {/* Left Drawer - Chat History */}
      <LeftDrawer
        isOpen={isDrawerOpen}
        sessions={sessions}
        selectedSessionId={selectedSessionId}
        loading={loading}
        error={sessionsError}
        onRetry={() => void fetchSessions()}
        onSelectSession={(sessionId: string) => {
          void selectSession(sessionId);
          pspSopService.clearSessionId();
          localStorage.setItem('psp-sessionid', sessionId);
          const nextParams = new URLSearchParams(searchParams);
          nextParams.set('session_id', sessionId);
          setSearchParams(nextParams, { replace: true });
          closeDrawer();
        }}
        onNewChat={handleNewChat}
        onClose={closeDrawer}
      />

      {/* Main Content Area */}
      <div className="psp-sop-main-content">
        {/* Desktop Top Header - Hidden on mobile/tablet */}
        <div className="psp-sop-chat-header psp-sop-desktop-only">
          <div className="chat-header-title">
            <h1>Pet Supplies Plus - AI Powered SOP Navigator</h1>
          </div>

          {/* Avatar */}
          <div className="chat-header-avatar">
            <div className="avatar-container" ref={dropdownRef}>
              <motion.button
                className="header-button avatar-button"
                title="User Menu"
                onClick={() => setShowDropdown(!showDropdown)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <i className="fas fa-user"></i>
              </motion.button>

              {/* Dropdown Menu */}
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
                      {/* User Email Row */}
                      {userEmail && (
                        <div className="dropdown-item user-email-item">
                          <i className="fas fa-envelope"></i>
                          <span>{userEmail}</span>
                        </div>
                      )}
                      {/* Logout Row */}
                      <div className="dropdown-item logout-item" onClick={handleLogout}>
                        <i className="fas fa-sign-out-alt"></i>
                        <span>Logout</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Messages and Chat Input */}
        <div className="psp-sop-chat-area">
          <ChatMessages onSuggestionClick={handleSuggestionClick} />
          <ChatInput onSendMessage={sendMessage} />
        </div>
      </div>
    </div>
  );
};
