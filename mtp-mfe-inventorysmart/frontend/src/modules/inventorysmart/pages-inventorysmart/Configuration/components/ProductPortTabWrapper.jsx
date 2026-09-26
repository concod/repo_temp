import React, { useEffect, useState, useRef } from "react";
import { cloneDeep, isEmpty } from "lodash";
import ProductPortMapping from "modules/inventorysmart/pages-inventorysmart/Product-Mapping/components/product-port-mapping";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import {
  IS_OVERRIDEN_CORE_BUTTON_WIDTH,
  IS_OVERRIDEN_CORE_BUTTON_PLACEMENT,
} from "core/constants";

/**
 * Wrapper component for Product-Port Mapping tab
 * This component handles filters, modify mapping, and all necessary state management
 * for the ProductPortMapping component
 */
const ProductPortTabWrapper = (props) => {
  const [filtersSelection, setFiltersSelection] = useState([]);
  const [flagEdit, setFlagEdit] = useState(false);
  const filterDependencyRef = useRef([]);
  const type = new URLSearchParams(window.location.search).get("type");
  const isRedirectedFromDifferentPage =
    type && props?.productMappingFilterDependency?.length > 0;

  // Load filters on mount
  useEffect(() => {
    loadFilters();
    // Handle filter dependencies from redirect
    if (
      isRedirectedFromDifferentPage &&
      props.productMappingFilterDependency?.length > 0
    ) {
      const dependencyList = dependencyStructure(
        props.productMappingFilterDependency
      );
      filterDependencyRef.current = dependencyList;
      setFiltersSelection(cloneDeep(dependencyList));
    }
  }, []);

  useEffect(() => {
    return () => {
      props.setNoOfButtonsNextToTab?.(undefined);
    };
  }, []);

  useEffect(() => {
    const hasFiltersApplied = Boolean(
      (filterDependencyRef.current?.length > 0) || 
      (props.productMappingFilterDependency?.length > 0)
    );
    props.setNoOfButtonsNextToTab?.(hasFiltersApplied ? 1 : undefined);
  }, [filterDependencyRef.current, props.productMappingFilterDependency]);

  /**
   * Convert filter dependency structure from redirect format to internal format
   */
  const dependencyStructure = (dependencyList) => {
    return dependencyList.map((item) => {
      return {
        attribute_name: item.filter_id,
        operator: "in",
        values: Array.isArray(item.values)
          ? item.values.map((opt) => opt.value)
          : item.values,
        filter_type: item.filter_type,
      };
    });
  };

  /**
   * Load dashboard filters for Product-Port mapping
   */
  const loadFilters = async () => {
    const response = await fetchFilterFieldValues(
      "Product-Port Mapping",
      props.savedFilterSelection,
      props.screenName
    );
    if (isEmpty(props.productPortMappingFilterDashboardConfiguration)) {
      let filterConfigData = [
        {
          filterDashboardData: response,
          isCrossDimensionFilter: false,
          screen_name: props.screenName,
        },
      ];
      const filterConfig = formattedFilterConfiguration(
        "productMappingFilterConfiguration",
        filterConfigData,
        "Product Mapping"
      );
      props.setFilterConfiguration(filterConfig);
    }
  };

  /**
   * Handle filter application from CoreComponentScreen
   */
  const onFilterDashboardClick = (dependencyData) => {
    filterDependencyRef.current = dependencyData;
    setFiltersSelection(cloneDeep(dependencyData));
  };

  /**
   * Update flag edit state (used for unsaved changes prompt)
   */
  const updateFlagEdit = (flag) => {
    setFlagEdit(flag);
  };

  return (
    <div style={{ marginTop: IS_OVERRIDEN_CORE_BUTTON_PLACEMENT }}>
      <CoreComponentScreen
        IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        showFilterDashboard={true}
        filterConfigKey="productMappingFilterConfiguration"
        onApplyFilter={onFilterDashboardClick}
        customDependencyValue={{ addFilterExclusions: false }}
        autoHideFilterButton={true}
      >
        <ProductPortMapping
          filtersSelection={filtersSelection}
          ref={filterDependencyRef}
          selectedProductMappingArticles={props.selectedProductMappingArticles}
          isRedirectedFromDifferentPage={isRedirectedFromDifferentPage}
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
          updateFlagEdit={updateFlagEdit}
          handleErrorMessage={props.handleErrorMessage}
        />
      </CoreComponentScreen>
    </div>
  );
};

export default ProductPortTabWrapper;
