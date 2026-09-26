import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import { useChat } from "../../hooks/useChat";
import catBlinkingAnimation from "../../assets/cat_blinking.json";
import AudioRecorder from "./AudioRecorder";

export const FloatingInputBar: React.FC = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { sendMessage, isWaitingForResponse } = useChat();
  const [isAudioRecording, setIsAudioRecording] = useState(false);

  const handleTranscribe = (data: string) => {
    setQuery((prev) => `${prev}${data}`);
    setIsAudioRecording(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isWaitingForResponse) return;

    const messageText = query.trim();

    // Clear the input immediately
    setQuery("");

    // Navigate to chat interface first
    navigate("/apps/store-data-analyst/chat");

    // Send the message (this will add to store and get AI response)
    await sendMessage(messageText);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <motion.div
      className="floating-input-bar"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <form onSubmit={handleSubmit} className="floating-input-form">
        <div className="input-container">
          {/* <i className="fas fa-search input-icon"></i> */}
          <Lottie
            animationData={catBlinkingAnimation}
            loop={true}
            className="search-icon"
            style={{ width: 40, height: 40 }}
          />
          {isAudioRecording ? (
            <AudioRecorder onTranscribe={handleTranscribe} />
          ) : (
            <>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  isWaitingForResponse
                    ? "Processing your message..."
                    : "Ask anything about your store performance..."
                }
                className="floating-input"
              />
              <motion.button
                className="mic-button"
                onClick={() => setIsAudioRecording(true)}
                disabled={isWaitingForResponse}
              >
                <i className="fa-solid fa-microphone"></i>
              </motion.button>
              <motion.button
                type="submit"
                className="send-button"
                disabled={!query.trim() || isWaitingForResponse}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isWaitingForResponse ? (
                  <div
                    className="spinner"
                    style={{ width: "16px", height: "16px" }}
                  />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <path
                      d="M7.64453 5.5C7.68901 5.50002 7.72287 5.50916 7.75684 5.53223L7.79102 5.55957L12.4424 9.99512C12.4427 9.99823 12.4443 10.0022 12.4443 10.0068C12.4443 10.0107 12.4426 10.0138 12.4424 10.0166L7.77734 14.4531C7.74698 14.482 7.71378 14.5 7.64453 14.5C7.58462 14.5 7.54344 14.4844 7.49707 14.4404C7.45101 14.3966 7.44433 14.3682 7.44433 14.334C7.44438 14.3006 7.45097 14.2733 7.49707 14.2295L11.5566 10.3691L11.9375 10.0068L11.5566 9.64453L7.48242 5.77051C7.45629 5.74558 7.44434 5.72431 7.44434 5.67188C7.44434 5.62998 7.4537 5.6008 7.49707 5.55957C7.54344 5.51561 7.58462 5.5 7.64453 5.5Z"
                      fill="#1F2B4D"
                      stroke="white"
                    />
                  </svg>
                )}
                {/* <i className={isWaitingForResponse ? "fas fa-spinner fa-spin" : "fas fa-paper-plane"}></i> */}
              </motion.button>
            </>
          )}
        </div>
      </form>
    </motion.div>
  );
};
