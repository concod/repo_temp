import { makeStyles } from "@mui/styles";
import classNames from "classnames";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import React from "react";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import { useSelector } from "react-redux";
const NoDataWrapper = ({ label, customClass, loader }) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const adaDashboardReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );
  return (
    <CustomAccordion
      label={label}
    >
      <LoadingOverlay loader={loader}>
        <div
          className={classNames(
            classes.noData,
            globalClasses.flexRow,
            globalClasses.layoutAlignCenter
          )}
        >
          <span className={classes.noDataText}>
            No data applicable for selected filters.
          </span>
        </div>
      </LoadingOverlay>
    </CustomAccordion>
  );
};

export default NoDataWrapper;

const useStyles = makeStyles((theme) => ({
  noData: {
    height: theme.typography.pxToRem(125),
  },
  noDataText: {
    fontSize: 12,
  }
}));
