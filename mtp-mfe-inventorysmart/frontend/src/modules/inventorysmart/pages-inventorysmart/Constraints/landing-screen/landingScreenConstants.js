import { CONSTRAINTS } from "modules/inventorysmart/constants-inventorysmart/routesConstants";

export const LANDING_SCREEN_TAB = {
  RULE_GROUPS: "rule_groups",
  ALL_RULES: "all_rules",
  EXCEPTIONS: "exceptions",
  RULE_RESOLUTION: "rule_resolution",
};

export const isConstraintsLandingPath = (pathname = "") =>
  pathname === CONSTRAINTS;

export const LANDING_SCREEN_TABS = [
  { label: "Rule Groups", value: LANDING_SCREEN_TAB.RULE_GROUPS },
  { label: "All Rules", value: LANDING_SCREEN_TAB.ALL_RULES },
  { label: "Exceptions", value: LANDING_SCREEN_TAB.EXCEPTIONS },
  { label: "Rule Resolution", value: LANDING_SCREEN_TAB.RULE_RESOLUTION },
];

/** Page-level empty state when rule-groups summary `All` count is 0. */
export const RULE_GROUPS_EMPTY_STATE = {
  heading: "No Rule Groups Yet",
  description:
    'Go to All rules > Select Rule(s) > "Create New Group" to create your first group.',
};

const isValidLandingTab = (tab) =>
  LANDING_SCREEN_TABS.some((item) => item.value === tab);

/** Rule Groups by default. Child flows restore a tab via `location.state.preselectedTab`. */
export function resolveLandingScreenTab(location) {
  const fromRouteState = location?.state?.preselectedTab;
  if (isValidLandingTab(fromRouteState)) {
    return fromRouteState;
  }
  return LANDING_SCREEN_TAB.RULE_GROUPS;
}
