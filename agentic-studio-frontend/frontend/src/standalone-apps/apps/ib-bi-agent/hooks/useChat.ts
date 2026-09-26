import { useState } from "react";
import { useChatStore } from "../store";
import { IBAgentService } from "../services/ibAgentService";
import { processResponseText } from "../utils/structuredDataProcessor";
import { DEEP_RESEARCH_CLASSIFIER_AGENT_ID, DEEP_RESEARCH_AGENT_ID } from "../config/ibAgentConfig";

const ibAgentService = new IBAgentService();

export const useChat = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    addMessage,
    setTyping,
    setWaitingForResponse,
    setError,
    updateLastMessage,
    setClassificationResult,
    updateSessionTitleFromClassification,
    isWaitingForResponse,
    manualDeepResearch,
    setManualDeepResearch,
    setActiveSessionId,
    fetchSessions,
  } = useChatStore();

  const sendMessage = async (inputMessage: string): Promise<void> => {
    if (!inputMessage.trim() || isWaitingForResponse || isSubmitting) return;

    const message = inputMessage.trim();

    setIsSubmitting(true);
    setWaitingForResponse(true);
    setError(null);
    setClassificationResult(null);

    addMessage({
      text: message,
      isUser: true,
      clientTimestamp: new Date(),
    });

    const { activeSessionId, selectedSessionId } = useChatStore.getState();
    const apiSessionId = activeSessionId ?? selectedSessionId ?? undefined;
    const hadAssistantMessageInSession = useChatStore
      .getState()
      .messages.some((item: { isUser: boolean }) => !item.isUser);

    setTyping(true);

    try {
      let finalMessage = message;

      if (manualDeepResearch) {
        // Deep research is manually enabled - call both APIs in parallel
        const [classificationResult, deepResearchResponse] = await Promise.all([
          // API 1: Classifier for status only
          ibAgentService
            .sendMessage(message, DEEP_RESEARCH_CLASSIFIER_AGENT_ID, apiSessionId ?? undefined)
            .then((response) => {
              // Parse classification from response
              const parsed = parseClassificationFromResponse(response.text);
              return parsed;
            })
            .catch(() => null),

          // API 2: Deep research agent to process the input
          ibAgentService
            .sendMessage(message, DEEP_RESEARCH_AGENT_ID, apiSessionId ?? undefined)
            .catch(() => null),
        ]);

        // Set classification result for status display (but don't change toggle)
        if (classificationResult) {
          setClassificationResult({
            type: "complex",
            status: classificationResult.status,
            title: classificationResult.title,
          });
          updateSessionTitleFromClassification(classificationResult.title);
        }

        // Use deep research output as input to main agent
        if (deepResearchResponse?.text) {
          finalMessage = deepResearchResponse.text;
        }

        // Disable toggle after send
        setManualDeepResearch(false);
      } else {
        // Normal flow - call classifier to determine if complex
        const classificationPromise = ibAgentService
          .fetchQueryClassification(message, apiSessionId ?? undefined)
          .then((classification) => {
            setClassificationResult(classification);
            updateSessionTitleFromClassification(classification.title);
            return classification;
          })
          .catch(() => null);

        // Wait for classification
        await classificationPromise;
      }

      // Call main agent with the final message
      const response = await ibAgentService.sendMessage(
        finalMessage,
        undefined,
        apiSessionId ?? undefined
      );
      setTyping(false);

      const processed = await processResponseText(
        response.text,
        ibAgentService
      );

      addMessage({
        text: processed.text,
        structuredData: processed.structuredData,
        htmlContent: response.htmlContent,
        isUser: false,
        sources: response.sources,
        suggestions: response.suggestions,
        timing: response.timing,
        isTyping: true,
        executionId: response.executionId,
        sessionId: response.sessionId,
        clientTimestamp: new Date(),
      });

      if (response.sessionId) {
        setActiveSessionId(response.sessionId);
      }

      if (!hadAssistantMessageInSession) {
        await fetchSessions();
      }

      if (response.sources?.length) {
        updateLastMessage({
          sources: response.sources,
        });
      }
    } catch (error) {
      setTyping(false);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "I'm having trouble connecting right now. Please try again in a moment.";

      addMessage({
        text: errorMessage,
        isUser: false,
      });
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
      setWaitingForResponse(false);
      setClassificationResult(null);
      setManualDeepResearch(false);
    }
  };

  return {
    sendMessage,
    isSubmitting,
    isWaitingForResponse,
  };
};

/**
 * Parse classification result from response text
 */
function parseClassificationFromResponse(text: string): { type: string; status: string; title?: string } | null {
  try {
    let jsonStr = text.trim();
    const codeBlockMatch = jsonStr.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }
    const obj = JSON.parse(jsonStr) as Record<string, unknown>;
    const t = obj?.type;
    const s = obj?.status;
    if (typeof t === "string" && typeof s === "string") {
      const title = typeof obj?.title === "string" ? obj.title : undefined;
      return { type: t, status: s, title };
    }
  } catch {
    // ignore
  }
  return null;
}


