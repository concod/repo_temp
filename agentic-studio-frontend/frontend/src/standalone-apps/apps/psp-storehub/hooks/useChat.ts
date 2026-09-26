import { useState } from 'react';
import { useChatStore } from '../store';
import { PspStoreHubService } from '../services/PspStoreHubService';
import { response } from '../utils/constant';

const pspStoreHubService = new PspStoreHubService();

export const useChat = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { 
    addMessage, 
    setTyping, 
    setWaitingForResponse, 
    setError,
    isWaitingForResponse 
  } = useChatStore();
  

  const sendMessage = async (inputMessage: string) => {
    if (!inputMessage.trim() || isWaitingForResponse || isSubmitting) return;

    let message = inputMessage.trim();

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
      // Check if the message matches any key in response constants
      const staticResponse = response[message as keyof typeof response];
      
      if (staticResponse) {
        // Use static response from constants
        // Simulate a small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 7000));
        
        // Hide typing indicator
        setTyping(false);

        // Add bot response with static HTML content
        addMessage({
          htmlContent: staticResponse,
          isUser: false,
          isTyping: true, // Enable typing animation for new messages
        });
      } else {
        // Make API call for dynamic responses
        const apiResponse = await pspStoreHubService.sendMessage(message);
        
        // Hide typing indicator
        setTyping(false);

        // Add bot response
        addMessage({
          ...(apiResponse.htmlContent ? { htmlContent: apiResponse.htmlContent } : {}),
          ...(apiResponse.text ? { text: apiResponse.text } : {}),
          isUser: false,
          timing: apiResponse.timing,
          isTyping: true, // Enable typing animation for new messages
        });
      }

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
