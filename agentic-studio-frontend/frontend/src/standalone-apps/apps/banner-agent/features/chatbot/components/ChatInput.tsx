import { useEffect, useRef, useState } from "react";
import sendIcon from "../../../assets/send-icon.svg";

type ChatInputProps = {
    onSend: (message: string) => void;
    disabled: boolean;
    placeholder?: string;
};

export default function ChatInput({ onSend, disabled, placeholder = "Type your message here..." }: ChatInputProps) {
    const [message, setMessage] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }, [message]);

    const handleSend = () => {
        const text = message.trim();
        if (!text || disabled) return;
        onSend(text);
        setMessage("");
    };

    return (
        <div className="ba-chatbot__input-area">
            <textarea
                ref={textareaRef}
                value={message}
                rows={1}
                disabled={disabled}
                placeholder={placeholder}
                aria-label="Message input"
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                    }
                }}
            />
            <button type="button" onClick={handleSend} disabled={disabled} aria-label="Send message">
                <img src={sendIcon} alt="Send" />
            </button>
        </div>
    );
}
