import { useEffect, useRef, useState } from "react";
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
import { PRODUCT_SUPERSESSION_MAPPING } from "../../../../constants-inventorysmart/stringConstants";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import classNames from "classnames";
import { cloneDeep, isEmpty } from "lodash";
import { Stepper } from "impact-ui-v3";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";

import {
  formattedFilterConfiguration,
  formatSelectedFiltersData,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration, resetFilterConfiguration } from "core/actions/filterAction";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import ProductMappingTable from "./ProductMappingTable";
import { setInventorysmartCreateProducMappingEditedConfiguration } from "../../../../services-inventorysmart/Product-Supersession/product-supersession-create-mapping-service";

const CreateMapping = (props) => {
  const globalClasses = globalStyles();
  const modifiedProductsMappings = useRef([]);
  const isRedirectedFromDifferentPage =
    props.screenNameNavigatedFrom === "review-sku-level-mapping" &&
    props.inventorysmartCreateProductMappingFilterDependency?.length > 0;

  const [filterDependency, setFilterDependency] = useState([]);
  const [disableSaveMapping, setDisableSaveMapping] = useState(true);

  function updateButtonState(updatedState) {
    setDisableSaveMapping(updatedState);
  }

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  const applyFilters = (filterElements, filterDependency) => {
    const payload = filtersPayload(
      filterElements,
      filterDependency,
      true,
      true
    );

    props.setInventorysmartCreateProductMappingFilterDependency(
      filterDependency
    );
    props.setIsFiltersValid(payload.isValid);
    props.setSelectedFilters(payload.reqBody);
  };

  const onFilterDashboardClick = (
    dependencyData,
    filterData,
    additonalParam,
    isRedirect = true
  ) => {
    if (isRedirect) {
      props.setInventorysmartCreateProducMappingEditedConfiguration([]);
      modifiedProductsMappings.current = [];
      updateButtonState(true);
    }
    applyFilters(filterData, dependencyData);
  };

  useEffect(() => {
    const isFreshNavigationWithOldData = 
      !isRedirectedFromDifferentPage && 
      !isEmpty(props.filterDashboardConfiguration);
    if (isFreshNavigationWithOldData) {
      const updatedConfig = { ...props.allFilterDashboardConfigurations };
      delete updatedConfig.productsSupersessionCreateMappingFilterConfiguration;
      props.resetFilterConfiguration(updatedConfig);
    }

    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig(
          "Inventorysmart Configurations Product Supersession New"
        );
        const shouldResetConfig = 
          isEmpty(props.filterDashboardConfiguration) ||
          props?.filterDashboardConfiguration?.isRedirectedFromDifferentPage ||
          isFreshNavigationWithOldData;
        
        if (shouldResetConfig) {
          props.setInventoryCreateProductMappingFilterConfig(response);
        }
      } catch (e) {
        props.handleErrorMessage(e);
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
              isCrossDimensionFilter: false,
              screen_name: props.screenName,
              saved_filter_screen_name:
                "Inventorysmart Configurations Product Supersession New",
              update_filter_dimension_on_apply: !props.inventorysmart_product_supersession_v3,
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
            onFilterDashboardClick(selectedFilters, response, null, false);
          }

          props.setFilterConfiguration(filterConfig);
        } catch (error) {
          props.handleErrorMessage(error);
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
          headerBreadCrumb={
            props.breadcrumbOptions ? (
              <HeaderBreadCrumbs options={props.breadcrumbOptions} />
            ) : null
          }
          showPageRoute={false}
          showPageHeader={true}
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
          hideSaveFilterSection={isRedirectedFromDifferentPage}
          hideNoDataFound={isRedirectedFromDifferentPage}
          contained={true}
          autoHideFilterButton={true}
        >
          <div className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter} ${globalClasses.marginAuto} ${globalClasses.marginBottom}`}
              style={{ width: "70%" }}>
              <Stepper
                activeStep={props.activeStep || 0}
                orientation="horizontal"
                steps={PRODUCT_SUPERSESSION_MAPPING.map((label) => ({
                  label: label,
                }))}
                onClick={(index) => {
                  if (props.setActiveStep) {
                    if (index <= (props.activeStep || 0)) return;
                  }
                }}
              />
          </div>
          {props.isFiltersValid && (
            <div className={classNames(globalClasses.marginVertical1rem)}>
              <ProductMappingTable
                modifiedProductsMappings={modifiedProductsMappings}
                disableSaveMapping={disableSaveMapping}
                updateButtonState={updateButtonState}
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
    allFilterDashboardConfigurations:
      store.filterReducer.filterDashboardConfiguration,
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    inventorysmart_product_supersession_v3:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        ?.productSupersessionModuleConfig?.inventorysmart_product_supersession_v3,
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
  resetFilterConfiguration: (filterConfiguration) =>
    dispatch(resetFilterConfiguration(filterConfiguration)),
  partialResetCreateProductMappingStore: (payload) =>
    dispatch(partialResetCreateProductMappingStore(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setInventorysmartCreateProducMappingEditedConfiguration: (payload) =>
    dispatch(setInventorysmartCreateProducMappingEditedConfiguration(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(CreateMapping);
