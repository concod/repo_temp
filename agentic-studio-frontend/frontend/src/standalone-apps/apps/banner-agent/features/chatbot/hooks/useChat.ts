import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChatResponse } from "../types";
import {
    hasValidImageUrls,
    toProxyGeneratedImageUrl,
} from "../utils/imageUtils";
import {
    formatMessageTime,
    generateMessageId,
    normalizeBannerImageLinksInText,
} from "../utils/messageUtils";
import { useBannerChatStore } from "../../../store/chatStore";
import { bannerAgentService } from "../../../services/bannerAgentService";

export function useChat() {
    const {
        messages,
        isWaitingForResponse,
        isRetrying,
        sessions,
        selectedSessionId,
        activeSessionId,
        sessionsLoading,
        conversationLoading,
        addMessage,
        clearChat,
        setWaitingForResponse,
        setRetrying,
        setActiveSessionId,
        fetchSessions,
        selectSession,
        startNewSession,
    } = useBannerChatStore();

    const [previewImageUrl, setPreviewImageUrl] = useState("");

    // Fetch sessions on mount
    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const previewOpen = Boolean(previewImageUrl);

    const addUserMessage = useCallback(
        (text: string) => {
            addMessage({
                id: generateMessageId("user"),
                role: "user",
                text,
                createdAt: formatMessageTime(),
                sources: [],
                imageUrls: [],
                productImageUrls: [],
                sessionId: activeSessionId ?? selectedSessionId ?? undefined,
            });
        },
        [addMessage, activeSessionId, selectedSessionId]
    );

    const addBotMessage = useCallback(
        (response: ChatResponse, sessionId?: string) => {
            const normalizedText = response.isHtml
                ? response.text
                : normalizeBannerImageLinksInText(response.text);
            const imageUrls = Array.isArray(response.editableImageUrls)
                ? response.editableImageUrls.map((url) => toProxyGeneratedImageUrl(url))
                : [];
            const productImageUrls = Array.isArray(response.productImageUrls)
                ? response.productImageUrls.map((url) => toProxyGeneratedImageUrl(url))
                : [];

            addMessage({
                id: generateMessageId("bot"),
                role: "bot",
                text: normalizedText,
                isHtml: response.isHtml,
                createdAt: formatMessageTime(),
                sources: response.sources,
                imageUrls,
                productImageUrls,
                sessionId,
            });
        },
        [addMessage]
    );

    const addErrorMessage = useCallback(
        (errorMessage: string) => {
            addMessage({
                id: generateMessageId("error"),
                role: "bot",
                text: errorMessage,
                createdAt: formatMessageTime(),
                sources: [],
                imageUrls: [],
                productImageUrls: [],
                isError: true,
            });
        },
        [addMessage]
    );

    const sendChatMessage = useCallback(async (message: string) => {
        const trimmed = message.trim();
        if (!trimmed || isWaitingForResponse) return;

        setWaitingForResponse(true);
        setRetrying(false);
        addUserMessage(trimmed);

        const apiSessionId = activeSessionId ?? selectedSessionId ?? undefined;
        const hadBotMessage = messages.some((m) => m.role === "bot" && !m.isError);

        try {
            const response = await bannerAgentService.sendMessage(trimmed, apiSessionId);

            if (!hasValidImageUrls(response)) {
                setRetrying(true);
                try {
                    const retryResponse = await bannerAgentService.sendMessage(trimmed, apiSessionId);
                    addBotMessage(retryResponse, retryResponse.sessionId);
                    if (retryResponse.sessionId) {
                        setActiveSessionId(retryResponse.sessionId);
                    }
                } catch {
                    addBotMessage(response, response.sessionId);
                    if (response.sessionId) {
                        setActiveSessionId(response.sessionId);
                    }
                } finally {
                    setRetrying(false);
                }
            } else {
                addBotMessage(response, response.sessionId);
                if (response.sessionId) {
                    setActiveSessionId(response.sessionId);
                }
            }

            // After first bot response in a session, refresh session list
            if (!hadBotMessage) {
                await fetchSessions();
            }
        } catch (error) {
            const errorMsg =
                error instanceof Error
                    ? error.message
                    : "An unexpected error occurred. Please try again.";
            addErrorMessage(errorMsg);
        } finally {
            setWaitingForResponse(false);
            setRetrying(false);
        }
    }, [
        addBotMessage,
        addErrorMessage,
        addUserMessage,
        activeSessionId,
        fetchSessions,
        isWaitingForResponse,
        messages,
        selectedSessionId,
        setActiveSessionId,
        setRetrying,
        setWaitingForResponse,
    ]);

    const openPreview = useCallback(() => {
        // Preview panel is intentionally disabled for now.
    }, []);

    const closePreview = useCallback(() => {
        setPreviewImageUrl("");
    }, []);

    const value = useMemo(
        () => ({
            messages,
            isWaitingForResponse,
            isRetrying,
            previewOpen,
            previewImageUrl,
            sessions,
            selectedSessionId,
            activeSessionId,
            sessionsLoading,
            conversationLoading,
            sendChatMessage,
            clearChat,
            openPreview,
            closePreview,
            selectSession,
            startNewSession,
            setActiveSessionId,
            fetchSessions,
        }),
        [
            clearChat,
            closePreview,
            isRetrying,
            isWaitingForResponse,
            messages,
            openPreview,
            previewImageUrl,
            previewOpen,
            sessions,
            selectedSessionId,
            activeSessionId,
            sessionsLoading,
            conversationLoading,
            sendChatMessage,
            selectSession,
            startNewSession,
            setActiveSessionId,
            fetchSessions,
        ]
    );

    return value;
}
