import React, { useRef, useCallback, useEffect, useState } from 'react';
import { PrimaryMediumIconOnlyButton, TertiaryMediumIconOnlyButton } from "../Button";
import { TextInput } from '../Input';
import { MessageContentRenderer } from '../MessageRenderer';
import { useAgentStreaming } from '../../hooks/useAgentStreaming';
import type { StreamingResult } from '../../types/api';
import attachIcon from "../../assets/images/attach.svg";
import sendIcon from "../../assets/images/send-white.svg";
import micIcon from "../../assets/images/mic.svg";
import placeholderIcon from "../../assets/images/placeholder-bg.svg";
import sendPurpleIcon from "../../assets/images/send-purple.svg";
import avatarIcon from "../../assets/images/avatar.svg";
import botIcon from "../../assets/images/bot-icon.svg";
import { useNavigate } from 'react-router-dom';

// Enhanced Message types for streaming support
interface Message {
  id: string;
  text?: string;
  htmlContent?: string; // Rich HTML content from streaming
  type: 'user' | 'bot';
  timestamp: Date;
  // Streaming-specific fields
  logUrl?: string;
  executionTime?: number;
  executionId?: string;
  isStreaming?: boolean;
  streamingSteps?: Array<{
    id: string;
    message: string;
    status: 'starting' | 'processing' | 'complete';
    timestamp: string;
    order: number;
  }>;
  // Error information
  error?: {
    message: string;
    details?: string;
  };
}

// Enhanced Message display component with streaming support
const MessageItem = ({ message }: { message: Message }) => (
    <div className={`manage-agent__message ${message.type === 'user' ? 'user' : 'bot'}`}>
        <div className="manage-agent__message-avatar">
            <div className="manage-agent__message-time">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <img 
                src={message.type === 'user' ? avatarIcon : botIcon} 
                alt={message.type === 'user' ? 'User' : 'Bot'} 
            />
        </div>
        <div className="manage-agent__message-content">
            <MessageContentRenderer 
                text={message.text}
                htmlContent={message.htmlContent}
                sender={message.type}
                logUrl={message.logUrl}
                executionTime={message.executionTime}
                executionId={message.executionId}
                isStreaming={message.isStreaming}
                streamingSteps={message.streamingSteps}
                error={message.error}
            />
        </div>
    </div>
);

export interface AgentChatInterfaceProps {
  agentId: string; // Required for streaming API calls
  guardrailsReq?: boolean; // Optional - whether guardrails are required for this agent
  messages?: Message[]; // Optional - will be managed internally with streaming
  currentMessage?: string; // Optional - will be managed internally
  isTyping?: boolean; // Optional - legacy support, replaced with streaming visualization
  spinnerState?: number; // Optional - legacy support for old spinner
  spinnerTexts?: string[]; // Optional - legacy support for old spinner
  onMessageChange?: (message: string) => void; // Optional - callback for input changes
  onExampleClick?: (example: string) => void; // Optional - callback for example clicks
  onMessageComplete?: (result: StreamingResult) => void; // Callback when streaming completes
  backPath?: string;
  title?: string;
  description?: string;
  examples?: string[]; // Optional - custom examples from agent sample_user_input
  enableFileUpload?: boolean; // Enable file upload functionality
}

