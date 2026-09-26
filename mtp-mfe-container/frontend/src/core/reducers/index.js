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
import productGroupReducer from "core/pages/product-grouping/product-grouping-service";
import tableReducer from "./tableReducer";
import storeGroupReducer from "core/pages/store-grouping/services-store-grouping/custom-store-group-service";
import eventConfigurationReducer from "./eventConfigReducer";
import tenantConfigReducer from "./tenantConfigReducer";
import sideBarReducer from "./sideBarReducer";
import homePageReducer from "./homePageReducer";
import commentBarReducer from "./commentBarReducer";
import { tenantUserRoleMgmtReducer } from "core/pages/tenant-config/access-user-management/services/TenantManagement/combinedService";
import { LOGOUT_CURRENT_USER } from "../actions/types";
import plansmartTenantConfig from "./tenantConfigService";
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
  eventConfigurationReducer,
  productGroupReducer,
  tableReducer,
  storeGroupReducer,
  tenantConfigReducer,
  tenantUserRoleMgmtReducer,
  sideBarReducer,
  homePageReducer,
  commentBarReducer,
  plansmartTenantConfig,
  jsonParserReducer,
  tableViewConfigurationReducer,
  commonChatReducer,
  smartBotReducer,
  cellCommentReducer,
  notificationReducerSlice,
};

export default rootReducer;
