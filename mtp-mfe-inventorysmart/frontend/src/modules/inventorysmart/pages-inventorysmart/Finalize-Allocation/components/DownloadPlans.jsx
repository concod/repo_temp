import React from "react";
import { Button, Grid } from "@mui/material";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";

const DownloadPlans = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  return (
    <Grid
      container
      direction="row"
      justifyContent="center"
      alignItems="center"
      className={globalClasses.marginAround}
    >
      {props.downloadConfig.map((btn) => {
        return (
          <div key={btn.id}>
            <Button
              variant="contained"
              color="primary"
              className={classes.button}
              id={`download-${btn.type}`}
              onClick={() => props.onClickHandler(btn.type)}
            >
              {btn.label}
            </Button>
          </div>
        );
      })}
    </Grid>
  );
};

export default DownloadPlans;
