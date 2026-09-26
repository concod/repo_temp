import { combineReducers } from "redux";
import planningMetrics from "./planningMetrics";
import conditionalFormatting from "./conditionalFormatting";

const plansmartTenantConfig = combineReducers({
  planningMetrics,
  conditionalFormatting,
});

export default plansmartTenantConfig;
