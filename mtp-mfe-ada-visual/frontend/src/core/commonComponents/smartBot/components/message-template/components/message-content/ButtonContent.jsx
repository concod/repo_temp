import { useRef } from 'react';
import { Button } from 'impact-ui-v3';
import { makeStyles } from '@mui/styles';
import { pxToRem } from 'core/Utils/functions/utils';
import { useSelector, useDispatch } from 'react-redux';
import { setChatbotContext, setStepFormStreamData } from 'core/actions/smartBotActions';
import { AxiosSource } from '../message-types/streamed-content/AxiosEventSource';
import { BASE_API } from 'config/api';
import isArray from 'lodash/isArray';
import { stopAgentFlow } from 'core/commonComponents/smartBot/services/chatbot-services';

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

const ButtonContent = ({ bodyText, isFormDisabled = false, isStepFormSubmit = false, isFormValid = true }) => {
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
  const chatbotContext = useSelector(
    (state) => state.smartBotReducer.chatbotContext
  );

  const handleButtonClick = (button) => {
    if (isStepFormSubmit) {
      // Build the user_input from chatbotContext
      const userInput = {};
      for (const key in chatbotContext) {
        if (key.startsWith('__')) continue;
        if (chatbotContext[key]?.updated) {
          let value = chatbotContext[key][key];
          userInput[key] = isArray(value)
            ? value
            : typeof value === 'number' ? value : String(value);
        }
      }
      console.log("[ButtonContent] step form submit, calling init API with userInput:", userInput);
      dispatch(setChatbotContext({}));
      // Call the init API via SSE directly
      callInitApiStream(userInput);
      return;
    }
    let sendButton = document.getElementById("chat-input-send-button");
    sendButton.click();
  };

  const callInitApiStream = (userInput) => {
    // Prefer module-level values (set synchronously by StreamedContent), fall back to sessionStorage
    const sessionId = stepFormStreamControl.sessionId || sessionStorage.getItem("stepForm_sessionId") || "";
    const chatId = stepFormStreamControl.chatId || sessionStorage.getItem("stepForm_chatId") || "";
    const agentId = stepFormStreamControl.agentId || sessionStorage.getItem("stepForm_agentId") || "";
    const baseUrl = stepFormStreamControl.baseUrl || sessionStorage.getItem("stepForm_baseUrl") || "";

    const payload = {
      agent_id: agentId,
      session_id: sessionId,
      chat_id: chatId,
      user_input: userInput,
      init: false,
      delay: 0.3,
    };

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
      dispatch(setStepFormStreamData({ status: "error", chunks: [...chunksRef] }));
    };

    // Signal that streaming has started (after setting stepFormStreamControl so useEffect sees the flag)
    dispatch(setStepFormStreamData({ status: "streaming_start", chunks: [] }));
    // Fire DOM event so SmartBot can show stop icon (Redux gets cleared by TabularContent before parent effects run)
    window.dispatchEvent(new CustomEvent("stepFormStreamStart"));

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
        console.log("[ButtonContent] SSE chunk:", data);
        if (data?.status === "step" || data?.status === "step_form" || data?.status === "questions" || data?.status === "thinking" || data?.status === "widget") {
          chunksRef.push(data);
          // If this chunk also carries [DONE], dispatch collected chunks now
          if (data?.message === "[DONE]") {
            stepFormStreamControl.isStreaming = false;
            stepFormStreamControl.abort = null;
            window.dispatchEvent(new CustomEvent("stepFormStreamEnd"));
            dispatch(setStepFormStreamData({ status: "done", chunks: [...chunksRef] }));
          }
        } else if (data?.status === "completed" || data?.message === "[DONE]") {
          // Stream ended — dispatch all collected chunks at once
          stepFormStreamControl.isStreaming = false;
          stepFormStreamControl.abort = null;
          window.dispatchEvent(new CustomEvent("stepFormStreamEnd"));
          // Signal tab switch to agent_response when status is "completed"
          if (data?.status === "completed") {
            window.dispatchEvent(new CustomEvent("stepFormStreamCompleted"));
          }
          dispatch(setStepFormStreamData({ status: "done", chunks: [...chunksRef] }));
        } else if (data?.message) {
          chunksRef.push({ status: "content", message: data.message });
        }
      } catch (e) {
        console.error("[ButtonContent] SSE parse error:", e);
      }
    });

    sourceRef.current.addEventListener("error", () => {
      // On error, still dispatch whatever we collected
      stepFormStreamControl.isStreaming = false;
      stepFormStreamControl.abort = null;
      window.dispatchEvent(new CustomEvent("stepFormStreamEnd"));
      dispatch(setStepFormStreamData({ status: "error", chunks: chunksRef }));
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