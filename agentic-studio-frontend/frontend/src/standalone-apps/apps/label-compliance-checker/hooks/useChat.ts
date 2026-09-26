import { useState } from "react";
import { useChatStore, useThemeStore } from "../store/index";
import { LabelComplianceService } from "../services/labelComplianceService";

const labelComplianceService = new LabelComplianceService();

export const useChat = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    addMessage,
    setTyping,
    setWaitingForResponse,
    setError,
    updateLastMessage,
    isWaitingForResponse,
  } = useChatStore();

  const { language } = useThemeStore();

  const sendMessage = async (inputMessage: string, file?: File) => {
    if ((!inputMessage.trim() && !file) || isWaitingForResponse || isSubmitting)
      return;

    let message = inputMessage.trim();

    // Append language instruction if Spanish is selected
    if (language === "spanish") {
      message += " The response should be in spanish";
    }

    setIsSubmitting(true);
    setWaitingForResponse(true);
    setError(null);

    // Add user message - show file name if file is uploaded
    const displayMessage = file
      ? `${message || "Analyzing uploaded image -"} ${file.name}`
      : message;

    addMessage({
      text: displayMessage,
      isUser: true,
    });

    // Show typing indicator
    setTyping(true);

    try {
      let response;

      if (file) {
        // Handle file upload first, then send the URL to the agent
        const fileUploadResponse = await labelComplianceService.uploadFile(
          file
        );

        // Use the URL from file upload to send to the agent
        const messageWithUrl = fileUploadResponse.url
          ? `${message} ${fileUploadResponse.url}`
          : message;

        if (fileUploadResponse.url) {
          updateLastMessage({
            imageUrl: fileUploadResponse.url,
          });
        }

        response = await labelComplianceService.sendMessage(messageWithUrl);
      } else {
        // Handle text-only message
        response = await labelComplianceService.sendMessage(message);
      }

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
      console.error("Error sending message:", error);

      const errorMessage =
        error instanceof Error
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
    isWaitingForResponse,
  };
};
