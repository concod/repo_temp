import React from "react";
import makeStyles from "@mui/styles/makeStyles";
import { EmptyState } from "impact-ui-v3";
import { pxToRem } from "core/Utils/functions/utils";

export const useStyles = makeStyles((theme) => ({
  emptyStateContainer: {
    height: `calc(100vh - ${pxToRem(216)})`,
    display: "flex",
    alignItems: "center",
    margin: "1rem",
  },
}));

const EmptyStateLayout = (props) => {
  const classes = useStyles();

  const { emptyStateDescription, emptyStateHeading } = props;

  return (
    <div className={classes.emptyStateContainer}>
      <EmptyState
        description={
          emptyStateDescription ||
          "Please select different filters to this page."
        }
        heading={emptyStateHeading || "Filters Not Found"}
        primaryButtonLabel={
          props?.hidePrimaryButton ? null : props?.primaryButtonLabel
        }
        onPrimaryButtonClick={() => {
          if (typeof props?.onPrimaryButtonClick === "function") {
            props?.onPrimaryButtonClick();
          }
        }}
      />
    </div>
  );
};

export default EmptyStateLayout;
