import { useEffect } from "react";
import ChatSystemDrawer from "./ChatSystemDrawer/ChatSystemDrawer";
import { useSelector } from "react-redux";

const ChatSystem = () => {
  const chatOpen = useSelector((state) => state.commonChatReducer?.openChat);

  useEffect(() => {
    if (chatOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [chatOpen]);

  if (chatOpen) {
    return (
      <section id="chat-system">
        <ChatSystemDrawer openChat={chatOpen} />
      </section>
    );
  }

  return null;
};

export default ChatSystem;
