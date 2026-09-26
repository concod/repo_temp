import React from "react";
import Typography from "@mui/material/Typography";
import { Button } from "impact-ui-v3";
import { useExpediteOrdersCardsStyles } from "./styles.js";

const ExpediteOrdersCtaCard = ({
  onCreateOffCycle,
  onExpediteOrders,
  title = "Override The Default Lead Time",
  createOffCycleLabel = "Create Off Cycle Order",
}) => {
  const classes = useExpediteOrdersCardsStyles();

  return (
    <div className={classes.ctaCard}>
      <div className={classes.ctaCardContent}>
        <div className={classes.ctaIconWrapper} aria-hidden>
          <span className={classes.ctaEmoji}>🙁</span>
        </div>

        <div className={classes.ctaTextBlock}>
          <Typography className={classes.ctaTitle}>{title}</Typography>
          <Typography className={classes.ctaDesc}>
            Not Satisfied With The Recommendation? Create An Off-Cycle Order Or
            Expedite The Existing One.
          </Typography>
        </div>
      </div>

      <div className={classes.ctaButtonsRow}>
        <Button
          size="small"
          type="default"
          variant="secondary"
          className={classes.ctaButton}
          onClick={onCreateOffCycle}
        >
          {createOffCycleLabel}
        </Button>
        <Button
          size="small"
          type="default"
          variant="secondary"
          className={classes.ctaButton}
          onClick={onExpediteOrders}
          disabled={true}
        >
          Expedite Orders
        </Button>
      </div>
    </div>
  );
};

export default ExpediteOrdersCtaCard;
