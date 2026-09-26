import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Box, Button } from "@mui/material";
import { addSnack } from "core/actions/snackbarActions";
import { Prompt } from "impact-ui";
import { PLAN_SMART_PRE_SEASON_DASHBOARD } from "modules/plansmart/constants-plansmart/routesConstants";
import {
  DRAFT,
  FINAL_FORECAST,
  FINAL_PLAN,
  REGULAR_PLAN,
  saveAsWarningMsg,
  statusCodeBasedOnPlanType,
} from "modules/plansmart/constants-plansmart/stringConstants";
import {
  planSmartSavePlanLoaderSelector,
  savePlanAPI,
  setPlanSmartSavePlanLoader,
} from "modules/plansmart/services-plansmart/BudgetPlanTable/budget-plan-table-service";
import { useState } from "react";
import { connect } from "react-redux";
import { useHistory, withRouter } from "react-router-dom";
import { useStyles } from "../plansmart-styles";

const SaveOptionsForBudgetTable = (props) => {
  const [showSavePlanDialogue, setShowSavePlanDialogue] = useState(false);
  const [saveAsWarningModal, setSaveAsWarningModal] = useState(false);
  const [selectedSaveAsOption, setSelectedSaveAsOption] = useState(null);
  const plansmartClasses = useStyles();
  const history = useHistory();

  const {
    savePlanRequest,
    setSavePlanLoader,
    optionList = [],
    planDetails,
  } = props;

  const handleSaveAsType = (option) => {
    switch (option) {
      case DRAFT:
        setShowSavePlanDialogue(true);
        break;
      case FINAL_FORECAST:
      case REGULAR_PLAN:
      case FINAL_PLAN:
        setSaveAsWarningModal(true);
        break;

      default:
        break;
    }
  };

  /**
   * @function
   * @description Function to handle Save and redirect user to Dashboard
   */
  const onSavePlan = () => {
    history.push(PLAN_SMART_PRE_SEASON_DASHBOARD);
  };

  const handleSaveAsWarningModal = async (value) => {
    setSavePlanLoader(true);
    setSaveAsWarningModal(false);
    if (value) {
      switch (selectedSaveAsOption) {
        case FINAL_FORECAST:
        case REGULAR_PLAN:
        case FINAL_PLAN:
          const status = statusCodeBasedOnPlanType[selectedSaveAsOption];
          try {
            const result = await savePlanRequest(
              planDetails?.plan_code,
              status
            );
            if (result.data.status) {
              showSnackMessage("Plan save successfully", "success");
              setTimeout(() => {
                history.push(PLAN_SMART_PRE_SEASON_DASHBOARD);
              }, 800);
            } else {
              showSnackMessage("Error in saving the plan details.", "error");
            }
          } catch (error) {
            showSnackMessage("Error in saving the plan details.", "error");
          }
          break;
        default:
          break;
      }
    }
    setSavePlanLoader(false);
  };

  const showSnackMessage = (text, variance) => {
    props.addSnack({
      message: text,
      options: {
        variant: variance,
      },
    });
  };

  return (
    <div>
      {saveAsWarningModal && (
        <>
          <Prompt
            isOpen={saveAsWarningModal}
            title={<Box display="flex" alignItems="center">
              <WarningAmberIcon color="warning" />
              <Box ml={1}>Warning</Box>
            </Box>}
            subHeading={saveAsWarningMsg[selectedSaveAsOption]}
            infoList={[]}
            primaryButtonProps={{
              children: "Yes", onClick: () => {
                handleSaveAsWarningModal(true);
                setSaveAsWarningModal(false)
              }
            }}
            tertiaryButtonProps={{
              children: "No",
              onClick: () => setSaveAsWarningModal(false),
            }}
            variant="warning"
          />
        </>
      )}
      {showSavePlanDialogue && (
          <Prompt
            isOpen={showSavePlanDialogue}
            title="Save Plan"
            subHeading="Are you sure you want to save this plan?"
            infoList={[]}
            primaryButtonProps={{
              children: "Yes", onClick: () => {
                onSavePlan();
                setShowSavePlanDialogue(false)
              }
            }}
            tertiaryButtonProps={{
              children: "No",
              onClick: () => setShowSavePlanDialogue(false),
            }}
          />
      )}
      {optionList &&
        optionList?.map((saveAsObj) => (
          <Button
            id="plansmartSaveAsBtn"
            onClick={() => {
              setSelectedSaveAsOption(saveAsObj.value);
              handleSaveAsType(saveAsObj.value);
            }}
            variant="contained"
            color="primary"
            className={plansmartClasses.button}
          >
            {saveAsObj.label}
          </Button>
        ))}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    savePlanLoader: planSmartSavePlanLoaderSelector(store),
  };
};

const mapDispatchToProps = (dispatch) => ({
  savePlanRequest: (planCode, status) =>
    dispatch(savePlanAPI(planCode, status)),
  setSavePlanLoader: (payload) => dispatch(setPlanSmartSavePlanLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(SaveOptionsForBudgetTable));
