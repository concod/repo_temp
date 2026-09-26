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
  deleteWedgeChoice,
  getWedgeAttributesData,
  setWedgeAttributeData,
  set2_3_Loader,
  updateStyleWedgeData,
} from "modules/assortsmart/services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import { addSnack } from "core/actions/snackbarActions";
import { getPlanPayload } from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { uniqBy } from "lodash";
import AgGridTable from "core/Utils/agGrid";
import { bindActionCreators } from "redux";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planWedgeServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const DeleteWedgeDataModal = (props) => {
  const [deleteTableData, setDeleteTableData] = useState([]);
  const classes = useStyles();
  const DeleteChoiceInstance = useRef({});

  const displaySnackMessage = (msg, type) => {
    props.addSnack({
      message: msg,
      options: {
        variant: type,
      },
    });
  };

  useEffect(() => {
    if (props.deleteData?.length) {
      setDeleteTableData([]);
      let uniqueKey =
        props.deleteType === "style_level" ? "style_id" : "choice_name";
      const tableData = uniqBy(props.deleteData, uniqueKey);
      const deleteData = tableData.map((item) => {
        if (props.deleteType === "style_level") {
          return {
            l3_name: item.l3_name,
            style_id: item.style_id,
          };
        } else {
          return {
            l3_name: replaceSpecialCharacter(item.l3_name),
            choice_name: replaceSpecialCharacter(item.choice_name),
            set_name: item.set_name
          };
        }
      });
      setDeleteTableData(deleteData);
    }
  }, [props.deleteData]);

  const deleteChoiceAction = () => {
    let flag = true;
    deleteTableData.forEach((data) => {
      if (
        data.set_name &&
        data.set_name !== "" &&
        flag
      ) {
        displaySnackMessage(
          `To delete ${data.choice_name}, it should be removed from set`,
          "warning"
        );
        flag = false;
      }
    });
    if (flag) {
      props.closeDeleteTablePopup();
      if (props.deleteType === "style_level") {
        props.setShowDeleteStylePopup(true);
      } else {
        props.setShowDeleteChoicePopup(true);
      }
    }
  };

  const loadTableInstance = (params) => {
    DeleteChoiceInstance.current = params;
  };
  return (
    <Dialog
      maxWidth={"md"}
      aria-labelledby="customized-dialog-title"
      open={props.showDeleteTablePopup}
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
            The following{" "}
            {props.deleteType === "style_level" ? "style id" : "choices"} have
            been marked for deletion:
          </Typography>
          <IconButton
            aria-label="close"
            size="large"
            color="primary"
            onClick={props.closeDeleteTablePopup}
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
                rowdata={deleteTableData || []}
                columns={props.deleteColumns}
                loadTableInstance={loadTableInstance}
                sideBar={false}
                onGridChanged
                adjustTableHeight={true}
              />
            </LoadingOverlay>
          </Grid>
        </div>
      </DialogContent>
      <DialogActions className={classes.NLEFooter}>
        <div className={"drop-down-label"}>
          Do you want to delete these{" "}
          {props.deleteType === "style_level" ? "style id" : "choices"}?
        </div>
        <div>
          <Button
            variant="outlined"
            color="primary"
            onClick={props.closeDeleteTablePopup}
            id="deleteChoicePopupCancelBtn"
            className={classes.button}
          >
            No
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              deleteChoiceAction();
            }}
            id="deleteChoiceSaveBtn"
            color="primary"
            className={classes.smallPrimaryButton}
            disabled={deleteTableData?.length <= 0 ? true : false}
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
    isLoading: planWedgeServiceActions.set2_3_LoaderSelector(state),
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(state),
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      deleteWedgeChoice,
      getWedgeAttributesData,
      setWedgeAttributeData,
      set2_3_Loader,
      addSnack,
      updateStyleWedgeData,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(DeleteWedgeDataModal));
