import React, { useState } from 'react';
import agentKeyIcon from "../../assets/images/agent-key-icon.svg";
import apiKeyIcon from "../../assets/images/api-key-icon.svg";
import TextInput from "../Input/TextInput";
import Button from "../Button/Button";

/**
 * Props interface for ApiKeyCard component
 */
export interface ApiKeyCardProps {
  /** API key type/name */
  title: string;
  /** Description of what this API key is used for */
  description: string;
  /** The actual API key (will be masked) */
  apiKey: string;
  /** Creation date */
  createdDate: string;
  /** Whether the key never expires */
  neverExpires?: boolean;
  /** Icon color theme */
  iconColor?: 'blue' | 'purple';
}

/**
 * ApiKeyCard Component
 * Displays an API key with copy and visibility toggle functionality
 */
const ApiKeyCard: React.FC<ApiKeyCardProps> = ({
  title,
  description,
  apiKey,
  createdDate,
  neverExpires = true,
  iconColor = 'blue'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  /**
   * Toggle API key visibility
   */
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  /**
   * Copy API key to clipboard
   */
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy API key:', err);
    }
  };

  /**
   * Get masked API key for display
   */
  const getMaskedKey = () => {
    if (isVisible) return apiKey;
    return '•'.repeat(24);
  };


  /**
   * Get icon color based on theme
   */
  const getIconColor = () => {
    return iconColor === 'blue' ? '#0066CC' : '#8B5CF6';
  };

  /**
   * Get the appropriate icon based on the iconColor prop
   */
  const getIcon = () => {
    return iconColor === 'blue' ? agentKeyIcon : apiKeyIcon;
  };

  return (
    <div className="api-key-card">
      <div className="api-key-card__header">
        <div className="api-key-card__header-left">
          <div 
            className="api-key-card__header-icon"
            style={{ 
              color: getIconColor()
            }}
          >
            <img src={getIcon()} alt={`${title} icon`} width="26" height="26" />
          </div>
          <div className="api-key-card__header-info">
            <h3 className="api-key-card__header-title">{title}</h3>
            <p className="api-key-card__header-description body-small">{description}</p>
          </div>
        </div>
      </div>

      <div className="api-key-card__body">
        <div className="api-key-card__key-section">
        <TextInput
              value={getMaskedKey()}
              className="api-key-card__text-input"
              disabled={true}
            />
              <Button
                variant="tertiary"
                size="sm"
                format="iconOnly"
                className="api-key-card__key-button"
                onClick={copyToClipboard}
                width={38}
                height={38}
                icon={copied ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.3333 6H7.33333C6.59695 6 6 6.59695 6 7.33333V13.3333C6 14.0697 6.59695 14.6667 7.33333 14.6667H13.3333C14.0697 14.6667 14.6667 14.0697 14.6667 13.3333V7.33333C14.6667 6.59695 14.0697 6 13.3333 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3.33333 10.6667C2.59695 10.6667 2 10.0697 2 9.33333V3.33333C2 2.59695 2.59695 2 3.33333 2H9.33333C10.0697 2 10.6667 2.59695 10.6667 3.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              />
              <Button
                variant="tertiary"
                size="sm"
                format="iconOnly"
                className="api-key-card__key-button"
                onClick={toggleVisibility}
                width={38}
                height={38}
                icon={isVisible ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.41 8L12.71 4.71C12.8983 4.5217 13.0041 4.2663 13.0041 4C13.0041 3.7337 12.8983 3.4783 12.71 3.29C12.5217 3.1017 12.2663 2.99591 12 2.99591C11.7337 2.99591 11.4783 3.1017 11.29 3.29L8 6.59L4.71 3.29C4.5217 3.1017 4.2663 2.99591 4 2.99591C3.7337 2.99591 3.4783 3.1017 3.29 3.29C3.1017 3.4783 2.99591 3.7337 2.99591 4C2.99591 4.2663 3.1017 4.5217 3.29 4.71L6.59 8L3.29 11.29C3.1963 11.383 3.12184 11.4936 3.07105 11.6154C3.02026 11.7373 2.99414 11.868 2.99414 12C2.99414 12.132 3.02026 12.2627 3.07105 12.3846C3.12184 12.5064 3.1963 12.617 3.29 12.71C3.38296 12.8037 3.49357 12.8781 3.61543 12.9289C3.73729 12.9797 3.86799 13.0058 4 13.0058C4.13201 13.0058 4.26271 12.9797 4.38457 12.9289C4.50643 12.8781 4.61704 12.8037 4.71 12.71L8 9.41L11.29 12.71C11.383 12.8037 11.4936 12.8781 11.6154 12.9289C11.7373 12.9797 11.868 13.0058 12 13.0058C12.132 13.0058 12.2627 12.9797 12.3846 12.9289C12.5064 12.8781 12.617 12.8037 12.71 12.71C12.8037 12.617 12.8781 12.5064 12.9289 12.3846C12.9797 12.2627 13.0058 12.132 13.0058 12C13.0058 11.868 12.9797 11.7373 12.9289 11.6154C12.8781 11.4936 12.8037 11.383 12.71 11.29L9.41 8Z" fill="currentColor"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 8S3 3 8 3S15 8 15 8S13 13 8 13S1 8 1 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              />
          {/* <div className="api-key-card__key-input">
            <TextInput
              value={getMaskedKey()}
              className="api-key-card__text-input"
            />
            
             <div className="api-key-card__key-actions">
              
              <div title={isVisible ? "Hide API key" : "Show API key"}>
                
              </div>
            </div> 
          </div> */}
        </div>

        <div className="api-key-card__footer">
          <span className="api-key-card__created-date body-small">
            Created on {createdDate}
          </span>
          {neverExpires && (
            <div className="api-key-card__status">
              <div className="api-key-card__status-indicator"></div>
              <span className="api-key-card__status-text body-small">Never expires</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiKeyCard;
