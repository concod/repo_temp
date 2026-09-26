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
import { setThinkingContext } from "core/actions/smartBotActions";
import StepsResponseTab from "./steps-response-tab/StepsResponseTab";
import colours from "core/Styles/colours";
import { setCurrentAgentChatId } from "core/actions/smartBotActions";
import { stopAgentFlow } from "core/commonComponents/smartBot/services/chatbot-services";
import { stepFormStreamControl } from "../../message-content/ButtonContent.jsx";

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
const StreamedContent = ({ botData }) => {
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

  // State management for streaming content
  const [content, setContent] = useState("");
  // const [thinkingContent, setThinkingContent] = useState("");
  const [thinkDone, setThinkDone] = useState(false);
  const [isStreaming, setIsStreaming] = useState(true);
  const [wasStreamingAborted, setWasStreamingAborted] = useState(false);
  const wasStreamingAbortedRef = useRef(false);
  const [thinkingStarted, setThinkingStarted] = useState(false);
  const [isStreamingDone, setIsStreamingDone] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingTime, setThinkingTime] = useState(0);
  const [showThoughtDropdown, setShowThoughtDropdown] = useState(false);
  const [isThoughtExpanded, setIsThoughtExpanded] = useState(false);
  const [steps, setSteps] = useState([
    {
      header: "Processing Request",
      sub_header: "Analyzing the current request",
      step_status: "not-completed"
    }
  ]);
  const [questions, setQuestions] = useState([]);
  const [questionsStepsMap, setQuestionsStepsMap] = useState({});
  const [stepFormDataMap, setStepFormDataMap] = useState({});
  const [stepChange, setStepChange] = useState(false);
  const [stepsDone, setStepsDone] = useState(false);
  const [finalStepDone, setFinalStepDone] = useState(false);
  const thinkingContentRef = useRef("");
  const thinkingContext = useSelector((state) => {
    return state.smartBotReducer.thinkingContext;
  });
  const stepRef = useRef([
    {
      header: "Processing Request",
      sub_header: "Analyzing the current request",
      step_status: "not-completed"
    }
  ]);
  const questionsRef = useRef([]);
  const questionsStepsMapRef = useRef({});
  const stepFormDataMapRef = useRef({});
  const { thinkingHeaderMessage: headerMessage } = thinkingContext;

  // Refs to maintain data across renders
  const sourceRef = useRef(null); // Holds the SSE source instance
  const lastMessageRef = useRef(""); // Tracks the last received message
  const thinkingStartTimeRef = useRef(null);
  const thinkingTimeFinalRef = useRef(0);
  const thinkingHeaderMessageRef = useRef("Planning next moves.....");
  const thinkingDoneRef = useRef(false);
  const setThinkingContentRef = useRef(setThinkingContent); // Store current setThinkingContent function
  const streamTimeoutRef = useRef(null); // Ref for stream timeout
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
        : `${BASE_API}/core/chatbot/navigation-v3`;
      let method = botData?.utilityObject?.method
        ? botData?.utilityObject?.method
        : "PUT";
      delete botData.inputBody.chat_input;
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
          if (data?.message || data?.status === "step" || data?.status === "step_form" || data?.status === "thinking" || data?.status === "questions") {
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
          }
          else if (data.status === "thinking") {
            
            messageToStoreRef.current.chatData.thinkingResponse.thinkingHeading = "Planning next moves";
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
              thinkingHeaderMessage: thinkingHeaderMessageRef.current,
              thinkingContent: thinkingContentRef.current,
            }));
            setThinkingStarted(true);
            setIsThinkingFromParent(false);
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
          }
          else if (data.status === "step_form") {
            const formWidgetData = isArray(data.widget_data)
              ? data.widget_data
              : [data.widget_data];
            const currentIntent = data.current_intent || formWidgetData?.[0]?.current_intent;

            if (currentIntent) {
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
              };
              setStepFormDataMap(cloneDeep(stepFormDataMapRef.current));
            }
            setStepChange((prev) => !prev);
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
            // If this is the [DONE] chunk, mark streaming as complete
            if (data.message === "[DONE]") {
              setIsStreamingDone(true);
              const doneState = streamStateMap.get(streamKey);
              if (doneState) doneState.completed = true;
            }
          }
          else if (data.message !== "[DONE]") {

            // setTimeout(() => {
            //   setStepsDone(true);
            // }, 5000);
            if (!thinkingDoneRef?.current && currentMode === "agent") {
              thinkingDoneRef.current = true;
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
              setThinkingHeaderMessage(`Thought for ${formatThinkingTime(finalThinkingTime)}`);
              thinkingHeaderMessageRef.current = `Thought for ${formatThinkingTime(finalThinkingTime)}`;
              dispatch(setThinkingContext({
                thinkingHeaderMessage: `Thinking Completed`,
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
      console.error("Stream error:", event.reason);
      setIsStreaming(false);
      errState.completed = true;
      if (isThinking) {
        setIsThinking(false);
        const endTime = Date.now();
        const duration = Math.round((endTime - thinkingStartTimeRef.current) / 1000);
        const finalThinkingTime = Math.max(duration, 1); // Ensure at least 1 second
        setThinkingTime(finalThinkingTime);
        setShowThoughtDropdown(true);
        thinkingStartTimeRef.current = finalThinkingTime;
        // Store thinking time in messageToStoreRef for persistence
        messageToStoreRef.current.chatData.thinkingResponse.thinkingTime = finalThinkingTime;
      }
    });

    // Handle stream closure
    source.addEventListener("close", () => {
      const closeState = streamStateMap.get(streamKey);
      if (!closeState || closeState.listenerGeneration !== generation) return;
      setIsStreaming(false);
      closeState.completed = true;
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
      // Restore thinking state
      if (store.chatData?.thinkingResponse?.thinkingStream) {
        thinkingContentRef.current = store.chatData.thinkingResponse.thinkingStream;
      }
      if (store.chatData?.thinkingResponse?.thinkingTime) {
        thinkingTimeFinalRef.current = store.chatData.thinkingResponse.thinkingTime;
        setThinkingTime(store.chatData.thinkingResponse.thinkingTime);
      }

      if (mapState.completed) {
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
    if (isStreamingDone) {
      localStorage.setItem("isStreaming", "false");
      if (currentMode === "agent") {
      setIsStop(false);
        // Use thinkingTime state instead of thinkingTimeFinalRef.current to ensure we have the correct value
        const finalThinkingTime =
          thinkingTime || thinkingTimeFinalRef.current || 1;
        messageToStoreRef.current.chatData.thinkingResponse.thinkingHeading = `Thinking Completed`;
        // messageToStoreRef.current.chatData.thinkingResponse.thinkingHeading = `Thought for ${formatThinkingTime(
        //   finalThinkingTime
        // )}`;
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
            },
          },
        };
        processResponse(
          response,
          botData.inputBody,
          currentMode,
          botData.utilityObject.customChatConfig,
          {
            newChatData: chatDataInfoRef,
            isTabEnabled: true,
            steps: cloneDeep(stepRef.current),
            currentTabValue: stepsDone ? "agent_response" : "steps",
            questions: cloneDeep(questionsRef.current),
            questionsStepsMap: cloneDeep(questionsStepsMapRef.current),
            stepFormDataMap: cloneDeep(stepFormDataMapRef.current),
          },
          activeConversationId
        );


      // [
      //   {
      //     header: "Finding relevant information",
      //     sub_header: "Alan is working to identify relevant information to user answer user query",
      //     step_status: "not-completed",
      //   },
      // ];

      // [
      //   {
      //     header: "Finding relevant information",
      //     sub_header: "Alan is working to identify relevant information to user answer user query",
      //     step_status: "completed",
      //   },
      //   {
      //     header: "Output Generation",
      //     sub_header: "Alan is finalizing response to user query",
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
            steps: cloneDeep(stepRef.current),
            currentTabValue: stepsDone ? "agent_response" : "steps",
            questions: cloneDeep(questionsRef.current),
            questionsStepsMap: cloneDeep(questionsStepsMapRef.current),
            stepFormDataMap: cloneDeep(stepFormDataMapRef.current),
          },
          activeConversationId
        );
      }
      // Clean up module-level Map entry - stream is fully processed
      streamStateMap.delete(streamKey);
      // Trigger re-render by updating chatDataState
      setTimeout(() => {
        setChatDataState({ ...chatDataRef.current });
      }, 1000);
    }
  }, [isStreamingDone, thinkingTime, activeConversationId]);


  useEffect(() => {
    if (currentMode === "agent") {
      if (sourceRef.current && isStreaming) {
        setIsStop(true);
        setFunctionsState({
          ...functionsState,
          abortStreaming: abortStreaming,
        });
        functionsRef.current.abortStreaming = abortStreaming;
      } else {
        setIsStop(false);
      }
    }
  }, [isStreaming]);

  /**
   * Aborts the current streaming connection
   */
  const abortStreaming = () => {
    if (sourceRef.current && isStreaming) {
      setWasStreamingAborted(true);
      wasStreamingAbortedRef.current = true;
      sourceRef.current.close();
      setIsStreaming(false);
      setIsStreamingDone(true);
      // Delete module-level Map entry immediately on abort.
      // This ensures if the component unmounts before the isStreamingDone effect runs
      // (e.g. handleNewChatClick clears conversation), the next mount with the same
      // streamKey starts a fresh stream instead of restoring the aborted one.
      streamStateMap.delete(streamKey);

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
      
      // If no content yet, show aborted message
      // if (isEmpty(messageToStoreRef.current.chatData?.response)) {
        messageToStoreRef.current.chatData.response =
        messageToStoreRef.current.chatData.response + "\n\nStream was stopped by user.";
        setContent((prev) => {
          return prev + "\n\nStream was stopped by user.";
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
   */
  useEffect(() => {
    return () => {
      // Intentionally not closing the stream - it persists in streamStateMap
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
   * Auto-abort previous stream when starting a new one
   */
  useEffect(() => {
    // If we already have a source and it's streaming, abort it before starting new one
    if (sourceRef.current && isStreaming) {
      sourceRef.current.close();
    }
  }, [botData.inputBody]); // Trigger when new input is provided

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
          />
        }
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
