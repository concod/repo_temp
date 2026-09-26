import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import {
  ERROR,
  ERROR_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import React, { useEffect, useState } from "react";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { connect } from "react-redux";
import { setInvalidAllocation } from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import {
  clearNotification,
  setMoveToTiageLoader,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { reCreateAllocationApi } from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";
import { addSnack } from "core/actions/snackbarActions";
import { DASHBOARD } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { useHistory } from "react-router-dom";
import { deletePlans } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";

const InvalidAllocation = (props) => {
  const [showInValidModal, setShowInValidModal] = useState(false);
  const [inValidMessage, setInValidMessage] = useState("");

  const classes = useStyles();
  const allocationCode = new URLSearchParams(window.location.search).get(
    "allocation_code"
  );
  const history = useHistory();

  useEffect(() => {
    let l_response = props.resposne.data;
    setShowInValidModal(l_response?.display_error);
    setInValidMessage(l_response?.message);
    props.setInvalidAllocation(l_response?.display_error);
  }, [props.resposne]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const onCloseModalHandler = () => {
    if (
      props.onCancelCallBack &&
      props.inventorysmartScreenConfig?.finalize?.checkCrossCountry
    ) {
      props.onCancelCallBack();
    }
    setShowInValidModal(false);
  };

  const reCreateAllocation = async () => {
    try {
      props.setMoveToTiageLoader(true);
      let l_createAllocationResponse = await props.reCreateAllocationApi({
        allocation_code: allocationCode || props.autoAllocationCodeFromDashboard,
      });
      displaySnackMessages(l_createAllocationResponse.data.message, "info");
      await props.clearNotification({
        event_id: [
          new URLSearchParams(window.location.search).get("allocation_code") || 
          props.autoAllocationCodeFromDashboard
        ],
        delete_type: "hard_delete",
      });
      setTimeout(() => {
        history?.push(`${DASHBOARD}?step=0`);
      }, 1000);
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setMoveToTiageLoader(false);
    }
  };

  const discardAllocation = async () => {
    try {
      props.setMoveToTiageLoader(true);
      let l_createAllocationResponse = await props.deletePlans({
        plan_codes: [allocationCode || props.autoAllocationCodeFromDashboard],
      });
      displaySnackMessages(l_createAllocationResponse.data.message, "success");
      setTimeout(() => {
        history?.push(`${DASHBOARD}?step=0`);
      }, 1000);
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setMoveToTiageLoader(false);
    }
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
          >
            {props.inventorysmartScreenConfigFinalize?.reCreateAllocation &&
              props.resposne?.data?.reallocate && (
                <div className={classes.buttonGroupWrapper}>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => reCreateAllocation()}
                    className={classes.button}
                  >
                    Reallocate
                  </Button>
                  {/* as per MTP-55357 Removed the Discard button
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => discardAllocation()}
                    className={classes.button}
                  >
                    Discard
                  </Button> */}
                </div>
              )}
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfigFinalize:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig.finalize,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInvalidAllocation: (payload) => dispatch(setInvalidAllocation(payload)),
  setMoveToTiageLoader: (payload) => dispatch(setMoveToTiageLoader(payload)),
  reCreateAllocationApi: (payload) => dispatch(reCreateAllocationApi(payload)),
  deletePlans: (payload) => dispatch(deletePlans(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
  clearNotification: (payload) => dispatch(clearNotification(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(InvalidAllocation);
