import { useState, useEffect, useRef } from "react";
import { Tabs } from "impact-ui-v3";
import Steps from "./components/Steps.jsx";
import AgentResponse from "./components/AgentResponse.jsx";
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import { useSelector, useDispatch } from "react-redux";
import { setStepFormStreamData, clearPersistedFormValues, setChatbotContext, setMinimizedStreamData, setThinkingContext } from "core/actions/smartBotActions";
import { cloneDeep } from "lodash";
import isArray from "lodash/isArray";
import { parseResponse } from "core/commonComponents/smartBot/utlis.js";
import TextContent from "../TextContent.jsx";
import TableContent from "../TableContent.jsx";
import GraphContent from "../GraphContent.jsx";
import RadioContent from "../RadioContent.jsx";
import CheckboxContent from "../CheckboxContent.jsx";
import SelectContent from "../SelectContent.jsx";
import SliderContent from "../SliderContent.jsx";
import ButtonContent from "../ButtonContent.jsx";
import InputContent from "../InputContent.jsx";
import DatePickerContent from "../DatePickerContent.jsx";
import DateRangePickerContent from "../DateRangePickerContent.jsx";
import HtmlContent from "../HtmlContent.jsx";
import ChipsContent from "../ChipsContent.jsx";
import SelectableChips from "../SelectableChips.jsx";
import QuestionsContent from "../QuestionsContent.jsx";
import ImageContent from "../ImageContent.jsx";
import { TextRenderer } from "core/commonComponents/smartBot/components/TextRenderer";

// Module-level counter and active instance tracker.
// Only the active instance should process stepFormStreamData from Redux.
let instanceCounter = 0;
let activeTabularInstanceId = null;

