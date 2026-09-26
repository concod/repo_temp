import { makeStyles } from "@mui/styles";
import { useState } from "react";
import classNames from "classnames";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import React from "react";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import { useSelector } from "react-redux";
import { Accordion } from "impact-ui-v3";
const NoDataWrapper = ({ label, customClass, loader }) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const adaDashboardReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const [accordionValue, setAccordionValue] = useState(label);
  return (
    <div style={{ marginBottom: "15px" }}>
      <Accordion
        label={label}
        isSingleItem={true}
        singleData={{
          header: label,
          content: (
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
          ),
          value: label,
        }}
        expanded={accordionValue}
        onChange={(value) => {
          if (!accordionValue) {
            setAccordionValue(label);
          } else {
            setAccordionValue(null);
          }
        }}
      />
    </div>
  );
};

export default NoDataWrapper;

const useStyles = makeStyles((theme) => ({
  noData: {
    height: theme.typography.pxToRem(125),
  },
  noDataText: {
    fontSize: 12,
  },
}));
