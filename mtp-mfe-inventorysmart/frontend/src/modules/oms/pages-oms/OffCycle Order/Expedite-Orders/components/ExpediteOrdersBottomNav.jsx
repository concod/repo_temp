/**
 * Sticky bottom bar for Expedite Orders (Figma node 3060:65850).
 * Back to dashboard / Cancel / Finalize — wired by parent for prompts and actions.
 */
import React from "react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { Button } from "impact-ui-v3";
import { useExpediteOrdersCardsStyles } from "./styles.js";
import { SELECT_STRATEGY_AND_APPROVE } from "modules/oms/pages-oms/Decision-Dashboard/Ordering-Alerts/utils/constants.js";

const ExpediteOrdersBottomNav = ({
  expediteFlowStep,
  isSimulating,
  isApproveLoading = false,
  onBackToDashboard,
  onCancel,
  onApprove,
  // Read-only Before (notification mode): hide Cancel/Approve, keep navigation.
  hideActions = false,
}) => {
  const classes = useExpediteOrdersCardsStyles();

  return (
    <div className={classes.expediteBottomNav}>
      <Button
        variant="tertiary"
        size="large"
        className={classes.expediteBottomNavBack}
        onClick={onBackToDashboard}
        disabled={isSimulating}
        icon={<ChevronLeftIcon sx={{ fontSize: 16 }} />}
      >
        Back to dashboard
      </Button>
      {!hideActions && (
        <div className={classes.expediteBottomNavRight}>
          <Button
            variant="tertiary"
            size="medium"
            className={classes.expediteBottomNavCancel}
            onClick={onCancel}
            disabled={isSimulating}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="medium"
            className={classes.expediteBottomNavFinalize}
            onClick={onApprove}
            disabled={isApproveLoading}
          >
            {SELECT_STRATEGY_AND_APPROVE}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ExpediteOrdersBottomNav;
