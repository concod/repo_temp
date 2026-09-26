import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Grid,
  IconButton,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SwapStoreTableComponent from "./swap-store-table-component";
import {
  fetchClusterStoreListData,
  updateSwapStoreData,
} from "../../../../assortsmart/services-assortsmart/Clustering/Finalize-Cluster/finalize-cluster-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { cloneDeep } from "lodash";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { addSnack } from "core/actions/snackbarActions";

export const GetSwapStoreInstanceContext = React.createContext();

const SwapStoreModal = (props) => {
  const [swapStoreResponse, setSwapStoreResponse] = useState([]);
  const [RTinstanceDefaultCluster, setRTinstanceDefaultCluster] = useState(
    null
  );
  const [RTinstanceSelectedCluster, setRTinstanceSelectedCluster] = useState(
    null
  );
  const [isSavedSwapStore, setIsSavedSwapStore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClusterValue, setSelectedClusterValue] = useState([]);
  const [swapStoreLoader, setSwapStoreLoader] = useState(true);

  const fetchStoreSwapData = async () => {
    let swapStoreResponseData = await props.fetchClusterStoreListData({
      cluster_plan_code: props.planDetails?.data?.cluster_plan_code,
      performance_bucket_id: props.performanceClusterBucket,
      attribute_bucket_id: props.attributeClusterBucket,
      channel: props.currentClusterChannel || "",
    });
    setSwapStoreResponse(swapStoreResponseData);
  };

  useEffect(() => {
    fetchStoreSwapData();
  }, []);

  const setSaveBeforeChange = (val) => {
    setIsSavedSwapStore(val);
  };

  const receiveSelectedCluster = (val) => {
    setSelectedClusterValue(val);
  };

  const getPerformaceLabel = (selectedCluster) => {
    let clusterLabel = selectedCluster?.split(
      props.currentClusterChannel + " "
    );
    if (clusterLabel?.length > 1) {
      clusterLabel.unshift(props.currentClusterChannel);
      return clusterLabel?.[0] + " " + clusterLabel?.[2].match(/\d+/)?.[0];
    } else {
      let regex = /[^a-z" "]/gi;
      if (props.perfAttrCharLabel?.perf_char_label === "True") {
        return selectedCluster.replace(regex, "");
      }
      return selectedCluster.match(/\d+/)?.[0];
    }
  };

  const onSaveStoreSwap = async () => {
    const leftRows = [],
      rightRows = [];
    RTinstanceDefaultCluster.current.api.forEachNode((node) => {
      leftRows.push(node.data.store_code);
    });
    RTinstanceSelectedCluster.current.api.forEachNode((node) => {
      rightRows.push(node.data.store_code);
    });
    setIsLoading(true);
    let regex;
    if (props.perfAttrCharLabel?.perf_char_label === "True") {
      regex = /[a-z" "]/gi;
    } else {
      regex = /[^a-z" "]/gi;
    }
    let payload = {
      cluster_plan_code: props.planDetails?.data?.cluster_plan_code,
      performance_bucket_id: props.performanceClusterBucket,
      attribute_bucket_id: props.attributeClusterBucket,
      data: [
        {
          performance_label: getPerformaceLabel(
            props.selectedClusterForSwapStore
          ),
          attribute_label: cloneDeep(props.selectedClusterForSwapStore).replace(
            regex,
            ""
          ),
          stores_code: leftRows,
        },
        {
          performance_label:
            selectedClusterValue === "non-clustered"
              ? "non-clustered"
              : getPerformaceLabel(selectedClusterValue),
          attribute_label:
            selectedClusterValue === "non-clustered"
              ? "non-clustered"
              : cloneDeep(selectedClusterValue).replace(regex, ""),
          stores_code: rightRows,
        },
      ],
    };
    let swapStoreUpdateData = await props.updateSwapStoreData(payload);

    if (swapStoreUpdateData?.data?.status) {
      fetchStoreSwapData();
      setIsSavedSwapStore(false);
      props.addSnack({
        message: "Store transferred successfully!",
        options: {
          variant: "success",
        },
      });
      props.saveSwapStoreAlert();
    }
  };

  const classes = useStyles();

  return (
    <Dialog
      maxWidth={"lg"}
      aria-labelledby="customized-dialog-title"
      open={props.showSwapStoreModal}
      fullWidth={true}
      onClose={props.closeSwapStoreModal}
    >
      <DialogTitle id="customized-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          Transfer Stores between Clusters
          <IconButton aria-label="close" size="large">
            <CloseIcon onClick={props.closeSwapStoreModal} />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent>
        <div className={classes.contentBody}>
          <GetSwapStoreInstanceContext.Provider
            value={{
              setRTinstanceDefaultCluster,
              setRTinstanceSelectedCluster,
            }}
          >
            <SwapStoreTableComponent
              selectedClusterForSwapStore={props.selectedClusterForSwapStore}
              swapStoreResponse={swapStoreResponse}
              isSavedSwapStore={isSavedSwapStore}
              setSaveBeforeChange={setSaveBeforeChange}
              isLoading={isLoading}
              sendSelectedCluster={receiveSelectedCluster}
              setIsLoading={setIsLoading}
              closeSwapStoreModal={props.closeSwapStoreModal}
              swapStoreLoader={swapStoreLoader}
              setSwapStoreLoader={setSwapStoreLoader}
            />
          </GetSwapStoreInstanceContext.Provider>
        </div>
      </DialogContent>
      <DialogActions>
        <Button
          color="primary"
          variant="contained"
          id="saveStoreSwap"
          className={classes.smallPrimaryButton}
          disabled={
            isLoading || RTinstanceDefaultCluster?.length || swapStoreLoader
          }
          onClick={onSaveStoreSwap}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const mapStateToProps = (store) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(store),
  };
};

const mapActionsToProps = {
  fetchClusterStoreListData,
  updateSwapStoreData,
  addSnack,
};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(withRouter(SwapStoreModal));
