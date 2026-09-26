import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useChatStore, useThemeStore } from '../../store/index';
import tscLogo from '../../assets/tsc-banner.jpg';

export const AppHeader: React.FC = () => {
  const navigate = useNavigate();
  const { clearMessages } = useChatStore();
  const { theme, toggleTheme } = useThemeStore();
//   const { logout, userEmail } = useAuthStore();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleRefresh = () => {
    clearMessages();
  };

  const handleLogout = () => {
//     logout();
    clearMessages();
    navigate('/apps/label-compliance-agent/');
    setShowDropdown(false);
  };

  return (
    <header className="psp-sop-header">
      <div className="logo">
        <motion.div
          className="logo-container"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <img src={tscLogo} alt="Pet Supplies Plus" className="logo-image" />
          <h1 className="logo-text">TSC - AI Powered Label Compliance Checker</h1>
        </motion.div>
      </div>
      
      <div className="header-actions">
        {/* Reset Button */}
        <motion.button
          className="header-button"
          onClick={handleRefresh}
          title="Reset Chat"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <i className="fas fa-redo"></i>
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

        {/* Avatar with Hover Dropdown */}
        <div 
          className="avatar-container"
          onMouseEnter={() => setShowDropdown(true)}
          onMouseLeave={() => setShowDropdown(false)}
        >
          <motion.button
            className="header-button avatar-button"
            title="User Menu"
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
                  {/* {userEmail && (
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
    </header>
  );
};
