import React, { useEffect, useState, useRef } from "react";
import { Typography, Collapse, IconButton, Button } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { AxiosSource } from "./AxiosEventSource";
import { BASE_API } from "config/api";
import { parseResponse } from "core/commonComponents/smartBot/utlis";
import { TextRenderer } from "core/commonComponents/smartBot/components/TextRenderer";
import { useStyles as useChatStyles } from "core/commonComponents/smartBot/styling";
import { useStyles } from "./styling.js";
import { pxToRem } from "core/Utils/functions/utils";
import isArray from "lodash/isArray.js";
import isEmpty from "lodash/isEmpty.js";
import ExpandMoreIcon from "coreAssets/chatbot/expand_more.svg";
import { cloneDeep, isObject } from "lodash";
import ThinkingIndicator from "./ThinkingIndicator.jsx";
import ThinkinHeaderInfo from "./ThinkinHeaderInfo";
import { useDispatch, useSelector } from "react-redux";
import { setThinkingContext, setMinimizedStreamData } from "core/actions/smartBotActions";
import StepsResponseTab from "./steps-response-tab/StepsResponseTab";
import colours from "core/Styles/colours";
import { setCurrentAgentChatId } from "core/actions/smartBotActions";
import { stopAgentFlow } from "core/commonComponents/smartBot/services/chatbot-services";
import { updateQuestionTiming } from "core/commonComponents/smartBot/services/conversation-service";
import { stepFormStreamControl } from "../../message-content/ButtonContent.jsx";
import { resetStepFormTimeoutFlag } from "../../message-content/StepFormContent.jsx";
import { showTabNotification } from "core/commonComponents/smartBot/tabNotification";

/**
 * Module-level Map to persist streaming state across component remounts (tab switches).
 * Keyed by a stable identifier derived from input payload + mode + conversation ID.
 * This survives the cloneDeep replacement of botData in SmartBot's useEffect.
 */
const streamStateMap = new Map();

/**
 * Formats thinking time to display minutes when appropriate
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
const formatThinkingTime = (seconds) => {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    return `${minutes} min ${remainingSeconds} sec`;
  }
};

/**
 * StreamedContent Component
 * Handles real-time streaming of chat messages with a typing-like effect
 *
 * @param {Object} botData - Contains conversation data and utility objects
 * @param {Object} botData.utilityObject - Contains refs and IDs for chat management
 * @param {string} botData.utilityObject.activeConversationId - Current conversation ID
 * @param {string} botData.utilityObject.currentMode - Current chat mode
 * @param {React.RefObject} botData.utilityObject.chatDataRef - Ref to chat data
 * @param {React.RefObject} botData.utilityObject.chatBodyRef - Ref to chat body element
 * @param {Function} botData.utilityObject.setChatDataState - Function to update chat data state
 */
