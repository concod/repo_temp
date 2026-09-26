import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import SelectContainer from "core/commonComponents/filters/SelectContainer";
import {
  configureYearOptions,
  isNumber,
} from "modules/ada/utils-ada/utilityFunctions";
import { makeStyles } from "@mui/styles";
import { useTranslation } from "impact-ui-v3";

const SelectFiscalYear = ({
  updateCompareWithValuesInRedux,
  historicYears,
}) => {
  const { t } = useTranslation();
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
        label={t("ada.dashboard.selectFiscalYear")}
        selectAllLabel={t("ada.dashboard.fiscalYear")}
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
