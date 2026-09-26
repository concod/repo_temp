import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useChatStore } from "../../store";
import AudioRecorder from "./AudioRecorder";

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isAudioRecording, setIsAudioRecording] = useState(false);

  const { isWaitingForResponse } = useChatStore();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 150);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [inputValue]);

  const handleSubmit = async () => {
    const message = inputValue.trim();
    if (!message || isWaitingForResponse || isSubmitting) return;

    setIsSubmitting(true);
    setInputValue("");

    try {
      await onSendMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTranscribe = (data: string) => {
    setInputValue((prev) => `${prev}${data}`);
    setIsAudioRecording(false);
  };

  const isDisabled = isWaitingForResponse || isSubmitting;

  return (
    <div className="psp-sop-input-container">
      <div className="psp-sop-chat-input">
        {isAudioRecording ? (
          <AudioRecorder onTranscribe={handleTranscribe} />
        ) : (
          <>
            <textarea
              ref={textareaRef}
              className="message-input"
              placeholder="Ask question"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isDisabled}
              rows={1}
              aria-label="Message input"
            />

            <motion.button
              className="mic-button"
              onClick={() => setIsAudioRecording(true)}
              disabled={isDisabled}
            >
              <i className="fa-solid fa-microphone"></i>
            </motion.button>

            <motion.button
              className="send-button"
              onClick={handleSubmit}
              disabled={isDisabled || !inputValue.trim()}
              whileHover={!isDisabled ? { scale: 1.05 } : {}}
              whileTap={!isDisabled ? { scale: 0.95 } : {}}
              aria-label="Send message"
            >
              {isSubmitting ? (
                <div
                  className="spinner"
                  style={{ width: "16px", height: "16px" }}
                />
              ) : (
                <i className="fas fa-paper-plane"></i>
              )}
            </motion.button>
          </>
        )}
      </div>

      <div className="psp-sop-copyright">
        A product of{" "}
        <a
          href="https://app.impact-agents.ai"
          target="_blank"
          rel="noopener noreferrer"
        >
          Agentic Retail Automation Platform
        </a>
      </div>
    </div>
  );
};
