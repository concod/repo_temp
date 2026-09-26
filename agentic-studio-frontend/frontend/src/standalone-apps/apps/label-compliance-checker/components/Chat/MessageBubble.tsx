import React, { useState } from "react";
import { motion } from "framer-motion";
import type { Message } from "../../types/chat.types";
// import { TypingAnimation } from "../Animations/TypingAnimation";
import { SourceReferences } from "../UI/SourceReferences";
import { MessageSuggestions } from "./MessageSuggestions";
// import { MarkdownRenderer } from "../../utils/markdownRenderer";
import { useChatStore } from "../../store";

interface MessageBubbleProps {
  message: Message;
  onSuggestionClick: (suggestion: string) => void;
  isLastBotMessage?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onSuggestionClick,
  isLastBotMessage = false,
}) => {
  const [showExtras] = useState(false);
  const [showTiming] = useState(false);
  const { isWaitingForResponse, isTyping } = useChatStore();

  // const handleTypingComplete = () => {
  //   setShowExtras(true);
  //   if (message.timing) {
  //     setTimeout(() => setShowTiming(true), 200);
  //   }
  // };

  return (
    <motion.div
      className={`psp-sop-message ${
        message.isUser ? "user-message" : "bot-message"
      }`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="message-avatar">
        <div className="avatar-icon">
          <i className={message.isUser ? "fas fa-user" : "fas fa-robot"}></i>
        </div>
      </div>

      <div className="message-content">
        {/* Response timing */}
        {!message.isUser && message.timing && (
          <motion.div
            className="response-timing"
            initial={{ opacity: 0 }}
            animate={{ opacity: showTiming ? 1 : 0 }}
            transition={{ duration: 0.5 }}
          >
            <i
              className="fas fa-clock"
              style={{ marginRight: "4px", fontSize: "10px" }}
            ></i>
            Response generated in {message.timing}
          </motion.div>
        )}

        <div className="message-text">
          {message.isUser ? (
            // User messages - show immediately
            <span
              dangerouslySetInnerHTML={{
                __html: message.text.replace(/\n/g, "<br>"),
              }}
            />
          ) : message.isTyping ? (
            // Bot messages with typing animation
            // <TypingAnimation
            //   text={message.text}
            //   speed={500}
            //   onComplete={handleTypingComplete}
            //   className="markdown-content"
            // />
            <span
              dangerouslySetInnerHTML={{
                __html: message.text.replace(/\n/g, ""),
              }}
            />
          ) : (
            // Bot messages without typing (e.g., from history)
            <span
              dangerouslySetInnerHTML={{
                __html: message.text.replace(/\n/g, ""),
              }}
            />
          )}
        </div>
        {message.isUser && message.imageUrl && (
          <div
            style={{
              height: "200px",
              width: "100%",
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "10px",
            }}
          >
            <img
              src={message.imageUrl}
              style={{ height: "100%", width: "auto", borderRadius: "12px" }}
            />
          </div>
        )}

        {/* Sources */}
        {!message.isUser && showExtras && message.sources && (
          <SourceReferences sources={message.sources} />
        )}

        {/* Suggestions */}
        {!message.isUser && showExtras && message.suggestions && (
          <MessageSuggestions
            suggestions={message.suggestions}
            onSuggestionClick={onSuggestionClick}
            isVisible={isLastBotMessage && !isWaitingForResponse && !isTyping}
          />
        )}

        <div className="message-time">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </motion.div>
  );
};
