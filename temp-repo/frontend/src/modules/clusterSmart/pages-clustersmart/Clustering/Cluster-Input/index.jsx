import PlanInfoComponent from "./components/edit-plan-component";
import StoreSelection from "./components/store-selection";
import AttributesTables from "./components/attribute-tables";
import { useEffect, useState } from "react";
import { useHistory } from "react-router";
import {
  getStoreChannels,
  setClusterInputLoader,
  updatePlanAPI,
  getChannelBasedStoreGroups,
  setSelectedStoreGrp,
  setDisplayAttribTable,
  resetClusterSelectionFields,
} from "modules/assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import {
  setClusterPlanDetails,
  updateClusterPlan,
  getClusterPlanDetails,
} from "modules/clusterSmart/services-clustersmart/ClusterPlan/cluster-plan-service";
import { connect } from "react-redux";
import { setPlanDetails } from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as clusterInputServiceActions from "modules/assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import * as clusterPlanServiceActions from "modules/clusterSmart/services-clustersmart/ClusterPlan/cluster-plan-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import { addSnack } from "core/actions/snackbarActions";
import LoadingOverlay from "core/Utils/Loader/loader";
import {
  updatePlan,
  getStoreGrps,
  fetchInputClusterData,
} from "./cluster-initial-function";

const InputClusteringComponent = (props) => {
  const [channelBasedStoreGrps, setchannelBasedStoreGrps] = useState([]);
  const [channelOptions, setchannelOptions] = useState([]);
  const [selectedChannel, setselectedChannel] = useState([]);
  const [isClusterInputMount, setisClusterInputMount] = useState(true);
  const [channelType, setChannelType] = useState("single");
  const history = useHistory();
  const location = history.location.pathname;

  useEffect(() => {
    if (props.planDetails?.data?.channel) {
      getStoreGrps(
        props,
        props.planDetails?.data?.channel,
        props.planDetails?.data?.sub_channel,
        setchannelBasedStoreGrps
      );
    }
  }, [props.planDetails?.data]);

  useEffect(() => {
    if (props.isPlanInfoFetched && !isClusterInputMount) {
      fetchInputClusterData(
        props,
        location,
        setchannelOptions,
        setselectedChannel,
        setchannelBasedStoreGrps
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.isPlanInfoFetched, isClusterInputMount]);

  useEffect(() => {
    setChannelType(
      props.screenConfiguration?.["1.1"]?.[
        "assort_channel_type_selection_1.1"
      ] || "single"
    );
    setisClusterInputMount(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.screenConfiguration]);

  const onChannelChange = async (newValue) => {
    setselectedChannel(newValue);
    updatePlan(props, newValue, location, setchannelBasedStoreGrps);
  };

  return (
    <>
      <LoadingOverlay loader={props.loader_1_1} spinner>
        <PlanInfoComponent {...props} />
        <StoreSelection
          storeGrps={channelBasedStoreGrps}
          selectedChannel={selectedChannel}
          channels={channelOptions}
          channelType={channelType}
          setselectedChannel={onChannelChange}
          {...props}
        />
        {props.displayAttributes && <AttributesTables {...props}/>}
      </LoadingOverlay>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    loader_1_1:
      clusterInputServiceActions.clusterInputIndexLoader_1_1Selector(store) ||
      clusterInputServiceActions.clusterInputEditPlanLoader_1_1Selector(
        store
      ) ||
      clusterInputServiceActions.clusterInputStoreSelectionLoader_1_1Selector(
        store
      ) ||
      clusterInputServiceActions.clusterInputAttributesTableLoader_1_1Selector(
        store
      ),
    planDetails: planDashboardServiceActions.planDetailsDataSelector(store),
    displayAttributes: clusterInputServiceActions.displayAttribTableSelector(
      store
    ),
    selectedStoreGroup: clusterInputServiceActions.selectedStoreGrpSelector(
      store
    ),
    clusterPlanDetails: clusterPlanServiceActions.clusterPlanDetailsSelector(
      store
    ),
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      store
    ),
  };
};
const mapActionsToProps = {
  getStoreChannels,
  setClusterInputLoader,
  updatePlanAPI,
  getChannelBasedStoreGroups,
  setPlanDetails,
  setSelectedStoreGrp,
  setDisplayAttribTable,
  addSnack,
  resetClusterSelectionFields,
  setClusterPlanDetails,
  updateClusterPlan,
  getClusterPlanDetails,
};
export default connect(
  mapStateToProps,
  mapActionsToProps
)(InputClusteringComponent);
