import React from 'react';
import { motion } from 'framer-motion';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  return (
    <motion.div
      className="psp-sop-message bot-message error-message"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="message-avatar">
        <div className="avatar-icon">
          <i className="fas fa-exclamation-circle"></i>
        </div>
      </div>
      <div className="message-content">
        <div className="message-text">
          <div className="error-title">
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
            Connection Issue
          </div>
          <div className="error-details">
            {message}
          </div>
          {onRetry && (
            <div className="error-help">
              <button 
                onClick={onRetry}
                style={{
                  background: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  marginTop: '8px'
                }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
        <div className="message-time">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  );
};
