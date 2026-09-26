import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { addSnack } from "core/actions/snackbarActions";
import {
  getL3OptData,
  setL3OptData,
  setL2OptData,
  set2_1_Loader,
  updateL3OptData,
  createNewL3,
  getOptimizeL3Data,
} from "../../../services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import { capitalize } from "core/Utils/formatter";
import LoadingOverlay from "core/Utils/Loader/loader";
import CreateNewLevelThreeComponent from "./create-new-level-three-component";

const CreateNewLevelFourModal = (props) => {
  return (
    <Dialog
      maxWidth={"lg"}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      onClose={() => props.setShowCreateLevelThree(false)}
    >
      <DialogTitle id="customized-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          {`Create ${capitalize(
            props.levelsJson[
              props?.screenConfiguration?.common?.final_level || "l3_name"
            ]
          )}`}
          <IconButton aria-label="close" size="large">
            <CloseIcon onClick={() => props.setShowCreateLevelThree(false)} />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent>
        <LoadingOverlay loader={props.isLoading}>
          <CreateNewLevelThreeComponent {...props} />
        </LoadingOverlay>
      </DialogContent>
    </Dialog>
  );
};

const mapStateToProps = (store) => {
  return {
    planDetails: store.assortsmartReducer.planDashboardReducer.planDetails,
    levelsJson: store.assortsmartReducer.planDashboardReducer.levelsJson,
    planLevels: store.assortsmartReducer.planDashboardReducer.planLevels,
    isLoading: store.assortsmartReducer.planInitialReducer.loader_2_1,
    screenConfiguration:
      store.assortsmartReducer.commonAssortReducer.screenConfiguration,
    productList: store.assortsmartReducer.planInitialReducer.productList,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getL3OptData: (payload, endpoint, objId) =>
    dispatch(getL3OptData(payload, endpoint, objId)),
  setL3OptData: (payload) => dispatch(setL3OptData(payload)),
  setL2OptData: (payload) => dispatch(setL2OptData(payload)),
  set2_1_Loader: (payload) => dispatch(set2_1_Loader(payload)),
  updateL3OptData: (payload, endpoint, objId) =>
    dispatch(updateL3OptData(payload, endpoint, objId)),
  createNewL3: (payload, endpoint, objId) => dispatch(createNewL3(payload, endpoint, objId)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  getOptimizeL3Data: (payload, objId) => dispatch(getOptimizeL3Data(payload, objId)),
});
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(CreateNewLevelFourModal));