const StreamedContent = ({ botData, botProps }) => {
  const {
    activeConversationId,
    currentMode,
    chatDataRef,
    chatBodyRef,
    setChatDataState,
    chatDataInfoRef,
    setLoader = (params) => {},
    processResponse = (params) => {},
    setThinkingContent,
    thinkingContent,
    isThinking: isThinkingFromParent,
    setIsThinking: setIsThinkingFromParent,
    chatId,
    setChatId,
    isStop,
    setIsStop,
    functionsRef,
    functionsState,
    setFunctionsState,
    thinkingHeaderMessage,
    setThinkingHeaderMessage,
    baseUrl,
    setNavSessionId
  } = botData.utilityObject || {};
  const classes = useStyles();
  const chatClasses = useChatStyles();
  const dispatch = useDispatch();

  // Detect if this is a remount after user-aborted stream (for instant state restoration)
  const _initMapState = streamStateMap.get(
    `${currentMode}_${activeConversationId}_${JSON.stringify(botData.inputBody)}`
  );
  const _isAbortedRemount = !!(_initMapState?.initiated && _initMapState?.completed && _initMapState?.aborted);

  // State management for streaming content
  const [content, setContent] = useState(() =>
    _isAbortedRemount ? (_initMapState.messageStore?.chatData?.response || "") : ""
  );
  // const [thinkingContent, setThinkingContent] = useState("");
  const [thinkDone, setThinkDone] = useState(false);
  const [isStreaming, setIsStreaming] = useState(_isAbortedRemount ? false : true);
  const [wasStreamingAborted, setWasStreamingAborted] = useState(_isAbortedRemount);
  const wasStreamingAbortedRef = useRef(_isAbortedRemount);
  const [thinkingStarted, setThinkingStarted] = useState(false);
  const [isStreamingDone, setIsStreamingDone] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingTime, setThinkingTime] = useState(0);
  const [showThoughtDropdown, setShowThoughtDropdown] = useState(false);
  const [isThoughtExpanded, setIsThoughtExpanded] = useState(false);
  const [steps, setSteps] = useState(() => {
    if (_isAbortedRemount) {
      return _initMapState.completedSteps || [{
        header: "Processing Request",
        sub_header: "Analyzing the current request",
        step_status: "completed"
      }];
    }
    return [{
      header: "Processing Request",
      sub_header: "Analyzing the current request",
      step_status: "not-completed"
    }];
  });
  const [questions, setQuestions] = useState([]);
  const [questionsStepsMap, setQuestionsStepsMap] = useState({});
  const [stepFormDataMap, setStepFormDataMap] = useState({});
  const [stepChange, setStepChange] = useState(false);
  const [stepsDone, setStepsDone] = useState(_isAbortedRemount);
  const [finalStepDone, setFinalStepDone] = useState(false);
  const [streamingWidgetData, setStreamingWidgetData] = useState([]);
  // Auto-retry state
  const MAX_RETRY_COUNT = 1; // Number of auto-retries allowed
  const RETRY_COUNTDOWN_SECONDS = 15; // Countdown duration before auto-retry
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const retryCountRef = useRef(0); // How many retries have been attempted
  const retryTimerRef = useRef(null); // Interval ref for countdown
  const retryCountdownRef = useRef(0); // Non-state countdown for interval callback
  const thinkingContentRef = useRef("");
  const thinkingContext = useSelector((state) => {
    return state.smartBotReducer.thinkingContext;
  });
  const stepRef = useRef(_isAbortedRemount
    ? (_initMapState.completedSteps || [{
        header: "Processing Request",
        sub_header: "Analyzing the current request",
        step_status: "completed"
      }])
    : [{
        header: "Processing Request",
        sub_header: "Analyzing the current request",
        step_status: "not-completed"
      }]
  );
  const questionsRef = useRef([]);
  const questionsStepsMapRef = useRef({});
  const stepFormDataMapRef = useRef({});
  const { thinkingHeaderMessage: headerMessage } = thinkingContext;

  // Refs to maintain data across renders
  const sourceRef = useRef(null); // Holds the SSE source instance
  const lastMessageRef = useRef(""); // Tracks the last received message
  const thinkingStartTimeRef = useRef(null);
  const thinkingTimeFinalRef = useRef(0);
  const thinkingHeaderMessageRef = useRef("Working for 0m:00s");
  // Inherit the in-flight start time so a remount (e.g. tab switch, where
  // processStream is not re-run) keeps the original one instead of resetting.
  // Null for a fresh question - processStream sets it.
  const streamStartTimeRef = useRef(
    thinkingContext?.isStreamCompleted ? null : thinkingContext?.streamStartTime || null
  );
  const thinkingDoneRef = useRef(false);
  const thinkingStartedRef = useRef(false);
  const setThinkingContentRef = useRef(setThinkingContent); // Store current setThinkingContent function
  const streamTimeoutRef = useRef(null); // Ref for stream timeout
  const streamingDoneProcessedRef = useRef(_isAbortedRemount); // Guard to prevent isStreamingDone effect running twice
  const stepFormActiveRef = useRef(false); // Guard: when true, step useEffect skips dispatch to avoid overriding step_form data
  // Stable key for the module-level streamStateMap (survives cloneDeep of botData)
  const streamKey = useRef(
    `${currentMode}_${activeConversationId}_${JSON.stringify(botData.inputBody)}`
  ).current;

  // Look up existing stream state from the Map (persists across tab-switch remounts)
  const existingStreamState = streamStateMap.get(streamKey);

  const messageToStoreRef = useRef(
    existingStreamState?.messageStore || {
      status: "",
      currentMode: currentMode,
      chatData: {
        response: "",
        response_heading: "",
        thinkingResponse: {
          thinkingContent: <ThinkingIndicator thinkingContent={thinkingContent} />,
          thinkingStream: "",
          thinkingTime: botData?.utilityObject?.thinkingResponse?.thinkingTime,
          thinkingHeading: botData?.utilityObject?.thinkingResponse?.thinkingHeading
        },
      },
      appendedData: {},
      appendedDataFromLastChunk: {},
      initValue: false,
      sessionId: "",
      navSessionId: "",
      uniqueChatId: "",
      additionalArgs: {},
    }
  );
  const processedChunksRef = useRef(new Set()); // Tracks processed message chunks to prevent duplicates
  const currentContentRef = useRef(""); // Tracks current content before adding new chunk
  const newContentRef = useRef(""); // Tracks content after adding new chunk

  /**
   * Effect to handle automatic scrolling when new content is added
   * Smoothly scrolls to the bottom of the chat when content updates
   */
  // useEffect(() => {
  //   if (chatBodyRef?.current && content) {
  //     const scrollToPosition = chatBodyRef.current.scrollHeight;
  //     chatBodyRef.current.scrollTo({
  //       top: scrollToPosition,
  //       behavior: "smooth",
  //     });
  //   }
  // }, [content]);


  // Update the ref whenever setThinkingContent changes
  useEffect(() => {
    setThinkingContentRef.current = setThinkingContent;
  }, [setThinkingContent]);

  // Dispatch minimized stream data on step changes.
  // Uses the same logic as Steps.jsx to show "Thinking" when the last
  // question is completed but the stream hasn't finished yet.
  useEffect(() => {
    if (isStreamingDone) return;
    if (stepFormActiveRef.current) return; // step_form has taken over — don't override
    const qs = questions;
    const lastQ = qs[qs.length - 1];
    const lastQSteps = questionsStepsMap[lastQ];
    const lastQCompleted = lastQSteps &&
      lastQSteps.length > 0 &&
      lastQSteps.every((s) => s.step_status === "completed");

    // Count only questions whose latest step is not-completed
    const inProgressCount = qs.filter((q) => {
      const qSteps = questionsStepsMap[q];
      if (!qSteps || qSteps.length === 0) return true; // no steps yet = in progress
      const lastStep = qSteps[qSteps.length - 1];
      return lastStep.step_status !== "completed";
    }).length;

    if (lastQCompleted && !stepsDone) {
      // Last question completed but stream not done — show "Thinking"
      dispatch(setMinimizedStreamData({
        isStreaming: true,
        stepHeader: "Thinking",
        stepSubHeader: "Working on the next step...",
        stepStatus: "not-completed",
        streamStartTime: streamStartTimeRef.current,
        actionCount: inProgressCount,
      }));
    } else if (stepRef.current.length > 0) {
      // Normal step update — show the latest question + sub-header
      const latestStep = stepRef.current[stepRef.current.length - 1];
      const latestQuestion = qs[qs.length - 1] || latestStep?.header || "Processing";
      dispatch(setMinimizedStreamData({
        isStreaming: true,
        stepHeader: latestQuestion,
        stepSubHeader: latestStep?.sub_header || "",
        stepStatus: latestStep?.step_status,
        streamStartTime: streamStartTimeRef.current,
        actionCount: inProgressCount,
      }));
    }
  }, [stepChange, questions, questionsStepsMap, stepsDone, isStreamingDone]);

  /**
   * Main effect to initialize and handle the streaming connection
   * Sets up the SSE connection and event listeners for message processing
   */
  const processStream = async () => {
    try {
      // botData.inputBody = {
      //   "query": "get product status for this l2_name 10_Trey Heckmann"
      // }
      let endPoint = botData?.utilityObject?.endpoint
        ? `${BASE_API}${botData?.utilityObject?.endpoint}`
        : `${BASE_API}/core/chatbot/navigation-v2`;
      let method = botData?.utilityObject?.method
        ? botData?.utilityObject?.method
        : "PUT";
      delete botData.inputBody.chat_input;
      // Clear any stale timeout flag from a previous session
      resetStepFormTimeoutFlag();
      // Start the timer immediately when the API is called
      if (!streamStartTimeRef.current) {
        streamStartTimeRef.current = Date.now();
        dispatch(setThinkingContext({
          streamStartTime: streamStartTimeRef.current,
          isStreamCompleted: false,
          finalElapsedSeconds: null,
          thinkingHeaderMessage: "Working for 0m:00s",
          thinkingContent: "",
        }));
      }
      // Initialize SSE connection with API endpoint
      sourceRef.current = AxiosSource(
        endPoint,
        {
          method: method,
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            "Cache-Control": "no-cache",
          },
          body: botData.inputBody
            ? JSON.stringify(botData.inputBody)
            : undefined,
          timeout: 30000, // 30 second timeout
        },
        messageToStoreRef
      );
      // Persist source in module-level Map so the connection survives tab-switch unmounts
      const state = streamStateMap.get(streamKey);
      if (state) {
        state.source = sourceRef.current;
        state.initiated = true;
      }
      // Dispatch initial minimized widget data
      dispatch(setMinimizedStreamData({
        isStreaming: true,
        stepHeader: "Processing Request",
        stepSubHeader: "Analyzing the current request",
        stepStatus: "not-completed",
        streamStartTime: streamStartTimeRef.current,
        actionCount: 1,
      }));
      // localStorage.setItem("isStreaming", "true");
      // Handle incoming messages
      attachListeners(sourceRef.current);
    } catch (error) {
      console.error("Error processing stream:", error);
      setContent("Error streaming response. Please try again.");
      setIsStreaming(false);
      if (isThinking) {
        setIsThinking(false);
        const endTime = Date.now();
        const duration = Math.round((endTime - thinkingStartTimeRef.current) / 1000);
        const finalThinkingTime = Math.max(duration, 1); // Ensure at least 1 second
        setThinkingTime(finalThinkingTime);
        setShowThoughtDropdown(true);
        
        // Store thinking time in messageToStoreRef for persistence
        messageToStoreRef.current.chatData.thinkingResponse.thinkingTime = finalThinkingTime;
      }
    }
  };

  /**
   * Starts the auto-retry countdown. Shows "Auto re-trying in Xs" with a "Retry Now" button.
   * When countdown reaches 0, triggers retryStream().
   */
  const startRetryCountdown = () => {
    setIsRetrying(true);
    retryCountdownRef.current = RETRY_COUNTDOWN_SECONDS;
    setRetryCountdown(RETRY_COUNTDOWN_SECONDS);

    retryTimerRef.current = setInterval(() => {
      retryCountdownRef.current -= 1;
      setRetryCountdown(retryCountdownRef.current);

      if (retryCountdownRef.current <= 0) {
        clearInterval(retryTimerRef.current);
        retryTimerRef.current = null;
        retryStream();
      }
    }, 1000);
  };

  /**
   * Retries the stream with the same payload. Resets all streaming state
   * to simulate a fresh request.
   */
  const retryStream = () => {
    // Clear countdown state
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setIsRetrying(false);
    setRetryCountdown(0);
    retryCountRef.current += 1;

    // Reset streaming state for a fresh start
    setContent("");
    setIsStreaming(true);
    setIsStreamingDone(false);
    setStepsDone(false);
    setFinalStepDone(false);
    setWasStreamingAborted(false);
    wasStreamingAbortedRef.current = false;
    setSteps([{ header: "Processing Request", sub_header: "Analyzing the current request", step_status: "not-completed" }]);
    stepRef.current = [{ header: "Processing Request", sub_header: "Analyzing the current request", step_status: "not-completed" }];
    setQuestions([]);
    questionsRef.current = [];
    setQuestionsStepsMap({});
    questionsStepsMapRef.current = {};
    setStepFormDataMap({});
    stepFormDataMapRef.current = {};
    setStreamingWidgetData([]);
    streamingDoneProcessedRef.current = false;

    // Reset messageToStoreRef for fresh accumulation
    messageToStoreRef.current = {
      status: "",
      currentMode: currentMode,
      chatData: {
        response: "",
        response_heading: "",
        thinkingResponse: {
          thinkingContent: <ThinkingIndicator thinkingContent={thinkingContent} />,
          thinkingStream: "",
          thinkingTime: 0,
          thinkingHeading: null,
        },
      },
      appendedData: {},
      appendedDataFromLastChunk: {},
      initValue: false,
      sessionId: "",
      navSessionId: "",
      uniqueChatId: "",
      additionalArgs: {},
    };

    // Reset stream state map entry and invalidate old listeners
    const state = streamStateMap.get(streamKey);
    if (state) {
      state.messageStore = messageToStoreRef.current;
      state.completed = false;
      // Increment listenerGeneration so any in-flight events from the old source are ignored
      state.listenerGeneration = (state.listenerGeneration || 0) + 1;
      // Close the old source if it's still open
      if (state.source && typeof state.source.close === "function") {
        try { state.source.close(); } catch (e) { /* ignore */ }
      }
      state.source = null;
    }

    // Re-initiate the stream
    processStream();
  };

  /**
   * Attaches event listeners to an SSE source with generation-based stale detection.
   * Only the latest mount's listeners will actually update state.
   */
  const attachListeners = (source) => {
    const state = streamStateMap.get(streamKey);
    const generation = state ? ++state.listenerGeneration : 0;
    
    source.addEventListener("message", (event) => {
      // Skip if this listener is from a stale (previous) mount
      const currState = streamStateMap.get(streamKey);
      if (!currState || currState.listenerGeneration !== generation) return;
      try {
        if (currentMode === "agent" && !isThinkingFromParent) {
          setIsThinkingFromParent(true);
          botData.utilityObject.isThinking = true;
          botData.utilityObject.thinkingResponse.isThinking = true;
          thinkingStartTimeRef.current = Date.now();
        }
        const data = JSON.parse(event.data);
        
        if (data?.status === "notification") {
            window.dispatchEvent(
              new CustomEvent("agent-notification", {
                detail: {
                  message: data?.message || "",
                  chat_id: data?.chat_id || "",
                  session_id: data?.session_id || "",
                },
              })
            );
            return;
          }
          // Skip is_error chunks — already handled in AxiosEventSource sseevent()
          if (data?.is_error) {
            // Trigger completion if status is "completed"
            if (data?.status === "completed") {
              setStepsDone(true);
              setIsStreamingDone(true);
              const doneState = streamStateMap.get(streamKey);
              if (doneState) doneState.completed = true;
              dispatch(setMinimizedStreamData({
                isStreaming: false,
                stepHeader: questionsRef.current[questionsRef.current.length - 1] || "Completed",
                stepSubHeader: "Done",
                stepStatus: "completed",
                streamStartTime: streamStartTimeRef.current,
                actionCount: questionsRef.current.length || 1,
              }));
            }
            return;
          }
          if (data?.message || data?.status === "step" || data?.status === "step_form" || data?.status === "thinking" || data?.status === "questions" || data?.status === "widget") {
          if (data.status === "questions") {
            const incomingQuestions = data.widget_data?.[0]?.questions || [];
            questionsRef.current = incomingQuestions;
            setQuestions(incomingQuestions);
            const initialMap = {};
            incomingQuestions.forEach((q) => {
              initialMap[q] = [
                {
                  header: "Processing Request",
                  sub_header: "Analyzing the current request",
                  step_status: "not-completed",
                },
              ];
            });
            questionsStepsMapRef.current = initialMap;
            setQuestionsStepsMap(cloneDeep(initialMap));
            // Dispatch minimized widget data when questions arrive
            dispatch(setMinimizedStreamData({
              isStreaming: true,
              stepHeader: incomingQuestions[0] || "Processing Request",
              stepSubHeader: "Analyzing the current request",
              stepStatus: "not-completed",
              streamStartTime: streamStartTimeRef.current,
              actionCount: incomingQuestions.length || 1,
            }));
          }
          else if (data.status === "thinking") {
            
            messageToStoreRef.current.chatData.thinkingResponse.thinkingHeading = (
              <ThinkinHeaderInfo thinkingHeaderMessage="Working for 0m:00s" />
            );
            // Start thinking if not already started
            if (!isThinking) {
              setIsThinking(true);
            }
            
            // Update thinking content in a more reliable way
            const newValue = (thinkingContentRef.current || "") + data.message;
            setThinkingContentRef.current(newValue);
            thinkingContentRef.current = thinkingContentRef.current + data.message;
            messageToStoreRef.current.chatData.thinkingResponse.thinkingStream = newValue;
            // Update the ThinkingIndicator components with the new accumulated content
            // messageToStoreRef.current.chatData.thinkingResponse.thinkingContent = (
            //   <ThinkingIndicator
            //     thinkingContent={newValue}
            //     isStreaming={isStreaming}
            //     thinkDone={thinkDone}
            //     renderThinkingLoader={renderThinkingLoader}
            //     thinkingStarted={thinkingStarted}
            //   />
            // );
            dispatch(setThinkingContext({
              streamStartTime: streamStartTimeRef.current,
              isStreamCompleted: false,
              finalElapsedSeconds: null,
              thinkingHeaderMessage: thinkingHeaderMessageRef.current,
              thinkingContent: thinkingContentRef.current,
            }));
            setThinkingStarted(true);
            thinkingStartedRef.current = true;
            setIsThinkingFromParent(false);
            // Minimized widget data for thinking is handled via useEffect on thinkingStarted
            // botData.utilityObject.thinkingResponse.thinkingContent = (
            //   <ThinkingIndicator
            //     thinkingContent={newValue}
            //     isStreaming={isStreaming}
            //     thinkDone={thinkDone}
            //     renderThinkingLoader={renderThinkingLoader}
            //     thinkingStarted={thinkingStarted}
            //   />
            // );
          }
          else if(data.status === "step") {
            let newStep = data.widget_data[0];
            const currentIntent = data.widget_data[0]?.current_intent;
            setSteps([...steps, newStep]);
            let newSteps = cloneDeep(stepRef.current);
            if (newSteps.length === 1) {
              newSteps.forEach((step) => {
                step.step_status = "completed";
              });
            }
            const existingStepIndex = newSteps.findIndex((step) => step.header === newStep.header);
            if (existingStepIndex !== -1) {
              newSteps[existingStepIndex] = newStep;
            } else {
              newSteps.push(newStep);
            }
            stepRef.current = newSteps;
            setSteps(newSteps);

            if (currentIntent) {
              // Auto-create entry if no questions chunk was received
              if (!questionsStepsMapRef.current[currentIntent]) {
                questionsStepsMapRef.current[currentIntent] = [
                  {
                    header: "Processing Request",
                    sub_header: "Analyzing the current request",
                    step_status: "not-completed",
                  },
                ];
                // Add intent to questions list if not already present
                if (!questionsRef.current.includes(currentIntent)) {
                  questionsRef.current = [...questionsRef.current, currentIntent];
                  setQuestions([...questionsRef.current]);
                }
              }
              let intentSteps = cloneDeep(questionsStepsMapRef.current[currentIntent]);
              if (newStep.header) {
                // Remove placeholder if it's the only entry — real step replaces it
                if (intentSteps.length === 1 && intentSteps[0].header === "Processing Request") {
                  intentSteps = [];
                }
                // Only add/update sub-steps that have a non-empty header
                const existingIdx = intentSteps.findIndex((s) => s.header === newStep.header);
                if (existingIdx !== -1) {
                  intentSteps[existingIdx] = newStep;
                } else {
                  intentSteps.push(newStep);
                }
              } else if (newStep.step_status === "completed") {
                // Empty header + completed: remove the placeholder so no bullet shows
                const placeholderIdx = intentSteps.findIndex((s) => s.header === "Processing Request");
                if (placeholderIdx !== -1 && intentSteps.length === 1) {
                  intentSteps.splice(placeholderIdx, 1);
                } else if (placeholderIdx !== -1) {
                  intentSteps[placeholderIdx].step_status = "completed";
                }
              }
              // If the latest step for this intent is completed, mark all sub-steps as completed
              if (newStep.step_status === "completed") {
                intentSteps.forEach((s) => {
                  s.step_status = "completed";
                });
              }
              questionsStepsMapRef.current[currentIntent] = intentSteps;
              setQuestionsStepsMap(cloneDeep(questionsStepsMapRef.current));
            }

            setStepChange((prev) => !prev);
            // Minimized widget step data is handled via useEffect on stepChange
          }
          else if (data.status === "step_form") {
            showTabNotification();
            const formWidgetData = isArray(data.widget_data)
              ? data.widget_data
              : [data.widget_data];
            const currentIntent = data.current_intent || formWidgetData?.[0]?.current_intent;

            if (currentIntent) {
              // Auto-create question/intent entry if no prior step chunk created it
              if (!questionsStepsMapRef.current[currentIntent]) {
                questionsStepsMapRef.current[currentIntent] = [];
                if (!questionsRef.current.includes(currentIntent)) {
                  questionsRef.current = [...questionsRef.current, currentIntent];
                  setQuestions([...questionsRef.current]);
                }
              }
              // Mark all steps under this intent as completed — the form is the final state
              if (questionsStepsMapRef.current[currentIntent]?.length > 0) {
                questionsStepsMapRef.current[currentIntent].forEach((s) => {
                  s.step_status = "completed";
                });
              }
              setQuestionsStepsMap(cloneDeep(questionsStepsMapRef.current));
              const sendButton = document.getElementById("chat-input-send-button");
              const stepFormSubmitButton = {
                type: "button",
                data: {
                  message: "",
                  buttons: [
                    {
                      label: "Submit",
                      variant: "primary",
                      size: "medium",
                      disabled: false,
                      onClick: () => sendButton?.click(),
                    },
                  ],
                },
              };
              stepFormDataMapRef.current[currentIntent] = {
                widgets: [...formWidgetData, stepFormSubmitButton],
                showSavedFilters: data.show_saved_filters !== false,
                preSelectedFilters: data.pre_selected_filters || null,
              };
              setStepFormDataMap({ ...stepFormDataMapRef.current });
            }
            // Mark step_form as active so the step useEffect won't override the minimized dispatch
            stepFormActiveRef.current = true;
            // If this is the [DONE] chunk, mark streaming as complete BEFORE toggling stepChange
            // (React 17 does not batch setState in non-React event handlers, so order matters)
            if (data.message === "[DONE]") {
              // Do NOT set stepsDone here — step_form [DONE] is not status:"completed".
              // stepsDone should only be true when status:"completed" arrives.
              setIsStreamingDone(true);
              const doneState = streamStateMap.get(streamKey);
              if (doneState) doneState.completed = true;
            }
            setStepChange((prev) => !prev);
            // Dispatch minimized widget data for step_form (waiting for user input)
            const latestQuestion = questionsRef.current[questionsRef.current.length - 1] || currentIntent || "Processing";
            // Use sub_header from the last step if available (e.g., "Waiting for User response")
            const lastStepForIntent = questionsStepsMapRef.current[latestQuestion];
            const lastStepEntry = lastStepForIntent?.[lastStepForIntent.length - 1];
            const stepFormSubHeader = lastStepEntry?.sub_header || "Waiting for your response";
            dispatch(setMinimizedStreamData({
              isStreaming: true,
              stepHeader: latestQuestion,
              stepSubHeader: stepFormSubHeader,
              stepStatus: "step_form",
              streamStartTime: streamStartTimeRef.current,
              actionCount: 0, // All steps completed, waiting for user
            }));
            // Persist IDs immediately when step_form arrives (AxiosEventSource already set them)
            const _sid = messageToStoreRef.current.sessionId || "";
            const _cid = messageToStoreRef.current.uniqueChatId || "";
            const _aid = botData.inputBody?.agent_id || "";
            const _burl = baseUrl || "";
            sessionStorage.setItem("stepForm_sessionId", _sid);
            sessionStorage.setItem("stepForm_chatId", _cid);
            sessionStorage.setItem("stepForm_agentId", _aid);
            sessionStorage.setItem("stepForm_baseUrl", _burl);
            // Also set on module-level control object (survives async timing issues)
            stepFormStreamControl.sessionId = _sid;
            stepFormStreamControl.chatId = _cid;
            stepFormStreamControl.agentId = _aid;
            stepFormStreamControl.baseUrl = _burl;
          }
          else if (data.status === "widget") {
            // Render widget data immediately as it arrives during streaming
            const widgetItems = isArray(data.widget_data)
              ? data.widget_data
              : [data.widget_data];
            setStreamingWidgetData((prev) => [...prev, ...widgetItems]);
          }
          else if (data.message !== "[DONE]") {

            // setTimeout(() => {
            //   setStepsDone(true);
            // }, 5000);
            if (!thinkingDoneRef?.current && currentMode === "agent") {
              thinkingDoneRef.current = true;
              thinkingStartedRef.current = false;
              setThinkDone(true);
              setIsThinkingFromParent(false);
              const endTime = Date.now();
              const startTime =
                thinkingStartTimeRef.current || endTime - 1000; // Fallback to 1 second ago
              const duration = Math.round((endTime - startTime) / 1000);
              const finalThinkingTime = Math.max(duration, 1); // Ensure at least 1 second
              setThinkingTime(finalThinkingTime);
              setShowThoughtDropdown(true);
              setIsThinking(false);
              // Store thinking time in messageToStoreRef for persistence
              messageToStoreRef.current.chatData.thinkingResponse.thinkingTime = finalThinkingTime;
              thinkingTimeFinalRef.current = finalThinkingTime;
              // Keep timer running — do NOT set "Worked for" here.
              // Timer continues showing "Working for Xm:Ys" until status:"completed" arrives.
              dispatch(setThinkingContext({
                streamStartTime: streamStartTimeRef.current,
                isStreamCompleted: false,
                finalElapsedSeconds: null,
                thinkingHeaderMessage: thinkingHeaderMessageRef.current,
                thinkingContent: thinkingContentRef.current,
              }));
              // dispatch(setThinkingContext({
              //   thinkingHeaderMessage: `Thought for ${formatThinkingTime(finalThinkingTime)}`,
              //   thinkingContent: thinkingContentRef.current,
              // }));
              // botData.utilityObject.thinkingResponse.thinkingHeading = (
              //   <ThinkinHeaderInfo
              //     thinkingHeaderMessage={`Thought for ${formatThinkingTime(finalThinkingTime)}`}
              //   />
              // );
            }
            // if(thinkingStarted.current && !thinkDone){
            //   setThinkDone(true);
            //   thinkingStarted.current = false;
            // }
            setContent((prev) => {
              return prev + data.message;
            });

            // if (currentMode === "agent") {
            //   setIsThinkingFromParent(false);
            //   botData.utilityObject.isThinking = false;
            //   botData.utilityObject.thinkingResponse.isThinking = false;
            //   const finalThinkingTime =
            //   thinkingTime || thinkingTimeFinalRef.current || 1;
            //   let thinkingTimeFinal = cloneDeep(finalThinkingTime);
            //   botData.utilityObject.thinkingResponse.thinkingHeading = (
            //     <ThinkinHeaderInfo
            //       thinkingHeaderMessage={`Thought for ${formatThinkingTime(thinkingTimeFinal)}`}
            //     />
            //   );
            // }
            // // End thinking when regular content starts
            // if (isThinking && currentMode === "agent") {
            //   setIsThinking(false);
            //   if (!thinkDone) {
            //     const endTime = Date.now();
            //     const startTime =
            //       thinkingStartTimeRef.current || endTime - 1000; // Fallback to 1 second ago
            //     const duration = Math.round((endTime - startTime) / 1000);
            //     const finalThinkingTime = Math.max(duration, 1); // Ensure at least 1 second
            //     setThinkingTime(finalThinkingTime);
            //     setShowThoughtDropdown(true);
            //
            //     // Store thinking time in messageToStoreRef for persistence
            //     messageToStoreRef.current.chatData.thinkingResponse.thinkingTime = finalThinkingTime;
            //     thinkingTimeFinalRef.current = finalThinkingTime;
            //   }
            // }
            // if(!thinkDone && currentMode === "agent") {
            //   setThinkDone(true);
            //   setIsThinking(false);
            //   setTimeout(() => {
            //     // setThinkDone(true);
            //     const endTime = Date.now();
            //     const startTime =
            //       thinkingStartTimeRef.current || endTime - 1000; // Fallback to 1 second ago
            //     const duration = Math.round((endTime - startTime) / 1000);
            //     const finalThinkingTime = Math.max(duration, 1); // Ensure at least 1 second
            //     setThinkingTime(finalThinkingTime);
            //     setShowThoughtDropdown(true);
            //     // Store thinking time in messageToStoreRef for persistence
            //     messageToStoreRef.current.chatData.thinkingResponse.thinkingTime = finalThinkingTime;
            //     thinkingTimeFinalRef.current = finalThinkingTime;
            //     setContent((prev) => {
            //       return prev + data.message;
            //     });
            //   }, 1000);
            // }
            // else {
            //   setContent((prev) => {
            //     return prev + data.message;
            //   });
            // }
          } else {
            // message === "[DONE]" with status "completed" — switch to agent_response tab


            if (data.status === "completed") {
              setStepsDone(true);
            }
            setIsStreamingDone(true);
            const doneState = streamStateMap.get(streamKey);
            if (doneState) doneState.completed = true;
            // Mark streaming as done in minimized widget data
            dispatch(setMinimizedStreamData({
              isStreaming: false,
              stepHeader: questionsRef.current[questionsRef.current.length - 1] || "Completed",
              stepSubHeader: "Done",
              stepStatus: "completed",
              streamStartTime: streamStartTimeRef.current,
              actionCount: questionsRef.current.length || 1,
            }));
          }
        }
      } catch (e) {
        console.error("Error processing message:", e);
      }
    });

    // Handle stream errors
    source.addEventListener("error", (event) => {
      const errState = streamStateMap.get(streamKey);
      if (!errState || errState.listenerGeneration !== generation) return;

      // User-initiated abort is fully handled by abortStreaming() — skip all error processing
      const isUserAbort =
        wasStreamingAbortedRef.current ||
        errState.aborted ||
        (event.reason && event.reason.includes("Network request aborted"));
      if (isUserAbort) return;

      console.error("Stream error:", event.reason, "statusCode:", event.statusCode);
      setIsStreaming(false);
      errState.completed = true;

      const is503 = event.statusCode === 503;
      const isAgentUnavailable = event.statusCode === 502 || event.statusCode === 404;

      if (isThinking) {
        setIsThinking(false);
        const endTime = Date.now();
        const duration = Math.round((endTime - thinkingStartTimeRef.current) / 1000);
        const finalThinkingTime = Math.max(duration, 1);
        setThinkingTime(finalThinkingTime);
        setShowThoughtDropdown(true);
        thinkingStartTimeRef.current = finalThinkingTime;
        messageToStoreRef.current.chatData.thinkingResponse.thinkingTime = finalThinkingTime;
      }

      // Agent unavailable (502/404) — show specific message, no retry
      if (isAgentUnavailable) {
        setWasStreamingAborted(true);
        wasStreamingAbortedRef.current = true;

        const currentSteps = stepRef.current;
        if (currentSteps.length > 0) {
          const lastStep = currentSteps[currentSteps.length - 1];
          if (lastStep.step_status === "not-completed") {
            lastStep.step_status = "completed";
          }
          stepRef.current = [...currentSteps];
          setSteps([...currentSteps]);
        }

        const agentUnavailableMessage = "Agent isn't available right now. Please contact your administrator or try again later.";
        const hasExistingWidgetsOnUnavail = messageToStoreRef.current.appendedData &&
          (isArray(messageToStoreRef.current.appendedData)
            ? messageToStoreRef.current.appendedData.length > 0
            : Object.keys(messageToStoreRef.current.appendedData).length > 0);

        if (hasExistingWidgetsOnUnavail) {
          const errorWidget = { type: "text", response: agentUnavailableMessage };
          if (isArray(messageToStoreRef.current.appendedData)) {
            messageToStoreRef.current.appendedData.push(errorWidget);
          } else {
            messageToStoreRef.current.appendedData = [messageToStoreRef.current.appendedData, errorWidget];
          }
        } else {
          messageToStoreRef.current.chatData.response = agentUnavailableMessage;
        }
        setContent(agentUnavailableMessage);

        dispatch(setMinimizedStreamData({
          isStreaming: false,
          stepHeader: questionsRef.current[questionsRef.current.length - 1] || "Agent unavailable",
          stepSubHeader: "Connection closed",
          stepStatus: "completed",
          streamStartTime: streamStartTimeRef.current,
          actionCount: questionsRef.current.length || 1,
        }));

        setStepsDone(true);
        setIsStreamingDone(true);
      }
      // Check if we can auto-retry (abrupt close or 503, but not user abort)
      else if (!isUserAbort && retryCountRef.current < MAX_RETRY_COUNT) {
        // Still have retries left — start countdown instead of showing final error
        setStepsDone(true); // Switch to agent_response tab to show countdown
        const retryMessage = "The service is temporarily unavailable because of an unusual load. Please wait a moment and try again.";
        setContent(retryMessage);
        startRetryCountdown();
      } else {
        // Retries exhausted — show final message
        setWasStreamingAborted(true);
        wasStreamingAbortedRef.current = true;

        const currentSteps = stepRef.current;
        if (currentSteps.length > 0) {
          const lastStep = currentSteps[currentSteps.length - 1];
          if (lastStep.step_status === "not-completed") {
            lastStep.step_status = "completed";
          }
          stepRef.current = [...currentSteps];
          setSteps([...currentSteps]);
        }

        // Append the error message at the bottom of any existing content.
        // If widgets already exist in appendedData, append as the last widget
        // so it renders AFTER the already-received content (not at the top).
        const finalMessage = "Please reach out to IA for this, as this didn't work even after retry";
        const hasExistingWidgetsOnErr = messageToStoreRef.current.appendedData &&
          (isArray(messageToStoreRef.current.appendedData)
            ? messageToStoreRef.current.appendedData.length > 0
            : Object.keys(messageToStoreRef.current.appendedData).length > 0);

        if (hasExistingWidgetsOnErr) {
          const errorWidget = { type: "text", response: finalMessage };
          if (isArray(messageToStoreRef.current.appendedData)) {
            messageToStoreRef.current.appendedData.push(errorWidget);
          } else {
            messageToStoreRef.current.appendedData = [messageToStoreRef.current.appendedData, errorWidget];
          }
        } else {
          messageToStoreRef.current.chatData.response = finalMessage;
        }
        setContent(finalMessage);

        dispatch(setMinimizedStreamData({
          isStreaming: false,
          stepHeader: questionsRef.current[questionsRef.current.length - 1] || "Ended unexpectedly",
          stepSubHeader: "Connection closed",
          stepStatus: "completed",
          streamStartTime: streamStartTimeRef.current,
          actionCount: questionsRef.current.length || 1,
        }));

        setStepsDone(true);
        setIsStreamingDone(true);
      }
    });

    // Handle stream closure
    source.addEventListener("close", () => {
      const closeState = streamStateMap.get(streamKey);
      if (!closeState || closeState.listenerGeneration !== generation) return;
      setIsStreaming(false);

      // If closeState.completed is already true, this is a normal close after [DONE].
      // If it's still false, the backend closed the connection abruptly.
      if (!closeState.completed) {
        closeState.completed = true;

        // Stop thinking if in progress
        if (isThinking) {
          setIsThinking(false);
          const endTime = Date.now();
          const duration = Math.round((endTime - thinkingStartTimeRef.current) / 1000);
          const finalThinkingTime = Math.max(duration, 1);
          setThinkingTime(finalThinkingTime);
          setShowThoughtDropdown(true);
          messageToStoreRef.current.chatData.thinkingResponse.thinkingTime = finalThinkingTime;
        }

        // Check if we can auto-retry
        if (retryCountRef.current < MAX_RETRY_COUNT) {
          // Still have retries left — start countdown instead of showing final error
          setStepsDone(true); // Switch to agent_response tab to show countdown
          setContent("The service is temporarily unavailable because of an unusual load. Please wait a moment and try again.");
          startRetryCountdown();
        } else {
          // Retries exhausted — show final message
          setWasStreamingAborted(true);
          wasStreamingAbortedRef.current = true;

          // Mark the last in-progress step as completed
          const currentSteps = stepRef.current;
          if (currentSteps.length > 0) {
            const lastStep = currentSteps[currentSteps.length - 1];
            if (lastStep.step_status === "not-completed") {
              lastStep.step_status = "completed";
            }
            stepRef.current = [...currentSteps];
            setSteps([...currentSteps]);
          }

          // Append the error message at the bottom of any existing content.
          // If widgets already exist in appendedData, append as the last widget
          // so it renders AFTER the already-received content (not at the top).
          const finalMessage = "The service is temporarily unavailable because of an unusual load. Please wait a moment and try again.";
          const hasExistingWidgets = messageToStoreRef.current.appendedData &&
            (isArray(messageToStoreRef.current.appendedData)
              ? messageToStoreRef.current.appendedData.length > 0
              : Object.keys(messageToStoreRef.current.appendedData).length > 0);

          if (hasExistingWidgets) {
            const errorWidget = { type: "text", response: finalMessage };
            if (isArray(messageToStoreRef.current.appendedData)) {
              messageToStoreRef.current.appendedData.push(errorWidget);
            } else {
              messageToStoreRef.current.appendedData = [messageToStoreRef.current.appendedData, errorWidget];
            }
          } else {
            messageToStoreRef.current.chatData.response = finalMessage;
          }
          setContent(finalMessage);

          dispatch(setMinimizedStreamData({
            isStreaming: false,
            stepHeader: questionsRef.current[questionsRef.current.length - 1] || "Ended unexpectedly",
            stepSubHeader: "Connection closed",
            stepStatus: "completed",
            streamStartTime: streamStartTimeRef.current,
            actionCount: questionsRef.current.length || 1,
          }));

          setStepsDone(true);
          setIsStreamingDone(true);
        }
      }
      // else: closeState.completed is already true — normal close after [DONE], nothing to do.
    });
  };

  /**
   * Effect to initialize streaming or restore state on tab-switch remount.
   * Uses module-level streamStateMap to detect remounts and avoid re-triggering the API.
   */
  useEffect(() => {
    const mapState = streamStateMap.get(streamKey);
    if (mapState?.initiated) {
      // Remount after tab switch - restore state from persisted data
      const store = messageToStoreRef.current;
      // Restore accumulated content
      setContent(store.chatData?.response || "");
      // Restore widget data received so far
      if (isArray(store.appendedData) && store.appendedData.length > 0) {
        setStreamingWidgetData(store.appendedData);
      } else if (store.appendedData && !isArray(store.appendedData) && Object.keys(store.appendedData).length > 0) {
        setStreamingWidgetData([store.appendedData]);
      }
      // Restore thinking state
      if (store.chatData?.thinkingResponse?.thinkingStream) {
        thinkingContentRef.current = store.chatData.thinkingResponse.thinkingStream;
      }
      if (store.chatData?.thinkingResponse?.thinkingTime) {
        thinkingTimeFinalRef.current = store.chatData.thinkingResponse.thinkingTime;
        setThinkingTime(store.chatData.thinkingResponse.thinkingTime);
      }

      if (mapState.completed && mapState.aborted) {
        // Stream was user-aborted — state already initialized correctly at render time
        // (via _isAbortedRemount flag in useState initializers). Nothing more to do.
        return;
      } else if (mapState.completed) {
        // Stream already finished while we were unmounted - trigger completion
        setIsStreaming(false);
        setIsStreamingDone(true);
      } else if (mapState.source) {
        // Stream still in progress - re-attach listeners to existing source
        sourceRef.current = mapState.source;
        setIsStreaming(true);
        attachListeners(mapState.source);
      }
    } else {
      // First mount - initialize Map entry and start streaming
      streamStateMap.set(streamKey, {
        messageStore: messageToStoreRef.current,
        source: null,
        initiated: false,
        completed: false,
        listenerGeneration: 0,
      });
      processStream();
    }
  }, []);


  /**
   * Effect to update chat data when streaming is complete
   * Parses the accumulated response and updates the chat history
   */
  useEffect(() => {
    if (isStreamingDone && !streamingDoneProcessedRef.current) {
      streamingDoneProcessedRef.current = true;
      localStorage.setItem("isStreaming", "false");
      // Clear minimized widget when streaming is fully done (unless step_form waiting for user)
      if (stepsDone) {
        dispatch(setMinimizedStreamData(null));
      }
      setIsStop(false);
      if (currentMode === "agent") {
        // Use thinkingTime state instead of thinkingTimeFinalRef.current to ensure we have the correct value
        const finalThinkingTime =
          thinkingTime || thinkingTimeFinalRef.current || 1;
        const completedElapsed = streamStartTimeRef.current
          ? Math.floor((Date.now() - streamStartTimeRef.current) / 1000)
          : finalThinkingTime;
        const compMin = Math.floor(completedElapsed / 60);
        const compSec = completedElapsed % 60;
        const workedForLabel = `Completed in ${compMin}m:${String(compSec).padStart(2, '0')}s`;
        // Only stop the timer if we got status:"completed" (stepsDone=true).
        // If stream ended with step_form [DONE], keep timer running for the next restream.
        if (stepsDone) {
          // Completed — use a static string so this chat's heading won't
          // re-animate when a future chat dispatches a new streamStartTime.
          messageToStoreRef.current.chatData.thinkingResponse.thinkingHeading = workedForLabel;
          dispatch(setThinkingContext({
            streamStartTime: streamStartTimeRef.current,
            isStreamCompleted: true,
            finalElapsedSeconds: completedElapsed,
            thinkingHeaderMessage: workedForLabel,
            thinkingContent: thinkingContentRef.current,
          }));
        } else {
          // step_form case: keep heading as the live ThinkinHeaderInfo component so the timer keeps ticking
          messageToStoreRef.current.chatData.thinkingResponse.thinkingHeading = (
            <ThinkinHeaderInfo thinkingHeaderMessage="Working for 0m:00s" />
          );
        }
        let actualResponse = cloneDeep(
          messageToStoreRef.current.chatData.thinkingResponse.thinkingStream
        );
        messageToStoreRef.current.chatData.thinkingResponse.thinkingContent = actualResponse;
        let parsedResponse = parseResponse(
          messageToStoreRef.current.chatData,
          "text"
        );
        chatDataRef.current[currentMode] = [
          ...chatDataRef.current[currentMode].slice(0, -1),
        ];
        chatDataInfoRef.current[currentMode].conversations[activeConversationId].messages = [
          ...chatDataInfoRef.current[
            currentMode
          ].conversations[activeConversationId].messages.slice(0, -1),
        ];

        botData.utilityObject.setInitValue(messageToStoreRef.current.initValue);
        botData.utilityObject.setSessionId(messageToStoreRef.current.sessionId);
        // Also update currentSessionId via event so the send button uses the correct session_id
        if (messageToStoreRef.current.status === "completed" || messageToStoreRef.current.status === "follow-up") {
          window.dispatchEvent(new CustomEvent("stepFormInitStateUpdate", {
            detail: {
              initValue: messageToStoreRef.current.initValue,
              sessionId: messageToStoreRef.current.sessionId,
              uniqueChatId: messageToStoreRef.current.uniqueChatId,
            },
          }));
        }
        botData.utilityObject.setAdditionalArgs(
          !isEmpty(messageToStoreRef.current.additionalArgs)
            ? messageToStoreRef.current.additionalArgs
            : {}
        );
        if (!wasStreamingAbortedRef.current) {
          botData.utilityObject.setUniqueChatId(messageToStoreRef.current.uniqueChatId);
          dispatch(setCurrentAgentChatId(messageToStoreRef.current.uniqueChatId));
        }
        // Persist IDs for step form restream (ButtonContent reads these)
        const _sid2 = messageToStoreRef.current.sessionId || "";
        const _cid2 = messageToStoreRef.current.uniqueChatId || "";
        const _aid2 = botData.inputBody?.agent_id || "";
        const _burl2 = baseUrl || "";
        sessionStorage.setItem("stepForm_sessionId", _sid2);
        sessionStorage.setItem("stepForm_chatId", _cid2);
        sessionStorage.setItem("stepForm_agentId", _aid2);
        sessionStorage.setItem("stepForm_baseUrl", _burl2);
        stepFormStreamControl.sessionId = _sid2;
        stepFormStreamControl.chatId = _cid2;
        stepFormStreamControl.agentId = _aid2;
        stepFormStreamControl.baseUrl = _burl2;
        // Persist completed/follow-up state so ButtonContent can read it after remount
        stepFormStreamControl.initValue = messageToStoreRef.current.initValue;
        stepFormStreamControl.uniqueChatId = _cid2;
        let appendedDataLength = 0;
        if(isArray(messageToStoreRef.current.appendedDataFromLastChunk)) {
          appendedDataLength = messageToStoreRef.current.appendedDataFromLastChunk.length;
        }
        else if (isObject(messageToStoreRef.current.appendedDataFromLastChunk)) {
          appendedDataLength = 1;
        }
        botData.utilityObject?.setFieldNumber(appendedDataLength);
        let sendButton = document.getElementById("chat-input-send-button");
        // sendButton.disabled = false;
        let dummyButton = {};
        const hasStepForm = !isEmpty(messageToStoreRef.current.stepFormData);
        if (
          !wasStreamingAborted &&
          !hasStepForm &&
          (!messageToStoreRef.current.initValue ||
            messageToStoreRef.current.status === "follow-up")
        ) {
          dummyButton = {
            type: "button",
            data: {
              message: "",
              buttons: [
                {
                  label: "Submit",
                  variant: "primary",
                  size: "medium",
                  disabled: false,
                  onClick: () => sendButton.click(),
                },
              ],
            },
          };
        }
        // let parsedButtonResponse = parseResponse(dummyButton, "button");

        let finalData = isArray(messageToStoreRef?.current?.appendedData)
          ? messageToStoreRef?.current?.appendedData
          : [messageToStoreRef?.current?.appendedData];
        let textResponseTobeParsed = {
          ...messageToStoreRef.current.chatData,
          type: "text",
        };
        let response = {
          data: {
            data: {
              data: isEmpty(dummyButton)
                ? [textResponseTobeParsed, ...finalData]
                : [textResponseTobeParsed, ...finalData, dummyButton],
              session_id: messageToStoreRef.current.sessionId || "",
            },
          },
        };
        const hasStepFormWidgets = !isEmpty(stepFormDataMapRef.current);
        // response.session_id is intentionally blank once the flow completes, so
        // keep the retained session separately and stamp it on the stored message.
        const messageChatSessionId =
          messageToStoreRef.current.chatSessionId ||
          messageToStoreRef.current.sessionId ||
          "";

        // Persist how long this turn took: PATCH /questions/{session_id}.
        // Uses the retained chatSessionId (the live session_id is blanked at
        // completion) and only for genuine completions. Fire-and-forget so it
        // never blocks the completion/render path.
        const turnStatus = messageToStoreRef.current.status;
        if (
          messageChatSessionId &&
          (turnStatus === "completed" || turnStatus === "follow-up")
        ) {
          const endMs = Date.now();
          const startMs =
            streamStartTimeRef.current || endMs - completedElapsed * 1000;
          const durationMs = Math.max(0, Math.round(endMs - startMs));
          updateQuestionTiming(messageChatSessionId, {
            startTime: new Date(startMs).toISOString(),
            endTime: new Date(endMs).toISOString(),
            duration: durationMs,
          }).catch((err) =>
            console.error("updateQuestionTiming error", err)
          );
        }

        Promise.resolve(
          processResponse(
            response,
            botData.inputBody,
            currentMode,
            botData.utilityObject.customChatConfig,
            {
              newChatData: chatDataInfoRef,
              isTabEnabled: true,
              steps: stepRef.current.map(s => ({ ...s })),
              currentTabValue: (stepsDone && !hasStepFormWidgets) ? "agent_response" : "steps",
              questions: [...questionsRef.current],
              questionsStepsMap: { ...questionsStepsMapRef.current },
              stepFormDataMap: { ...stepFormDataMapRef.current },
            },
            activeConversationId
          )
        ).then(() => {
          if (!messageChatSessionId) return;
          const storedMessages =
            chatDataInfoRef.current?.[currentMode]?.conversations?.[
              activeConversationId
            ]?.messages;
          if (storedMessages?.length) {
            storedMessages[storedMessages.length - 1].chatSessionId =
              messageChatSessionId;
          }
        });


      // [
      //   {
      //     header: "Finding relevant information",
      //     sub_header: "Iris is working to identify relevant information to user answer user query",
      //     step_status: "not-completed",
      //   },
      // ];

      // [
      //   {
      //     header: "Finding relevant information",
      //     sub_header: "Iris is working to identify relevant information to user answer user query",
      //     step_status: "completed",
      //   },
      //   {
      //     header: "Output Generation",
      //     sub_header: "Iris is finalizing response to user query",
      //     step_status: "not-completed",
      //   },
      // ];

        // chatDataRef.current[currentMode] = [
        //   ...chatDataRef.current[currentMode],
        //   parsedButtonResponse,
        // ];
        // chatDataInfoRef.current[currentMode].conversations[1].messages = [
        //   ...chatDataInfoRef.current[currentMode].conversations[1].messages,
        //   parsedButtonResponse,
        // ];
        // messageToStoreRef.current.chatData.thinkingResponse.thinkingContent = <></>;
        // messageToStoreRef.current.chatData.thinkingResponse.thinkingStream = "";
        // setThinkingContentRef.current(<></>);
        setLoader(false);
      } else {
        // If user aborted, skip heavy processResponse — just clean up messages
        if (wasStreamingAbortedRef.current) {
          stepRef.current = [
            ...stepRef.current,
            {
              header: "Finished",
              sub_header: "Analysis complete",
              step_status: "completed",
            },
          ];
          chatDataRef.current[currentMode].conversations[
            activeConversationId
          ].messages = [
            ...chatDataRef.current[currentMode].conversations[
              activeConversationId
            ].messages.slice(0, -1),
          ];
          if(chatDataInfoRef.current[currentMode]?.conversations?.[activeConversationId]) {
            chatDataInfoRef.current[currentMode].conversations[activeConversationId].messages = [
              ...chatDataInfoRef.current[
                currentMode
              ].conversations?.[activeConversationId]?.messages?.slice(0, -1),
            ];
          }
          setLoader(false);
        } else {
          stepRef.current = [
            ...stepRef.current,
            {
              header: "Finished",
              sub_header: "Analysis complete",
              step_status: "not-completed",
            },
          ];
        let parsedResponse = parseResponse(
          messageToStoreRef.current.chatData,
          "text"
        );
        chatDataRef.current[currentMode].conversations[
          activeConversationId
        ].messages = [
          ...chatDataRef.current[currentMode].conversations[
            activeConversationId
          ].messages.slice(0, -1),
          // {
          //   ...parsedResponse,
          //   // enableLikes: true
          // },
        ];
        if(chatDataInfoRef.current[currentMode]?.conversations?.[activeConversationId]) {
          chatDataInfoRef.current[currentMode].conversations[activeConversationId].messages = [
            ...chatDataInfoRef.current[
              currentMode
            ].conversations?.[activeConversationId]?.messages?.slice(0, -1),
            // {
            //   ...parsedResponse,
            //   // enableLikes: true
            // },
          ];
        }
        let finalData = isArray(messageToStoreRef?.current?.appendedData)
          ? messageToStoreRef?.current?.appendedData
          : isEmpty(messageToStoreRef?.current?.appendedData)
            ? []
            : [messageToStoreRef?.current?.appendedData];
        let textResponseTobeParsed = {
          ...messageToStoreRef.current.chatData,
          type: "text",
        };
        let response = {
          data: {
            data: {
              data: [textResponseTobeParsed, ...finalData],
              session_id: messageToStoreRef.current.sessionId || "",
            },
          },
        };
        if (messageToStoreRef.current.navSessionId && setNavSessionId) {
          setNavSessionId(messageToStoreRef.current.navSessionId);
        }
        processResponse(
          response,
          botData.inputBody,
          currentMode,
          botData.utilityObject.customChatConfig,
          {
            newChatData: chatDataInfoRef,
            isTabEnabled: true,
            steps: stepRef.current.map(s => ({ ...s })),
            currentTabValue: stepsDone ? "agent_response" : "steps",
            questions: [...questionsRef.current],
            questionsStepsMap: { ...questionsStepsMapRef.current },
            stepFormDataMap: { ...stepFormDataMapRef.current },
          },
          activeConversationId
        );
        }
      }
      // Clean up module-level Map entry - but keep it for aborted streams
      // so tab-switch remounts can detect the aborted state
      if (!wasStreamingAbortedRef.current) {
        streamStateMap.delete(streamKey);
      }
      // Trigger re-render by updating chatDataState
      setTimeout(() => {
        setChatDataState({ ...chatDataRef.current });
      }, 1000);
    }
  }, [isStreamingDone, thinkingTime, activeConversationId]);


  // Show/hide the stop (cancel execution) icon while the stream is active.
  // Gate on state only - sourceRef is a ref, so mutating it never re-runs this
  // effect. Relying on it meant that if the source wasn't assigned yet on the
  // first run, isStop was set to false and never re-evaluated for the rest of
  // the stream, leaving the cancel button hidden.
  useEffect(() => {
    if (isStreaming && !isStreamingDone) {
      setIsStop(true);
      setFunctionsState({
        ...functionsState,
        abortStreaming: abortStreaming,
      });
      functionsRef.current.abortStreaming = abortStreaming;
    } else {
      setIsStop(false);
    }
  }, [isStreaming, isStreamingDone]);

  /**
   * Aborts the current streaming connection
   */
  const abortStreaming = () => {
    // Clear any active retry countdown timer
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
      setIsRetrying(false);
      setRetryCountdown(0);
      // Exhaust retries so no further retries can occur
      retryCountRef.current = MAX_RETRY_COUNT;
    }
    if (isStreaming) {
      setWasStreamingAborted(true);
      wasStreamingAbortedRef.current = true;
      if (sourceRef.current) {
        sourceRef.current.close();
      }
      setIsStreaming(false);
      setIsStreamingDone(true);
      // Mark as completed+aborted so tab-switch remounts don't restart the stream.
      // The isStreamingDone effect will clean up the entry after processing.
      const mapState = streamStateMap.get(streamKey);
      if (mapState) {
        mapState.completed = true;
        mapState.aborted = true;
        mapState.source = null;
      }

      // Stop the agent flow on the backend
      if (messageToStoreRef.current.sessionId) {
        stopAgentFlow(
          { session_id: messageToStoreRef.current.sessionId },
          baseUrl
        );
      }
      // Clear timeout if exists
      if (streamTimeoutRef.current) {
        clearTimeout(streamTimeoutRef.current);
        streamTimeoutRef.current = null;
      }
      
      // Stop thinking if it's in progress
      if (isThinking) {
        setIsThinking(false);
        const endTime = Date.now();
        const duration = Math.round((endTime - thinkingStartTimeRef.current) / 1000);
        const finalThinkingTime = Math.max(duration, 1);
        setThinkingTime(finalThinkingTime);
        setShowThoughtDropdown(true);
        messageToStoreRef.current.chatData.thinkingResponse.thinkingTime = finalThinkingTime;
      }
      // Stop the timer on abort (agent-specific thinking context)
      if (currentMode === "agent") {
        const abortElapsed = streamStartTimeRef.current
          ? Math.floor((Date.now() - streamStartTimeRef.current) / 1000)
          : 0;
        const abortMin = Math.floor(abortElapsed / 60);
        const abortSec = abortElapsed % 60;
        const abortLabel = `Completed in ${abortMin}m:${String(abortSec).padStart(2, '0')}s`;
        dispatch(setThinkingContext({
          streamStartTime: streamStartTimeRef.current,
          isStreamCompleted: true,
          finalElapsedSeconds: abortElapsed,
          thinkingHeaderMessage: abortLabel,
          thinkingContent: thinkingContentRef.current,
        }));
      }
      
      // Mark all in-progress steps as completed on abort
      const currentSteps = stepRef.current;
      if (currentSteps.length > 0) {
        const updatedSteps = currentSteps.map((step) => ({
          ...step,
          step_status: "completed",
        }));
        stepRef.current = updatedSteps;
        setSteps(updatedSteps);
        // Persist completed steps on the map entry for remount restoration
        const abortMapState = streamStateMap.get(streamKey);
        if (abortMapState) {
          abortMapState.completedSteps = updatedSteps;
        }
      }
      // Also mark steps completed in questionsStepsMap
      const updatedMap = { ...questionsStepsMapRef.current };
      Object.keys(updatedMap).forEach((key) => {
        updatedMap[key] = updatedMap[key].map((s) => ({
          ...s,
          step_status: "completed",
        }));
      });
      questionsStepsMapRef.current = updatedMap;
      setQuestionsStepsMap({ ...updatedMap });
      setStepsDone(true);

      // If no content yet, show aborted message
      // if (isEmpty(messageToStoreRef.current.chatData?.response)) {
        messageToStoreRef.current.chatData.response =
        messageToStoreRef.current.chatData.response + "\n\nYou stopped this response. You can ask a new question whenever you're ready";
        setContent((prev) => {
          return prev + "\n\nYou stopped this response. You can ask a new question whenever you're ready";
        })
      // }
    }
  };

  /**
   * Expose abort function to parent component
   */
  useEffect(() => {
    if (botData.utilityObject) {
      botData.utilityObject.abortStreaming = abortStreaming;
    }
    
    return () => {
      if (botData.utilityObject) {
        delete botData.utilityObject.abortStreaming;
      }
    };
  }, [isStreaming]);

  /**
   * Cleanup on unmount: Do NOT close the stream here.
   * The stream connection is kept alive in streamStateMap so it survives
   * tab-switch remounts. It is only closed by explicit abortStreaming() or new chat.
   * Also clear the retry countdown timer if active.
   */
  useEffect(() => {
    return () => {
      // Intentionally not closing the stream - it persists in streamStateMap
      // Clean up retry timer to avoid memory leaks
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, []);

  /**
   * Keyboard shortcut to abort streaming (Escape key)
   */
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Escape' && isStreaming && !isStreamingDone) {
        abortStreaming();
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isStreaming, isStreamingDone]);

  /**
   * Auto-abort previous stream when starting a new one.
   * NOTE: This is intentionally removed. In axios 0.32.0, signal/abort is properly
   * supported, and this effect was firing on mount causing immediate cancellation.
   * Stream abort on "new chat" is already handled by handleNewChatClick calling
   * functionsState.abortStreaming(). The streamStateMap logic handles all other cases.
   */

  /**
   * Set up timeout for auto-abort (optional - can be configured)
   */
  useEffect(() => {
    const maxStreamDuration = 3600000; // 1 hour in milliseconds (configurable)
    
    if (isStreaming && !isStreamingDone) {
      streamTimeoutRef.current = setTimeout(() => {
        if (sourceRef.current) {
          sourceRef.current.close();
          setIsStreaming(false);
          setIsStreamingDone(true);
          setContent(prev => prev + "\n\n[Stream timed out after 1 hour]");
        }
      }, maxStreamDuration);
    }

    return () => {
      if (streamTimeoutRef.current) {
        clearTimeout(streamTimeoutRef.current);
        streamTimeoutRef.current = null;
      }
    };
  }, [isStreaming, isStreamingDone]);

  /**
   * Component for displaying collapsible thought dropdown
   */
  const ThoughtDropdown = () => (
    <div className={classes.thoughtDropdown}>
      <div 
        className={classes.thoughtHeader}
        onClick={() => setIsThoughtExpanded(!isThoughtExpanded)}
      >
        <span className={classes.thoughtIcon}>🧠</span>
        <Typography className={classes.thoughtHeaderText}>
          Thought for {formatThinkingTime(thinkingTime)}
        </Typography>
        <span className={`${classes.dropdownArrow} ${isThoughtExpanded ? 'expanded' : ''}`}>
          ▼
        </span>
      </div>
      <Collapse in={isThoughtExpanded}>
        <div className={classes.thoughtContent}>
          <Typography className={classes.thoughtText}>
            {thinkingContent}
          </Typography>
        </div>
      </Collapse>
    </div>
  );

  const renderThinkingLoader = () => {
    return <div>{!thinkDone && <span className={classes.cursor} />}</div>;
  };
  /**
   * Renders the streamed content with appropriate formatting
   * Handles both single-line and multi-line content with markdown support
   * @returns {JSX.Element} Rendered content with optional blinking cursor
   */
  const renderContent = () => {
    return (
      <div className={classes.streamContainer}>
        {/* Show stop button while streaming */}
        {/* {isStreaming && !isStreamingDone && (
          <Button
            className={classes.stopButton}
            variant="contained"
            size="small"
            onClick={abortStreaming}
          >
            Stop
          </Button>
        )} */}

        {/* Show thinking indicator while thinking is active */}
        {/* {isThinking && <ThinkingIndicator />} */}

        {/* Show thought dropdown when thinking is complete and has content */}
        {/* {showThoughtDropdown && thinkingContent && <ThoughtDropdown />} */}

        {/* Render main content */}
        {
          <StepsResponseTab
            steps={steps}
            stepChange={stepChange}
            setSteps={setSteps}
            stepsDone={stepsDone}
            setStepsDone={setStepsDone}
            finalStepDone={finalStepDone}
            setFinalStepDone={setFinalStepDone}
            content={content}
            isStreaming={isStreaming}
            currentMode={currentMode}
            questions={questions}
            questionsStepsMap={questionsStepsMap}
            stepFormDataMap={stepFormDataMap}
            isFormDisabled={botData?.isFormDisabled || false}
            streamingWidgetData={streamingWidgetData}
            isRetrying={isRetrying}
            botProps={botProps}
            agentId={botData?.inputBody?.agent_id || ""}
            sessionId={messageToStoreRef.current?.sessionId || ""}
            chatSessionId={messageToStoreRef.current?.chatSessionId || botData?.chatSessionId || ""}
          />
        }
        {/* Retry countdown UI */}
        {isRetrying && (
          <div className={classes.retryContainer}>
            <TextRenderer text={`Auto re-trying in ${retryCountdown}s`} thinking="" />
          </div>
        )}
        {/* {content ? (
          content.includes("\n") ? (
            <div>
              {content.split("\n").map((text, index) => (
                <React.Fragment key={index}>
                  <Typography className={chatClasses.bodyTextStyling}>
                    <TextRenderer text={text} />
                  </Typography>
                  <br />
                </React.Fragment>
              ))}
              {isStreaming && <span className={classes.cursor} />}
            </div>
          ) : (
            <Typography className={chatClasses.chatbotText}>
              <TextRenderer text={content} />
              {isStreaming && <span className={classes.cursor} />}
            </Typography>
          )
        ) : (
          // Show cursor even when no content yet
          isStreaming && <span className={classes.cursor} />
        )} */}
      </div>
    );
  };
  if(currentMode === "agent") {
    return renderContent();
  }
  return renderContent();

};

