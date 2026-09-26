import { useState, useEffect, useRef } from "react";
import { Tabs } from "impact-ui-v3";
import Steps from "./components/Steps.jsx";
import AgentResponse from "./components/AgentResponse.jsx";
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import { useSelector, useDispatch } from "react-redux";
import { setStepFormStreamData, clearPersistedFormValues, setChatbotContext } from "core/actions/smartBotActions";
import { cloneDeep } from "lodash";
import isArray from "lodash/isArray";
import { parseResponse } from "core/commonComponents/smartBot/utlis.js";
import TextContent from "../TextContent.jsx";
import TableContent from "../TableContent.jsx";
import GraphContent from "../GraphContent.jsx";



const TabularContent = ({ steps: initialSteps, currentTabValue, children, questions: initialQuestions = [], questionsStepsMap: initialQuestionsStepsMap = {}, stepFormDataMap: initialStepFormDataMap = {}, isFormDisabled = false }) => {

  const dispatch = useDispatch();
  const stepFormStreamData = useSelector((state) => state.smartBotReducer.stepFormStreamData);

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

  // Render a widget item from SSE data
  const renderWidget = (item, index) => {
    try {
      const parsedData = parseResponse(item, item.type, "", "", true);
      if (!parsedData) return null;
      const key = `restream-widget-${index}`;
      switch (parsedData.bodyType) {
        case "text":
          return <TextContent key={key} bodyText={parsedData.bodyText} botData={parsedData} />;
        case "table":
          return <TableContent key={key} bodyText={parsedData.bodyText} />;
        case "graph":
          return <GraphContent key={key} bodyText={parsedData.bodyText} />;
        default:
          return null;
      }
    } catch (e) {
      console.error("[TabularContent] renderWidget error:", e);
      return null;
    }
  };

  // Watch Redux for batched SSE chunks dispatched by ButtonContent
  useEffect(() => {
    if (!stepFormStreamData) return;

    const payload = stepFormStreamData;
    // Clear Redux immediately
    dispatch(setStepFormStreamData(null));

    if (payload.status === "streaming_start") {
      setIsRestreaming(true);
      setStepFormSubmitted(true);
      setHasNewStepFormFromRestream(false);
      setTabValue("steps");
      return;
    }

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
      setWidgetContent((prev) => [...prev, ...newWidgets]);
    }

    // If the response contains a new step_form, reset stepFormSubmitted and mark new form as active
    const lastStepFormChunk = [...chunks].reverse().find((c) => c.status === "step_form");
    if (lastStepFormChunk) {
      const formWidgetData = isArray(lastStepFormChunk.widget_data) ? lastStepFormChunk.widget_data : [lastStepFormChunk.widget_data];
      const latestIntent = lastStepFormChunk.current_intent || formWidgetData?.[0]?.current_intent;
      setStepFormSubmitted(false);
      setHasNewStepFormFromRestream(true);
      setActiveFormIntent(latestIntent || null);
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
            isFormDisabled={(isFormDisabled && !isRestreaming) || stepFormSubmitted}
            activeFormIntent={hasNewStepFormFromRestream ? activeFormIntent : null}
            isRestreaming={isRestreaming}
          />,
          <AgentResponse>
            {children}
            {renderedWidgets.length > 0 && (
              <div className="restream-widget-content">
                {renderedWidgets}
              </div>
            )}
          </AgentResponse>,
        ]}
        value={tabValue}
      />
    </div>
  );
};

export default TabularContent;
