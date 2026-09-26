import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import DOMPurify from 'dompurify';
import type { StreamingStep } from '../../types/api';

interface MessageContentRendererProps {
  text?: string;
  htmlContent?: string; // Rich HTML content from streaming API
  sender: 'user' | 'bot';
  logUrl?: string; // Execution log URL
  executionTime?: number; // Execution time in seconds
  executionId?: string; // Execution ID
  isStreaming?: boolean; // Show streaming state
  streamingSteps?: StreamingStep[]; // Execution steps
  error?: { // Error information
    message: string;
    details?: string;
  };
}

const MessageContentRenderer: React.FC<MessageContentRendererProps> = ({ 
  text, 
  htmlContent,
  sender, 
  logUrl, 
  executionTime, 
  executionId,
  isStreaming = false,
  streamingSteps = [],
  error
}) => {
  // Tab state for Answer, Steps, and Logs
  const [activeTab, setActiveTab] = useState<'answer' | 'steps' | 'logs'>('answer');
  
  // Ref for auto-scrolling processing steps
  const processingStepsRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when streaming steps change
  useEffect(() => {
    if (isStreaming && processingStepsRef.current && streamingSteps.length > 0) {
      const scrollContainer = processingStepsRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [streamingSteps, isStreaming]);
  
  // Simple text processing - handle escaped characters and line breaks
  const processedText = useMemo(() => {
    // Safety check for undefined or null text
    if (!text) return '';
    
    let processed = text;

    // Handle escaped newlines
    processed = processed.replace(/\\n/g, '\n');
    
    // Handle escaped Unicode characters (like emojis)
    processed = processed.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => {
      return String.fromCharCode(parseInt(code, 16));
    });
    
    // Handle escaped quotes
    processed = processed.replace(/\\"/g, '"');
    processed = processed.replace(/\\'/g, "'");
    
    // Handle escaped backslashes
    processed = processed.replace(/\\\\/g, '\\');

    return processed;
  }, [text]);

  // Process and sanitize HTML content with markdown handling
  const sanitizedHtml = useMemo(() => {
    if (!htmlContent) return '';
    
    // First, let's process any remaining markdown syntax in the HTML
    let processedHtml = htmlContent;
    
    // Convert markdown headers that weren't converted
    processedHtml = processedHtml.replace(/### \*\*(.*?)\*\*/g, '<h3><strong>$1</strong></h3>');
    processedHtml = processedHtml.replace(/### (.*?)(<br>|$)/g, '<h3>$1</h3>$2');
    processedHtml = processedHtml.replace(/## \*\*(.*?)\*\*/g, '<h2><strong>$1</strong></h2>');
    processedHtml = processedHtml.replace(/## (.*?)(<br>|$)/g, '<h2>$1</h2>$2');
    processedHtml = processedHtml.replace(/# \*\*(.*?)\*\*/g, '<h1><strong>$1</strong></h1>');
    processedHtml = processedHtml.replace(/# (.*?)(<br>|$)/g, '<h1>$1</h1>$2');
    
    // Convert remaining bold text
    processedHtml = processedHtml.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert remaining italic text
    processedHtml = processedHtml.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert bullet points that use • to proper list items
    // Look for lines that start with • and group them into lists
    processedHtml = processedHtml.replace(/((?:^|\n)• .*(?:\n• .*)*)/gm, (match) => {
      const items = match.split(/\n?• /).filter(item => item.trim());
      const listItems = items.map(item => `<li>${item.trim()}</li>`).join('');
      return `<ul>${listItems}</ul>`;
    });
    
    // Clean up any double line breaks
    processedHtml = processedHtml.replace(/<br>\s*<br>/g, '<br>');
    
    return DOMPurify.sanitize(processedHtml, {
      ALLOWED_TAGS: [
        'div', 'p', 'br', 'a', 'strong', 'em', 'b', 'i', 'u', 
        'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'pre', 'code', 'blockquote', 'span', 'table', 'thead', 
        'tbody', 'tr', 'td', 'th', 'hr', 'img'
      ],
      ALLOWED_ATTR: [
        'href', 'target', 'rel', 'style', 'class', 'id', 'border',
        'cellpadding', 'cellspacing', 'width', 'height', 'align',
        'src', 'alt', 'onerror'
      ]
    });
  }, [htmlContent]);

  // Format execution time
  const formatExecutionTime = (seconds?: number): string => {
    if (!seconds || seconds < 0) return 'N/A';
    
    if (seconds < 1) {
      return `${Math.round(seconds * 1000)}ms`;
    } else if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    }
  };

  // Determine what tabs to show - only Answer, Steps, and Logs
  const availableTabs = useMemo(() => {
    const tabs: Array<{ key: 'answer' | 'steps' | 'logs'; label: string; icon: string }> = [];
    
    // Always show Answer tab if we have content (HTML or text)
    if (htmlContent || text) {
      tabs.push({ key: 'answer', label: 'Answer', icon: 'fas fa-comment-dots' });
    }
    if (streamingSteps.length > 0) {
      tabs.push({ key: 'steps', label: 'Steps', icon: 'fas fa-list-ol' });
    }
    if (logUrl) {
      tabs.push({ key: 'logs', label: 'Logs', icon: 'fas fa-clipboard-list' });
    }
    
    return tabs;
  }, [htmlContent, text, streamingSteps.length, logUrl]);

  // Set default active tab
  React.useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find(tab => tab.key === activeTab)) {
      setActiveTab(availableTabs[0].key);
    }
  }, [availableTabs, activeTab]);

  // Simple components - just highlight links
  const components = {
    // Basic link highlighting
    a: ({ children, href, ...props }: any) => (
      <a
        className="message-link"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    ),
  };

  return (
    <div className={`message-content-renderer ${sender === 'user' ? 'user-message' : 'bot-message'}`}>
      {sender === 'user' ? (
        // User messages - simple display
        <div className="processed-text">
          <ReactMarkdown 
            remarkPlugins={[remarkBreaks]}
            components={components}
          >
            {processedText}
          </ReactMarkdown>
        </div>
      ) : (
        // Bot messages with streaming support
        <>
          {isStreaming && (
            <div className="processing-container">
              <div className="processing-header">
                <div className="processing-icon">
                  <div className="processing-spinner"></div>
                </div>
                <div className="processing-info">
                  <div className="processing-title">
                    {streamingSteps.length > 0 ? streamingSteps[streamingSteps.length - 1]?.message : 'Processing your request...'}
                  </div>
                  <div className="processing-subtitle">
                    Status: Processing
                  </div>
                </div>
              </div>
              
              {streamingSteps.length > 0 && (
                <div className="processing-steps" ref={processingStepsRef}>
                  {streamingSteps.map((step, index) => (
                    <div key={step.id} className="processing-step">
                      <div className={`processing-dot ${index === streamingSteps.length - 1 ? 'pulsating' : ''}`}></div>
                      <div className="processing-step-content">
                        <div className="processing-step-text">{step.message}</div>
                        <div className="processing-step-time">{step.timestamp}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {!isStreaming && availableTabs.length > 1 && (
            // Three-tab interface inspired by main_7.js
            <div className="response-tabs-container">
              <div className="tab-navigation">
                {availableTabs.map((tab) => (
                  <button
                    key={tab.key}
                    className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <i className={`tab-icon ${tab.icon}`}></i>
                    {tab.label}
                  </button>
                ))}
              </div>
              
              {/* Answer Tab Content */}
              {activeTab === 'answer' && (
                <div className="tab-content answer-content active">
                  <div className="answer-text">
                    {htmlContent ? (
                      <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                    ) : (
                      <ReactMarkdown 
                        remarkPlugins={[remarkBreaks]}
                        components={components}
                      >
                        {processedText}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              )}
              
              {/* Steps Tab Content */}
              {activeTab === 'steps' && streamingSteps.length > 0 && (
                <div className="tab-content steps-content active">
                  <div className="steps-container">
                    {streamingSteps.map((step) => (
                      <div key={step.id} className="step-item">
                        <div className={`step-indicator ${step.status}`}>
                          {step.status === 'complete' ? (
                            <>
                              <i className="fas fa-check"></i>
                              {/* Fallback checkmark if FontAwesome doesn't load */}
                              <span className="fallback-check">✓</span>
                            </>
                          ) : (
                            step.order
                          )}
                        </div>
                        <div className="step-content">
                          <div className="step-message">{step.message}</div>
                          <div className="step-meta">
                            <span className="step-time">
                              <i className="fas fa-clock"></i>
                              {step.timestamp}
                            </span>
                            <span className={`step-status ${step.status}`}>
                              {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Logs Tab Content */}
              {activeTab === 'logs' && logUrl && (
                <div className="tab-content logs-content active">
                  <div className="logs-container">
                    <div className="logs-icon-container">
                      <i className="fas fa-file-alt"></i>
                    </div>
                    <h3 className="logs-title">Execution Logs</h3>
                    <p className="logs-description">
                      View detailed execution logs and debugging information for this request
                    </p>
                    <a 
                      href={logUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="logs-button"
                    >
                      <i className="fas fa-external-link-alt"></i>
                      <span>Open Execution Logs</span>
                    </a>
                    {(executionTime || executionId) && (
                      <div className="execution-info">
                        {executionTime && (
                          <div>Execution Time: <span className="execution-time">{formatExecutionTime(executionTime)}</span></div>
                        )}
                        {executionId && (
                          <div>Execution ID: {executionId}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {!isStreaming && error && (
            // Error content display
            <div className="error-content">
              <div className="error-header">
                <div className="error-icon">
                  <i className="fas fa-exclamation-triangle"></i>
                  {/* Fallback error icon if FontAwesome doesn't load */}
                  <span className="fallback-error">⚠️</span>
                </div>
                <div className="error-title">Task Execution Failed</div>
              </div>
              
              <div className="error-message">
                {error.message}
              </div>
              
              {error.details && (
                <div className="error-details">
                  {error.details}
                </div>
              )}
              
              {(executionTime || logUrl) && (
                <div className="execution-footer">
                  {executionTime && (
                    <span className="execution-time">
                      Failed after {formatExecutionTime(executionTime)}
                    </span>
                  )}
                  {logUrl && (
                    <a 
                      href={logUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="logs-link"
                    >
                      View Error Logs
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {!isStreaming && !error && availableTabs.length <= 1 && (
            // Simple content display (no tabs needed)
            <div className="simple-content">
              <div className="answer-text">
                {htmlContent ? (
                  <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                ) : (
                  <ReactMarkdown 
                    remarkPlugins={[remarkBreaks]}
                    components={components}
                  >
                    {processedText}
                  </ReactMarkdown>
                )}
              </div>
              
              {(executionTime || logUrl) && (
                <div className="execution-footer">
                  {executionTime && (
                    <span className="execution-time">
                      Executed in {formatExecutionTime(executionTime)}
                    </span>
                  )}
                  {logUrl && (
                    <a 
                      href={logUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="logs-link"
                    >
                      View Logs
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MessageContentRenderer;
