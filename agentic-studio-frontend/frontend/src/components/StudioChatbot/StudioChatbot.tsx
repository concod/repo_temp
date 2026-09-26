import React, { useEffect, useRef, useState } from 'react';
import { ChatbotService } from '../../services/chatbotService';
import './StudioChatbot.scss';

interface Message {
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface StudioChatbotProps {
  agentId?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: 'light' | 'dark';
}

const StudioChatbot: React.FC<StudioChatbotProps> = ({
  agentId = '9750c4ca-e3dc-4ffe-82b5-18a07d8294a9',
  position = 'bottom-right',
  theme = 'light'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inputValue, setInputValue] = useState('');
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context
  useEffect(() => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.debug('Audio context not supported:', e);
    }
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Clear unread count when opening
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  const playSound = (type: 'send' | 'receive') => {
    if (!audioContextRef.current) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      if (type === 'send') {
        oscillator.frequency.setValueAtTime(800, audioContextRef.current.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1000, audioContextRef.current.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1);
        oscillator.stop(audioContextRef.current.currentTime + 0.1);
      } else {
        oscillator.frequency.setValueAtTime(400, audioContextRef.current.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContextRef.current.currentTime + 0.2);
        oscillator.frequency.exponentialRampToValueAtTime(500, audioContextRef.current.currentTime + 0.4);
        gainNode.gain.setValueAtTime(0.01, audioContextRef.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.25, audioContextRef.current.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.4);
        oscillator.stop(audioContextRef.current.currentTime + 0.4);
      }
      
      oscillator.type = 'sine';
      oscillator.start(audioContextRef.current.currentTime);
    } catch (e) {
      console.debug('Error playing sound:', e);
    }
  };

  const addMessage = (content: string, sender: 'user' | 'bot') => {
    const newMessage: Message = {
      content,
      sender,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    if (sender === 'bot' && !isOpen) {
      setUnreadCount(prev => prev + 1);
    }
  };

  const sendMessage = async () => {
    const message = inputValue.trim();
    if (!message || isTyping) return;

    playSound('send');
    addMessage(message, 'user');
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await ChatbotService.sendMessage(agentId, message);
      const botResponse = await ChatbotService.parseStreamResponse(response);

      addMessage(botResponse, 'bot');
      playSound('receive');

      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('Sorry, I encountered an error. Please try again.', 'bot');
      playSound('receive');
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className={`studio-chatbot studio-chatbot--${position} studio-chatbot--${theme}`}>
      {/* Toggle Button */}
      {!isOpen && (
        <button
          className="studio-chatbot__toggle"
          onClick={() => setIsOpen(true)}
          aria-label="Open help chatbot"
        >
          <svg viewBox="0 0 24 24" className="studio-chatbot__toggle-icon">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
          {unreadCount > 0 && (
            <span className="studio-chatbot__badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Interface */}
      {isOpen && (
        <div className="studio-chatbot__interface">
          {/* Header */}
          <div className="studio-chatbot__header">
            <div className="studio-chatbot__header-info">
              <div className="studio-chatbot__header-avatar">
                <svg viewBox="0 0 100 100">
                  <rect x="25" y="30" width="50" height="45" rx="8" ry="8" fill="white"/>
                  <circle cx="35" cy="45" r="4" fill="#667eea"/>
                  <circle cx="65" cy="45" r="4" fill="#667eea"/>
                  <circle cx="35" cy="44" r="1.5" fill="white"/>
                  <circle cx="65" cy="44" r="1.5" fill="white"/>
                  <rect x="42" y="55" width="16" height="3" rx="1.5" fill="#667eea"/>
                </svg>
              </div>
              <div className="studio-chatbot__header-text">
                <h3>Studio Assistant</h3>
                <p>I'm here to help you with Studio</p>
              </div>
            </div>
            <button
              className="studio-chatbot__close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chatbot"
            >
              <svg viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div 
            className="studio-chatbot__messages"
            ref={messagesContainerRef}
          >
            {messages.length === 0 && (
              <div className="studio-chatbot__welcome">
                <p>👋 Hi! I'm your Studio Assistant. How can I help you today?</p>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div 
                key={index}
                className={`studio-chatbot__message studio-chatbot__message--${message.sender}`}
              >
                <div className="studio-chatbot__message-avatar">
                  {message.sender === 'bot' ? (
                    <svg viewBox="0 0 100 100">
                      <rect x="25" y="30" width="50" height="45" rx="8" ry="8" fill="white"/>
                      <circle cx="35" cy="45" r="4" fill="#667eea"/>
                      <circle cx="65" cy="45" r="4" fill="#667eea"/>
                    </svg>
                  ) : (
                    <div className="studio-chatbot__user-avatar">
                      <svg viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div 
                  className="studio-chatbot__message-content"
                  dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                />
              </div>
            ))}

            {isTyping && (
              <div className="studio-chatbot__message studio-chatbot__message--bot studio-chatbot__typing">
                <div className="studio-chatbot__message-avatar">
                  <svg viewBox="0 0 100 100">
                    <rect x="25" y="30" width="50" height="45" rx="8" ry="8" fill="white"/>
                    <circle cx="35" cy="45" r="4" fill="#667eea"/>
                    <circle cx="65" cy="45" r="4" fill="#667eea"/>
                  </svg>
                </div>
                <div className="studio-chatbot__typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="studio-chatbot__input-container">
            <textarea
              ref={inputRef}
              className="studio-chatbot__input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              rows={1}
              disabled={isTyping}
            />
            <button
              className="studio-chatbot__send"
              onClick={sendMessage}
              disabled={!inputValue.trim() || isTyping}
              aria-label="Send message"
            >
              <svg viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudioChatbot;
