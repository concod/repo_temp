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
import { tenantUserRoleMgmtReducer } from "core/pages/tenant-config/access-user-management/services/TenantManagement/combinedService";
import { LOGOUT_CURRENT_USER } from "../actions/types";
import productMappingReducerService from "core/pages/product-mapping/services-product-mapping/productMappingService";
import storeMappingReducerService from "core/pages/storeMapping/services/storeMappingService";
import dcMappingReducerService from "core/pages/dcmapping/services-dc-mapping/dc-mapping-service";
import plansmartTenantConfig from "./tenantConfigService";
import configuratorReducer from "./configuratorReducer";
import smartBotReducer from "./smartBotReducer";
import jsonParserReducer from "./jsonParserReducer";
import tableViewConfigurationReducer from "core/Utils/agGrid/table-view/table-view-panel-service";
import commonChatReducer from "core/commonComponents/ChatSystem/services-chatsystem/custom-services-chat-system";
import cellCommentReducer from "core/Utils/agGrid/cellComment/cell-comment-services";
import notificationReducerSlice from "core/commonComponents/Notification/notification-services/notification-services";

const rootReducer = {
  adminReducer,
  authReducer,
  layoutReducer,
  loaderReducer,
  filterReducer,
  tenantReducer,
  notificationReducer,
  workflowReducer,
  snackbarReducer,
  filterElementsReducer,
  UnitDefnReducer,
  eventConfigurationReducer,
  productGroupReducer,
  productStatusReducer,
  tableReducer,
  storeGroupReducer,
  dcStatusReducer,
  tenantConfigReducer,
  tenantUserRoleMgmtReducer,
  sideBarReducer,
  homePageReducer,
  commentBarReducer,
  createGradeReducer,
  productMappingReducerService,
  storeMappingReducerService,
  dcMappingReducerService,
  plansmartTenantConfig,
  configuratorReducer,
  jsonParserReducer,
  tableViewConfigurationReducer,
  commonChatReducer,
  smartBotReducer,
  cellCommentReducer,
  notificationReducerSlice,
};

export default rootReducer;
