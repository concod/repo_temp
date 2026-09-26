import React, { useEffect, useState } from 'react';
import successIcon from '../../assets/images/toast-success.svg';
import errorIcon from '../../assets/images/toast-error.svg';
import closeIcon from '../../assets/images/close-icon.svg';

interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, type, message, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show toast
    setTimeout(() => setIsVisible(true), 10);
    
    // Auto dismiss after 4 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onRemove(id), 300); // Wait for animation
    }, 4000);

    return () => clearTimeout(timer);
  }, [id, onRemove]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onRemove(id), 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <img 
            src={successIcon} 
            alt="Success" 
            width="18" 
            height="18" 
          />
        );
      case 'error':
        return (
          <img 
            src={errorIcon} 
            alt="Error" 
            width="18" 
            height="18" 
          />
        );
      default:
        return null;
    }
  };

  const getToastStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      display: 'flex',
      width: '384px',
      height: '36px',
      minWidth: '370px',
      padding: '8px 16px',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexShrink: 0,
      borderRadius: '8px',
      boxShadow: '0 0 4px 0 rgba(0, 0, 0, 0.12)',
      pointerEvents: 'auto',
      opacity: isVisible ? 1 : 0,
      transform: `translateX(${isVisible ? '0' : '100%'})`,
      transition: 'all 0.3s ease',
    };

    switch (type) {
      case 'success':
        return {
          ...baseStyles,
          border: '1px solid #9DE27D',
          background: 'rgba(210, 246, 234, 0.30)',
        };
      case 'error':
        return {
          ...baseStyles,
          border: '1px solid  #FC9797',
          background: ' #FFE4EE',
        };
      default:
        return {
          ...baseStyles,
          border: '1px solid #ccc',
          background: '#f9f9f9',
        };
    }
  };

  return (
    <div style={getToastStyles()}>
      <div className="toast__content" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flex: 1,
        minWidth: 0, // Allow flex item to shrink below its content size
      }}>
        <div className="toast__icon" style={{ flexShrink: 0 }}>
          {getIcon()}
        </div>
        <div className="toast__message" style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: '14px',
          lineHeight: '20px',
          color: '#333',
        }}>
          {message}
        </div>
      </div>
      <button className="toast__close" onClick={handleClose} style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '2px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <img 
          src={closeIcon} 
          alt="Close" 
          width="16" 
          height="16" 
        />
      </button>
    </div>
  );
};

export default Toast;