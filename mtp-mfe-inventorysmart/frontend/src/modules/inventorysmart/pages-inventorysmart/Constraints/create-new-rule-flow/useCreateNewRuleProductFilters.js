import { useEffect, useState } from "react";
import { cloneDeep, isEmpty } from "lodash";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import {
  displaySnackMessages,
  fetchFilterOptions,
} from "../../inventorysmart-utility";
import { handleErrorMessage } from "../Rules-Constraints/add-rcl-component";
import {
  CREATE_NEW_RULE_FILTER_CONFIG_KEY,
  CREATE_NEW_RULE_FILTER_GROUP_LABEL,
  areMandatoryCreateRuleFiltersSatisfied,
  buildFilterFieldsFromSelectProductConfig,
  CONSTRAINTS_FILTER_SCREEN,
} from "./createNewRuleFilterUtils";

/**
 * Loads Select Product filter configuration and hydrates the cross-filter dashboard
 * for the Create new rule → Select Product step.
 */
export function useCreateNewRuleProductFilters({
  screenName,
  createRulesConfigs,
  inventorysmartScreenConfig,
  tenantFilterUamConfig,
  filterDashboardConfiguration,
  savedFilterSelection,
  productsLevelDataForBackFlow,
  selectedRclProductLevel,
  fetchSelectProductFilterConfig,
  setFilterConfig,
  setProductsLevelDataForBackFlow,
  dispatchSnack,
  onMandatorySatisfactionChange,
}) {
  const [loading, setLoading] = useState(true);
  const [filterFieldConfig, setFilterFieldConfig] = useState([]);
  const [filterDependency, setFilterDependency] = useState({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const selectProductFilterConfigRes =
          await fetchSelectProductFilterConfig(CONSTRAINTS_FILTER_SCREEN);
        if (cancelled) return;

        const raw = cloneDeep(selectProductFilterConfigRes?.data?.data || []);
        const countryProductField = raw.find(
          (item) => item.column_name === "country_product"
        );
        const countryExtra = countryProductField?.extra ?? null;

        const fields = buildFilterFieldsFromSelectProductConfig(
          raw,
          createRulesConfigs,
          countryExtra
        );
        setFilterFieldConfig(fields);
      } catch (err) {
        if (!cancelled) {
          handleErrorMessage(err, { addSnack: dispatchSnack });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [createRulesConfigs, fetchSelectProductFilterConfig, dispatchSnack]);

  useEffect(() => {
    if (typeof onMandatorySatisfactionChange !== "function") {
      return;
    }
    if (loading || isEmpty(filterFieldConfig)) {
      onMandatorySatisfactionChange(false);
      return;
    }
    onMandatorySatisfactionChange(
      areMandatoryCreateRuleFiltersSatisfied(
        filterFieldConfig,
        selectedRclProductLevel
      )
    );
  }, [
    loading,
    filterFieldConfig,
    selectedRclProductLevel,
    onMandatorySatisfactionChange,
  ]);

  useEffect(() => {
    if (isEmpty(filterFieldConfig)) {
      return;
    }
    const dashLen =
      filterDashboardConfiguration?.filterConfig?.[0]?.filterDashboardData
        ?.length;
    const hasBackFlowFilters =
      productsLevelDataForBackFlow?.filterConfig?.length > 0;
    const shouldLoadFilterValues =
      (isEmpty(filterDashboardConfiguration) && !isEmpty(filterFieldConfig)) ||
      hasBackFlowFilters ||
      dashLen !== filterFieldConfig.length;

    if (!shouldLoadFilterValues) {
      return;
    }

    const getFilterValues = async (selected) => {
      const isRedirectedFromDifferentStep = hasBackFlowFilters;
      const selectedFilters = isRedirectedFromDifferentStep
        ? cloneDeep(productsLevelDataForBackFlow.filterConfig)
        : selected || [];

      try {
        const requiredFilterObjParams = {
          allFilters: cloneDeep(filterFieldConfig),
          appliedFilters: selectedFilters,
          current: null,
          rolesBasedAccess: inventorysmartScreenConfig?.roleBasedAccess,
          screenName,
          tenantFilterUamConfig,
        };
        const response = await fetchFilterOptions(requiredFilterObjParams);
        if (response?.data?.show_message) {
          displaySnackMessages(response?.data?.message, "success", {
            addSnack: dispatchSnack,
          });
        }
        const filterConfigData = [
          {
            filterDashboardData: response,
            isCrossDimensionFilter: true,
            screen_name: screenName,
          },
        ];
        const filterConfig = formattedFilterConfiguration(
          CREATE_NEW_RULE_FILTER_CONFIG_KEY,
          filterConfigData,
          CREATE_NEW_RULE_FILTER_GROUP_LABEL
        );
        if (isRedirectedFromDifferentStep) {
          const formattedSelectedFilters = formatSelectedFiltersData(
            filterConfigData,
            CREATE_NEW_RULE_FILTER_GROUP_LABEL,
            selectedFilters
          );
          setFilterDependency(formattedSelectedFilters);
          setProductsLevelDataForBackFlow({
            ...productsLevelDataForBackFlow,
            filterConfig: [],
          });
        }
        setFilterConfig(filterConfig);
      } catch (err) {
        handleErrorMessage(err, { addSnack: dispatchSnack });
      }
    };
    getFilterValues(savedFilterSelection);
  }, [
    filterFieldConfig,
    filterDashboardConfiguration,
    productsLevelDataForBackFlow?.filterConfig,
    productsLevelDataForBackFlow,
    inventorysmartScreenConfig?.roleBasedAccess,
    screenName,
    tenantFilterUamConfig,
    savedFilterSelection,
    setFilterConfig,
    dispatchSnack,
    setProductsLevelDataForBackFlow,
  ]);

  return {
    loading,
    filterFieldConfig,
    filterDependency,
  };
}
