import { useEffect, useRef } from "react";
import type { ChatMessage } from "../types";
import MessageItem from "./MessageItem";
import TypingIndicator from "./TypingIndicator";

type MessageListProps = {
    messages: ChatMessage[];
    isTyping: boolean;
    isRetrying: boolean;
};

export default function MessageList({ messages, isTyping, isRetrying }: MessageListProps) {
    const listRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const target = listRef.current;
        if (!target) return;
        target.scrollTop = target.scrollHeight;
    }, [messages, isTyping, isRetrying]);

    return (
        <div className="ba-chatbot__messages" ref={listRef}>
            <div className="ba-chatbot__day-pill">
                <span>Today</span>
            </div>

            {messages.map((message) => (
                <MessageItem key={message.id} message={message} />
            ))}

            {isRetrying ? (
                <div className="ba-chatbot__retry">
                    {/* <i className="fas fa-sync-alt fa-spin" aria-hidden="true" /> */}
                    <div>
                        <strong>Error occurred during agent execution</strong>
                        <p>Retrying to generate response. Please wait..</p>
                    </div>
                </div>
            ) : null}

            {isTyping ? <TypingIndicator /> : null}
        </div>
    );
}
