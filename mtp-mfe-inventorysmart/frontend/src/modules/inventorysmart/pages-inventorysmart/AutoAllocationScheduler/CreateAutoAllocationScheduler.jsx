import React, { useEffect, useRef, useState } from "react";
import Loader from "core/Utils/Loader/loader";
import { Typography } from "@mui/material";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import { displaySnackMessages } from "../inventorysmart-utility";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { ConnectedFrequencySelector } from "./FrequencySelector";
import {
  createNewAutoAllocationScheduler,
  getSelectedSchedulerDetails,
  updateSchedulerDetails,
} from "modules/inventorysmart/services-inventorysmart/AutoAllocationRules/auto-allocation-scheduler-service";
import moment from "moment";
import { CONFIGUTAIONS_CACHE } from "../../constants-inventorysmart/stringConstants";
import {
  FREQUENCY_OPTIONS,
  NEVER_ENDING_DATE,
} from "./autoAllocationConstants";
import { isEqual } from "lodash";
import { Input, Panel, useTranslation } from "impact-ui-v3";
const INITIALFORMDATA = {
  dailyRepeatOn: "",
  frequency_type: "",
  selectedWeeks: [],
  selectedDatesForMonthly: [],
  selectedDaysForMonthly: [],
  selectedWeeksForMonthly: [],
  selectedMonths: [],
  selectedDatesForQuaterly: [],
  selectedDaysForQuaterly: [],
  selectedWeeksForQuarterly: [],
  selectedMonthsForYearly: [],
  selectedDatesForYearly: [],
  selectedDaysForYearly: [],
  selectedWeeksForYearly: [],
};

export const handleErrorMessage = (e, props) => {
  const errObj = e?.response?.data;
  if (errObj?.show_message)
    displaySnackMessages(errObj?.message, "error", props);
  else displaySnackMessages(ERROR_MESSAGE, "error", props);
};

