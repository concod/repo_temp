import { useState } from 'react';
import { useChatStore, useThemeStore } from '../store';
import { LululemonTrendService } from '../services/LululemonTrendService';

const trendService = new LululemonTrendService();

export const useChat = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { 
    addMessage, 
    setTyping, 
    setWaitingForResponse, 
    setError,
    isWaitingForResponse 
  } = useChatStore();
  
  const { language } = useThemeStore();

  const sendMessage = async (inputMessage: string) => {
    if (!inputMessage.trim() || isWaitingForResponse || isSubmitting) return;

    let message = inputMessage.trim();

    if (language === 'spanish') {
      message += " The response should be in spanish";
    }

    setIsSubmitting(true);
    setWaitingForResponse(true);
    setError(null);

    addMessage({
      text: inputMessage.trim(),
      isUser: true,
    });

    setTyping(true);

    try {
      const response = await trendService.sendMessage(message);
      setTyping(false);

      addMessage({
        text: response.text,
        isUser: false,
        sources: response.sources,
        suggestions: response.suggestions,
        timing: response.timing,
        isTyping: true,
      });

    } catch (error) {
      setTyping(false);
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "I'm having trouble connecting right now. Please try again in a moment.";

      addMessage({
        text: errorMessage,
        isUser: false,
      });
    } finally {
      setIsSubmitting(false);
      setWaitingForResponse(false);
    }
  };

  return {
    sendMessage,
    isSubmitting,
    isWaitingForResponse
  };
};


