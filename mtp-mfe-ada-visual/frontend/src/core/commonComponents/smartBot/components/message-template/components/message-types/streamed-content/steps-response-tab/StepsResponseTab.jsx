import { Tabs } from "impact-ui-v3";
import Steps from "./components/Steps";
import AgentResponse from "./components/AgentResponse";
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';

import { useState } from "react";


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
  } = props;

  const [tabValue, setTabValue] = useState("steps");


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
            isFormDisabled={isFormDisabled}
          />,
          <AgentResponse content={content} isStreaming={isStreaming} />,
        ]}
        value={tabValue}
      />
    </div>
  );
};

export default StepsResponseTab;
