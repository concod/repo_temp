import { cloneDeep } from "lodash";
import { loadCreateNewRuleFlowSession } from "./createNewRuleFlowSession";

export const CREATE_NEW_RULE_RCL_CODE = 5242;

// /** Create new rule always uses Inventory Smart constraints APIs (not OMS / DC Store). */
// export const CREATE_NEW_RULE_IS_CONSTRAINTS_FLOW = true;
// export const CREATE_NEW_RULE_IS_OMS_CONSTRAINTS_FLOW = false;

// export const getPoStrategyFlowFromSession = () => {
//   try {
//     return JSON.parse(sessionStorage.getItem("is_po_strategy_flow")) || false;
//   } catch (error) {
//     return false;
//   }
// };

// // URL/API routing flags for RCL APIs in the Create New Rule flow (may need in future)
// export const getCreateNewRuleApiFlowFlags = (location) => ({
//   isConstraintsFlow: CREATE_NEW_RULE_IS_CONSTRAINTS_FLOW,
//   isOMSConstraintsFlow: CREATE_NEW_RULE_IS_OMS_CONSTRAINTS_FLOW,
//   isDCNetworkFlow: Boolean(location?.state?.redirectedFromNetworkTab),
//   isPoStrategyFlow: getPoStrategyFlowFromSession(),
// });

export const resolveConstraintFilters = ({
  selectedRclProductLevel,
  defaultFilters,
}) => {
  let filters = cloneDeep(selectedRclProductLevel || []);
  if (!filters.length) {
    const session = loadCreateNewRuleFlowSession();
    if (session?.filters?.length) {
      filters = cloneDeep(session.filters);
    }
  }
  if (defaultFilters?.length) {
    filters = [...filters, ...defaultFilters];
  }
  return filters;
};
