import { useHistory } from "react-router";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import {
  setInventorysmartFilterLoader,
  setSelectedFilters,
  setIsFiltersValid,
  resetProductSupersessionStore,
  setInventoryProductSupersessionFilterConfig,
  setProductSupersessionModuleConfig,
} from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-service";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
  isActionAllowedOnSubModule,
} from "../inventorysmart-utility";
import {
  DISABLED_EDITING_SUPERSESSION_MAPPING,
  ERROR_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
  // INVENTORY_SUBMODULES_NAMES
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import classNames from "classnames";
import { cloneDeep, isEmpty } from "lodash";

import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { CREATE_NEW_PRODUCT_MAPPING } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import ProductSupersessionDashboard from "./Product-Supersession-Dashboard";
import { Prompt, useTranslation } from "impact-ui-v3";
import { Button } from "impact-ui-v3";
import { common } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "config/constants";
import {
  getModuleBasedTenantConfig,
  setNoOfButtonsNextToTab,
} from "../../services-inventorysmart/common/inventory-smart-common-services";

const ProductSupersession = (props) => {
  const { t } = useTranslation();
  const history = useHistory();
  const globalClasses = globalStyles();

  const [selectedProductMappings, setSelectedProductMappings] = useState([]);
  const [showEditConfirmationDialog, setShowEditConfirmationDialog] = useState(
    false
  );
  const [userCreatedMappingEnabled, setUserCreatedMappingEnabled] = useState(
    true
  );

  useEffect(() => {
    if (props.user_created_mapping_enabled === false) {
      setUserCreatedMappingEnabled(false);
    } else {
      setUserCreatedMappingEnabled(true);
    }
  }, [props?.user_created_mapping_enabled]);

  useEffect(() => {
    const fetchModuleConfigs = async () => {
      if (props.productSupersessionModuleConfig) {
        return;
      }

      try {
        const response = await props.getModuleBasedTenantConfig({
          module_name: "product_supersession",
          screen_name: props.screenName,
        });
        props.setProductSupersessionModuleConfig(response);
      } catch (e) {
        props.handleErrorMessage(e);
      }
    };
    fetchModuleConfigs();
  }, []);

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  const editSKULevelMapping = () => {
    setShowEditConfirmationDialog(true);
  };

  const applyFilters = (filterElements, filterDependency) => {
    const payload = filtersPayload(
      filterElements,
      filterDependency,
      true,
      true // ignore custom dimensions
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
          "Inventorysmart Configurations Product Supersession"
        );
        if (
          isEmpty(props.filterDashboardConfiguration) ||
          props?.filterDashboardConfiguration?.isRedirectedFromDifferentPage
        ) {
          props.setInventoryProductSupersessionFilterConfig(response);
        }
      } catch (e) {
        props.handleErrorMessage(e);
      }
    };

    getInitialFilterConfiguration();

    return () => {
      props.resetProductSupersessionStore();
    };
  }, []);

  useEffect(() => {
    if (
      !isEmpty(props.inventoryProductSupersessionFilterConfig) &&
      !isEmpty(props.inventorysmartScreenConfig)
    ) {
      const getFilterValues = async (selected, current) => {
        try {
          props.setInventorysmartFilterLoader(true);
          let requiredFilterObjParams = {
            allFilters:
              cloneDeep(props.inventoryProductSupersessionFilterConfig) || [],
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
              isCrossDimensionFilter: false,
              screen_name: props.screenName,
              saved_filter_screen_name:
                "Inventorysmart Configurations Product Supersession",
              update_filter_dimension_on_apply: !props.inventorysmart_product_supersession_v3,
            },
          ];

          const filterConfig = formattedFilterConfiguration(
            "productsSupersessionFilterConfiguration",
            filterConfigData,
            "Product Supersession"
          );

          props.setFilterConfiguration(filterConfig);
        } catch (error) {
          props.handleErrorMessage(error);
        } finally {
          props.setInventorysmartFilterLoader(false);
        }
      };

      getFilterValues(props.savedFilterSelection);
    }
  }, [
    props.inventoryProductSupersessionFilterConfig,
    props.inventorysmartScreenConfig,
  ]);

  useEffect(() => {
    return () => {
      props.setNoOfButtonsNextToTab(undefined);
    };
  }, []);

  useEffect(() => {
    const hasFiltersApplied = Boolean(
      props.filterDashboardConfiguration?.appliedFilterData?.dependencyData
        ?.length > 0
    );
    props.setNoOfButtonsNextToTab(hasFiltersApplied ? 1 : undefined);
  }, [props.filterDashboardConfiguration]);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  const navigateToCreateProductMapping = () => {
    // props.setNewProductProfileLoader(true);
    history.push(CREATE_NEW_PRODUCT_MAPPING);
  };

  const navigateToHelpCenter = () => {
    window.open(props.helpCenterLink, "_blank", "noopener,noreferrer");
  };

  const addExtraButton = () => {
    let extraButtons = [];
    if (userCreatedMappingEnabled) {
      selectedProductMappings?.length === 0 ? (
        extraButtons.push(
          <Button
            id="create-product-profile"
            onClick={() => navigateToCreateProductMapping()}
            size="large"
            type="default"
            variant="primary"
            disabled={
              !canTakeActionOnModules(
                INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_SUPERSESSION_DASHBOARD,
                "create"
              )
            }
          >
            Create New Mapping
          </Button>
        )
      ) : (
        <Button
          id="create-product-profile"
          onClick={() => setShowEditConfirmationDialog(true)}
          color="primary"
          variant="contained"
          size="medium"
          className={globalClasses.marginVertical1rem}
          disabled={
            !canTakeActionOnModules(
              INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_SUPERSESSION_DASHBOARD,
              "edit"
            )
          }
        >
          Edit Mapping
        </Button>
      );
    }

    return extraButtons;
  };

  return (
    <>
      <div>
        <Prompt
          isOpen={showEditConfirmationDialog}
          title={t("inventorysmart.editingDisabled")}
          onPrimaryButtonClick={() => navigateToHelpCenter()}
          onSecondaryButtonClick={() => setShowEditConfirmationDialog(false)}
          primaryButtonLabel={common.__ConfirmBtnText}
          secondaryButtonLabel={common.__RejectBtnText}
          variant="warning"
        >
          {DISABLED_EDITING_SUPERSESSION_MAPPING}
        </Prompt>
        <div style={{ marginTop: IS_OVERRIDEN_CORE_BUTTON_PLACEMENT }}>
          <CoreComponentScreen
            showFilterLoader={props.inventorysmartFilterLoader}
            // Filter dashboard props
            IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
            showFilterDashboard={true}
            filterConfigKey={"productsSupersessionFilterConfiguration"}
            onApplyFilter={onFilterDashboardClick}
            emptyStateSecondaryButtonLabel={
              userCreatedMappingEnabled
                ? t("inventorysmart.createNewMapping")
                : ""
            }
            secondaryButtonProps={{
              disabled: !userCreatedMappingEnabled,
            }}
            emptyStateSecondaryButtonClick={() =>
              navigateToCreateProductMapping()
            }
            autoHideFilterButton={true}
          >
            {props.isFiltersValid && (
              <div className={classNames(globalClasses.marginVertical1rem)}>
                <ProductSupersessionDashboard
                  setSelectedProductMappings={setSelectedProductMappings}
                  editSKULevelMapping={editSKULevelMapping}
                  userCreatedMappingEnabled={userCreatedMappingEnabled}
                  handleErrorMessage={props.handleErrorMessage}
                  topRightOptions={addExtraButton()}
                  module={props.module}
                  inventorysmartModulesPermission={
                    props.inventorysmartModulesPermission
                  }
                />
              </div>
            )}
          </CoreComponentScreen>
        </div>
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartFilterLoader:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        .inventorysmartFilterLoader,
    isFiltersValid:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        .isFiltersValid,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    helpCenterLink:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig.tenant_help_center_link,
    inventoryProductSupersessionFilterConfig:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        .inventoryProductSupersessionFilterConfig,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "productsSupersessionFilterConfiguration"
      ],
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    user_created_mapping_enabled:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        ?.productSupersessionModuleConfig
        ?.inventorysmart_product_supersession_user_created_mapping,
    inventorysmart_product_supersession_v3:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        ?.productSupersessionModuleConfig?.inventorysmart_product_supersession_v3,
    inventorysmartModulesPermission:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    productSupersessionModuleConfig:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        .productSupersessionModuleConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventorysmartFilterLoader: (payload) =>
    dispatch(setInventorysmartFilterLoader(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setInventoryProductSupersessionFilterConfig: (payload) =>
    dispatch(setInventoryProductSupersessionFilterConfig(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  resetProductSupersessionStore: (payload) =>
    dispatch(resetProductSupersessionStore(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  getModuleBasedTenantConfig: (module) =>
    dispatch(getModuleBasedTenantConfig(module)),
  setNoOfButtonsNextToTab: (value) =>
    dispatch(setNoOfButtonsNextToTab(value)),
  setProductSupersessionModuleConfig: (payload) =>
    dispatch(setProductSupersessionModuleConfig(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductSupersession);
