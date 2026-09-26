import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import { ERROR } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import React, { useEffect, useState } from "react";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { connect } from "react-redux";
import { setInvalidAllocation } from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";

const InvalidAllocation = (props) => {
  const [showInValidModal, setShowInValidModal] = useState(false);
  const [inValidMessage, setInValidMessage] = useState("");

  const classes = useStyles();

  useEffect(() => {
    let l_response = props.resposne.data;
    setShowInValidModal(l_response?.display_error);
    setInValidMessage(l_response?.message);
    props.setInvalidAllocation(l_response?.display_error);
  }, [props.resposne]);

  const onCloseModalHandler = () => {
    if (
      props.onCancelCallBack &&
      props.inventorysmartScreenConfig?.finalize?.checkCrossCountry
    ) {
      props.onCancelCallBack();
    }
    setShowInValidModal(false);
  };
  return (
    <>
      {showInValidModal && (
        <Dialog
          onClose={() => onCloseModalHandler()}
          className={classes.root}
          maxWidth={"sm"}
          aria-labelledby="customized-dialog-title"
          open={true}
          fullWidth={true}
          disableEscapeKeyDown={true}
        >
          <DialogTitle id="customized-dialog-title">
            <Grid
              container
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h5" gutterBottom>
                {props.resposne?.data?.type || ERROR}
              </Typography>
              <IconButton aria-label="close" size="large">
                <CloseIcon onClick={() => onCloseModalHandler()} />
              </IconButton>
            </Grid>
          </DialogTitle>
          <DialogContent>
            <div className={classes.contentBody}>{inValidMessage}</div>
          </DialogContent>
          <DialogActions
            classes={{
              root: classes.footer,
            }}
          ></DialogActions>
        </Dialog>
      )}
    </>
  );
};

const mapDispatchToProps = (dispatch) => ({
  setInvalidAllocation: (payload) => dispatch(setInvalidAllocation(payload)),
});

export default connect(null, mapDispatchToProps)(InvalidAllocation);
