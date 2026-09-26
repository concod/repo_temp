import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Grid,
  Typography,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import CloseIcon from "@mui/icons-material/Close";
import { isEmpty } from "lodash";
import Charts from "core/Utils/charts";
import { buildTrendsGraphData } from "./budget-level-two-functions";

const ViewTrendsModal = (props) => {
  const [graphDataAvailability, setGraphDataAvailability] = useState(false);

  const useStyles = makeStyles({
    viewTrendsModalWidth: {
      maxWidth: "60rem !important",
      margin: "0 auto",
    },
  });

  const classes = useStyles();

  useEffect(() => {
    if (!isEmpty(props.graphRawData)) {
      setGraphDataAvailability(true);
    }
  }, [props.graphRawData]);
  return (
    <Dialog
      className={classes.viewTrendsModalWidth}
      maxWidth={"lg"}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      onClose={() => props.setShowViewTrends(false)}
    >
      <DialogTitle>
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h5" gutterBottom>
            {" "}
            View Trends
          </Typography>
          <IconButton aria-label="close" size="large">
            <CloseIcon onClick={() => props.setShowViewTrends(false)} />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent>
        {graphDataAvailability && <Charts options={buildTrendsGraphData(props)} />}
      </DialogContent>
    </Dialog>
  );
};

export default ViewTrendsModal;
