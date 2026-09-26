import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Grid,
  IconButton,
  Typography,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";

const ViewName = (props) => {
  const [viewName, setViewName] = useState("");
  const classes = useStyles();

  return (
    <Dialog
      maxWidth={"sm"}
      aria-labelledby="customized-dialog-title"
      open={props.isOpen}
      fullWidth={true}
      onClose={() => props.onClose()}
    >
      <DialogTitle id="customized-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          classes={{ root: classes.dialog }}
        >
          <Typography variant="h3">Save View</Typography>
          <IconButton aria-label="close" size="large">
            <CloseIcon onClick={() => props.onClose()} />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent className={classes.contentBody}>
        <TextField
          variant="outlined"
          name="viewName"
          type="text"
          id="viewHindsightName"
          placeholder="Enter View Name"
          value={viewName}
          onChange={(e) => setViewName(e.target.value)}
          fullWidth
          required=""
        />
      </DialogContent>
      <DialogActions>
        <Button
          color="primary"
          variant="outlined"
          onClick={() => props.onClose()}
          className={classes.smallPrimaryButton}
        >
          Cancel
        </Button>
        <Button
          color="primary"
          variant="contained"
          onClick={() => props.handleSaveView(viewName)}
          className={classes.smallPrimaryButton}
          disabled={viewName?.length ? false : true}
        >
          Save View
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ViewName;
