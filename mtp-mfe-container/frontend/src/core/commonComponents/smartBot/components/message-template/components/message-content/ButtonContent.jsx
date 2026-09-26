import { useRef } from 'react';
import { Button } from 'impact-ui-v3';
import { makeStyles } from '@mui/styles';
import { pxToRem } from 'core/Utils/functions/utils';
import { useSelector, useDispatch } from 'react-redux';
import { setChatbotContext, setStepFormStreamData, setThinkingContext, setMinimizedStreamData } from 'core/actions/smartBotActions';
import { AxiosSource } from '../message-types/streamed-content/AxiosEventSource';
import { BASE_API } from 'config/api';
import isArray from 'lodash/isArray';
import isEmpty from 'lodash/isEmpty';
import { stopAgentFlow } from 'core/commonComponents/smartBot/services/chatbot-services';
import { updateQuestionTiming } from 'core/commonComponents/smartBot/services/conversation-service';

// Module-level control object for step-form SSE stream.
// StreamedContent imports this to show/hide the stop icon during the second init stream.
export const stepFormStreamControl = {
  isStreaming: false,
  abort: null,
  // Session info — set by StreamedContent when step_form arrives
  sessionId: "",
  chatId: "",
  agentId: "",
  baseUrl: "",
  // Completed/follow-up state — persists across ButtonContent remounts
  initValue: false,
  uniqueChatId: "",
};

const useStyles = makeStyles((theme) => ({
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  buttonRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginTop: pxToRem(16),
  }
}));

const MAX_RETRY_COUNT_BUTTON = 1; // Number of auto-retries allowed for ButtonContent streams
const RETRY_COUNTDOWN_SECONDS_BUTTON = 15; // Countdown duration before auto-retry

