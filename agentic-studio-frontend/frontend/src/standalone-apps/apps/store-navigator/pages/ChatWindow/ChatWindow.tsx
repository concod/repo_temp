import { useNavigate } from "react-router-dom";
import "./ChatWindow.scss";
import { ChatInput } from "../../components/Input/ChatInput";
import { useMessageStore } from "../../store/messageStore";
import { useEffect, useRef } from "react";
import MessageBubble from "../../components/Chat/MessageBubble";
import chatbot from "../../assets/chatbot.png";

const ChatWindow = () => {
  const navigate = useNavigate();
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const { sendMessage, clearChat, messages } = useMessageStore();

  useEffect(() => {
    messageContainerRef.current?.scrollTo({
      top: messageContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  const handleBack = () => {
    navigate("/apps/navigator/home");
  };

  return (
    <div className="chat-window">
      <div className="chat-window--nav">
        <button
          className="chat-window--nav-back"
          onClick={handleBack}
          aria-label="Go back to home"
        >
          <i className="fa-solid fa-chevron-left"></i>
          Back
        </button>
        {messages.length > 0 && (
          <button className="chat-window--nav-reset" onClick={clearChat}>
            <i className="fa-solid fa-trash-can"></i> Clear chat
          </button>
        )}
      </div>
      <div className="chat-window--chat-interface">
        {messages.length === 0 ? (
          <div className="chat-window--empty-message">
            <div className="welcome-hero">
              <div className="welcome-hero--image-container">
                {/* Placeholder for your AI/Store Image */}
                <img src={chatbot} alt="AI Navigator" className="main-img" />
                <div className="glow-effect"></div>
              </div>

              <h1 className="welcome-hero--title">
                AI Powered Store <span>Navigator</span>
              </h1>

              <p className="welcome-hero--subtitle">
                I can help you find products, check stock levels, or navigate
                the store layout. What are you looking for today?
              </p>

              <div className="welcome-hero--suggestions">
                <div
                  className="chip"
                  onClick={() => sendMessage("Find men's polo T-Shirt")}
                >
                  Find men's polo T-Shirt
                </div>
                <div
                  className="chip"
                  onClick={() => sendMessage("Where is the women's dress?")}
                >
                  Where is the women's dress?
                </div>
                <div
                  className="chip"
                  onClick={() => sendMessage("Do you have cotton pants?")}
                >
                  Do you have cotton pants?
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            ref={messageContainerRef}
            className="chat-window--message-container"
          >
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        )}
        <div className="chat-window--input">
          <ChatInput onSendMessage={sendMessage} />
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
