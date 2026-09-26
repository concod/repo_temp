export default function TypingIndicator() {
    return (
        <div className="ba-chatbot__typing" aria-label="Agent is typing">
            <span className="ba-chatbot__typing-dot" />
            <span className="ba-chatbot__typing-dot" />
            <span className="ba-chatbot__typing-dot" />
        </div>
    );
}
