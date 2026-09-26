import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import SelectContainer from "core/commonComponents/filters/SelectContainer";
import {
  configureYearOptions,
  isNumber,
} from "modules/ada/utils-ada/utilityFunctions";
import { makeStyles } from "@mui/styles";

const SelectFiscalYear = ({
  updateCompareWithValuesInRedux,
  historicYears,
}) => {
  const classes = useStyles();

  const adaDashboardReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const adaClientConfig = useSelector(
    (store) =>
      store?.adaReducer?.adaDashboardReducer?.clientConfig?.attribute_value
  );

  const fiscalCalendarDetails = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer?.fiscalCalendarDetails
  );

  const handleCompareWithChange = (e, val) => {
    updateCompareWithValuesInRedux(val, true);
  };

  return (
    !!fiscalCalendarDetails?.length &&
    adaClientConfig?.attribute_value?.dashboard?.compareWith
      ?.showYearsDropdown && (
      <SelectContainer
        is_multiple_selection
        customClass={classes.selectContainer}
        label="Select Fiscal Year"
        selectAllLabel="Fiscal Year"
        initialData={historicYears}
        updateDependency={handleCompareWithChange}
        selectedOptions={
          adaDashboardReducer?.isCompareWithDropdown
            ? adaDashboardReducer?.compareWithSelectedDate
            : []
        }
      />
    )
  );
};

export default SelectFiscalYear;

const useStyles = makeStyles((theme) => ({
  selectContainer: {
    marginLeft: "2rem",
    "& > label": {
      display: "none",
    },
    position: "relative",
    transform: "translateY(-15px)",
  },
}));