const CreateAutoAllocationScheduler = (props) => {
  const { t } = useTranslation();
  const { edit, open, onClose, onSaved } = props;
  const {
    getSelectedScheduler,
    createSchedulerLoader,
    createNewScheduler,
    saveEditChanges,
    editId,
  } = props;
  const [rulesSet, setRulesSet] = useState([]);
  const [schedulerDefinition, setSchedulerDefinition] = useState("");
  const [schedulerName, setSchedulerName] = useState("");
  const [formData, setFormData] = useState(INITIALFORMDATA);
  const [schedulerRule, setSchedulerRule] = useState(null);
  const initialSnapshotRef = useRef(null);
  const classes = useStyles();

  const autoAllocationSchedulerTableHeader =
    props.autoAllocationSchedulerTableHeader || false;
  const configDetails =
    props.cache[CONFIGUTAIONS_CACHE]["AUTO-ALLOCATION-SCHEDULER"];
  const frequencyOptionValues =
    configDetails &&
    configDetails?.schedulerDetails?.frequencyDetails?.frequencyOptions
      ? configDetails?.schedulerDetails?.frequencyDetails?.frequencyOptions
      : FREQUENCY_OPTIONS;

  const getInitialFormData = () => ({
    ...INITIALFORMDATA,
    frequency_type: frequencyOptionValues[0]?.value || "",
    dailyRepeatOn:
      frequencyOptionValues[0]?.value === "daily" ? "week_days" : "",
  });

  const resetCreateForm = () => {
    setSchedulerName("");
    setSchedulerDefinition("");
    setFormData(getInitialFormData());
    setSchedulerRule(null);
  };
  const getSchedulerDefinition = () => {
    const {
      frequency_type,
      dailyRepeatOn,
      selectedWeeks,
      selectedDatesForMonthly,
      selectedDaysForMonthly,
      selectedWeeksForMonthly,
      selectedMonths,
      selectedDatesForQuaterly,
      selectedDaysForQuaterly,
      selectedWeeksForQuarterly,
      selectedMonthsForYearly,
      selectedDatesForYearly,
      selectedDaysForYearly,
      selectedWeeksForYearly,
    } = formData;
    const selectedFrequencyType =
      frequency_type || frequencyOptionValues[0].value;
    let temp = selectedFrequencyType;

    if (selectedFrequencyType === "daily") {
      temp += `&week days`;
    }

    if (selectedFrequencyType === "weekly") {
      temp += selectedWeeks.length > 0 ? `&${selectedWeeks.join(",")}` : "";
    }

    if (selectedFrequencyType === "monthly") {
      const validSelectedDates = selectedDatesForMonthly?.filter(Boolean);

      temp +=
        validSelectedDates?.length > 0
          ? `&${validSelectedDates?.join(",")}`
          : "";
      temp +=
        selectedDaysForMonthly?.length > 0
          ? `&${selectedDaysForMonthly?.join(",")}`
          : "";
      temp +=
        selectedWeeksForMonthly?.length > 0
          ? `&${selectedWeeksForMonthly?.join(",")}`
          : "";
    }

    if (selectedFrequencyType === "quarterly") {
      const validSelectedDates = selectedDatesForQuaterly?.filter(Boolean);
      temp += selectedMonths?.join(",") ? `&${selectedMonths?.join(",")}` : "";
      temp +=
        validSelectedDates?.length > 0
          ? `&${validSelectedDates?.join(",")}`
          : "";
      temp +=
        selectedDaysForQuaterly?.length > 0
          ? `&${selectedDaysForQuaterly?.join(",")}`
          : "";
      temp +=
        selectedWeeksForQuarterly?.length > 0
          ? `&${selectedWeeksForQuarterly?.join(",")}`
          : "";
    }

    if (selectedFrequencyType === "yearly") {
      const validSelectedDates = selectedDatesForYearly?.filter(Boolean);
      temp +=
        selectedMonthsForYearly?.length > 0
          ? `&${selectedMonthsForYearly?.join(",")}`
          : "";
      temp +=
        validSelectedDates?.length > 0
          ? `&${validSelectedDates?.join(",")}`
          : "";
      temp +=
        selectedDaysForYearly?.length > 0
          ? `&${selectedDaysForYearly?.join(",")}`
          : "";
      temp +=
        selectedWeeksForYearly?.length > 0
          ? `&${selectedWeeksForYearly.join(",")}`
          : "";
    }

    setSchedulerDefinition(temp);
  };

  const getSelectedSchedulerAndSetFormData = async () => {
    try {
      const response = await getSelectedScheduler(editId);
      if (response?.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success", props);
      }
      const selectedSchedulerDetails = response?.data?.data?.[0];

      const { sh_name, sh_structure, sh_frequency } = selectedSchedulerDetails;
      setSchedulerName(sh_name);
      setSchedulerDefinition(sh_frequency);
      setSchedulerRule(sh_structure.data);
      const data = sh_structure.data || {};
      initialSnapshotRef.current = {
        name: sh_name,
        frequency: sh_frequency,
        start_date: data.start_date
          ? moment(data.start_date).format("YYYY-MM-DD")
          : null,
        end_date: data.end_date
          ? moment(data.end_date).format("YYYY-MM-DD")
          : null,
        end_date_options: data.end_date_options ?? null,
        num_of_occurrence: Number(data.num_of_occurrence) || 0,
      };
    } catch (error) {
      handleErrorMessage(error, props);
    }
  };

  useEffect(() => {
    if (!open) return;

    if (edit) {
      getSelectedSchedulerAndSetFormData();
    } else {
      resetCreateForm();
    }
  }, [open, edit]);

  useEffect(() => {
    getSchedulerDefinition();
  }, [formData]);

  const handleClose = () => {
    onClose?.();
  };

  const handleSaveSuccess = () => {
    onSaved?.();
  };
  const validateDates = (startDate, endDate) => {
    startDate = moment(startDate);
    endDate = moment(endDate);
    return startDate.isBefore(endDate) || startDate.isSame(endDate);
  };
  const invalidDates = (formData) => {
    return (
      formData.start_date &&
      formData.end_date &&
      formData.end_date_options !== "never_ending" &&
      !validateDates(formData.start_date, formData.end_date)
    );
  };

  function validArrayLength(dateArray) {
    const validArray = dateArray?.filter(Boolean);
    return validArray?.length;
  }

  const isEditUnchanged = () => {
    const snap = initialSnapshotRef.current;
    if (!edit || !snap) return false;
    const normDate = (d) => (d ? moment(d).format("YYYY-MM-DD") : null);
    return (
      schedulerName === snap.name &&
      schedulerDefinition === snap.frequency &&
      normDate(formData.start_date) === snap.start_date &&
      normDate(formData.end_date) === snap.end_date &&
      (formData.end_date_options ?? null) === snap.end_date_options &&
      (Number(formData.num_of_occurrence) || 0) === snap.num_of_occurrence
    );
  };

  function isSaveButtonDisabled() {
    if (isEditUnchanged()) return true;
    if (schedulerName.trim().length === 0) return true;
    if (formData.frequency_type === "daily" && formData.dailyRepeatOn)
      return !Boolean(formData.dailyRepeatOn);
    if (formData.frequency_type === "weekly" && formData.selectedWeeks.length)
      return !Boolean(formData.selectedWeeks.length);
    if (
      formData.frequency_type === "monthly" &&
      (!formData.month_toggle || formData.month_toggle === "date")
    )
      return !Boolean(validArrayLength(formData.selectedDatesForMonthly));
    if (
      formData.frequency_type === "monthly" &&
      formData.month_toggle === "day"
    )
      return !(
        Boolean(formData.selectedDaysForMonthly?.length) &&
        Boolean(formData.selectedWeeksForMonthly?.length)
      );

    if (
      formData.frequency_type === "quarterly" &&
      (!formData.month_toggle || formData.month_toggle === "date")
    )
      return !(
        Boolean(validArrayLength(formData.selectedDatesForQuaterly)) &&
        Boolean(formData.selectedMonths?.length)
      );

    if (
      formData.frequency_type === "quarterly" &&
      formData.month_toggle === "day"
    )
      return !(
        Boolean(formData.selectedDaysForQuaterly?.length) &&
        Boolean(formData.selectedWeeksForQuarterly?.length) &&
        Boolean(formData.selectedMonths?.length)
      );

    if (
      formData.frequency_type === "yearly" &&
      (!formData.month_toggle || formData.month_toggle === "date")
    )
      return !(
        Boolean(formData.selectedMonthsForYearly?.length) &&
        Boolean(validArrayLength(formData.selectedDatesForYearly))
      );

    if (formData.frequency_type === "yearly" && formData.month_toggle === "day")
      return !(
        Boolean(formData.selectedDaysForYearly?.length) &&
        Boolean(formData.selectedMonthsForYearly?.length) &&
        Boolean(formData.selectedWeeksForYearly?.length)
      );

    return true;
  }

  const saveNewRule = async () => {
    if (invalidDates(formData)) {
      displaySnackMessages(
        t("inventorysmart.invalidDatesSelection"),
        "error",
        props
      );
      return;
    }
    const selectedDatesForMonthly =
      formData.selectedDatesForMonthly &&
      formData.selectedDatesForMonthly.filter(Boolean);
    const selectedDatesForQuaterly =
      formData.selectedDatesForQuaterly &&
      formData.selectedDatesForQuaterly.filter(Boolean);
    const selectedDatesForYearly =
      formData.selectedDatesForYearly &&
      formData.selectedDatesForYearly.filter(Boolean);
    const payload = {
      sh_name: schedulerName,
      sh_structure: {
        frequency_type: formData.frequency_type,
        data: {
          ...formData,
          start_date: formData?.start_date?.toISOString(true).split("T")[0],
          end_date: formData?.end_date?.toISOString(true).split("T")[0],
          selectedDatesForMonthly,
          selectedDatesForQuaterly,
          selectedDatesForYearly,
        },
      },
      sh_frequency: schedulerDefinition,
    };
    try {
      const response = await createNewScheduler(payload);
      if (response?.data?.data?.[0]?.auto_allocation_scheduler_create?.status) {
        displaySnackMessages(
          response?.data?.data?.[0]?.auto_allocation_scheduler_create?.message,
          "success",
          props
        );
        handleSaveSuccess();
      } else {
        displaySnackMessages(
          response?.data?.data?.[0]?.auto_allocation_scheduler_create?.message,
          "error",
          props
        );
      }
    } catch (error) {
      handleErrorMessage(error, props);
    }
  };

  const saveEditedChanges = async () => {
    const start_date = formData.start_date ? moment(formData.start_date) : null;
    const end_date = formData.end_date ? moment(formData.end_date) : null;
    const selectedDatesForMonthly =
      formData.selectedDatesForMonthly &&
      formData.selectedDatesForMonthly.filter(Boolean);
    const selectedDatesForQuaterly =
      formData.selectedDatesForQuaterly &&
      formData.selectedDatesForQuaterly.filter(Boolean);
    const selectedDatesForYearly =
      formData.selectedDatesForYearly &&
      formData.selectedDatesForYearly.filter(Boolean);
    if (invalidDates(formData)) {
      displaySnackMessages(
        t("inventorysmart.invalidDatesSelection"),
        "error",
        props
      );
      return;
    }
    const payload = {
      sh_name: schedulerName,
      sh_code: editId,
      sh_structure: {
        frequency_type: formData.frequency_type,
        data: {
          ...formData,
          start_date: start_date
            ? start_date.toISOString(true).split("T")[0]
            : null,
          end_date: end_date ? end_date.toISOString(true).split("T")[0] : null,
          selectedDatesForMonthly,
          selectedDatesForQuaterly,
          selectedDatesForYearly,
        },
      },
      sh_frequency: schedulerDefinition,
    };
    try {
      const response = await saveEditChanges(payload);
      if (response?.data?.data?.[0]?.auto_allocation_scheduler_create?.status) {
        displaySnackMessages(
          response?.data?.data?.[0]?.auto_allocation_scheduler_create?.message,
          "success",
          props
        );
        handleSaveSuccess();
      } else {
        displaySnackMessages(
          response?.data?.data?.[0]?.auto_allocation_scheduler_create?.message,
          "error",
          props
        );
      }
    } catch (error) {
      handleErrorMessage(error, props);
    }
  };

  const panelTitle =
    autoAllocationSchedulerTableHeader || "Set auto allocation scheduler";

  return (
    <Panel
      title={panelTitle}
      size="large"
      anchor="right"
      width={945}
      open={Boolean(open)}
      onClose={handleClose}
      primaryButtonLabel="Save"
      onPrimaryButtonClick={edit ? saveEditedChanges : saveNewRule}
      primaryButtonProps={{ disabled: isSaveButtonDisabled() }}
      secondaryButtonLabel="Cancel"
      onSecondaryButtonClick={handleClose}
      secondaryButtonProps={{ variant: "url" }}
    >
      <Loader loader={createSchedulerLoader}>
        <div className={classes.schedulerPanelBody}>
          <div className={classes.schedulerFieldsRow}>
            <div
              className={`${classes.schedulerInputBox} ${classes.alignTextField} ${classes.schedulerNameField}`}
            >
              <Typography
                className={`${classes.schedulerFieldLabel} ${classes.requiredAsterisk}`}
              >
                Scheduler name
              </Typography>
              <Input
                value={schedulerName}
                placeholder="Scheduler Name"
                onChange={(event) =>
                  setSchedulerName(event.target.value.trim())
                }
                margin="normal"
                required
                label=""
              />
            </div>
            <div
              className={`${classes.schedulerInputBox} ${classes.alignTextField} ${classes.schedulerDefField}`}
            >
              <Typography className={classes.schedulerFieldLabel}>
                Scheduler definition
              </Typography>
              <Input
                value={schedulerDefinition}
                placeholder="Scheduler Definition"
                onChange={() => {}}
                margin="normal"
                required
                disabled={true}
                label=""
              />
            </div>
          </div>

          <ConnectedFrequencySelector
            formData={formData}
            setFormData={setFormData}
            ruleData={schedulerRule}
            configDetails={configDetails}
            startingDate={
              configDetails &&
              configDetails?.schedulerDetails?.startsOn?.nextDay
                ? moment().add(1, "days").toDate()
                : moment().toDate()
            }
            frequencyOptions={frequencyOptionValues}
            setSchedulerRule={setSchedulerRule}
          />
        </div>
      </Loader>
    </Panel>
  );
};
const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  const autoAllocationSchedulerService =
    inventorysmartReducer.autoAllocationSchedulerService;
  return {
    createSchedulerLoader: autoAllocationSchedulerService.schedulerLoader,
    editId: autoAllocationSchedulerService.editId,
    editName: autoAllocationSchedulerService.editName,
    cache: store.inventorysmartReducer?.activeModulesCacheService?.cache,
    autoAllocationSchedulerTableHeader: store.inventorysmartReducer.inventorySmartCommonService
      .inventorysmartScreenConfig?.inventorysmart_configuration?.drillDown?.autoAllocationSchedulerTableHeader,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    createNewScheduler: (payload) =>
      dispatch(createNewAutoAllocationScheduler(payload)),
    saveEditChanges: (payload) => dispatch(updateSchedulerDetails(payload)),
    addSnack: (snack) => dispatch(addSnack(snack)),
    getSelectedScheduler: (payload) =>
      dispatch(getSelectedSchedulerDetails(payload)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CreateAutoAllocationScheduler);
