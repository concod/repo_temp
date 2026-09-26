import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
  Button,
  DialogActions,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import LoadingOverlay from "core/Utils/Loader/loader";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import {
  set2_3_Loader,
  updateWedgeData,
  addDropshipChoices,
} from "modules/assortsmart/services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { uniqBy } from "lodash";
import AgGridTable from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import { bindActionCreators } from "redux";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { displaySnackMessage } from "./plan-wedge-functions";

const DropShipModal = (props) => {
  const [dropShipTableData, setDropShipTableData] = useState([]);
  const classes = useStyles();
  const DropShipInstance = useRef({});

  useEffect(() => {
    if (props.dropShipChoices?.length) {
      const tableData = uniqBy(props.dropShipChoices, "choice_name");
      const dropShipChoices = tableData.map((item) => {
        return {
          l3_name: item.l3_name,
          choice_name: item.choice_name,
        };
      });
      setDropShipTableData(dropShipChoices);
    }
  }, [props.dropShipChoices]);

  const handleAddDropShipChoice = async () => {
    props.set2_3_Loader(true);
    const reqBody = {
      plan_wedge_data: props.finalWedgeData,
      is_completed: true,
      is_scaling: false,
      is_update_plan_step: false,
      plan_sub_step: "wedge_table",
      is_market_style_change: false,
      is_value_changed: props.isChoiceWedgeChanged,
      is_style_color_value_change: props.isStyleColorChanged,
    };
    if (
      props.screenConfiguration?.common?.show_style_level ||
      props.screenConfiguration?.common?.endpoint_project_name ===
        "assort-smart"
    ) {
      reqBody["wedge_level"] = "choice_level";
    }
    props.closeDropShipTablePopup();
    const updateResponse = await props.updateWedgeData(
      reqBody,
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    props.setIsStyleColorChanged(false);
    if (updateResponse?.data.status) {
      displaySnackMessage(
        updateResponse?.data?.data?.message || updateResponse?.data?.message,
        updateResponse?.data?.data?.message_type,
        props.addSnack
      );
      props.setIsChoiceWedgeChanged(false);
      if (props.statusImageMap) {
        props.callImageWedgeMap();
      }
      let payload = {
        plan_code: props.planDetails?.data?.plan_code,
        hold_budget: props.holdBudget,
      };
      if (
        props.screenConfiguration?.common?.show_style_level ||
        props.screenConfiguration?.common?.endpoint_project_name ===
          "assort-smart"
      ) {
        payload["wedge_level"] = "choice_level";
      }
      let dropShipChoicesResponse = await props.addDropshipChoices(
        payload,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (dropShipChoicesResponse?.data?.status) {
        displaySnackMessage(
          dropShipChoicesResponse.data.data.message,
          "success",
          props.addSnack
        );
      } else {
        displaySnackMessage(
          "Saving Dropship choices failed",
          "error",
          props.addSnack
        );
      }
      props.setCallWedge(true);
    }
  };

  const closeAddDropShipModal = async () => {
    props.closeDropShipTablePopup();
    props.setCallWedge(true);
  };

  const loadTableInstance = (params) => {
    DropShipInstance.current = params;
  };

  return (
    <Dialog
      maxWidth={"md"}
      aria-labelledby="customized-dialog-title"
      open={props.showDropShipTablePopup}
      fullWidth={true}
    >
      <DialogTitle id="customized-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          classes={{ root: classes.dialog }}
        >
          <Typography variant="h4">
            The following choices have been marked:
          </Typography>
          <IconButton
            aria-label="close"
            size="large"
            color="primary"
            onClick={props.closeDropShipTablePopup}
          >
            <Close />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent className={classes.contentBody}>
        <div>
          <Grid container direction="row" className={classes.dialogGrid}>
            <LoadingOverlay loader={props.isLoading}>
              <AgGridTable
                rowdata={dropShipTableData || []}
                columns={props.dropShipColumns}
                loadTableInstance={loadTableInstance}
                sideBar={false}
                sizeColumnsToFitFlag
                onGridChanged
                adjustTableHeight={true}
              />
            </LoadingOverlay>
          </Grid>
        </div>
      </DialogContent>
      <DialogActions className={classes.NLEFooter}>
        <div className={"drop-down-label"}>
          Do you want to add these choices as dropship?
        </div>
        <div>
          <Button
            variant="outlined"
            color="primary"
            onClick={closeAddDropShipModal}
            id="dropshipChoicePopupCancelBtn"
            className={classes.button}
          >
            No
          </Button>
          <Button
            variant="contained"
            onClick={handleAddDropShipChoice}
            id="dropshipChoiceSaveBtn"
            color="primary"
            className={classes.smallPrimaryButton}
            disabled={dropShipTableData?.length <= 0 ? true : false}
          >
            Yes
          </Button>
        </div>
      </DialogActions>
    </Dialog>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      updateWedgeData,
      addDropshipChoices,
      set2_3_Loader,
      addSnack,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(DropShipModal));
