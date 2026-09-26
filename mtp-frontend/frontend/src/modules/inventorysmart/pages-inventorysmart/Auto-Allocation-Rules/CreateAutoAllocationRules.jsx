import { connect } from "react-redux";
import AutoReleaseSelection from "./AutoReleaseSelection";
import WOSThresholdSelection from "./WOSThresholdSelection";
import { useState } from "react";
import FrequencySelector from "./FrequencySelector";
import { Button, TextField } from "@mui/material";
import globalStyles from "Styles/globalStyles";
import makeStyles from "@mui/styles/makeStyles";
import { isEmpty } from "lodash";
import { END_DATE_BEFORE_START_DATE_MSG, ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  createAllocationRule,
  updateAllocationRule,
} from "modules/inventorysmart/services-inventorysmart/Auto-Allocation-Rules/auto-allocation-rules-service";
import { useEffect } from "react";
import { getOrdinal } from "core/Utils/functions/utils";
import { AUTO_RELEASE_OPTIONS } from "./autoAllocationConstant";
import { CONFIGURATION, CREATE_AUTO_ALLOCATION_RULES } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { useNavigate } from "react-router-dom-v5-compat";
import { useLocation } from "react-router-dom-v5-compat";
import moment from "moment";
import { formateDate } from "core/Utils/functions/utils";

const useStyles = makeStyles(() => ({
  textField: {
    width: "20%",
  },
  frequencyWrapper: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
    margin: "1rem",
  },
  buttonWrapper: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    justifyContent: "center",
  },
  autoAllocationTextField: {
    width: "15vw",
    margin: "1px 0",
    "& .MuiInputBase-input": {
      padding: "10px",
    },
  },
}));

