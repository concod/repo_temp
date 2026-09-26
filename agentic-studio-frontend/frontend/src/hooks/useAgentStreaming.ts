import { useState, useCallback, useRef, useEffect } from "react";
import { AgentExecutionService } from "../services/agentExecutionService";
import type {
  InferenceRequest,
  StreamingStatusUpdate,
  StreamingResult,
  StreamingStep,
  StreamingState,
} from "../types/api";

export interface UseAgentStreamingReturn {
  streamingState: StreamingState;
  sendMessage: (agentId: string, message: string, file?: File, guardrailsReq?: boolean) => Promise<void>;
  cancelStream: () => void;
  clearHistory: () => void;
  isStreaming: boolean;
  canSend: boolean;
  currentStreamingSteps: StreamingStep[];
  finalResult: StreamingResult | null;
  error: string | null;
}

export const useAgentStreaming = (): UseAgentStreamingReturn => {
  const [streamingState, setStreamingState] = useState<StreamingState>({
    status: "idle",
    steps: [],
    currentMessage: "",
    finalResult: null,
    error: null,
    startTime: null,
    elapsedTime: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const elapsedTimeIntervalRef = useRef<number | null>(null);

  // Update elapsed time during streaming
  useEffect(() => {
    if (streamingState.status === "streaming" && streamingState.startTime) {
      elapsedTimeIntervalRef.current = setInterval(() => {
        setStreamingState((prev) => ({
          ...prev,
          elapsedTime: Math.floor((Date.now() - (prev.startTime || 0)) / 1000),
        }));
      }, 1000) as unknown as number;
    } else {
      if (elapsedTimeIntervalRef.current) {
        clearInterval(elapsedTimeIntervalRef.current);
        elapsedTimeIntervalRef.current = null;
      }
    }

    return () => {
      if (elapsedTimeIntervalRef.current) {
        clearInterval(elapsedTimeIntervalRef.current);
      }
    };
  }, [streamingState.status, streamingState.startTime]);

  const sendMessage = useCallback(
    async (agentId: string, message: string, file?: File, guardrailsReq?: boolean): Promise<void> => {
      try {
        // Reset state for new request
        setStreamingState({
          status: "connecting",
          steps: [],
          currentMessage: "Connecting to agent...",
          finalResult: null,
          error: null,
          startTime: Date.now(),
          elapsedTime: 0,
        });

        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();

        const request: InferenceRequest = {
          agentId,
          userInput: message,
        };

        // Update state to streaming
        setStreamingState((prev) => ({
          ...prev,
          status: "streaming",
          currentMessage: "Processing your request...",
        }));

        await AgentExecutionService.inferStreamEnhanced(
          request,
          file,
          guardrailsReq,
          // onStatusUpdate
          (update: StreamingStatusUpdate) => {
            setStreamingState((prev) => ({
              ...prev,
              currentMessage: update.message || prev.currentMessage,
              status: "streaming",
            }));
          },
          // onStepUpdate
          (step: StreamingStep) => {
            setStreamingState((prev) => ({
              ...prev,
              steps: [...prev.steps, step],
            }));
          },
          // onComplete
          (result: StreamingResult) => {
            // Mark all steps as completed
            setStreamingState((prev) => ({
              ...prev,
              status: "complete",
              finalResult: result,
              currentMessage: "Request completed",
              steps: prev.steps.map((step) => ({
                ...step,
                status: "complete",
              })),
            }));
          },
          // onError
          (error: Error) => {
            // Don't show AbortError to user - it's expected when navigating away
            if (error.name === "AbortError") {
              console.log("[useAgentStreaming] Request aborted gracefully");
              setStreamingState((prev) => ({
                ...prev,
                status: "idle",
                currentMessage: "",
                error: null, // Clear error for aborted requests
              }));
              return;
            }

            setStreamingState((prev) => ({
              ...prev,
              status: "error",
              error: error.message,
              currentMessage: "An error occurred",
            }));
          },
          // signal
          abortControllerRef.current.signal
        );
      } catch (error) {
        console.error("[useAgentStreaming] Send message failed:", error);

        // Don't show AbortError to user - it's expected when navigating away
        if (error instanceof Error && error.name === "AbortError") {
          console.log("[useAgentStreaming] Send message aborted gracefully");
          setStreamingState((prev) => ({
            ...prev,
            status: "idle",
            currentMessage: "",
            error: null, // Clear error for aborted requests
          }));
          return;
        }

        setStreamingState((prev) => ({
          ...prev,
          status: "error",
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
          currentMessage: "Failed to send message",
        }));
      }
    },
    []
  );

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setStreamingState((prev) => ({
      ...prev,
      status: "idle",
      currentMessage: "",
      error: "Request cancelled",
    }));
  }, []);

  const clearHistory = useCallback(() => {
    setStreamingState({
      status: "idle",
      steps: [],
      currentMessage: "",
      finalResult: null,
      error: null,
      startTime: null,
      elapsedTime: 0,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        // Gracefully cancel the stream without logging errors
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (elapsedTimeIntervalRef.current) {
        clearInterval(elapsedTimeIntervalRef.current);
        elapsedTimeIntervalRef.current = null;
      }
      // Reset state to prevent any lingering error states
      setStreamingState({
        status: "idle",
        steps: [],
        currentMessage: "",
        finalResult: null,
        error: null,
        startTime: null,
        elapsedTime: 0,
      });
    };
  }, []);

  return {
    streamingState,
    sendMessage,
    cancelStream,
    clearHistory,
    isStreaming:
      streamingState.status === "connecting" ||
      streamingState.status === "streaming",
    canSend:
      streamingState.status === "idle" ||
      streamingState.status === "complete" ||
      streamingState.status === "error",
    currentStreamingSteps: streamingState.steps,
    finalResult: streamingState.finalResult,
    error: streamingState.error,
  };
};

export default useAgentStreaming;