const ButtonContent = ({ bodyText, isFormDisabled = false, isStepFormSubmit = false, isFormValid = true, formParamNames = [], messageIndex = 0 }) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const sourceRef = useRef(null);
  const messageStoreRef = useRef({
    currentMode: "agent",
    chatData: {
      response: "",
      response_heading: "",
      thinkingResponse: {
        thinkingStream: "",
      },
    },
    appendedData: [],
    appendedDataFromLastChunk: [],
    stepFormData: {},
    sessionId: "",
    uniqueChatId: "",
    initValue: false,
    additionalArgs: {},
    status: "",
  });
  // Auto-retry state for ButtonContent streams
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef(null);
  const retryPayloadRef = useRef(null); // Stores the userInput for retries
  const chatbotContext = useSelector(
    (state) => state.smartBotReducer.chatbotContext
  );
  const chatbotContextRef = useRef(chatbotContext);
  chatbotContextRef.current = chatbotContext;
  const persistedFormValues = useSelector(
    (state) => state.smartBotReducer.persistedFormValues
  );
  const persistedFormValuesRef = useRef(persistedFormValues);
  persistedFormValuesRef.current = persistedFormValues;
  const thinkingContext = useSelector(
    (state) => state.smartBotReducer.thinkingContext
  );

  const handleButtonClick = (button) => {
    if (isStepFormSubmit) {
      // Read the latest chatbotContext from ref to avoid stale closures
      const currentContext = chatbotContextRef.current;
      const currentPersisted = persistedFormValuesRef.current;
      // Build the user_input ONLY from formParamNames (current form's fields)
      const userInput = {};
      if (formParamNames.length > 0) {
        formParamNames.forEach((paramName) => {
          // Primary source: chatbotContext (set by handleChange in form components)
          if (currentContext[paramName]?.updated) {
            let value = currentContext[paramName][paramName];
            userInput[paramName] = isArray(value)
              ? value
              : typeof value === 'number' ? value : String(value);
          } else {
            // Fallback: persistedFormValues (covers edge case where chatbotContext
            // was cleared but the form still has a valid selection displayed)
            const persistedKey = `${messageIndex}_${paramName}`;
            const persistedValue = currentPersisted[persistedKey];
            if (persistedValue !== undefined && persistedValue !== null) {
              // For select components, persistedFormValues stores option objects
              if (isArray(persistedValue)) {
                userInput[paramName] = persistedValue.map((opt) => opt.value !== undefined ? opt.value : opt);
              } else {
                userInput[paramName] = typeof persistedValue === 'number' ? persistedValue : String(persistedValue);
              }
            }
          }
        });
      } else {
        // Legacy fallback: no formParamNames provided, iterate chatbotContext
        for (const key in currentContext) {
          if (key.startsWith('__')) continue;
          if (currentContext[key]?.updated) {
            let value = currentContext[key][key];
            userInput[key] = isArray(value)
              ? value
              : typeof value === 'number' ? value : String(value);
          }
        }
      }
      dispatch(setChatbotContext({}));
      // Call the init API via SSE directly
      callInitApiStream(userInput);
      return;
    }
    let sendButton = document.getElementById("chat-input-send-button");
    sendButton.click();
  };

  const callInitApiStream = (userInput) => {
    // Store payload for potential retries
    retryPayloadRef.current = userInput;
    // Prefer module-level values (set synchronously by StreamedContent), fall back to sessionStorage
    // If a previous completed/follow-up response updated the state, use those values.
    // Read from module-level stepFormStreamControl (survives remounts) instead of local messageStoreRef.
    const hasCompletedState = stepFormStreamControl.initValue === true;
    const sessionId = hasCompletedState
      ? (stepFormStreamControl.sessionId ?? "")
      : (stepFormStreamControl.sessionId || sessionStorage.getItem("stepForm_sessionId") || "");
    const chatId = hasCompletedState
      ? (stepFormStreamControl.uniqueChatId ?? "")
      : (stepFormStreamControl.chatId || sessionStorage.getItem("stepForm_chatId") || "");
    const agentId = stepFormStreamControl.agentId || sessionStorage.getItem("stepForm_agentId") || "";
    const baseUrl = stepFormStreamControl.baseUrl || sessionStorage.getItem("stepForm_baseUrl") || "";

    const payload = {
      agent_id: agentId,
      session_id: sessionId,
      chat_id: chatId,
      user_input: userInput,
      init: hasCompletedState ? true : false,
      delay: 0.3,
    };

    // Reset the flag so subsequent calls don't re-use stale completed state
    if (hasCompletedState) {
      messageStoreRef.current.initValue = false;
      stepFormStreamControl.initValue = false;
    }

    const endPoint = baseUrl
      ? `${BASE_API}${baseUrl}/chatbot/agent/init`
      : `${BASE_API}/core/chatbot/agent/init`;

    // Collect all chunks, dispatch once when stream ends
    const chunksRef = [];

    // Expose stream control BEFORE Redux dispatch so SmartBot index.jsx can show stop icon
    stepFormStreamControl.isStreaming = true;
    stepFormStreamControl.abort = () => {
      if (sourceRef.current) {
        sourceRef.current.close();
        sourceRef.current = null;
      }
      stepFormStreamControl.isStreaming = false;
      stepFormStreamControl.abort = null;
      // Stop the agent flow on the backend (same as StreamedContent.abortStreaming)
      if (sessionId) {
        stopAgentFlow({ session_id: sessionId }, baseUrl);
      }
      dispatch(setStepFormStreamData({ status: "error", chunks: [...chunksRef], sessionId }));
    };

    // Signal that streaming has started (after setting stepFormStreamControl so useEffect sees the flag)
    dispatch(setStepFormStreamData({ status: "streaming_start", chunks: [], sessionId }));
    // Fire DOM event so SmartBot can show stop icon (Redux gets cleared by TabularContent before parent effects run)
    window.dispatchEvent(new CustomEvent("stepFormStreamStart"));
    // Capture start time for computing elapsed on completion.
    // Timer keeps running from the original streamStartTime (set when first API was hit).
    const stepFormStreamStartTime = Date.now();
    const originalStreamStart = thinkingContext?.streamStartTime || stepFormStreamStartTime;
    // Track the latest question for minimized widget updates
    let latestQuestionForMinimized = "Processing";

    // Update minimized widget to reflect new stream starting (clear step_form state)
    dispatch(setMinimizedStreamData({
      isStreaming: true,
      stepHeader: "Thinking",
      stepSubHeader: "Working on the next step...",
      stepStatus: "not-completed",
      streamStartTime: originalStreamStart,
      actionCount: 1,
    }));

    sourceRef.current = AxiosSource(
      endPoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify(payload),
        timeout: 30000,
      },
      messageStoreRef
    );

    // Listen for SSE messages and collect all chunks
    sourceRef.current.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);
        // Always keep stepFormStreamControl.sessionId in sync with the latest chunk's session_id
        if (data?.session_id) {
          stepFormStreamControl.sessionId = data.session_id;
          sessionStorage.setItem("stepForm_sessionId", data.session_id);
        }
        if (data?.chat_id) {
          stepFormStreamControl.chatId = data.chat_id;
          sessionStorage.setItem("stepForm_chatId", data.chat_id);
        }
        if (data?.status === "step" || data?.status === "step_form" || data?.status === "questions" || data?.status === "thinking" || data?.status === "widget") {
          chunksRef.push(data);
          // Dispatch step/step_form/questions/widget chunks immediately for real-time rendering
          if (data?.status === "widget") {
            dispatch(setStepFormStreamData({ status: "widget_chunk", chunks: [data], sessionId }));
          } else if (data?.status === "step" || data?.status === "step_form" || data?.status === "questions") {
            dispatch(setStepFormStreamData({ status: "step_chunk", chunks: [data], sessionId }));
          }
          // Update minimized widget with latest step data
          if (data?.status === "questions") {
            const intent = data?.current_intent || data?.widget_data?.[0]?.current_intent;
            if (intent) latestQuestionForMinimized = intent;
            dispatch(setMinimizedStreamData({
              isStreaming: true,
              stepHeader: latestQuestionForMinimized,
              stepSubHeader: "Working on the next step...",
              stepStatus: "not-completed",
              streamStartTime: originalStreamStart,
              actionCount: 1,
            }));
          } else if (data?.status === "step") {
            const stepData = isArray(data?.widget_data) ? data.widget_data[0] : data?.widget_data;
            const intent = data?.current_intent || stepData?.current_intent;
            if (intent) latestQuestionForMinimized = intent;
            dispatch(setMinimizedStreamData({
              isStreaming: true,
              stepHeader: latestQuestionForMinimized,
              stepSubHeader: stepData?.sub_header || stepData?.header || "Processing...",
              stepStatus: stepData?.step_status || "not-completed",
              streamStartTime: originalStreamStart,
              actionCount: 1,
            }));
          } else if (data?.status === "step_form") {
            const stepData = isArray(data?.widget_data) ? data.widget_data[0] : data?.widget_data;
            const intent = data?.current_intent || stepData?.current_intent;
            if (intent) latestQuestionForMinimized = intent;
            dispatch(setMinimizedStreamData({
              isStreaming: true,
              stepHeader: latestQuestionForMinimized,
              stepSubHeader: "Waiting for your response",
              stepStatus: "step_form",
              streamStartTime: originalStreamStart,
              actionCount: 0,
            }));
          }
          // If this chunk also carries [DONE], dispatch collected chunks now
          if (data?.message === "[DONE]") {
            stepFormStreamControl.isStreaming = false;
            stepFormStreamControl.abort = null;
            window.dispatchEvent(new CustomEvent("stepFormStreamEnd"));
            dispatch(setStepFormStreamData({ status: "done", chunks: [...chunksRef], sessionId }));
          }
        } else if (data?.status === "completed" || data?.status === "follow-up" || data?.message === "[DONE]") {
          // Capture the turn's session id BEFORE it's cleared below (used for
          // the timing PATCH). Falls back to the retained control/sessionStorage.
          const turnSessionId =
            data?.session_id ||
            stepFormStreamControl.sessionId ||
            sessionStorage.getItem("stepForm_sessionId") ||
            "";
          // Extract widget_data from completed/[DONE] chunks (e.g. graph widgets)
          if (!isEmpty(data?.widget_data)) {
            chunksRef.push({ ...data, status: "widget" });
            dispatch(setStepFormStreamData({ status: "widget_chunk", chunks: [{ ...data, status: "widget" }], sessionId }));
          }
          // Clear minimized widget on completion
          if (data?.status === "completed") {
            dispatch(setMinimizedStreamData(null));
          }
          // Update messageStoreRef the same way AxiosEventSource does for completed/follow-up
          if (data?.status === "completed" || data?.status === "follow-up") {
            messageStoreRef.current.initValue = true;
            messageStoreRef.current.sessionId = "";
            messageStoreRef.current.uniqueChatId = data?.chat_id ? data.chat_id : "";
            // Also persist on module-level object so it survives ButtonContent remounts
            stepFormStreamControl.initValue = true;
            stepFormStreamControl.sessionId = "";
            stepFormStreamControl.uniqueChatId = data?.chat_id ? data.chat_id : "";
            // Clear sessionStorage so stale session_id isn't picked up by future non-init calls
            sessionStorage.setItem("stepForm_sessionId", "");
            // Notify SmartBot to update its initValue/sessionId state
            window.dispatchEvent(new CustomEvent("stepFormInitStateUpdate", {
              detail: { initValue: true, sessionId: "", uniqueChatId: data?.chat_id || "" },
            }));
          }
          // Stream ended — dispatch all collected chunks at once
          stepFormStreamControl.isStreaming = false;
          stepFormStreamControl.abort = null;
          window.dispatchEvent(new CustomEvent("stepFormStreamEnd"));
          // Stop the timer only when status:"completed" is received
          if (data?.status === "completed") {
            // Use the original streamStartTime from Redux (set when first API was hit)
            const originalStartTime = thinkingContext?.streamStartTime || stepFormStreamStartTime;
            const totalElapsed = Math.floor((Date.now() - originalStartTime) / 1000);
            const sfMin = Math.floor(totalElapsed / 60);
            const sfSec = totalElapsed % 60;
            const sfWorkedLabel = `Completed in ${sfMin}m:${String(sfSec).padStart(2, '0')}s`;
            dispatch(setThinkingContext({
              streamStartTime: originalStartTime,
              isStreamCompleted: true,
              finalElapsedSeconds: totalElapsed,
              thinkingHeaderMessage: sfWorkedLabel,
              thinkingContent: "",
            }));
            // Persist how long this step-form turn took: PATCH /questions/{session_id}.
            // This restream completes outside StreamedContent, so its timing must
            // be recorded here. Fire-and-forget; skip if we have no session id.
            if (turnSessionId) {
              const endMs = Date.now();
              const durationMs = Math.max(0, Math.round(endMs - originalStartTime));
              updateQuestionTiming(turnSessionId, {
                startTime: new Date(originalStartTime).toISOString(),
                endTime: new Date(endMs).toISOString(),
                duration: durationMs,
              }).catch((err) =>
                console.error("updateQuestionTiming (step form) error", err)
              );
            }
          }
          // Signal tab switch to agent_response when status is "completed",
          // but only if the response doesn't contain a new step_form that needs user interaction
          const hasStepForm = chunksRef.some((c) => c.status === "step_form");
          if (data?.status === "completed" && !hasStepForm) {
            window.dispatchEvent(new CustomEvent("stepFormStreamCompleted"));
          }
          dispatch(setStepFormStreamData({ status: "done", chunks: [...chunksRef], sessionId }));
        } else if (data?.message) {
          chunksRef.push({ status: "content", message: data.message });
        }
      } catch (e) {
        console.error("[ButtonContent] SSE parse error:", e);
      }
    });

    sourceRef.current.addEventListener("error", (event) => {
      stepFormStreamControl.isStreaming = false;
      stepFormStreamControl.abort = null;
      window.dispatchEvent(new CustomEvent("stepFormStreamEnd"));

      // Don't retry if the user manually aborted the request
      const isUserAbort = event.reason === "Network request aborted";

      // Check if we can auto-retry (abrupt close or 503, but not user abort)
      if (!isUserAbort && retryCountRef.current < MAX_RETRY_COUNT_BUTTON) {
        // Dispatch a "retrying" status so TabularContent can show countdown UI
        dispatch(setStepFormStreamData({ status: "retrying", chunks: [...chunksRef], sessionId, countdown: RETRY_COUNTDOWN_SECONDS_BUTTON }));
        // Start countdown and auto-retry
        let countdown = RETRY_COUNTDOWN_SECONDS_BUTTON;
        retryTimerRef.current = setInterval(() => {
          countdown -= 1;
          if (countdown <= 0) {
            clearInterval(retryTimerRef.current);
            retryTimerRef.current = null;
            retryCountRef.current += 1;
            // Re-invoke with same payload
            callInitApiStream(retryPayloadRef.current);
          } else {
            // Update countdown in Redux for UI
            dispatch(setStepFormStreamData({ status: "retrying", chunks: [...chunksRef], sessionId, countdown }));
          }
        }, 1000);
      } else {
        // Retries exhausted or user-aborted — show final message
        chunksRef.push({ status: "content", message: "Please reach out to IA for this, as this didn't work even after retry" });
        dispatch(setStepFormStreamData({ status: "error", chunks: [...chunksRef], sessionId }));
      }
    });

    // Handle stream closure — fires when the HTTP request completes successfully.
    // If [DONE] was received, stepFormStreamControl.isStreaming is already false.
    // If [DONE] was NOT received, the connection closed abruptly mid-processing.
    sourceRef.current.addEventListener("close", () => {
      if (stepFormStreamControl.isStreaming) {
        stepFormStreamControl.isStreaming = false;
        stepFormStreamControl.abort = null;
        window.dispatchEvent(new CustomEvent("stepFormStreamEnd"));

        // Check if we can auto-retry
        if (retryCountRef.current < MAX_RETRY_COUNT_BUTTON) {
          dispatch(setStepFormStreamData({ status: "retrying", chunks: [...chunksRef], sessionId, countdown: RETRY_COUNTDOWN_SECONDS_BUTTON }));
          let countdown = RETRY_COUNTDOWN_SECONDS_BUTTON;
          retryTimerRef.current = setInterval(() => {
            countdown -= 1;
            if (countdown <= 0) {
              clearInterval(retryTimerRef.current);
              retryTimerRef.current = null;
              retryCountRef.current += 1;
              callInitApiStream(retryPayloadRef.current);
            } else {
              dispatch(setStepFormStreamData({ status: "retrying", chunks: [...chunksRef], sessionId, countdown }));
            }
          }, 1000);
        } else {
          // Retries exhausted — show final message
          chunksRef.push({ status: "content", message: "Please reach out to IA for this, as this didn't work even after retry" });
          dispatch(setStepFormStreamData({ status: "error", chunks: [...chunksRef], sessionId }));
        }
      }
    });

    // Handle stream closure — fires when the HTTP request completes successfully.
    // If [DONE] was received, the "message" handler already dispatched status:"done"
    // and set stepFormStreamControl.isStreaming = false.
    // If [DONE] was NOT received, the connection closed abruptly mid-processing.
    sourceRef.current.addEventListener("close", () => {
      if (stepFormStreamControl.isStreaming) {
        stepFormStreamControl.isStreaming = false;
        stepFormStreamControl.abort = null;
        window.dispatchEvent(new CustomEvent("stepFormStreamEnd"));
        // Append the abrupt close message as a content chunk so TabularContent
        // renders it at the bottom (after any already-received widgets/steps)
        chunksRef.push({ status: "content", message: "The requested Task has ended unexpectedly, please retry again" });
        dispatch(setStepFormStreamData({ status: "error", chunks: [...chunksRef], sessionId }));
      }
    });
  };

  const renderButtons = () => {
    if (!Array.isArray(bodyText.buttons)) {
      return null;
    }

    return bodyText.buttons.map((button, index) => (
      <div key={index}>
        <Button
          variant={button.variant || "primary"}
          size={button.size || "medium"}
          onClick={() => handleButtonClick(button)}
          disabled={button.disabled || isFormDisabled || (isStepFormSubmit && !isFormValid)}
          className={button.className}
          icon={button.icon}
          iconPlacement={button.iconPlacement || "left"}
        >
          {button.label}
        </Button>
      </div>
    ));
  };

  return (
    <div className={classes.buttonContainer}>
      {bodyText.message && (
        <div className={classes.message}>{bodyText.message}</div>
      )}
      <div className={classes.buttonRow}>
        {renderButtons()}
      </div>
    </div>
  );
};

export default ButtonContent; 