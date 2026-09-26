import React from "react";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import globalStyles from "core/Styles/globalStyles";
import classNames from "classnames";

const NoDataWrapper = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  return (
    <React.Fragment>
      <div
        className={classNames(
          globalClasses.minHeightBody,
          classes.textCenter
        )}
      >
        <p className={classNames(classes.secondaryHeading, classes.textCenter)}>
          No data found
        </p>
        <p className={classes.nodataWrapper}>
          Please click on select filters to filter and View Data
        </p>
      </div>
    </React.Fragment>
  );
};

export default NoDataWrapper;
