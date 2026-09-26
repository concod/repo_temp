import { useEffect, useState } from "react";
import { connect } from "react-redux";
import {
  setInventoryCreateProductMappingFilterConfig,
  setInventorysmartCreateMappingFilterLoader,
  setSelectedFilters,
  setIsFiltersValid,
  setInventorysmartCreateProductMappingFilterDependency,
  partialResetCreateProductMappingStore,
} from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-create-mapping-service";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
  isActionAllowedOnSubModule,
} from "modules/inventorysmart/pages-inventorysmart/inventorysmart-utility";
import {
  ERROR_MESSAGE,
  // INVENTORY_SUBMODULES_NAMES
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import classNames from "classnames";
import { cloneDeep, isEmpty } from "lodash";

import {
  formattedFilterConfiguration,
  formatSelectedFiltersData,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import ProductMappingTable from "./ProductMappingTable";

const CreateMapping = (props) => {
  const globalClasses = globalStyles();
  const isRedirectedFromDifferentPage =
    props.screenNameNavigatedFrom === "review-sku-level-mapping" &&
    props.inventorysmartCreateProductMappingFilterDependency?.length > 0;

  const [filterDependency, setFilterDependency] = useState([]);

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

    props.setInventorysmartCreateProductMappingFilterDependency(
      filterDependency
    );
    props.setIsFiltersValid(payload.isValid);
    props.setSelectedFilters(payload.reqBody);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    applyFilters(filterData, dependencyData);
  };

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig(
          "Inventorysmart Configurations Product Supersession New"
        );
        if (
          isEmpty(props.filterDashboardConfiguration) ||
          props?.filterDashboardConfiguration?.isRedirectedFromDifferentPage
        ) {
          props.setInventoryCreateProductMappingFilterConfig(response);
        }
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };

    getInitialFilterConfiguration();

    return () => {
      props.partialResetCreateProductMappingStore();
    };
  }, []);

  useEffect(() => {
    if (
      !isEmpty(props.inventoryCreateProductMappingFilterConfig) &&
      !isEmpty(props.inventorysmartScreenConfig)
    ) {
      const getFilterValues = async (selected, current) => {
        try {
          const selectedFilters = isRedirectedFromDifferentPage
            ? cloneDeep(
                props.inventorysmartCreateProductMappingFilterDependency
              )
            : selected;

          props.setInventorysmartCreateMappingFilterLoader(true);
          let requiredFilterObjParams = {
            allFilters:
              cloneDeep(props.inventoryCreateProductMappingFilterConfig) || [],
            appliedFilters: selectedFilters,
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
            },
          ];

          const filterConfig = formattedFilterConfiguration(
            "productsSupersessionCreateMappingFilterConfiguration",
            filterConfigData,
            "Product Supersession Create Mapping",
            selectedFilters
          );

          if (isRedirectedFromDifferentPage) {
            const formattedSelectedFilters = formatSelectedFiltersData(
              filterConfigData,
              "Product Supersession Create Mapping",
              selectedFilters
            );

            filterConfig[
              "productsSupersessionCreateMappingFilterConfiguration"
            ].isRedirectedFromDifferentPage = isRedirectedFromDifferentPage;

            setFilterDependency(formattedSelectedFilters);
            onFilterDashboardClick(selectedFilters, response);
          }

          props.setFilterConfiguration(filterConfig);
        } catch (error) {
          displaySnackMessages(ERROR_MESSAGE, "error");
        } finally {
          props.setInventorysmartCreateMappingFilterLoader(false);
        }
      };

      getFilterValues(props.savedFilterSelection);
    }
  }, [
    props.inventoryCreateProductMappingFilterConfig,
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
          showFilterLoader={
            props.inventorysmartCreateProductMappingFilterLoader
          }
          // Filter dashboard props
          filterDependency={filterDependency}
          showFilterDashboard={true}
          showChipsOnLoad={isRedirectedFromDifferentPage}
          filterConfigKey={
            "productsSupersessionCreateMappingFilterConfiguration"
          }
          onApplyFilter={onFilterDashboardClick}
        >
          {props.isFiltersValid && (
            <div className={classNames(globalClasses.marginVertical1rem)}>
              <ProductMappingTable
                canTakeActionOnModules={canTakeActionOnModules}
                reviewSKULevelMapping={props.reviewSKULevelMapping}
                isRedirectedFromDifferentPage={isRedirectedFromDifferentPage}
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
    inventorysmartCreateProductMappingFilterLoader:
      store.inventorysmartReducer
        .inventorySmartProductSupersessionCreateMappingService
        .inventorysmartCreateProductMappingFilterLoader,
    isFiltersValid:
      store.inventorysmartReducer
        .inventorySmartProductSupersessionCreateMappingService.isFiltersValid,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    inventoryCreateProductMappingFilterConfig:
      store.inventorysmartReducer
        .inventorySmartProductSupersessionCreateMappingService
        .inventoryCreateProductMappingFilterConfig,
    inventorysmartCreateProductMappingFilterDependency:
      store.inventorysmartReducer
        .inventorySmartProductSupersessionCreateMappingService
        .inventorysmartCreateProductMappingFilterDependency,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "productsSupersessionCreateMappingFilterConfiguration"
      ],
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventorysmartCreateMappingFilterLoader: (payload) =>
    dispatch(setInventorysmartCreateMappingFilterLoader(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setInventoryCreateProductMappingFilterConfig: (payload) =>
    dispatch(setInventoryCreateProductMappingFilterConfig(payload)),
  setInventorysmartCreateProductMappingFilterDependency: (payload) =>
    dispatch(setInventorysmartCreateProductMappingFilterDependency(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  partialResetCreateProductMappingStore: (payload) =>
    dispatch(partialResetCreateProductMappingStore(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(CreateMapping);
