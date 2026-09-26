import React, { useEffect, useState } from "react";
import { cloneDeep, isEmpty } from "lodash";
import { useSelector } from "react-redux";

import FilterGroup from "core/commonComponents/filters/filterGroup";
import { formattedTenantFilterConfig } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import {
  fetchCrossFilterOptions,
  getEligibleSKU,
  getFormattedChartFilters,
  getSelectedProductStoreFilters,
} from "modules/ada/utils-ada/utilityFunctions";

const ChartFilters = ({
  activeKey,
  id,
  setChartLoader,
  fetchChartData,
  setSelectedGraphFilters,
  setFilterApplied,
}) => {
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const [filterData, setFilterData] = useState([]);
  const [inititalSelection, setInititalSelection] = useState([]);

  // To fetch eligible SKU's
  const fetchTenantFilters = async (selected, key) => {
    try {
      setChartLoader((prevState) => prevState + 1);

      // Merged top level filters & visualization filters
      let selectedPayload = getFormattedChartFilters(adaReducer, selected);

      if (
        adaReducer?.clientConfig?.attribute_value?.custom_product_store_group
      ) {
        selectedPayload = selectedPayload?.filter(
          (elem) => elem?.filter_name !== "product_code"
        );

        selectedPayload = selectedPayload?.filter(
          (elem) => elem?.filter_name !== "store_code"
        );
      }

      //  Contains all the tenant filter config
      const formattedTenantFilters = formattedTenantFilterConfig(
        adaReducer?.tenantFilters?.visualization_filters,
        adaReducer?.clientConfig?.attribute_value?.aggLevelCount
      );

      let filterResponse = await fetchCrossFilterOptions(
        formattedTenantFilters,
        selectedPayload,
        "ada-visual",
        { application_code: 11 }
      );

      // Handling Product Sku filter
      // let skuData = filterResponse?.find(
      //   ({ column_name }) => column_name === "product_code"
      // );

      // if (skuData) {
      //   let skuDataFilter = selected?.find(
      //     ({ filter_id }) => filter_id === "product_code"
      //   );

      //   // When redirected from Alerts, the dropdown should show only the SKU(s) selected by the user.
      //   if (adaReducer?.isRedirectedFromInventory) {
      //     //If the user has deselected all options
      //     if (skuDataFilter === undefined) {
      //       let redirectedFilters = getSelectedProductStoreFilters(adaReducer);
      //       skuDataFilter = redirectedFilters?.find(
      //         ({ filter_id }) => filter_id === "product_code"
      //       );
      //       skuData.initialData = skuDataFilter;
      //     }

      //     let selectedValues = skuDataFilter?.values?.map(
      //       (filter) => filter.value
      //     );
      //     let checkConfiguration = [{ checkedRows: selectedValues }];
      //     skuDataFilter["check_configuration"] = checkConfiguration;
      //   }

      //   //When user clicks on SelectAll option from DropDown
      //   if (
      //     skuDataFilter &&
      //     !skuDataFilter?.check_configuration[0]?.checkedRows
      //   ) {
      //     let selectedValues = skuDataFilter?.values?.map(
      //       (filter) => filter.value
      //     );
      //     let checkConfiguration = [{ checkedRows: selectedValues }];
      //     skuDataFilter["check_configuration"] = checkConfiguration;
      //   }

      //   let skuDataCheckConfig = skuDataFilter?.check_configuration;

      //   const skuResponse = await getEligibleSKU(
      //     adaReducer,
      //     cloneDeep(filterResponse),
      //     id,
      //     skuDataCheckConfig
      //   );
      //   skuData.initialData = skuResponse;
      // }
      setSelectedGraphFilters(selectedPayload);

      // on component mount, preselect top level filters
      if (!inititalSelection?.length) {
        setInititalSelection(selectedPayload);
      } else {
        // on initial mount of component, there is no selection in visualization
        // so, we are only fetching chart data from this fn when selection is there
        fetchChartData(selectedPayload);
      }

      setFilterData(cloneDeep(filterResponse));
    } catch (error) {
      console.log("Error in Fetching Chart filters", error);
    } finally {
      setChartLoader((prevState) => prevState - 1);
    }
  };

  const update = (selected, key) => {
    setFilterApplied(true);
    fetchTenantFilters(selected, key);
  };

  useEffect(() => {
    if (
      isEmpty(adaReducer?.tenantFilters?.visualization_filters) ||
      !adaReducer?.isFiltersValid
    ) {
      return;
    }
    const selectedFilters = getSelectedProductStoreFilters(adaReducer);
    fetchTenantFilters(selectedFilters);
  }, [JSON.stringify(adaReducer?.tenantFilters), adaReducer?.isFiltersValid]);

  return (
    <FilterGroup
      inititalSelection={inititalSelection}
      handleResetFlag={true}
      key={activeKey}
      filters={filterData}
      update={update}
      customFilter
      screen="ada-chart"
      doNotUpdateDefaultValue
    />
  );
};

export default ChartFilters;
