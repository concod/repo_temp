import { Button } from "impact-ui-v3";
import SelectedModule from "./SelectedModule";
import PropTypes from "prop-types";

const ModuleSelection = ({
  classes,
  selectedModule,
  isCardVisible,
  setIsCardVisible,
  currentMode,
  setSelectedModule,
  fetchUserResultsFromQuery,
  setScreenName,
  setLink,
  activeConversationId, 
  setIsModuleChanged
}) => {
  const handleModuleSelect = (option, applicationCode) => {
    let newSelectedModule = { ...selectedModule, [activeConversationId]: option };
    setSelectedModule(newSelectedModule);
    setIsCardVisible(false);
    let dataObject = {
      actionName: "setUserScreenAndFlow",
      actionType: "direct",
      application_code: applicationCode,
      displayText: option,
      flow_type: currentMode,
      interactable: true,
      screen_name: option,
    };
    const selectedModuleData = JSON.stringify(newSelectedModule);
    localStorage.setItem("currentSelectedModuleData", selectedModuleData);
    fetchUserResultsFromQuery(dataObject, true);
    setScreenName(option);
    setLink(option);
    setIsModuleChanged(true);
  };

  return (
    <>
      <div
        className={`${classes.moduleContainer} ${
          !isCardVisible ? classes.showMode : ""
        }`}
      >
        <div className={classes.moduleText}>
          {!selectedModule[activeConversationId] ? (
            "Please select module"
          ) : (
            <>
              <strong>Module:</strong> <span>{selectedModule[activeConversationId]}</span>
            </>
          )}
        </div>
        <Button
          label={isCardVisible ? "Hide" : "Show"}
          size="large"
          variant="url"
          onClick={() => setIsCardVisible((prev) => !prev)}
        >
          {isCardVisible ? "Hide" : "Show"}
        </Button>
      </div>
      {isCardVisible && (
        <div className={classes.expandableCardWrapper}>
          <SelectedModule
            onSelect={handleModuleSelect}
            selectedModule={selectedModule}
            currentMode={currentMode}
            activeConversationId={activeConversationId}
          />
        </div>
      )}
    </>
  );
};

ModuleSelection.propTypes = {
  classes: PropTypes.object.isRequired,
  selectedModule: PropTypes.object.isRequired,
  isCardVisible: PropTypes.bool.isRequired,
  setIsCardVisible: PropTypes.func.isRequired,
  currentMode: PropTypes.string.isRequired,
  setSelectedModule: PropTypes.func.isRequired,
  fetchUserResultsFromQuery: PropTypes.func.isRequired,
  setScreenName: PropTypes.func.isRequired,
  setLink: PropTypes.func.isRequired,
};

export default ModuleSelection;