const AgentChatInterface: React.FC<AgentChatInterfaceProps> = ({
  agentId,
  guardrailsReq = false,
  messages: externalMessages = [],
  currentMessage: externalCurrentMessage = '',
  isTyping: externalIsTyping = false,
  spinnerState = 0,
  spinnerTexts = ['Processing...', 'Analyzing...', 'Generating...', 'Finalizing...', 'Complete!'],
  onMessageChange,
  // onExampleClick,
  onMessageComplete,
  backPath = '/agents',
  title = "Test Agent Interface",
  description = "See how your agent talks before it meets your users",
  examples,
  enableFileUpload = false
}) => {
  const navigate = useNavigate();
  const conversationRef = useRef<HTMLDivElement>(null);
  
  // Internal state management for streaming
  const [internalMessages, setInternalMessages] = useState<Message[]>(externalMessages);
  const [currentMessage, setCurrentMessage] = useState(externalCurrentMessage);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Use streaming hook
  const { 
    streamingState, 
    sendMessage: sendStreamingMessage, 
    isStreaming, 
    canSend,
    currentStreamingSteps,
    finalResult 
  } = useAgentStreaming();

  // Use provided examples or fallback to default ones
  const displayExamples = examples && examples.length > 0 
    ? examples 
    : ["What are your main feature ?","What knowledge are you trained on ?","How do I get started ?","Show me an example of your capabilities"];

  // Sync external messages with internal state
  useEffect(() => {
    setInternalMessages(externalMessages);
  }, [externalMessages]);

  // Handle streaming completion
  useEffect(() => {
    if (finalResult) {
      // Check if result is an error
      const isError = finalResult.type === 'error';
      
      // Add completed message to conversation with three-tab interface like main_7.js
      const completedMessage: Message = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        timestamp: new Date(),
        text: isError ? undefined : finalResult.content.text,
        htmlContent: isError ? undefined : finalResult.html_content || undefined,
        logUrl: finalResult.log_url,
        executionTime: streamingState.elapsedTime,
        executionId: finalResult.execution_id,
        isStreaming: false,
        streamingSteps: currentStreamingSteps,
        error: isError ? {
          message: finalResult.content.message || 'Task execution failed',
          details: finalResult.content.details
        } : undefined
      };

      setInternalMessages(prev => [...prev, completedMessage]);
      
      // Call external callback if provided
      if (onMessageComplete) {
        onMessageComplete(finalResult);
      }
    }
  }, [finalResult, currentStreamingSteps, streamingState.elapsedTime, onMessageComplete]);

  // Handle streaming errors
  useEffect(() => {
    if (streamingState.status === 'error' && streamingState.error) {
      // Don't show AbortError to user - it's expected when navigating away
      if (streamingState.error.includes('AbortError') || streamingState.error.includes('aborted')) {
        console.log('[AgentChatInterface] Stream aborted gracefully, not showing error to user');
        return;
      }
      
      // Add error message to conversation for real errors
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'bot',
        timestamp: new Date(),
        isStreaming: false,
        error: {
          message: 'Streaming Error',
          details: streamingState.error
        },
        executionTime: streamingState.elapsedTime
      };

      setInternalMessages(prev => [...prev, errorMessage]);
    }
  }, [streamingState.status, streamingState.error, streamingState.elapsedTime]);

  // Create streaming message when actively streaming
  const streamingMessage: Message | null = isStreaming ? {
    id: 'streaming-message',
    type: 'bot',
    timestamp: new Date(),
    isStreaming: true,
    streamingSteps: currentStreamingSteps
  } : null;

  // Combine messages with streaming message
  const allMessages = streamingMessage ? [...internalMessages, streamingMessage] : internalMessages;

  // const handleExampleClick = useCallback((example: string) => {
  //   if (onExampleClick) {
  //     onExampleClick(example);
  //   } else {
  //     setCurrentMessage(example);
  //     handleSendMessage(example);
  //   }
  // }, [onExampleClick]);

  const handleSendMessage = useCallback(async (messageToSend?: string) => {
    const message = messageToSend || currentMessage.trim();
    if (!message || !canSend) return;

    // Add user message to conversation
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: message,
      timestamp: new Date()
    };
    
    setInternalMessages(prev => [...prev, userMessage]);

    // Clear current message and file
    setCurrentMessage('');
    setSelectedFile(null);

    // External onSendMessage callback removed - using internal streaming

    // Send streaming message
    try {
      await sendStreamingMessage(agentId, message, selectedFile || undefined, guardrailsReq);
    } catch (error) {
      console.error('Failed to send streaming message:', error);
      // Add error message to conversation
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'bot',
        text: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        timestamp: new Date()
      };
      setInternalMessages(prev => [...prev, errorMessage]);
    }
  }, [currentMessage, canSend, selectedFile, agentId, sendStreamingMessage, guardrailsReq]);

  const handleTextBoxChange = useCallback((value: string) => {
    setCurrentMessage(value);
    if (onMessageChange) {
      onMessageChange(value);
    }
  }, [onMessageChange]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // File upload handlers
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size cannot exceed 10MB');
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  // Simple autoscroll when messages change
  useEffect(() => {
    if (conversationRef.current && allMessages.length > 0) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [allMessages]);

  return (
    <div className="manage-agent__left">
      <div className="manage-agent__left-header">
        <div className="manage-agent__left-header-content">
          <div className="manage-agent__left-header-content-left">
            <div className="manage-agent__left-header-content-left-icon" onClick={() => navigate(backPath)} style={{cursor: 'pointer'}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M7.82484 13L12.7248 17.9C12.9248 18.1 13.0208 18.3334 13.0128 18.6C13.0048 18.8667 12.9005 19.1 12.6998 19.3C12.4998 19.4834 12.2665 19.5794 11.9998 19.588C11.7332 19.5967 11.4998 19.5007 11.2998 19.3L4.69984 12.7C4.59984 12.6 4.52884 12.4917 4.48684 12.375C4.44484 12.2584 4.42451 12.1334 4.42584 12C4.42718 11.8667 4.44818 11.7417 4.48884 11.625C4.52951 11.5084 4.60018 11.4 4.70084 11.3L11.3008 4.70005C11.4842 4.51672 11.7135 4.42505 11.9888 4.42505C12.2642 4.42505 12.5015 4.51672 12.7008 4.70005C12.9008 4.90005 13.0008 5.13772 13.0008 5.41305C13.0008 5.68838 12.9008 5.92572 12.7008 6.12505L7.82484 11H18.9998C19.2832 11 19.5208 11.096 19.7128 11.288C19.9048 11.48 20.0005 11.7174 19.9998 12C19.9992 12.2827 19.9032 12.5204 19.7118 12.713C19.5205 12.9057 19.2832 13.0014 18.9998 13H7.82484Z" fill="#4B5767"/>
              </svg>
            </div>
            <div className="manage-agent__left-header-content-left-badge">
              <div className="manage-agent__left-header-content-left-badge-container">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="17" viewBox="0 0 16 17" fill="none">
                  <path d="M4.00016 9.83325H9.3335V8.49992H4.00016V9.83325ZM4.00016 7.83325H12.0002V6.49992H4.00016V7.83325ZM4.00016 5.83325H12.0002V4.49992H4.00016V5.83325ZM1.3335 15.1666V3.16659C1.3335 2.79992 1.46416 2.48614 1.7255 2.22525C1.98683 1.96436 2.30061 1.8337 2.66683 1.83325H13.3335C13.7002 1.83325 14.0142 1.96392 14.2755 2.22525C14.5368 2.48659 14.6673 2.80036 14.6668 3.16659V11.1666C14.6668 11.5333 14.5364 11.8473 14.2755 12.1086C14.0146 12.3699 13.7006 12.5004 13.3335 12.4999H4.00016L1.3335 15.1666ZM3.4335 11.1666H13.3335V3.16659H2.66683V11.9166L3.4335 11.1666Z" fill="white"/>
                </svg>
              </div>
            </div>
            <div className="manage-agent__left-header-content-left-title">
              <span className="manage-agent__left-header-content-left-title-text">{title}</span>
              <span className="manage-agent__left-header-content-left-title-description">{description}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="manage-agent__left-content">
        {allMessages.length === 0 ? (
          <div className="manage-agent__left-content-placeholder">
            <img src={placeholderIcon} alt="placeholder" />
            <div className="manage-agent__left-content-placeholder-text">
              <span className="manage-agent__left-content-placeholder-text-title">Start a conversation</span>
              <span className="manage-agent__left-content-placeholder-text-description">Try one of these examples or ask anything</span>
            </div>
            <div className="manage-agent__left-content-placeholder-examples">
              {displayExamples.map((example, index) => (
                <div 
                  key={index} 
                  className="manage-agent__left-content-placeholder-examples-item"
                  onClick={() => {
                    setCurrentMessage(example);
                    handleSendMessage(example);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <span>{example}</span>
                  <img src={sendPurpleIcon} alt="send" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="manage-agent__conversation-wrapper">
            <div 
              className="manage-agent__left-content-conversation scrollbar-hidden"
              ref={conversationRef}
            >
              {allMessages.map((message) => (
                <MessageItem key={message.id} message={message} />
              ))}
            </div>
            {/* Legacy spinner only for external isTyping (backward compatibility) */}
            {externalIsTyping && !isStreaming && (
              <div className="manage-agent__spinner-overlay">
                <img src={placeholderIcon} alt="placeholder" />
                <div className="manage-agent__spinner-text">
                  {spinnerTexts[spinnerState]}
                </div>
                <div className="manage-agent__spinner-progressbar">
                  <div 
                    className="manage-agent__spinner-progressbar-fill"
                    style={{ width: `${((spinnerState + 1) / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="manage-agent__left-footer">
        {/* File preview */}
        {selectedFile && (
          <div className="file-preview" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            marginBottom: '8px',
            background: 'rgba(99, 179, 237, 0.1)',
            border: '1px solid rgba(99, 179, 237, 0.3)',
            borderRadius: '8px',
            fontSize: '13px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 500 }}>{selectedFile.name}</span>
              <span style={{ color: '#6c757d', fontSize: '12px' }}>({Math.round(selectedFile.size / 1024)} KB)</span>
            </div>
            <button 
              onClick={handleRemoveFile}
              style={{
                background: 'none',
                border: 'none',
                color: '#6c757d',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '4px',
                borderRadius: '4px'
              }}
            >×</button>
          </div>
        )}
        
        <TextInput 
          placeholder={isStreaming ? 'Streaming in progress...' : 'Describe what you want to post about'} 
          width="100%" 
          value={currentMessage}
          onChange={handleTextBoxChange}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
        />
        <div className="manage-agent__left-footer-buttons">
          {/* File upload button */}
          {enableFileUpload && (
            <>
              <input
                type="file"
                id="file-upload"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
                accept=".txt,.pdf,.csv,.xlsx,.json"
              />
              <TertiaryMediumIconOnlyButton 
                icon={<img src={attachIcon} alt="attach" />}
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={isStreaming}
              />
            </>
          )}
          
          {/* Mic button (placeholder for future voice input) */}
          <TertiaryMediumIconOnlyButton 
            icon={<img src={micIcon} alt="mic" />}
            disabled={isStreaming}
          />
          
          {/* Send button */}
          <PrimaryMediumIconOnlyButton 
            icon={<img src={sendIcon} alt="send" />} 
            onClick={() => handleSendMessage()}
            disabled={!canSend || !currentMessage.trim()}
          />
        </div>
      </div>
    </div>
  );
};

export default AgentChatInterface;
export type { Message };
