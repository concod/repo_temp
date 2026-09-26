import React, { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom-v5-compat";
import { cloneDeep, isEmpty } from "lodash";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import globalStyles from "core/Styles/globalStyles";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import {
  setFilterConfiguration,
  setSelectedFilters as setSelectedFiltersCoreReducer,
  setIsFilterApplied,
} from "core/actions/filterAction";
import {  useTranslation } from "impact-ui-v3";
import { addSnack } from "core/actions/snackbarActions";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
  handleErrorMessage,
} from "../inventorysmart-utility";
import { AUTO_ALLOCATION_RECOMMENDATION } from "../../constants-inventorysmart/routesConstants";
import AllocationPreviewTable from "../Create-Allocation/components/AllocationPreviewTable";

const FILTER_CONFIG_KEY = "autoAllocationRecommendationFilterConfig";
const SCREEN_NAME = "Allocation";
const ALERT_ARTICLE_ATTRIBUTE = "article";

const safeJsonParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (e) {
    console.error(e);
    return fallback;
  }
};

// Reads the dashboard filter configuration, selected filters and selected alert
// article(s) persisted in localStorage by the alerts redirection flow
// (proceedWithRedirection / redirectToScreen). Mirrors the Create Allocation
// flow, which seeds its filter panel from `createAllocationFilterDetails` and
// `selectedFiltersCreateAllocation`. Gated on the `type=alerts` query param
// (kept in the URL) so it re-seeds idempotently across re-mounts and ignores
// stale localStorage on a normal (non-alert) visit.
const getAlertRedirectionData = () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("type") !== "alerts") {
    return {
      filterDetails: null,
      selectedFilters: null,
      alertFilters: [],
      articleIds: [],
    };
  }
  const filterDetails = safeJsonParse(
    localStorage.getItem("createAllocationFilterDetails"),
    null
  );
  const selectedFilters = safeJsonParse(
    localStorage.getItem("selectedFiltersCreateAllocation"),
    null
  );
  const articleIds = safeJsonParse(
    localStorage.getItem("selectedArticles"),
    []
  );
  const alertFilters = filterDetails?.appliedFilterData?.dependencyData || [];
  return { filterDetails, selectedFilters, alertFilters, articleIds };
};

const AutoAllocationRecommendation = (props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const globalClasses = globalStyles();

  const [filters, setFilters] = useState([]);
  const [filterValuesOnRender, setFilterValuesOnRender] = useState([]);

  // Dashboard filters + selected article(s) forwarded from the alerts screen
  const { filterDetails, selectedFilters, alertFilters, articleIds } = useMemo(
    () => getAlertRedirectionData(),
    []
  );
  const isAlertRedirection = !isEmpty(filterDetails) || !isEmpty(articleIds);

  // Article filter injected into all three recommendation API payloads
  const articleFilter = useMemo(() => {
    if (isEmpty(articleIds)) return null;
    return {
      attribute_name: ALERT_ARTICLE_ATTRIBUTE,
      filter_id: ALERT_ARTICLE_ATTRIBUTE,
      filter_type: "cascaded",
      values: articleIds,
      dimension: "product",
      operator: "in",
    };
  }, [articleIds]);

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        const response = await fetchFilterConfig("Allocation");
        setFilters(response);
      } catch (error) {
        handleErrorMessage(error, props);
      }
    };
    getInitialFilterConfiguration();
  }, []);

  useEffect(() => {
    // For a normal (non-alert) visit, load the user's saved filter selection.
    // Alert redirections seed the panel directly from localStorage below.
    if (
      !isAlertRedirection &&
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(filters)
    ) {
      getFilterValues(props.savedFilterSelection);
    }
  }, [filters, props.savedFilterSelection]);

  // When navigating from an alert, seed the filter panel (config + selected
  // filters) directly from the dashboard state persisted in localStorage, and
  // render the tables immediately with the dashboard filters so the user does
  // not have to re-apply them. Mirrors the Create Allocation flow. The selected
  // article is injected separately via the articleFilter prop. Consumed keys
  // are cleared so a later normal visit starts clean.
  useEffect(() => {
    if (isAlertRedirection) {
      if (!isEmpty(filterDetails)) {
        props.setFilterConfiguration({ [FILTER_CONFIG_KEY]: filterDetails });
      }
      if (!isEmpty(selectedFilters)) {
        props.setSelectedFiltersCoreReducer(selectedFilters);
      }
      // CoreComponentScreen renders its children only when the global filter
      // applied flag is set AND the config has applied dependency data.
      if (!isEmpty(alertFilters)) {
        props.setIsFilterApplied(true);
      }
      setFilterValuesOnRender(cloneDeep(alertFilters || []));
    }
  }, []);

  const getFilterValues = async (selected, current) => {
    try {
      const requiredFilterObjParams = {
        allFilters: cloneDeep(filters),
        appliedFilters: selected,
        current,
        rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
        screenName: SCREEN_NAME,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);
      const filterConfigData = [
        {
          filterDashboardData: response,
          expectedFilterDimensions: getFilterDimensions(response),
          isCrossDimensionFilter: true,
          screen_name: SCREEN_NAME,
          saved_filter_screen_name: "Allocation",
        },
      ];
      const filterConfig = formattedFilterConfiguration(
        FILTER_CONFIG_KEY,
        filterConfigData,
        SCREEN_NAME
      );
      props.setFilterConfiguration(filterConfig);
    } catch (err) {
      handleErrorMessage(err, props);
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    const payload = filtersPayload(filterData, dependencyData, true);
    setFilterValuesOnRender(payload.reqBody);
  };

  return (
    <div className={globalClasses.paddingAroundNew}>
      <CoreComponentScreen
        headerBreadCrumb={
          <HeaderBreadCrumbs
            options={[
              {
                label: t("inventorysmart.home"),
                to: "/home",
              },
              {
                label: t("inventorysmart.autoAllocationRecommendation"),
                id: 1,
                action: () => {
                  navigate(AUTO_ALLOCATION_RECOMMENDATION);
                },
              },
            ]}
          />
        }
        showFilterDashboard={true}
        filterConfigKey={FILTER_CONFIG_KEY}
        onApplyFilter={(dependencyData, filterData) =>
          onFilterDashboardClick(dependencyData, filterData)
        }
        showChipsOnLoad={true}
        // When redirected from an alert, pre-apply the dashboard filters:
        // disable the saved-default-filter auto-apply (which otherwise
        // overrides/errors), seed the applied filter dependency and render the
        // table directly. Mirrors the Create Allocation redirection flow.
        autoApplyEnabled={!isAlertRedirection}
        disableFilters={isAlertRedirection}
        filterDependency={isAlertRedirection ? selectedFilters : undefined}
      >
        {(filterValuesOnRender.length > 0 || articleFilter) && (
          <AllocationPreviewTable
            filterConfig={filters}
            selectedFilters={filterValuesOnRender}
            articleFilter={articleFilter}
          />
        )}
      </CoreComponentScreen>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[FILTER_CONFIG_KEY],
    savedFilterSelection: filterReducer.savedFilterSelection,
    inventorysmartScreenConfig:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  setSelectedFiltersCoreReducer: (payload) =>
    dispatch(setSelectedFiltersCoreReducer(payload)),
  setIsFilterApplied: (payload) => dispatch(setIsFilterApplied(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AutoAllocationRecommendation);
