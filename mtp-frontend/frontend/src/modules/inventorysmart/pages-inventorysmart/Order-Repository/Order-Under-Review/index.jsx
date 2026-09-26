import { useState } from "react";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { connect } from "react-redux";
import {
  deletePlans,
  setInventorysmartDeletePlanLoader,
} from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { addSnack } from "core/actions/snackbarActions";
import { Button, FormControl, Grid, Typography } from "@mui/material";

import UpdateIcon from "@mui/icons-material/Update";
import DescriptionIcon from "@mui/icons-material/Description";
import DeleteIcon from "@mui/icons-material/Delete";
import OrderManagementTable from "../../Order-Management/components/OrderManagementTable";
import { Stack } from "@mui/system";
import { useHistory } from "react-router";

const OrderUnderReview = function (props) {
  const [selectedPlanIds, setSelectedPlanIds] = useState([]);
  const [renderAgGrid, setRenderAgGrid] = useState(false);
  const [selectedSkuCount, setSelectedSkuCount] = useState(0);
  const globalClasses = globalStyles();
  const classes = useStyles();
  const history = useHistory();

  const confirmDeletePlans = () => {
    const callDelete = async () => {
      props.setInventorysmartDeletePlanLoader(true);
      try {
        let body = {
          plan_codes: [...selectedPlanIds],
        };
        await props.deletePlans(body);
        displaySnackMessages("Successfully deleted plans", "success");
        props.setInventorysmartDeletePlanLoader(false);
      } catch (err) {
        props.setInventorysmartDeletePlanLoader(false);
        displaySnackMessages("Something went wrong on delete", "error");
      }
    };
    callDelete();
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  //   const viewOrderDeepDrive = () => {
  //     history.push({
  //       pathname: ORDER_MANAGEMENT_DEEP_DRIVE,
  //     });
  //   };

  //   const viewOrderCreateScenario = () => {
  //     history.push({
  //       pathname: ORDER_MANAGEMENT_CREATE_SCENARIO,
  //     });
  //   };

  return (
    <div className={globalClasses.filterWrapper}>
      <Grid
        container
        className={globalClasses.marginVertical1rem}
        justifyContent={"space-between"}
      >
        <Grid container alignItems={"center"} item xs={3}>
          <Typography variant="h6">Orders under review</Typography>
        </Grid>
        <Grid item xs={6} container justifyContent={"flex-end"}>
          <Button
            variant="contained"
            color="primary"
            id="createProductBtn"
            className={classes.button}
            onClick={() => console.log("Button Clicked")}
          >
            <UpdateIcon fontSize="small"></UpdateIcon>
          </Button>
          <Button
            variant="contained"
            color="primary"
            id="createProductBtn"
            className={classes.button}
            onClick={() => console.log("Button Clicked")}
          >
            <DescriptionIcon fontSize="small"></DescriptionIcon>
          </Button>
          <Button
            variant="contained"
            color="primary"
            id="createProductBtn"
            className={classes.button}
            onClick={() => console.log("Button Clicked")}
          >
            <DeleteIcon fontSize="small"></DeleteIcon>
          </Button>
          <Button
            variant="contained"
            color="primary"
            id="productSetAllBtn"
            className={classes.button}
            //   onClick={viewOrderDeepDrive}
          >
            Send for Approval
          </Button>
        </Grid>
      </Grid>
      {/* <OrderManagementTable
        setSelectedPlanIds={setSelectedPlanIds}
        confirmDeletePlans={confirmDeletePlans}
        renderAgGrid={renderAgGrid}
        setRenderAgGrid={setRenderAgGrid}
        pagination={false}
        setSelectedSkuCount={setSelectedSkuCount}
      /> */}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  deletePlans: (payload) => dispatch(deletePlans(payload)),
  setInventorysmartDeletePlanLoader: (payload) =>
    dispatch(setInventorysmartDeletePlanLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderUnderReview);
