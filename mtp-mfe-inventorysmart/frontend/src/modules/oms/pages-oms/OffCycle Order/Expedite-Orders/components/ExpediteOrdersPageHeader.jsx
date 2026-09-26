import React from "react";
import Typography from "@mui/material/Typography";
import { useExpediteOrdersCardsStyles } from "./styles.js";

const ExpediteOrdersPageHeader = ({
  title,
  subtitle = null,
  beforeAfterControl = null,
  rightSlot = null,
}) => {
  const classes = useExpediteOrdersCardsStyles();

  return (
    <div className={classes.pageHeaderRow}>
      <Typography component="h1" className={classes.pageTitle}>
        {title}
        {subtitle ? (
          <Typography
            component="span"
            className={classes.pageTitleSubtitle}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Typography>
      {beforeAfterControl ? (
        <div className={classes.pageHeaderBeforeAfter}>
          {beforeAfterControl}
        </div>
      ) : null}
      {rightSlot ? (
        <div className={classes.pageHeaderRight}>{rightSlot}</div>
      ) : null}
    </div>
  );
};

export default ExpediteOrdersPageHeader;
