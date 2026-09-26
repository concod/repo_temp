import { combineReducers } from "redux";
import authReducer from "./authReducer";
import loaderReducer from "./loaderReducer";
import layoutReducer from "./layoutReducer";
import adminReducer from "./adminReducer";
import filterReducer from "./filterReducer";
import tenantReducer from "./tenantReducer";
import notificationReducer from "./notificationReducer";
import workflowReducer from "./workflowReducer";
import snackbarReducer from "./snackbarReducer";
import ticketingReducer from "./ticketingReducer";
import filterElementsReducer from "./filterElementsReducer";
import UnitDefnReducer from "core/pages/product-unit-definition/product-unit-definition-service";
import productGroupReducer from "core/pages/product-grouping/product-grouping-service";
import productStatusReducer from "./productStatusReducer";
import tableReducer from "./tableReducer";
import storeGroupReducer from "core/pages/store-grouping/services-store-grouping/custom-store-group-service";
import eventConfigurationReducer from "./eventConfigReducer";
import dcStatusReducer from "core/pages/dc-status/dc-status-service";
import tenantConfigReducer from "./tenantConfigReducer";
import sideBarReducer from "./sideBarReducer";
import homePageReducer from "./homePageReducer";
import commentBarReducer from "./commentBarReducer";
import createGradeReducer from "core/pages/store-grading/grading-services";
import { assortsmartReducer } from "../../modules/assortsmart/services-assortsmart/CombinedService";
import { plansmartReducer } from "../../modules/plansmart/services-plansmart/plansmart-combined-services";
import { inventorysmartReducer } from "../../modules/inventorysmart/services-inventorysmart/inventorysmart-combined-services";
import { tenantUserRoleMgmtReducer } from "core/pages/tenant-config/access-user-management/services/TenantManagement/combinedService";
import { LOGOUT_CURRENT_USER } from "../actions/types";
import { marksmartReducer } from "modules/marksmart/services-marksmart/marksmart-combined-service";
import { adaReducer } from "modules/ada/services-ada/ada-combined-services";
import productMappingReducerService from "core/pages/product-mapping/services-product-mapping/productMappingService";
import storeMappingReducerService from "core/pages/storeMapping/services/storeMappingService";
import dcMappingReducerService from "core/pages/dcmapping/services-dc-mapping/dc-mapping-service";
import { clustersmartReducer } from "modules/clusterSmart/services-clustersmart/CombinedService";
import plansmartTenantConfig from "./tenantConfigService"
import smartBotReducer from "./smartBotReducer";

const appReducer = combineReducers({
  adminReducer,
  authReducer,
  layoutReducer,
  loaderReducer,
  filterReducer,
  tenantReducer,
  notificationReducer,
  workflowReducer,
  snackbarReducer,
  ticketingReducer,
  filterElementsReducer,
  UnitDefnReducer,
  eventConfigurationReducer,
  productGroupReducer,
  productStatusReducer,
  tableReducer,
  storeGroupReducer,
  dcStatusReducer,
  tenantConfigReducer,
  assortsmartReducer,
  plansmartReducer,
  inventorysmartReducer,
  tenantUserRoleMgmtReducer,
  sideBarReducer,
  homePageReducer,
  marksmartReducer,
  adaReducer,
  commentBarReducer,
  createGradeReducer,
  productMappingReducerService,
  storeMappingReducerService,
  dcMappingReducerService,
  clustersmartReducer,
  plansmartTenantConfig,
  smartBotReducer
});

const rootReducer = (state, action) => {
  if (action.type === LOGOUT_CURRENT_USER) {
    const { authReducer } = state;
    state = { authReducer };
  }
  return appReducer(state, action);
};

export default rootReducer;