const CreateAutoAllocationRules = (props) => {

  const navigate = useNavigate()
  const location = useLocation()
  const classes = useStyles();

  const [formData, setFormData] = useState({
    dailyRepeatOn: "all_days",
  });
  const [showThreshold, setShowThreshold] = useState(false);
  const globalClasses = globalStyles();
  const [ruleName, setRuleName] = useState("");
  const [ruleOneDataForEdit, setRuleOneData] = useState("");
  const [basicRuleInfoForEdit, setRuleInfoForEdit] = useState("");
  const [isEditFlow, setIsEditFlow] = useState(false);
  const dateString = '&Date';

  /**
   * This function is used in edit flow when we want to pre-fill the data
   * @param prev 
   * @param newData 
   * @returns updated data for form
   */
  const prepareFormData = (prev, newData) => {
    const { rule_master, rule_type_list } = newData;
    const ruleOneData = rule_type_list.find((item) => item.rule_type === 1)
      ?.rule_definitions;
    const updatedFormData = {
      ...prev,
      frequency_type: ruleOneData.frequency_type,
      dailyRepeatOn: ruleOneData.repeat_on,
      end_date_options: ruleOneData.end_date_options,
      month_toggle: ruleOneData.month_toggle,
      selectedWeeks: ruleOneData.day_of_week,
      selectedWeeksForMonthly: ruleOneData.week_of_month,
      selectedDatesForMonthly: ruleOneData.day_of_month,
      selectedDaysForMonthly: ruleOneData.day_of_week,
      num_of_occurrence: ruleOneData.num_of_occurrence,
      start_date: ruleOneData.start_date,
      end_date: ruleOneData.end_date,
      rule_definitions: rule_master.rule_definitions,
    };
    return updatedFormData;
  };

  /**
   * This useEffect is to set all the local states with the pre-fill data in case of edit.
   */
  useEffect(() => {
    if (location?.state?.isEditFlow) {
      const { rule_master, rule_type_list } = location.state.editData;
      const ruleOneData = rule_type_list.find((item) => item.rule_type === 1)
        ?.rule_definitions;
      setRuleInfoForEdit(rule_master);
      setRuleOneData(ruleOneData);
      setRuleName(rule_master?.rule_name);
      setIsEditFlow(props.location?.state?.isEditFlow);
      setFormData((prev) =>
        prepareFormData(prev, location.state.editData)
      );
    }
  }, [location?.state]);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  const handleThresholdShow = () => {
    setShowThreshold((prev) => !prev);
  };

  const getFrequency = () => {
    if (formData.frequency_type === "daily") {
      return `${formData.dailyRepeatOn}`;
    } else if (formData.frequency_type === "weekly") {
      return `${formData?.selectedWeeks.map((weekday) => weekday.slice(0,3)).join(",")}`;
    } else if (formData.frequency_type === "monthly") {
      if (!isEmpty(formData?.selectedDatesForMonthly)) {
        return `${formData?.selectedDatesForMonthly}`;
      } else if (
        formData?.selectedDaysForMonthly &&
        formData?.selectedWeeksForMonthly
      ) {
        const weeksString = 'Weeks='
        return `${formData?.selectedDaysForMonthly
          .map((date) => date.slice(0, 3))
          .join(",")}& ${formData?.month_toggle?.value === 'day' ? weeksString : ""}${formData?.selectedWeeksForMonthly
          .map((date) => getOrdinal(date))
          .join(",")}`;
      }
      return ``;
    }
    return ``;
  };

  const isSaveDisable = () => {
    return formData?.start_date && formData?.end_date && ruleName.trim() && formData?.frequency_type;
  };

  const endDateCheck = () => {
    if (typeof formData?.end_date === 'string') {
      return moment(formData?.end_date).isBefore(formData?.start_date);
    } else {
      return formData?.end_date.isBefore(formData?.start_date);
    }
  }
  const handleSaveAllocationRule = async () => {
    try {
      
      if (endDateCheck()) {
        displaySnackMessages(END_DATE_BEFORE_START_DATE_MSG, "error");
        return;
      }
      let req = {
        ruleName: ruleName,
        ruleDefinitions: {
          RuleType1: {
            frequency_type: formData?.frequency_type,
            start_date: formateDate(formData?.start_date),
            end_date: formateDate(formData?.end_date),
            /**
            "day_of_week" will contain weekdays (Mon to Fri) for both the cases:
            1: Weekly
            2: Monthly-Day 
             */
            day_of_week:
              formData?.selectedWeeks.length > 0
                ? formData?.selectedWeeks
                : formData?.selectedDaysForMonthly || [],
            // "week_of_month" will contain week number 1st to 5th.
            week_of_month: formData?.selectedWeeksForMonthly,
            // "day_of_month" will contain Date from the month 1,2,3...31
            day_of_month: formData?.selectedDatesForMonthly,
            repeat_on: formData?.dailyRepeatOn,
            end_date_options: formData?.end_date_options ? formData?.end_date_options : "never_ending",
            month_toggle: typeof formData?.month_toggle === "string" ? formData?.month_toggle : formData?.month_toggle?.value,
          },
          // RuleType2: {
          //   auto_release_type: formData?.autoRelease.value,
          // },
        },
        ruleDefinitionsText: `(Freq=${
          formData.frequency_type ? formData.frequency_type : ""
        }&${formData.frequency_type === 'monthly' ? formData?.month_toggle?.value === 'day' ? formData.month_toggle.label : dateString : ""} &${getFrequency()} || start_date=${formData.start_date ? formateDate(formData.start_date) : ""} || end_date=${formData.end_date ? formateDate(formData.end_date) : ""})`,
  
      };

      if (formData?.num_of_occurrence > 0) {
        req.ruleDefinitions.RuleType1 = {
          ...req.ruleDefinitions.RuleType1,
          num_of_occurrence: Number(formData?.num_of_occurrence),
        };
      }

      // if (showThreshold) {
      //   req.ruleDefinitions = {
      //     ...req.ruleDefinitions,
      //     RuleType3: {
      //       threshold_type: "set-wos-rule",
      //       condition: formData?.condition,
      //       threshold: formData?.threshold,
      //     },
      //   };
      // }
   
      if (isEditFlow) {
        req.rule_code = basicRuleInfoForEdit.rule_code;
        let response = await props.updateAllocationRule(req);
        displaySnackMessages(response.data?.message, "success");
        setTimeout(() => handleBackClick(), 2000);
      } else {
        let response = await props.createAllocationRule(req);
        displaySnackMessages(response.data?.message, "success");
        setTimeout(() => handleBackClick(), 2000); 
      }
    } catch (e) {
      displaySnackMessages(e.response.status === 409 ? e.response?.data?.message : ERROR_MESSAGE, "error");
    }
  };

  const handleBackClick = () => {
    navigate(CONFIGURATION, { state : CREATE_AUTO_ALLOCATION_RULES });
  }

  const isOccurrenceValid = () => {
    if (formData?.end_date_options === "num_of_occurrence") {
      return !isNaN(formData?.num_of_occurrence) && formData?.num_of_occurrence > 0;
    }

    return false;
  }
  return (
    <>
      <h2 className={globalClasses.marginAround}>Create Auto Allocation Rule</h2>
      <FrequencySelector
        formData={formData}
        setFormData={setFormData}
        ruleData={ruleOneDataForEdit}
      />

      {/*   As per new implementation (MTP-42478) we are removing these rules.
      <AutoReleaseSelection
        formData={formData}
        setFormData={setFormData}
        ruleData={ruleTwoDataForEdit}
      />

      {showThreshold ? (
        <WOSThresholdSelection
          formData={formData}
          ruleData={ruleThreeDataForEdit}
          setFormData={setFormData}
          handleThresholdShow={handleThresholdShow}
        />
      ) : (
        <Button
          className={globalClasses.marginAround}
          variant="contained"
          color="primary"
          key="threshold-selection"
          onClick={handleThresholdShow}
        >
          + Add Threshold Rule
        </Button>
      )} */}

      <div className={`${classes.frequencyWrapper}`}>
        <div>Scheduler Definition:</div>
        <>
          {`(Freq=${
          formData.frequency_type ? formData.frequency_type : ""
        }&${formData.frequency_type === 'monthly' ? formData?.month_toggle?.value === 'day' ? formData.month_toggle.label : dateString : ""} &${getFrequency()} || start_date=${formData.start_date ? formateDate(formData.start_date) : ""} || end_date=${formData.end_date ? formateDate(formData.end_date) : ""})`
          }
        </>
      </div>

      <div className={`${classes.frequencyWrapper}`}>
        <div>Scheduler Name:<span style={{ color: "red" }}>*</span></div>
        <TextField
          required={true}
          variant="outlined"
          type="text"
          className={classes.autoAllocationTextField}
          value={ruleName}
          onChange={(e) => {
            setRuleName(e.target.value);
          }}
          disabled={isEditFlow}
        />
      </div>

      <div className={classes.buttonWrapper}>
        <div className={classes.buttonWrapper}>
          <Button
            className={globalClasses.marginAround}
            variant="contained"
            color="primary"
            key="threshold-selection"
            onClick={handleBackClick}
            >
            Back
          </Button>
        </div>

        <div className={classes.buttonWrapper}>
          <Button
            className={globalClasses.marginAround}
            variant="contained"
            color="primary"
            key="threshold-selection"
            onClick={handleSaveAllocationRule}
            disabled={ // Will be enabled only if any of the days, dates or weeks selected in respective frequency_type
              formData?.end_date_options === "num_of_occurrence" 
                ? (!isOccurrenceValid() || !ruleName?.trim()) 
                : !isSaveDisable() || 
                  (formData?.frequency_type === "weekly" && (!formData?.selectedWeeks || formData?.selectedWeeks.length === 0)) ||
                  (formData?.frequency_type === "monthly" && (formData?.month_toggle?.value === "date") &&(!formData?.selectedDatesForMonthly || formData?.selectedDatesForMonthly.length === 0)) ||
                  (formData?.frequency_type === "monthly" && (formData?.month_toggle?.value === "day") && (!formData?.selectedWeeksForMonthly || formData?.selectedWeeksForMonthly.length === 0 || !formData?.selectedDaysForMonthly || formData?.selectedDaysForMonthly.length === 0))
            } 
            >
            {isEditFlow ? `Update` : `Save`}
          </Button>
        </div>
      </div>
    </>
  );
};

const mapDispatchToProps = (dispatch) => {
  return {
    createAllocationRule: (body) => dispatch(createAllocationRule(body)),
    updateAllocationRule: (body) => dispatch(updateAllocationRule(body)),
  };
};
export default connect(null, mapDispatchToProps)(CreateAutoAllocationRules);
