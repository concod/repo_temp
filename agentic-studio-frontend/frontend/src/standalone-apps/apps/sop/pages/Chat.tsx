import { useChatStore } from "../store";
import { useChat } from "../hooks/useChat";
import { useEffect } from "react";
import { pspSopService } from "../services/PspSopService";
import { WelcomeScreen } from "../components/Chat/WelcomeScreen";
import { ChatInput } from "../components/Input/ChatInput";
import { ChatMessages } from "../components/Chat/ChatMessages";

const Chat = () => {
  const { messages } = useChatStore();
  const { sendMessage, isWaitingForResponse } = useChat();

  const hasMessages = messages.length > 0;

  // Clear sessionId on component mount (handles page reload)
  useEffect(() => {
    pspSopService.clearSessionId();
  }, []);

  const handleSuggestionClick = (suggestion: string) => {
    if (isWaitingForResponse) return;
    sendMessage(suggestion);
  };

  if (!hasMessages) {
    return <WelcomeScreen isVisible={true} onSendMessage={sendMessage} />;
  }

  return (
    <div className="psp-sop-chat-area">
      <ChatMessages onSuggestionClick={handleSuggestionClick} />
      <ChatInput onSendMessage={sendMessage} />
    </div>
  );
};

export default Chat;
