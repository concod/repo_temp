import { combineReducers } from "redux";
import planDashboardReducer from "./Plan-Dashboard/plan-dashboard-service";
import clusterInputReducer from "./Clustering/Cluster-Input/cluster-input-service";
import finalizeClusterReducer from "./Clustering/Finalize-Cluster/finalize-cluster-service";
import planInitialReducer from "./Plan/Plan-Initial/plan-initial-service";
import planDepthChoieService from "./Plan/Plan-Depth-Choice/depth-choice-service";
import planWedgeReducer from "./Plan/Plan-Wedge/plan-wedge-service";
import planFinalizeReducer from "./Plan/Plan-Finalize/plan-finalize-service";
import bopReceiptDrawerReducer from "./Plan/BOP-Receipt-Drawer/bop-receipt-drawer-service";
import commonAssortReducer from "./common-assort-service";
import comparePlanReducer from "./Plan/Compare-Plan/compare-plan-service";
import omniChannelReducer from "./OmniChannel/omni-channel-service";
import coreChoiceConfigurationReducer from "./CoreChoiceConfiguration/core-choice-configuration-service";
import hindsightReducer from "./Hindsight-Dashboard/hindsight-dashboard-service";
import strategyReducer from "./Strategy-Module/strategy-module-service";
import newStoreDetailsReducer from "./New-Store/new-store-details";

export const assortsmartReducer = combineReducers({
  planDashboardReducer,
  planInitialReducer,
  finalizeClusterReducer,
  clusterInputReducer,
  planWedgeReducer,
  planDepthChoieService,
  planFinalizeReducer,
  bopReceiptDrawerReducer,
  commonAssortReducer,
  comparePlanReducer,
  omniChannelReducer,
  coreChoiceConfigurationReducer,
  hindsightReducer,
  strategyReducer,
  newStoreDetailsReducer,
});
