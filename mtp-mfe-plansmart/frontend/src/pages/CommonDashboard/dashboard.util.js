import {
  DEPARTMENT,
  FORM_FIELDS,
  CLASS,
  PLANS_LIST_COLUMN_API_URL,
  PLANS_LIST_TABLE_API_URL,
  TARGET_PLANS_LIST_COLUMN_API_URL,
  TARGET_PLANS_LIST_TABLE_API_URL,
  DASHBOARD_PAGES,
  PLANS_LIST_STATUS_FILTER_PAYLOAD
} from "./dashboard.constant";
import PlansTable from "./components/PlansList/PlansTable";
import { getDashboardTableData } from "./dashboard.api";
import { setFilterLoader } from "./dashboard.slice";
import { FILTER_CONFIG_URL as FILTER_CONFIG_URL_PRESEASON } from "./pages/PreSeason/preSeason.constant";
import { FILTER_CONFIG_URL as FILTER_CONFIG_URL_INSEASON } from "./pages/InSeason/inSeason.constant";

const resetFilter = () => {
  const location = window.location;
  const selectedScreenName = location?.pathname.split("/")[2];
  setFilterLoader(true);
  getDashboardTableData(selectedScreenName);
};

export const preSeasonTabsData = [
  {
    label: "Active Plan",
    id: "planSmart-dashboard-active",
    TabPanel: (
      <PlansTable
        statusFilterPayload={PLANS_LIST_STATUS_FILTER_PAYLOAD.activePlan}
        selectedScreenName={DASHBOARD_PAGES.PRE_SEASON}
        filterConfigUrl={FILTER_CONFIG_URL_PRESEASON}
        resetFilter={resetFilter}
      />
    )
  },
  {
    label: "Scenario Plan",
    id: "planSmart-dashboard-scenario",
    TabPanel: (
      <PlansTable
        statusFilterPayload={PLANS_LIST_STATUS_FILTER_PAYLOAD.scenarioPlan}
        selectedScreenName={DASHBOARD_PAGES.PRE_SEASON}
        filterConfigUrl={FILTER_CONFIG_URL_PRESEASON}
        resetFilter={resetFilter}
      />
    )
  }
];

export const inSeasonTabsData = [
  {
    label: "Active Forecast",
    id: "planSmart-dashboard-active",
    TabPanel: (
      <PlansTable
        statusFilterPayload={PLANS_LIST_STATUS_FILTER_PAYLOAD.activeForecast}
        selectedScreenName={DASHBOARD_PAGES.IN_SEASON}
        filterConfigUrl={FILTER_CONFIG_URL_INSEASON}
        resetFilter={resetFilter}
      />
    )
  },
  {
    label: "Scenario Forecast",
    id: "planSmart-dashboard-scenario",
    TabPanel: (
      <PlansTable
        statusFilterPayload={PLANS_LIST_STATUS_FILTER_PAYLOAD.scenarioForecast}
        selectedScreenName={DASHBOARD_PAGES.IN_SEASON}
        filterConfigUrl={FILTER_CONFIG_URL_INSEASON}
        resetFilter={resetFilter}
      />
    )
  }
];

/**
 * Converts filter object into a list of filter schemas.
 * @param {Object} filters - Object containing various filter options.
 * @returns {Array<Object>} List of filter schemas.
 * @description
 *   - Skips filters with keys 'class_options' or 'department_options'.
 *   - Converts single non-array filter values to arrays.
 */
export const transformFilterPayload = (filters) => {
  const filtersList = [];
  for (const filter in filters) {
    const filterSchema = {
      attribute_name: "",
      operator: "in",
      filter_type: "cascaded",
      values: []
    };

    if (["class_options", "department_options"].indexOf(filter) === -1) {
      if (filter === CLASS) {
        filterSchema.attribute_name = FORM_FIELDS.L0_NAME;
      } else if (filter === DEPARTMENT) {
        filterSchema.attribute_name = FORM_FIELDS.L1_NAME;
      } else {
        filterSchema.attribute_name = filter;
      }
      if (!Array.isArray(filters[filter])) {
        filterSchema.values = [filters[filter].toString()];
      } else {
        filterSchema.values = filters[filter];
      }

      filtersList.push(filterSchema);
    }
  }
  return filtersList;
};

/**
 * Determines the API URL based on the given screen name.
 * @param {string} screenName - The name of the screen.
 * @returns {string} URL of the appropriate API endpoint.
 * @description
 *   - Uses a ternary operator to select the API URL.
 */
export const getTableConfigUrl = (screenName) => {
  return screenName === DASHBOARD_PAGES.TARGET_PLAN
    ? TARGET_PLANS_LIST_COLUMN_API_URL
    : PLANS_LIST_COLUMN_API_URL;
};