const TabularContent = ({ steps: initialSteps, currentTabValue, children, questions: initialQuestions = [], questionsStepsMap: initialQuestionsStepsMap = {}, stepFormDataMap: initialStepFormDataMap = {}, isFormDisabled = false, sessionId: propSessionId = "", chatSessionId = "", botProps = null, currentMode = "", agentId = "" }) => {

  const dispatch = useDispatch();
  const stepFormStreamData = useSelector((state) => state.smartBotReducer.stepFormStreamData);
  const thinkingContext = useSelector((state) => state.smartBotReducer.thinkingContext);
  const streamStartTimeRef = useRef(thinkingContext?.streamStartTime);

  // Keep streamStartTime ref in sync with Redux for use in event handler closures
  useEffect(() => {
    streamStartTimeRef.current = thinkingContext?.streamStartTime;
  }, [thinkingContext?.streamStartTime]);

  const [tabValue, setTabValue] = useState(currentTabValue);
  // Local state — initialized from props, updated by SSE chunks
  const [stepsState, setStepsState] = useState(() => {
    const s = cloneDeep(initialSteps);
    s.forEach((step) => { step.step_status = "completed"; });
    return s;
  });
  const [questionsState, setQuestionsState] = useState(cloneDeep(initialQuestions));
  const [questionsStepsMapState, setQuestionsStepsMapState] = useState(() => {
    const m = cloneDeep(initialQuestionsStepsMap);
    Object.keys(m).forEach((key) => {
      m[key].forEach((step) => { step.step_status = "completed"; });
    });
    return m;
  });
  const [stepFormDataMapState, setStepFormDataMapState] = useState(cloneDeep(initialStepFormDataMap));
  const [widgetContent, setWidgetContent] = useState([]);
  const [isRestreaming, setIsRestreaming] = useState(false);
  const [stepFormSubmitted, setStepFormSubmitted] = useState(false);
  const [hasNewStepFormFromRestream, setHasNewStepFormFromRestream] = useState(false);
  const [activeFormIntent, setActiveFormIntent] = useState(null);
  const [retryCountdown, setRetryCountdown] = useState(0); // Countdown seconds for retry UI
  const [timeoutMessage, setTimeoutMessage] = useState("");
  const [isTimedOut, setIsTimedOut] = useState(false);

  // Stable unique instance ID for this TabularContent mount
  const instanceIdRef = useRef(null);
  if (instanceIdRef.current === null) {
    instanceCounter += 1;
    instanceIdRef.current = instanceCounter;
  }

  // Refs for accumulating state during streaming (avoids stale closures)
  const stepsRef = useRef(stepsState);
  const questionsRef = useRef(questionsState);
  const questionsStepsMapRef = useRef(questionsStepsMapState);
  const stepFormDataMapRef = useRef(stepFormDataMapState);

  const handleChangeTabValue = (_event, newValue) => {
    setTabValue(newValue);
  };

  // Switch to agent_response tab when ButtonContent's nth init stream completes with status "completed"
  useEffect(() => {
    const handleStepFormCompleted = () => {
      setTabValue("agent_response");
    };
    window.addEventListener("stepFormStreamCompleted", handleStepFormCompleted);
    return () => {
      window.removeEventListener("stepFormStreamCompleted", handleStepFormCompleted);
    };
  }, []);

  // Switch to agent_response tab on form inactivity timeout (30 min)
  useEffect(() => {
    const handleStepFormTimeout = () => {
      setTimeoutMessage("This session timed out due to inactivity. Please start a new message to continue.");
      setStepFormSubmitted(true);
      setIsTimedOut(true);
      setTabValue("agent_response");
      dispatch(setMinimizedStreamData(null));
      const elapsed = streamStartTimeRef.current
        ? Math.floor((Date.now() - streamStartTimeRef.current) / 1000)
        : null;
      const mins = elapsed != null ? Math.floor(elapsed / 60) : 0;
      const secs = elapsed != null ? elapsed % 60 : 0;
      const timedOutLabel = `Worked for ${mins}m:${String(secs).padStart(2, '0')}s`;
      dispatch(setThinkingContext({
        streamStartTime: null,
        isStreamCompleted: true,
        finalElapsedSeconds: elapsed,
        thinkingHeaderMessage: timedOutLabel,
        thinkingContent: "",
      }));
    };
    window.addEventListener("stepFormTimeout", handleStepFormTimeout);
    return () => {
      window.removeEventListener("stepFormTimeout", handleStepFormTimeout);
    };
  }, []);

  // Render a widget item from SSE data
  const renderWidgetBody = (parsedData, key) => {
      switch (parsedData.bodyType) {
        case "text":
          return <TextContent key={key} bodyText={parsedData.bodyText} botData={parsedData} />;
        case "chips":
          return parsedData.isMultiSelect ? (
            <SelectableChips
              key={key}
              bodyText={parsedData.bodyText}
              chipType="selectable"
              utilityData={parsedData.utilityData}
              props={botProps}
            />
          ) : (
              <ChipsContent
                key={key}
                bodyText={parsedData.bodyText}
                props={botProps}
                botData={parsedData}
                isFormDisabled={isFormDisabled}
              />
          );
        case "questions":
          return <QuestionsContent key={key} bodyText={parsedData.bodyText} props={botProps} />;
        case "image":
          return <ImageContent key={key} bodyText={parsedData.bodyText} />;
        case "table":
          return <TableContent key={parsedData.bodyText?.table_name || key} bodyText={parsedData.bodyText} />;
        case "graph":
          return <GraphContent key={key} bodyText={parsedData.bodyText} />;
        case "radio":
          return <RadioContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} />;
        case "checkbox":
          return <CheckboxContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} />;
        case "select":
          return <SelectContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} />;
        case "slider":
          return <SliderContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} />;
        case "button":
          return <ButtonContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} />;
        case "input":
          return <InputContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} />;
        case "datePicker":
          return <DatePickerContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} />;
        case "dateRangePicker":
          return <DateRangePickerContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} />;
        case "html":
          return <HtmlContent key={key} bodyText={parsedData.bodyText} />;
        default:
          return null;
      }
  };

  const renderWidget = (item, index) => {
    try {
      const parsedData = parseResponse(item, item.type, agentId, currentMode, true, propSessionId);
      if (!parsedData) return null;
      const key = `restream-widget-${index}`;
      return renderWidgetBody(parsedData, key);
    } catch (e) {
      console.error("[TabularContent] renderWidget error:", e);
      return null;
    }
  };

  // Register as active instance when this TabularContent has an active step form
  useEffect(() => {
    const hasActiveForm = Object.keys(initialStepFormDataMap).length > 0;
    if (hasActiveForm) {
      activeTabularInstanceId = instanceIdRef.current;
    }
  }, [initialStepFormDataMap]);

  // Watch Redux for batched SSE chunks dispatched by ButtonContent
  useEffect(() => {
    if (!stepFormStreamData) return;

    // Only the active instance should process stepFormStreamData
    if (activeTabularInstanceId !== null && activeTabularInstanceId !== instanceIdRef.current) {
      return;
    }

    const payload = stepFormStreamData;
    // Clear Redux immediately
    dispatch(setStepFormStreamData(null));

    if (payload.status === "streaming_start") {
      setIsRestreaming(true);
      setStepFormSubmitted(true);
      setHasNewStepFormFromRestream(false);
      setRetryCountdown(0);
      setTabValue("steps");
      return;
    }

    // Handle retry countdown updates from ButtonContent
    if (payload.status === "retrying") {
      setRetryCountdown(payload.countdown || 0);
      return;
    }

    // Handle real-time widget chunks dispatched immediately by ButtonContent
    if (payload.status === "widget_chunk") {
      const chunks = payload.chunks || [];
      const newWidgets = [];
      chunks.forEach((data) => {
        if (data.status === "widget") {
          const widgetItems = isArray(data.widget_data) ? data.widget_data : [data.widget_data];
          widgetItems.forEach((item) => {
            if (item) newWidgets.push(item);
          });
        }
      });
      if (newWidgets.length > 0) {
        setWidgetContent((prev) => [...prev, ...newWidgets]);
      }
      return;
    }

    // Handle real-time step/step_form/questions chunks for incremental UI updates
    if (payload.status === "step_chunk") {
      const chunks = payload.chunks || [];
      let newSteps = cloneDeep(stepsRef.current);
      let newQuestions = [...questionsRef.current];
      let newQuestionsStepsMap = cloneDeep(questionsStepsMapRef.current);
      let newStepFormDataMap = cloneDeep(stepFormDataMapRef.current);

      chunks.forEach((data) => {
        if (data.status === "questions") {
          const incomingQuestions = data.widget_data?.[0]?.questions || [];
          newQuestions = [...newQuestions, ...incomingQuestions];
          incomingQuestions.forEach((q) => {
            if (!newQuestionsStepsMap[q]) {
              newQuestionsStepsMap[q] = [
                {
                  header: "Processing Request",
                  sub_header: "Analyzing the current request",
                  step_status: "not-completed",
                },
              ];
            }
          });
        }

        if (data.status === "step") {
          const newStep = data.widget_data?.[0];
          if (!newStep) return;
          const currentIntent = newStep.current_intent;

          const existingIdx = newSteps.findIndex((s) => s.header === newStep.header);
          if (existingIdx !== -1) {
            newSteps[existingIdx] = newStep;
          } else {
            newSteps.push(newStep);
          }

          if (currentIntent) {
            if (!newQuestionsStepsMap[currentIntent]) {
              newQuestions.push(currentIntent);
              newQuestionsStepsMap[currentIntent] = [
                {
                  header: "Processing Request",
                  sub_header: "Analyzing the current request",
                  step_status: "not-completed",
                },
              ];
            }
            let intentSteps = newQuestionsStepsMap[currentIntent];
            if (newStep.header && intentSteps.length === 1 && intentSteps[0].header === "Processing Request") {
              intentSteps = [];
              newQuestionsStepsMap[currentIntent] = intentSteps;
            }
            const existingStepIdx = intentSteps.findIndex((s) => s.header === newStep.header);
            if (existingStepIdx !== -1) {
              intentSteps[existingStepIdx] = newStep;
            } else {
              intentSteps.push(newStep);
            }
            if (newStep.step_status === "completed") {
              intentSteps.forEach((s) => { s.step_status = "completed"; });
            }
            newQuestionsStepsMap[currentIntent] = intentSteps;
          }
        }

        if (data.status === "step_form") {
          const formWidgetData = isArray(data.widget_data) ? data.widget_data : [data.widget_data];
          const currentIntent = data.current_intent || formWidgetData?.[0]?.current_intent;
          if (currentIntent) {
            if (!newQuestionsStepsMap[currentIntent]) {
              newQuestionsStepsMap[currentIntent] = [];
              if (!newQuestions.includes(currentIntent)) {
                newQuestions.push(currentIntent);
              }
            }
            // Mark all steps under this intent as completed — the form is the final state
            if (newQuestionsStepsMap[currentIntent]?.length > 0) {
              newQuestionsStepsMap[currentIntent].forEach((s) => { s.step_status = "completed"; });
            }
            const submitButton = {
              type: "button",
              data: {
                message: "",
                buttons: [
                  {
                    label: "Submit",
                    variant: "primary",
                    size: "medium",
                    disabled: false,
                  },
                ],
              },
            };
            newStepFormDataMap[currentIntent] = {
              widgets: [...formWidgetData, submitButton],
              showSavedFilters: data.show_saved_filters !== false,
              preSelectedFilters: data.pre_selected_filters || null,
            };
          }
        }
      });

      // Update refs and state
      stepsRef.current = newSteps;
      questionsRef.current = newQuestions;
      questionsStepsMapRef.current = newQuestionsStepsMap;
      stepFormDataMapRef.current = newStepFormDataMap;

      setStepsState(cloneDeep(newSteps));
      setQuestionsState([...newQuestions]);
      setQuestionsStepsMapState(cloneDeep(newQuestionsStepsMap));
      setStepFormDataMapState(cloneDeep(newStepFormDataMap));

      // If a step_form chunk arrives during restream, handle form reset
      const lastStepFormChunk = chunks.find((c) => c.status === "step_form");
      if (lastStepFormChunk) {
        const formWidgetData = isArray(lastStepFormChunk.widget_data) ? lastStepFormChunk.widget_data : [lastStepFormChunk.widget_data];
        const latestIntent = lastStepFormChunk.current_intent || formWidgetData?.[0]?.current_intent;
        setStepFormSubmitted(false);
        setHasNewStepFormFromRestream(true);
        setActiveFormIntent(latestIntent || null);
        activeTabularInstanceId = instanceIdRef.current;
        dispatch(clearPersistedFormValues());
        dispatch(setChatbotContext({}));
      }
      return;
    }

    // Clear retry countdown when final processing starts
    setRetryCountdown(0);

    // Process all collected chunks at once (done or error)
    const chunks = payload.chunks || [];

    let newSteps = cloneDeep(stepsRef.current);
    let newQuestions = [...questionsRef.current];
    let newQuestionsStepsMap = cloneDeep(questionsStepsMapRef.current);
    let newStepFormDataMap = cloneDeep(stepFormDataMapRef.current);
    const newWidgets = [];

    chunks.forEach((data) => {
      if (data.status === "questions") {
        const incomingQuestions = data.widget_data?.[0]?.questions || [];
        newQuestions = [...newQuestions, ...incomingQuestions];
        incomingQuestions.forEach((q) => {
          if (!newQuestionsStepsMap[q]) {
            newQuestionsStepsMap[q] = [
              {
                header: "Processing Request",
                sub_header: "Analyzing the current request",
                step_status: "not-completed",
              },
            ];
          }
        });
      }

      if (data.status === "step") {
        const newStep = data.widget_data?.[0];
        if (!newStep) return;
        const currentIntent = newStep.current_intent;

        // Update flat steps
        const existingIdx = newSteps.findIndex((s) => s.header === newStep.header);
        if (existingIdx !== -1) {
          newSteps[existingIdx] = newStep;
        } else {
          newSteps.push(newStep);
        }

        // Update per-question steps map
        if (currentIntent) {
          // If this is a new intent we haven't seen, add it to questions and map
          if (!newQuestionsStepsMap[currentIntent]) {
            newQuestions.push(currentIntent);
            newQuestionsStepsMap[currentIntent] = [
              {
                header: "Processing Request",
                sub_header: "Analyzing the current request",
                step_status: "not-completed",
              },
            ];
          }
          let intentSteps = newQuestionsStepsMap[currentIntent];
          // Remove placeholder if the real step has a header
          if (newStep.header && intentSteps.length === 1 && intentSteps[0].header === "Processing Request") {
            intentSteps = [];
            newQuestionsStepsMap[currentIntent] = intentSteps;
          }
          const existingStepIdx = intentSteps.findIndex((s) => s.header === newStep.header);
          if (existingStepIdx !== -1) {
            intentSteps[existingStepIdx] = newStep;
          } else {
            intentSteps.push(newStep);
          }
          // Mark all sub-steps completed when the latest step is completed
          if (newStep.step_status === "completed") {
            intentSteps.forEach((s) => { s.step_status = "completed"; });
          }
          newQuestionsStepsMap[currentIntent] = intentSteps;
        }
      }

      if (data.status === "step_form") {
        const formWidgetData = isArray(data.widget_data) ? data.widget_data : [data.widget_data];
        const currentIntent = data.current_intent || formWidgetData?.[0]?.current_intent;
        if (currentIntent) {
          // Auto-create question/intent entry if no prior step chunk created it
          if (!newQuestionsStepsMap[currentIntent]) {
            newQuestionsStepsMap[currentIntent] = [];
            if (!newQuestions.includes(currentIntent)) {
              newQuestions.push(currentIntent);
            }
          }
          // Mark all steps under this intent as completed — the form is the final state
          if (newQuestionsStepsMap[currentIntent]?.length > 0) {
            newQuestionsStepsMap[currentIntent].forEach((s) => { s.step_status = "completed"; });
          }
          const submitButton = {
            type: "button",
            data: {
              message: "",
              buttons: [
                {
                  label: "Submit",
                  variant: "primary",
                  size: "medium",
                  disabled: false,
                },
              ],
            },
          };
          newStepFormDataMap[currentIntent] = {
            widgets: [...formWidgetData, submitButton],
            showSavedFilters: data.show_saved_filters !== false,
            preSelectedFilters: data.pre_selected_filters || null,
          };
        }
      }

      if (data.status === "widget") {
        const widgetItems = isArray(data.widget_data) ? data.widget_data : [data.widget_data];
        widgetItems.forEach((item) => {
          if (item) newWidgets.push(item);
        });
      }

      if (data.status === "content" && data.message) {
        newWidgets.push({ type: "text", response: data.message });
      }
    });

    // Batch-update all state at once
    stepsRef.current = newSteps;
    questionsRef.current = newQuestions;
    questionsStepsMapRef.current = newQuestionsStepsMap;
    stepFormDataMapRef.current = newStepFormDataMap;

    setStepsState(cloneDeep(newSteps));
    setQuestionsState([...newQuestions]);
    setQuestionsStepsMapState(cloneDeep(newQuestionsStepsMap));
    setStepFormDataMapState(cloneDeep(newStepFormDataMap));

    if (newWidgets.length > 0) {
      // If widget data contains form components (radio, select, checkbox, etc.),
      // append a Submit button so the user can submit their selection
      const formTypes = ["radio", "select", "checkbox", "slider", "input", "datePicker", "dateRangePicker"];
      const hasFormWidget = newWidgets.some((item) => formTypes.includes(item?.type));
      const hasStepForm = chunks.some((c) => c.status === "step_form");
      if (hasFormWidget && !hasStepForm) {
        const sendButton = document.getElementById("chat-input-send-button");
        newWidgets.push({
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
        });
      }
      // Replace (not append) to avoid duplicates from real-time widget_chunk dispatches
      setWidgetContent(newWidgets);
    }

    // If the response contains a new step_form, reset stepFormSubmitted and mark new form as active
    const lastStepFormChunk = [...chunks].reverse().find((c) => c.status === "step_form");
    if (lastStepFormChunk) {
      const formWidgetData = isArray(lastStepFormChunk.widget_data) ? lastStepFormChunk.widget_data : [lastStepFormChunk.widget_data];
      const latestIntent = lastStepFormChunk.current_intent || formWidgetData?.[0]?.current_intent;
      setStepFormSubmitted(false);
      setHasNewStepFormFromRestream(true);
      setActiveFormIntent(latestIntent || null);
      // Re-register as active instance since this TabularContent now owns the new form
      activeTabularInstanceId = instanceIdRef.current;
      // Clear stale persisted form values and context so the new form starts fresh
      dispatch(clearPersistedFormValues());
      dispatch(setChatbotContext({}));
    }

    setIsRestreaming(false);
  }, [stepFormStreamData]);

  // Render widget content from restream responses
  const renderedWidgets = widgetContent.map((item, index) => renderWidget(item, index)).filter(Boolean);

  return (
    <div>
      <Tabs
        onChange={handleChangeTabValue}
        orientation="horizontal"
        tabNames={[
          {
            label: "Steps",
            value: "steps",
            icon: <FormatListBulletedOutlinedIcon fontSize="large" />,
          },
          {
            label: "Agent response",
            value: "agent_response",
            icon: <PsychologyOutlinedIcon fontSize="large" />,
          },
        ]}
        tabPanels={[
          <Steps
            steps={stepsState}
            questions={questionsState}
            questionsStepsMap={questionsStepsMapState}
            stepFormDataMap={stepFormDataMapState}
            isFormDisabled={(isFormDisabled && !isRestreaming) || stepFormSubmitted || isTimedOut}
            activeFormIntent={hasNewStepFormFromRestream ? activeFormIntent : null}
            isRestreaming={isRestreaming}
            sessionId={propSessionId}
            chatSessionId={chatSessionId}
            agentId={agentId}
          />,
          <AgentResponse>
            {children}
            {renderedWidgets.length > 0 && (
              <div className="restream-widget-content">
                {renderedWidgets}
              </div>
            )}
            {retryCountdown > 0 && (
              <div style={{ marginTop: "8px" }}>
                <TextRenderer text={`Auto re-trying in ${retryCountdown}s`} thinking="" />
              </div>
            )}
            {timeoutMessage && (
              <div style={{ marginTop: "8px" }}>
                <TextRenderer text={timeoutMessage} thinking="" />
              </div>
            )}
          </AgentResponse>,
        ]}
        value={tabValue}
      />
    </div>
  );
};

/** Reset the active instance tracker (call when a new conversation starts from the input field) */
export const resetActiveTabularInstance = () => {
  activeTabularInstanceId = null;
};

export default TabularContent;
