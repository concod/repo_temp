import { useEffect, useState } from "react";
import { RadioButtonGroup, useTranslation } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";

const ConflictResolutionModal = (props) => {
  const { t } = useTranslation();
  const useStyles = makeStyles((theme) => ({
    DialogContentTitle: {
      ...theme.typography.h6,
    },
  }));
  const [enableExtendOption, setEnableExtendOption] = useState(false);

  const classes = useStyles();
  const globalClasses = globalStyles();
  const handleRadioValChange = (event) => {
    if (event.target.value === "enable-extend-dates") {
      setEnableExtendOption(true);
      props.setResolutionType("conflict_replace");
    } else if (event.target.value === "hard_reset") {
      setEnableExtendOption(false);
      props.setResolutionType(event.target.value);
    } else {
      props.setResolutionType(event.target.value);
    }
  };

  const datesSelectedRadioOptions = [
    {
      value: "hard_reset",
      label: t("inventorysmart.replaceExistingEligibility"),
    },
    {
      value: "enable-extend-dates",
      label: t("inventorysmart.addCurrentDates"),
      disabled: enableExtendOption,
    },
  ];

  const extendDatesRadioOptions = [
    {
      value: "conflict_replace",
      label: t("inventorysmart.replaceConflictDates"),
      disabled: !enableExtendOption,
    },
    {
      value: "conflict_combine",
      label: t("inventorysmart.doNotReplaceConflictDates"),
      disabled: !enableExtendOption,
    },
  ];

  useEffect(() => {
    props.setResolutionType("hard_reset");
  }, []);
  return (
    <>
      <div className={globalClasses.dialogTitle}>
        {t("inventorysmart.statusConflictResolution")}
      </div>

      <div className={globalClasses.paperWrapper}>
        <div
          className={`${classes.DialogContentTitle} ${globalClasses.marginBottom}`}
        >
          {t("inventorysmart.selectedDatesMust")}
        </div>

        <RadioButtonGroup
          aria-label="conflict-resolution"
          name="controlled-radio-buttons-group"
          value={props.resolutionType}
          onChange={handleRadioValChange}
          options={datesSelectedRadioOptions}
        />

        {enableExtendOption && (
          <>
            <div
              className={`${classes.DialogContentTitle} ${globalClasses.marginBottom} ${globalClasses.marginTop}`}
            >
              {t("inventorysmart.extendExistingDates")}
            </div>
            <RadioButtonGroup
              aria-label="conflict-resolution"
              name="controlled-radio-buttons-group"
              value={props.resolutionType}
              onChange={handleRadioValChange}
              options={extendDatesRadioOptions}
            />
          </>
        )}
      </div>
    </>
  );
};

export default ConflictResolutionModal;
