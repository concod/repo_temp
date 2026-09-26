import { combineReducers } from "redux";
import userRoleManagementReducer from "./User-Role-Management/user-role-management-service";
import userManagementReducer from "./User-Management/user-management-service";

export const tenantUserRoleMgmtReducer = combineReducers({
  userRoleManagementReducer,
  userManagementReducer,
});
