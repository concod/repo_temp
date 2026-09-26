import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ChatInput from "./ChatInput";
import MessageList from "./MessageList";
import ChatHistoryDrawer from "./ChatHistoryDrawer";
import { useChat } from "../hooks/useChat";
import { useStandaloneCreativeConfig } from "../../../../../shared/packages/marketingCreativeCore/provider";
import chatDog from "../../../assets/chat-dog.svg";

type ChatWindowProps = {
    embedded?: boolean;
};

const ADVANCED_EDITOR_SESSION_IMAGE_KEY = "banner-agent:advanced-editor-source";
const ADVANCED_EDITOR_PRODUCT_IMAGES_KEY = "banner-agent:advanced-editor-product-images";

export default function ChatWindow({ embedded = false }: ChatWindowProps) {
    const navigate = useNavigate();
    const { defaultPrompt } = useStandaloneCreativeConfig();
    const {
        messages,
        isWaitingForResponse,
        isRetrying,
        sessions,
        selectedSessionId,
        sessionsLoading,
        conversationLoading,
        sendChatMessage,
        clearChat,
        selectSession,
        startNewSession,
        setActiveSessionId,
    } = useChat();
    const hasMessages = messages.length > 0;
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const hasInitializedSessionRef = useRef(false);

    // --- URL ↔ Session sync (same pattern as IB agent) ---

    const sessionIdFromUrl = (searchParams.get("session_id") ?? "").trim();

    // On mount: restore session from URL or create a new one
    useEffect(() => {
        if (hasInitializedSessionRef.current) return;
        hasInitializedSessionRef.current = true;

        const targetSessionId = sessionIdFromUrl || startNewSession();

        if (!sessionIdFromUrl) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.set("session_id", targetSessionId);
            setSearchParams(nextParams, { replace: true });
        }

        setActiveSessionId(targetSessionId);
        void selectSession(targetSessionId);
    }, [
        sessionIdFromUrl,
        searchParams,
        setSearchParams,
        setActiveSessionId,
        selectSession,
        startNewSession,
    ]);

    // Keep URL in sync when selectedSessionId changes
    useEffect(() => {
        const currentParam = (searchParams.get("session_id") ?? "").trim();

        if (selectedSessionId && currentParam !== selectedSessionId) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.set("session_id", selectedSessionId);
            setSearchParams(nextParams, { replace: true });
            return;
        }

        if (!selectedSessionId && currentParam) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete("session_id");
            setSearchParams(nextParams, { replace: true });
        }
    }, [searchParams, selectedSessionId, setSearchParams]);

    const splitStyle = useMemo(
        () => ({
            gridTemplateColumns: "minmax(360px, 1240px)",
            justifyContent: "center",
            width: "100%",
        }),
        []
    );

    const handleSelectSession = useCallback(async (sessionId: string) => {
        await selectSession(sessionId);
        setDrawerOpen(false);
    }, [selectSession]);

    const handleNewChat = useCallback(() => {
        const newSessionId = startNewSession();
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set("session_id", newSessionId);
        setSearchParams(nextParams, { replace: true });
        setDrawerOpen(false);
    }, [startNewSession, searchParams, setSearchParams]);

    const handleCloseDrawer = useCallback(() => {
        setDrawerOpen(false);
    }, []);

    const handleClearChat = () => {
        const newSessionId = clearChat();
        if (newSessionId) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.set("session_id", newSessionId);
            setSearchParams(nextParams, { replace: true });
        }
    };

    const handleOpenAdvancedEditor = useCallback(() => {
        // Direct-entry flow should open canvas/templates without inheriting a prior hero image.
        window.sessionStorage.removeItem(ADVANCED_EDITOR_SESSION_IMAGE_KEY);
        window.sessionStorage.removeItem(ADVANCED_EDITOR_PRODUCT_IMAGES_KEY);
        navigate("../advanced-editor?mode=banner", { relative: "path" });
    }, [navigate]);

    const chatSection = (
        <section className={`ba-chatbot ${embedded ? "ba-chatbot--embedded" : ""}`} style={splitStyle}>
            {/* Chat History Drawer (right-side sliding panel) */}
            <ChatHistoryDrawer
                isOpen={drawerOpen}
                sessions={sessions}
                selectedSessionId={selectedSessionId}
                loading={sessionsLoading}
                conversationLoading={conversationLoading}
                onClose={handleCloseDrawer}
                onSelectSession={handleSelectSession}
                onNewChat={handleNewChat}
            />

            <article className={`ba-chatbot__panel ${hasMessages ? "is-chat-mode" : ""}`}>
                {/* Always-visible topbar */}
                <header className="ba-chatbot__topbar">
                    <button
                        type="button"
                        onClick={() => setDrawerOpen(true)}
                        className="ba-chatbot__history-toggle"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        History
                    </button>
                    <button
                        type="button"
                        onClick={handleOpenAdvancedEditor}
                    >
                        Advanced Editor
                    </button>
                    {hasMessages && (
                        <button type="button" onClick={handleClearChat} disabled={isWaitingForResponse}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            New Chat
                        </button>
                    )}
                </header>

                <div className="ba-chatbot__intro-stage" aria-hidden={hasMessages}>
                    <div className="ba-chatbot__hero">
                        <img src={chatDog} alt="Chat assistant" className="ba-chatbot__hero-dog" />
                        <div className="ba-chatbot__hero-content">
                            <h1>What should I create for you!</h1>
                            <p>Generates assets for your product ad campaigns</p>
                        </div>
                    </div>

                    <div className="ba-chatbot__composer-wrap ba-chatbot__composer-wrap--intro">
                        <ChatInput
                            onSend={sendChatMessage}
                            disabled={isWaitingForResponse || hasMessages}
                            placeholder="Ask anything to our Artist"
                        />

                        <div className="ba-chatbot__hero-example">
                            <span>For Example, try this:</span>
                            <button
                                type="button"
                                onClick={() => sendChatMessage(defaultPrompt)}
                                disabled={hasMessages}
                            >
                                {defaultPrompt}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="ba-chatbot__chat-stage" aria-hidden={!hasMessages}>
                    {conversationLoading ? (
                        <div className="ba-chatbot__loading">Loading conversation...</div>
                    ) : (
                        <MessageList
                            messages={messages}
                            isTyping={isWaitingForResponse}
                            isRetrying={isRetrying}
                        />
                    )}

                    <div className="ba-chatbot__composer-wrap">
                        <ChatInput
                            onSend={sendChatMessage}
                            disabled={isWaitingForResponse || conversationLoading}
                            placeholder="Ask anything to Alan"
                        />
                    </div>
                </div>
            </article>

        </section>
    );

    if (embedded) {
        return chatSection;
    }

    return <section className="ba-chatbot-shell">{chatSection}</section>;
}
