import { useState } from 'react';
import { useChatStore, useThemeStore } from '../store';
import { PspSopService } from '../services/PspSopService';

export const pspSopService = new PspSopService();

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

    // Append language instruction if Spanish is selected
    if (language === 'spanish') {
      message += " The response should be in spanish";
    }

    setIsSubmitting(true);
    setWaitingForResponse(true);
    setError(null);

    // Add user message
    addMessage({
      text: inputMessage.trim(),
      isUser: true,
    });

    // Show typing indicator
    setTyping(true);

    try {
      const response = await pspSopService.sendMessage(message);
      
      // Hide typing indicator
      setTyping(false);

      // Add bot response
      addMessage({
        text: response.text,
        isUser: false,
        sources: response.sources,
        suggestions: response.suggestions,
        timing: response.timing,
        isTyping: true, // Enable typing animation for new messages
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
