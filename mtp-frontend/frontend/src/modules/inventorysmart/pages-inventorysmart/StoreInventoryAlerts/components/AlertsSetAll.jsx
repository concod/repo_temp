import React from "react";

import {
  Button,
  Dialog,
  DialogContent,
  Grid,
  Typography,
  DialogTitle,
  DialogActions,
} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

import Form from "core/Utils/form";

import makeStyles from "@mui/styles/makeStyles";
import { UPDATE_MODAL_STOCK } from "../../../constants-inventorysmart/stringConstants";

const useStyles = makeStyles((theme) => ({
  moduleTitle: {
    ...theme.typography.h3,
  },
  dialogContentBody: {
    borderTop: "none",
  },
  paperFullWidth: {
    overflowY: "visible",
    minWidth: "80%",
  },
  dialogRoot: {
    "& .MuiDialog-paperWidthSm": {
      width: "35rem !important",
      borderRadius: "0.6rem",
    },
  },
}));

const AlertsSetAll = (props) => {
  const classes = useStyles();

  return (
    <Dialog
      onClose={props.closeSetAllModal}
      className={classes.dialogRoot}
      maxWidth={"sm"}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      disableEscapeKeyDown={true}
      disableBackdropClick={false}
    >
      <DialogTitle id="customized-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h5" gutterBottom>
            Set All
          </Typography>
          <IconButton
            aria-label="close"
            onClick={props.closeSetAllModal}
            size="large"
          >
            <CloseIcon />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent>
        <div>
          <Form
            maxFieldsInRow={1}
            layout={"horizontal"}
            handleChange={props.handleChange}
            fields={UPDATE_MODAL_STOCK}
            updateDefaultValue={false}
            defaultValues={props.modelStockData}
          ></Form>
        </div>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={props.onApply} color="primary">
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AlertsSetAll;
