import { Tabs } from "impact-ui-v3";
import Steps from "./components/Steps";
import AgentResponse from "./components/AgentResponse";
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';

import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { TextRenderer } from "core/commonComponents/smartBot/components/TextRenderer";
import { useStyles as useChatStyles } from "core/commonComponents/smartBot/styling";
import { setMinimizedStreamData, setThinkingContext } from "core/actions/smartBotActions";


const StepsResponseTab = (props) => {

  const {
    steps,
    setSteps,
    stepsDone,
    setStepsDone,
    finalStepDone,
    setFinalStepDone,
    content,
    isStreaming,
    stepChange,
    currentMode,
    questions,
    questionsStepsMap,
    stepFormDataMap,
    isFormDisabled,
    streamingWidgetData,
    isRetrying,
    botProps,
    agentId,
    sessionId,
    chatSessionId,
  } = props;

  const dispatch = useDispatch();
  const thinkingContext = useSelector((state) => state.smartBotReducer.thinkingContext);
  const streamStartTimeRef = useRef(thinkingContext?.streamStartTime);

  // Keep streamStartTime ref in sync with Redux for use in event handler closures
  useEffect(() => {
    streamStartTimeRef.current = thinkingContext?.streamStartTime;
  }, [thinkingContext?.streamStartTime]);

  const [tabValue, setTabValue] = useState(stepsDone ? "agent_response" : "steps");
  const [timeoutMessage, setTimeoutMessage] = useState("");
  const [isTimedOut, setIsTimedOut] = useState(false);

  // Switch to agent_response tab on form inactivity timeout (30 min)
  useEffect(() => {
    const handleStepFormTimeout = () => {
      setTimeoutMessage("This session timed out due to inactivity. Please start a new message to continue.");
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

  // When retry countdown starts, switch to agent_response to show it.
  // When retry actually fires (isRetrying goes false + isStreaming goes true), switch back to steps.
  useEffect(() => {
    if (isRetrying) {
      setTabValue("agent_response");
    }
  }, [isRetrying]);

  useEffect(() => {
    if (isStreaming && !isRetrying) {
      setTabValue("steps");
    }
  }, [isStreaming, isRetrying]);


  const handleChangeTabValue = (_event, newValue) => {
    setTabValue(newValue);
  };

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
            steps={steps}
            setSteps={setSteps}
            done={stepsDone}
            setDone={setStepsDone}
            setTabValue={setTabValue}
            finalStepDone={finalStepDone}
            setFinalStepDone={setFinalStepDone}
            stepChange={stepChange}
            currentMode={currentMode}
            questions={questions}
            questionsStepsMap={questionsStepsMap}
            stepFormDataMap={stepFormDataMap}
            isFormDisabled={isFormDisabled || isTimedOut}
            botProps={botProps}
            agentId={agentId}
            sessionId={sessionId}
            chatSessionId={chatSessionId}
          />,
          <>
            <AgentResponse content={content} isStreaming={isStreaming} streamingWidgetData={streamingWidgetData} isFormDisabled={isFormDisabled || isTimedOut} />
            {timeoutMessage && (
              <div style={{ marginTop: "8px", padding: "0 8px" }}>
                <TextRenderer text={timeoutMessage} thinking="" />
              </div>
            )}
          </>,
        ]}
        value={tabValue}
      />
    </div>
  );
};

export default StepsResponseTab;
