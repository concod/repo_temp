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
    let swapStoreResponseData = await props.fetchClusterStoreListData(
      {
        cluster_plan_code: props.planDetails?.data?.cluster_plan_code,
        performance_bucket_id: props.performanceClusterBucket,
        attribute_bucket_id: props.attributeClusterBucket,
        channel:
          props.planDetails?.data?.store_group_id === 0 &&
          props.filters?.[0]?.initialData?.length > 1
            ? props.channelSelected || ""
            : "",
      },
      props.planDetails?.data?.cluster_plan_code
    );
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

  const getPerformanceAttributeLabel = (selectedCluster, regex, type) => {
    let currentClusterChannel = props.currentClusterChannel;
    let clusterLabel;
    if (!currentClusterChannel) {
      props.planDetails?.data?.channel?.map((chan) => {
        if (selectedCluster.includes(chan)) {
          currentClusterChannel = chan;
        }
      });
    }
    clusterLabel = selectedCluster?.split(currentClusterChannel + " ");
    if (currentClusterChannel && clusterLabel?.length > 1) {
      clusterLabel.unshift(currentClusterChannel);
      let [name_code, ...store_name] = clusterLabel[2].split(" ");
      store_name = store_name.join(" ");
      return (
        clusterLabel?.[0] +
        " " +
        (regex ? name_code.replace(regex, "") : name_code.match(/\d+/)?.[0])
      );
    } else if (props.planDetails?.data?.channel?.length === 1) {
      const attribute_code = selectedCluster?.charAt(0);
      const performance_code = selectedCluster?.charAt(1);
      return type === "attribute" ? attribute_code : performance_code;
    } else {
      if (props.perfAttrCharLabel?.perf_char_label === "True") {
        let regex = /[^a-z" "]/gi;
        return selectedCluster.replace(regex, "");
      }
      if (type === "attribute") {
        return cloneDeep(selectedCluster).replace(regex, "");
      }
      return selectedCluster.match(/\d+/)?.[0];
    }
  };

  const getStoreLabel = (selectedCluster) => {
    let currentClusterChannel = props.currentClusterChannel;
    if (!currentClusterChannel) {
      props.planDetails?.data?.channel?.map((chan) => {
        if (selectedCluster.includes(chan)) {
          currentClusterChannel = chan;
        }
      });
    }
    let clusterLabel = selectedCluster?.split(currentClusterChannel + " ");
    if (currentClusterChannel && clusterLabel?.length > 1) {
      return clusterLabel[1].split(" ").slice(1).join(" ");
    } else if (props.planDetails?.data?.channel?.length === 1) {
      return selectedCluster.substring(2).trim();
    } else {
      let regex = /[^a-z" "]/gi;
      if (props.perfAttrCharLabel?.perf_char_label === "True") {
        return selectedCluster.replace(regex, "");
      }
      return selectedCluster.match(/\d+/)?.[0];
    }
  };
  function findClusterCode(clusterName, data) {
    const item = data.find((item) => item.cluster_name === clusterName || item.cluster_code === clusterName);
    return item ? item.cluster_code : null;
  }

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
    let cluster_type =
      props.selectedClusterTab === undefined
        ? props.planDetails?.data?.cluster_type
        : props.selectedClusterTab === 0
        ? "ia_recommended"
        : "upload";
    let selectedClusterCode = await findClusterCode(
      selectedClusterValue,
      props.clusterEditTableData
    );
    let selectedClusterSwapCode = await findClusterCode(
      props.selectedClusterForSwapStore,
      props.clusterEditTableData
    );
    let payload = {
      cluster_plan_code: props.planDetails?.data?.cluster_plan_code,
      performance_bucket_id: props.performanceClusterBucket,
      attribute_bucket_id: props.attributeClusterBucket,
      cluster_type: cluster_type,
      data: [
        {
          performance_label:
            props.selectedClusterForSwapStore === "unclustered-stores"
              ? "unclustered-stores"
              : getPerformanceAttributeLabel(selectedClusterSwapCode),
          attribute_label:
            props.selectedClusterForSwapStore === "unclustered-stores"
              ? "unclustered-stores"
              : getPerformanceAttributeLabel(
                  selectedClusterSwapCode,
                  regex,
                  "attribute"
                ),
          cluster_display_name:
            props.cluster_type !== "ia_recommended"
              ? props.selectedClusterForSwapStore === "unclustered-stores"
                ? "unclustered-stores"
                : props.selectedClusterForSwapStore
              : undefined,
          stores_code: leftRows,
        },
        {
          performance_label:
            selectedClusterValue === "unclustered-stores"
              ? "unclustered-stores"
              : getPerformanceAttributeLabel(selectedClusterCode),
          attribute_label:
            selectedClusterValue === "unclustered-stores"
              ? "unclustered-stores"
              : getPerformanceAttributeLabel(
                  selectedClusterCode,
                  regex,
                  "attribute"
                ),
          cluster_display_name:
            props.cluster_type !== "ia_recommended"
              ? selectedClusterValue === "unclustered-stores"
                ? "unclustered-stores"
                : selectedClusterValue
              : undefined,
          stores_code: rightRows,
        },
      ],
    };
    if (
      props.planDetails?.data?.selected_attribute.includes("store") &&
      cluster_type === "ia_recommended"
    ) {
      payload.data[0].store_label =
        props.selectedClusterForSwapStore === "unclustered-stores"
          ? "unclustered-stores"
          : payload.data[0].performance_label.match(/^[^\s]*/)?.[0] +
            " " +
            getStoreLabel(props.selectedClusterForSwapStore);
      payload.data[1].store_label =
        selectedClusterValue === "unclustered-stores"
          ? "unclustered-stores"
          : payload.data[1].performance_label.match(/^[^\s]*/)?.[0] +
            " " +
            getStoreLabel(selectedClusterValue);
    }
    let swapStoreUpdateData = await props.updateSwapStoreData(
      payload,
      props.planDetails?.data?.cluster_plan_code
    );

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
