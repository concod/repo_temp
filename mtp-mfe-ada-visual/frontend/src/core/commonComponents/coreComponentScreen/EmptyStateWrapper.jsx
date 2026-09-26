import makeStyles from "@mui/styles/makeStyles";
import { LinearProgress } from "@mui/material";
import { pxToRem } from "../../Utils/functions/utils";
import { useState, useEffect } from "react";
import { EmptyState, Loader , Button} from "impact-ui-v3";
import { getProgressPercentage } from "./utils";
import globalStyles from "core/Styles/globalStyles";
import colours from "../../Styles/colours";
import { isEmpty } from "lodash";

export const useStyles = makeStyles((theme) => ({
  autoApplyMsgWrapper: {
    width: pxToRem(509),
    maxHeight: pxToRem(64),
    minHeight: pxToRem(64),
    borderRadius: pxToRem(12),
    background: colours.linkWater1,
    padding: `${pxToRem(0)} ${pxToRem(10)}`,
    "& .ia-styles.ia-loader-container": {
      zIndex: 10,
    },
  },
  autoApplyMsg: {
    fontFamily: "Manrope",
    fontWeight: 500,
    fontSize: pxToRem(16),
    lineHeight: "125%",
    letterSpacing: "0%",
    color: theme?.palette?.text?.boldHeadingBlue,
  },
  gap_12: {
    gap: pxToRem(12),
    height: pxToRem(60),
  },
  progressBar: {
    background: theme?.palette?.colours?.aliceBlue,
    borderRadius: pxToRem(4),
    "& .MuiLinearProgress-bar": {
      borderRadius: pxToRem(4),
      background: colours.blue_01,
      height: pxToRem(4),
    },
  },
  emptyStateContainer: {
    height: `calc(100vh - ${pxToRem(216)})`,
    display: "flex",
    alignItems: "center",
    marginTop: pxToRem(50),
  },
}));

const EmptyStateWrapper = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const [progress, setProgress] = useState(33);

  const {
    emptyStateDescription,
    emptyStateHeading,
    emptyStateOnPrimaryButtonClick,
    emptyStatePrimaryButtonLabel,
    emptyStateSecondaryButtonLabel,
    emptyStateSecondaryButtonClick,
    emptyStateProps = {},
    defaultFilterLoadingMsg,
    isAutoApplyEnabled,
    defaultFilterLoader,
    setOpenModal,
    renderCustomComponent,
    returnCustomComponent,
  } = props;

  useEffect(() => {
    setProgress(getProgressPercentage(defaultFilterLoadingMsg));
  }, [defaultFilterLoadingMsg]);

  // Prepare conditional props
  const conditionalProps =
    (isAutoApplyEnabled && !defaultFilterLoader) ||
    !(isAutoApplyEnabled && defaultFilterLoader)
      ? {
          onPrimaryButtonClick:
            emptyStateOnPrimaryButtonClick || (() => setOpenModal(true)),
        }
      : {};

  const bottomOptions =
    isAutoApplyEnabled && defaultFilterLoader ? (
      <span>
      <div
        className={`${classes.autoApplyMsgWrapper} ${globalClasses.layoutAlignSpaceBetween} ${globalClasses.flexColumn} ${globalClasses.alignTextCenter}`}
      >
        <div
          className={`${globalClasses.fullWidth} ${globalClasses.verticalAlignCenter}  ${globalClasses.flexRow} ${classes.gap_12} ${globalClasses.layoutAlignCenter} `}
        >
          <Loader progress="" size="small" text="" />

          <span className={classes.autoApplyMsg}>
            {defaultFilterLoadingMsg}
          </span>
        </div>
        <LinearProgress
          variant="determinate"
          value={progress}
          className={classes.progressBar}
        />
      </div>
        {props?.autoHideFilterButton  && <><br/><Button onClick={() => setOpenModal(true)}>Change filters</Button></>}
      </span>
    ) : renderCustomComponent ? (
      returnCustomComponent()
    ) : null;

  return (
    <div className={classes.emptyStateContainer}>
      <EmptyState
        description={
          emptyStateDescription ||
          "Save your preferred filters as default for a faster, more streamlined experience every visit"
        }
        heading={emptyStateHeading || "Add Filters to view"}
        primaryButtonLabel={
          isEmpty(conditionalProps)
            ? null
            : emptyStatePrimaryButtonLabel || "Add filter"
        }
        secondaryButtonLabel={
          isEmpty(conditionalProps) ? null : emptyStateSecondaryButtonLabel
        }
        onSecondaryButtonClick={emptyStateSecondaryButtonClick}
        emptyStateBottomOptions={bottomOptions}
        {...conditionalProps}
        {...(!isAutoApplyEnabled || !defaultFilterLoader
          ? emptyStateProps
          : {})}
        primaryButtonProps={
          props.primaryButtonProps ? props.primaryButtonProps : {
            id: "filterToggleBtn"
          }
        }
        secondaryButtonProps={
          props.secondaryButtonProps ? props.secondaryButtonProps : {}
        }
      />
    </div>
  );
};

export default EmptyStateWrapper;