export default StreamedContent;

// {
//     "response_type": "text",
//     "message": "",
//     "response_heading": null,
//     "status": "questions",
//     "widget_data": [
//         {
//             "questions": [
//                 "Retrieve all Shortfall articles for Retail-Store in class 'LTH-Leather', and count how many Shortfall articles there are.",
//                 "Retrieve the total number of L3 articles for Retail-Store in class 'LTH-Leather', and compute the % of total L3 articles that are Shortfall articles using the Shortfall article count."
//             ]
//         }
//     ],
//     "session_id": "0_e0cbabb0-7bf2-4d59-ac2e-6dcba96f80e2",
//     "chat_id": "0_493cc7bd-49b9-4b2f-83ce-78e78b822416",
//     "is_error": false
// }

// data: { "response_type": "text", "message": "", "response_heading": null, "status": "questions", "widget_data": [{ "questions": ["Give me last week sales"] }], "session_id": "1_7e0006d8-bd0d-4e92-b8f0-65cc38127f4d", "chat_id": "1_9b4a6a14-654a-4a42-bde5-dd54fe2888f8", "is_error": false }

// data: {"response_type": "text", "message": "", "response_heading": null, "status": "step", "widget_data": [{"header": "Assessing user query", "sub_header": "Classification In Progress", "step_status": "not-completed", "current_intent": "Give me last week sales"}], "session_id": "1_7e0006d8-bd0d-4e92-b8f0-65cc38127f4d", "chat_id": "1_9b4a6a14-654a-4a42-bde5-dd54fe2888f8", "is_error": false}
