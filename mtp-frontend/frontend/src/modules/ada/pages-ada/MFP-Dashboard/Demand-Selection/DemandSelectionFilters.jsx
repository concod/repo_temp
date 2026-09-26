import React, { useEffect, useState } from "react";
import { cloneDeep, isEmpty } from "lodash";
import { useSelector } from "react-redux";

import FilterGroup from "core/commonComponents/filters/filterGroup";
import { formattedTenantFilterConfig } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import { fetchCrossFilterOptions } from "modules/ada/utils-ada/utilityFunctions";

const DemandSelectionFilters = ({
  activeKey,
  //   id,
  setChartLoader,
  fetchChartData,
  //setSelectedGraphFilters,
  setFilterApplied,
  setLoader
}) => {
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const [filterData, setFilterData] = useState([]);
  const [inititalSelection, setInititalSelection] = useState([]);

  // To fetch eligible SKU's

  const getSelectedProductStoreFilters = (adaReducer, selectedFilterId) => {
    const clonedReducer = cloneDeep(adaReducer);
    var selectedPayload;
    if (selectedFilterId?.length !== 0) {
      selectedPayload = [
        ...(clonedReducer.product || []),
        ...(clonedReducer.store || []),
      ];
    } else {
      selectedPayload = [...(clonedReducer.product || [])];
    }

    return selectedPayload;
  };

  const getFormattedFilters = (adaReducer, selected) => {
    const clonedReducer = cloneDeep(adaReducer);

    let selectedFilterId = selected.map((el) => el?.filter_id);

    for (let item of selectedFilterId) {
      let productIndex = clonedReducer.product?.findIndex(
        (elem) => elem?.filter_id === item
      );

      if (productIndex > -1) {
        clonedReducer.product.splice(productIndex, 1);
      }

      let storeIndex = clonedReducer.store?.findIndex(
        (elem) => elem?.filter_id === item
      );

      if (storeIndex > -1) {
        clonedReducer.store.splice(storeIndex, 1);
      }
    }
    let selectedProductStoreFilters = getSelectedProductStoreFilters(
      clonedReducer,
      selectedFilterId
    );
    let selectedPayload = [...selectedProductStoreFilters, ...selected];

    return selectedPayload;
  };

  const formattedFilterConfigDemand = (
    tenantFilters = {},
    aggLevelCount = 3
  ) => {
    let clonedTenantFilters = cloneDeep(tenantFilters);
    let keys = ["l0"];

    if (aggLevelCount === 2) {
      keys.pop();
    }
    const filtersInTenantOrder = [];

    keys?.forEach((key) => {
      filtersInTenantOrder.push({
        ...clonedTenantFilters?.[key],
        is_clearable: true,
      });
    });

    return filtersInTenantOrder;
  };

  const fetchTenantFilters = async (selected, key) => {
    try {
      //setChartLoader((prevState) => prevState + 1);

      // Merged top level filters & visualization filters
      let selectedPayload = getFormattedFilters(adaReducer, selected);
      let filterDemand = {
        l0: {
          column_name: "channel",
          dimension: "store",
          display_name: "channel",
          level_desc: "channel",
          level_desc_display_name: "channel",
        },
      };
      //  Contains all the tenant filter config
      const formattedTenantFilters = formattedFilterConfigDemand(
        filterDemand,
        adaReducer?.clientConfig?.attribute_value?.aggLevelCount
      );

      let filterResponse = await fetchCrossFilterOptions(
        formattedTenantFilters,
        selectedPayload,
        "ada-visual",
        { application_code: 11 }
      );
      if (!inititalSelection?.length) {
        setInititalSelection(selectedPayload);
      } else {
        // on initial mount of component, there is no selection in visualization
        // so, we are only fetching chart data from this fn when selection is there

        fetchChartData(selectedPayload);
      }
      setFilterData(cloneDeep(filterResponse));
    } catch (error) {
      // errorHandler(dispatch, error);
    } finally {
    }
  };

  const update = (selected, key) => {
    setLoader(true);
    fetchTenantFilters(selected, key);
  };

  useEffect(() => {
    if (isEmpty(adaReducer?.tenantFilters) || !activeKey) {
      return;
    }
    let selected = getSelectedProductStoreFilters(adaReducer);
    fetchTenantFilters(selected);
  }, [activeKey, adaReducer?.tenantFilters]);

  return (
    <FilterGroup
      inititalSelection={inititalSelection}
      filters={filterData}
      update={update}
      customFilter
      screen="ada-chart"
      doNotUpdateDefaultValue
    />
  );
};

export default DemandSelectionFilters;
