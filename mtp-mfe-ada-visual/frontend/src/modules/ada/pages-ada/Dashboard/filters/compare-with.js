// dispatch(setHistoricActuals(payload));
// dispatch(setCompareWithSelectedDate(selectedDate));
// dispatch(setIsCompareWithDropdown(isDropdown));

import { useEffect, useState } from "react";
import {
  setHistoricActuals,
  // getHistoricYears,
  setCompareWithSelectedDate,
  setIsCompareWithDropdown,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import { useDispatch, useSelector } from "react-redux";
import {
  configureYearOptions,
  handleCompareBtnClick,
} from "modules/ada/utils-ada/utilityFunctions";
import SelectContainer from "core/commonComponents/filters/SelectContainer";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import { formatStringDate } from "core/Utils/functions/utils";
import { isNumber } from "lodash";
import { RadioButtonGroup } from "impact-ui-v3";
import SelectFiscalYear from "./select-fiscal-year";

const CompareWith = ({
  fiscalDatesEnd,
  compareRadioButtons,
  updateCompareWithValuesInRedux,
  historicYears,
}) => {
  const adaDashboardReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const classes = useStyles();

  const handleCompareWithChange = (e, val) => {
    let selectedRadioOption = [
      compareRadioButtons?.find((elem) => elem.value.toString() === val),
    ];
    updateCompareWithValuesInRedux(selectedRadioOption);
  };

  if (!fiscalDatesEnd) {
    return <p>Select TimeLine to select compare with</p>;
  }

  return (
    <LoadingOverlay loader={false}>
      <div className={classes.compareWithContainer}>
        <p className={classes.compareWithLabel}>Historic Actuals</p>

        <div className={classes.compareWithOptionsContainer}>
          <RadioButtonGroup
            orientation="row"
            name="ia-test-radio-group"
            onChange={handleCompareWithChange}
            options={compareRadioButtons}
            selectedOption={
              !adaDashboardReducer?.isCompareWithDropdown
                ? adaDashboardReducer?.compareWithSelectedDate?.[0]?.value
                : null
            }
          />
          {adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
            ?.dashboard?.compareWith?.showYearsDropdown && (
            <span className={classes.separator}>Or</span>
          )}
          <SelectFiscalYear
            historicYears={historicYears}
            updateCompareWithValuesInRedux={updateCompareWithValuesInRedux}
          />
        </div>
      </div>
    </LoadingOverlay>
  );
};

export default CompareWith;

const useStyles = makeStyles((theme) => ({
  compareWithContainer: {
    justifyContent: "flex-start",
  },
  compareWithOptionsContainer: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  compareWithLabel: {
    color: "#0D152C",
    fontSize: "1rem",
    fontWeight: "800",
    lineHeight: "1.5rem",
    marginRight: "0.75rem",
  },
  compareButtonContainer: {
    paddingTop: "0.7rem",
  },
  selectContainer: {
    marginLeft: "2rem",
    "& > label": {
      display: "none",
    },
    position: "relative",
    transform: "translateY(-15px)",
  },
  separator: {
    color: "0D152C",
  },
}));
