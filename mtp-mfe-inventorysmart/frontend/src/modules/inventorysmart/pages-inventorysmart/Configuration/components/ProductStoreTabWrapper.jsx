import React, { useEffect, useState, useRef } from "react";
import { cloneDeep, isEmpty } from "lodash";
import ProductStoreBand from "modules/inventorysmart/pages-inventorysmart/Product-Mapping/components/product-store-band";
import ModifyMappings from "modules/inventorysmart/pages-inventorysmart/Product-Mapping/components/modify-mapping";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
  isFilterAccessRestricted,
} from "core/commonComponents/coreComponentScreen/utils";
import { fetchDynamicConfigFromTenantReducer } from "core/Utils/DynamicLabels";
import {
  IS_OVERRIDEN_CORE_BUTTON_WIDTH,
  IS_OVERRIDEN_CORE_BUTTON_PLACEMENT,
} from "core/constants";

/**
 * Wrapper component for Product-Store tab (moved from level 3 to level 2)
 * This component handles filters, modify mapping, and all necessary state management
 * for the ProductStoreBand component
 */
const ProductStoreTabWrapper = (props) => {
  const [modifyMapping, setModifyMapping] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectAllDependency, setSelectAllDependency] = useState(null);
  const [selectAll, setSelectAll] = useState(false);
  const [storeBandFilterSelection, setStoreBandFilterSelection] = useState([]);
  const [disableBandActionButtons, setDisableBandActionButtons] = useState(
    false
  );
  const storeDepRef = useRef([]);
  const type = new URLSearchParams(window.location.search).get("type");
  const isRedirectedFromDifferentPage =
    type && props?.productMappingFilterDependency?.length > 0;

  const isPsMappingUseRuleListFlow =
    props.inventorysmartScreenConfig?.inventorysmart_configuration
      ?.ps_mapping_use_rules_list_flow === false;

  // Load filters on mount
  useEffect(() => {
    isPsMappingUseRuleListFlow ? null : loadStoreBandFilters();
    updateStoreBandFilterBasedAccess();
    // Handle filter dependencies from redirect
    if (
      isRedirectedFromDifferentPage &&
      props.productMappingFilterDependency?.length > 0
    ) {
      const dependencyList = dependencyStructure(
        props.productMappingFilterDependency
      );
      storeDepRef.current = dependencyList;
      setStoreBandFilterSelection(cloneDeep(dependencyList));
      updateStoreBandFilterBasedAccess(dependencyList, true);
    }
  }, []);

  useEffect(() => {
    return () => {
      props.setNoOfButtonsNextToTab?.(undefined);
    };
  }, []);

  useEffect(() => {
    const hasFiltersApplied = Boolean(
      (storeDepRef.current?.length > 0) || 
      (props.productMappingFilterDependency?.length > 0)
    );
    props.setNoOfButtonsNextToTab?.(hasFiltersApplied ? 1 : undefined);
  }, [storeDepRef.current, props.productMappingFilterDependency]);

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
   * Load dashboard filters for Product-Store mapping
   */
  const loadStoreBandFilters = async () => {
    const response = await fetchFilterFieldValues(
      "ps mapping rules list",
      props.savedFilterSelection,
      props.screenName
    );
    if (isEmpty(props.producMappingRulesFilterConfiguration)) {
      let filterConfigData = [
        {
          filterDashboardData: response,
          isCrossDimensionFilter: false,
          screen_name: props.screenName,
        },
      ];
      if (sessionStorage.getItem("currentApp") === "inventorysmart") {
        filterConfigData[0]["saved_filter_screen_name"] =
          "Inventorysmart Product Mapping";
      }
      const filterConfig = formattedFilterConfiguration(
        "producMappingRulesFilterConfiguration",
        filterConfigData,
        "Product Mapping"
      );
      props.setFilterConfiguration(filterConfig);
    }
  };

  /**
   * Update action button disable state based on filter access restrictions
   */
  const updateStoreBandFilterBasedAccess = (
    dependencyList = [],
    filterCheck = false
  ) => {
    const filterBasedAccessList = fetchDynamicConfigFromTenantReducer(
      "core",
      "mapping_no_edit_access"
    );
    if (filterBasedAccessList) {
      const isFilterBasedAccessRestricted = filterCheck
        ? isFilterAccessRestricted(filterBasedAccessList, dependencyList)
        : true;
      setDisableBandActionButtons(isFilterBasedAccessRestricted);
    }
  };

  /**
   * Handle filter application from CoreComponentScreen
   */
  const onStoreBandFilterDashboardClick = (dependencyData) => {
    storeDepRef.current = dependencyData;
    setStoreBandFilterSelection(cloneDeep(dependencyData));
    updateStoreBandFilterBasedAccess(dependencyData, true);
  };

  /**
   * Toggle modify mapping modal for selected products
   */
  const toggleModifyMapping = async (data, metaPayload) => {
    setSelectAll(false);
    setSelectedProducts(data);
    setSelectAllDependency({
      rule_filters: {
        filters: [...storeDepRef.current],
        ...metaPayload,
      },
    });
    setModifyMapping(true);
  };

  /**
   * Toggle modify mapping modal for select all.
   * Treat select-all like a normal multi-record modify so the Style Color ID
   * dropdown is populated from the selected records (same as the non-select-all
   * flow), instead of hiding it.
   */
  const toggleSelectAllModify = async (metaPayload, data) => {
    toggleModifyMapping(data, metaPayload);
  };

  const PsMappingFilterConfig = isPsMappingUseRuleListFlow
    ? "productMappingFilterConfiguration"
    : "producMappingRulesFilterConfiguration";

  return (
    <>
      {modifyMapping && (
        <ModifyMappings
          selectedProducts={selectedProducts}
          dependencyRef={storeDepRef}
          dependency={selectAllDependency}
          isSelectAll={selectAll}
          closeModify={() => {
            setModifyMapping(false);
            setSelectedProducts([]);
          }}
        />
      )}
      {!modifyMapping && (
        <div style={{ marginTop: IS_OVERRIDEN_CORE_BUTTON_PLACEMENT }}>
          <CoreComponentScreen
            IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
            showFilterDashboard={true}
            filterConfigKey={PsMappingFilterConfig}
            onApplyFilter={onStoreBandFilterDashboardClick}
            customDependencyValue={{ addFilterExclusions: false }}
            autoHideFilterButton={true}
          >
            <ProductStoreBand
              ref={storeDepRef}
              toggleModifyMapping={toggleModifyMapping}
              toggleSelectAllModify={toggleSelectAllModify}
              filtersSelection={storeBandFilterSelection}
              isRedirectedFromDifferentPage={isRedirectedFromDifferentPage}
              module={props.module}
              screenName={props.screenName}
              roleBasedAccess={props.roleBasedAccess}
              disableActionButtons={disableBandActionButtons}
              handleErrorMessage={props.handleErrorMessage}
            />
          </CoreComponentScreen>
        </div>
      )}
    </>
  );
};

export default ProductStoreTabWrapper;
