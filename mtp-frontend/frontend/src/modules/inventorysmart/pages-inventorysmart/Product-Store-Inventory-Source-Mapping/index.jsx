import { useEffect } from "react";
import { connect } from "react-redux";
import {
  setInventorysmartFilterLoader,
  setSelectedFilters,
  setIsFiltersValid,
  setInventoryProductStoreInventorySourceFilterConfig,
  resetProductStoreInventorySourceMappingStore,
} from "modules/inventorysmart/services-inventorysmart/Product-Store-Inventory-Source-Mapping/product-store-inventory-source-mapping-service";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
  isActionAllowedOnSubModule,
} from "../inventorysmart-utility";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import classNames from "classnames";
import { cloneDeep, isEmpty } from "lodash";

import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import ProductStoreInventorySourceMappingSummary from "./components/ProductStoreInventorySourceMappingSummary";

const ProductStoreInventorySourceMapping = (props) => {
  const globalClasses = globalStyles();

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  const applyFilters = (filterElements, filterDependency) => {
    const payload = filtersPayload(filterElements, filterDependency, true);

    props.setIsFiltersValid(payload.isValid);
    props.setSelectedFilters(payload.reqBody);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    applyFilters(filterData, dependencyData);
  };

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig("Inventorysmart Product Rules");
        if (
          isEmpty(props.filterDashboardConfiguration) ||
          props?.filterDashboardConfiguration?.isRedirectedFromDifferentPage
        ) {
          props.setInventoryProductStoreInventorySourceFilterConfig(response);
        }
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };

    getInitialFilterConfiguration();

    return () => {
      props.resetProductStoreInventorySourceMappingStore();
    };
  }, []);

  useEffect(() => {
    if (
      !isEmpty(props.inventoryProductStoreInventorySourceFilterConfig) &&
      !isEmpty(props.inventorysmartScreenConfig)
    ) {
      const getFilterValues = async (selected, current) => {
        try {
          props.setInventorysmartFilterLoader(true);
          let requiredFilterObjParams = {
            allFilters:
              cloneDeep(
                props.inventoryProductStoreInventorySourceFilterConfig
              ) || [],
            appliedFilters: selected,
            current: current,
            rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: props.screenName,
            tenantFilterUamConfig: props.tenantFilterUamConfig,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);

          const filterConfigData = [
            {
              filterDashboardData: response,
              expectedFilterDimensions: getFilterDimensions(response),
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
              saved_filter_screen_name:
                "Inventorysmart Product Rules",
            },
          ];

          const filterConfig = formattedFilterConfiguration(
            "productStoreInventorySourceFilterConfiguration",
            filterConfigData,
            "Product Store Inventory Source"
          );

          props.setFilterConfiguration(filterConfig);
        } catch (error) {
          displaySnackMessages(ERROR_MESSAGE, "error");
        } finally {
          props.setInventorysmartFilterLoader(false);
        }
      };

      getFilterValues(props.savedFilterSelection);
    }
  }, [
    props.inventoryProductStoreInventorySourceFilterConfig,
    props.inventorysmartScreenConfig,
  ]);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  return (
    <>
      <div>
        <CoreComponentScreen
          showFilterLoader={props.inventorysmartFilterLoader}
          // Filter dashboard props
          showFilterDashboard={true}
          filterConfigKey={"productStoreInventorySourceFilterConfiguration"}
          onApplyFilter={onFilterDashboardClick}
        >
          {props.isFiltersValid && (
            <div className={classNames(globalClasses.marginVertical1rem)}>
              <ProductStoreInventorySourceMappingSummary
                canTakeActionOnModules={canTakeActionOnModules}
              />
            </div>
          )}
        </CoreComponentScreen>
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartFilterLoader:
      store.inventorysmartReducer
        .inventorySmartProductStoreInventorySourceMappingService
        .inventorysmartFilterLoader,
    isFiltersValid:
      store.inventorysmartReducer
        .inventorySmartProductStoreInventorySourceMappingService.isFiltersValid,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    inventoryProductStoreInventorySourceFilterConfig:
      store.inventorysmartReducer
        .inventorySmartProductStoreInventorySourceMappingService
        .inventoryProductStoreInventorySourceFilterConfig,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "productStoreInventorySourceFilterConfiguration"
      ],
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventorysmartFilterLoader: (payload) =>
    dispatch(setInventorysmartFilterLoader(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setInventoryProductStoreInventorySourceFilterConfig: (payload) =>
    dispatch(setInventoryProductStoreInventorySourceFilterConfig(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  resetProductStoreInventorySourceMappingStore: (payload) =>
    dispatch(resetProductStoreInventorySourceMappingStore(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductStoreInventorySourceMapping);
