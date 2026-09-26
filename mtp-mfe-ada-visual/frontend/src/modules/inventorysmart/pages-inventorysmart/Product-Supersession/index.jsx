import { useHistory } from "react-router";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import {
  setInventorysmartFilterLoader,
  setSelectedFilters,
  setIsFiltersValid,
  resetProductSupersessionStore,
  setInventoryProductSupersessionFilterConfig,
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
import { Button, Grid } from "@mui/material";
import { CREATE_NEW_PRODUCT_MAPPING } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import ProductSupersessionDashboard from "./Product-Supersession-Dashboard";
import { Prompt } from "impact-ui";
import { common } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

const ProductSupersession = (props) => {
  const history = useHistory();
  const globalClasses = globalStyles();

  const [selectedProductMappings, setSelectedProductMappings] = useState([]);
  const [showEditConfirmationDialog, setShowEditConfirmationDialog] =
    useState(false);

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
        displaySnackMessages(ERROR_MESSAGE, "error");
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
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
              saved_filter_screen_name: "Inventorysmart Product Supersession",
            },
          ];

          const filterConfig = formattedFilterConfiguration(
            "productsSupersessionFilterConfiguration",
            filterConfigData,
            "Product Supersession"
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
    props.inventoryProductSupersessionFilterConfig,
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

  const navigateToCreateProductMapping = () => {
    // props.setNewProductProfileLoader(true);
    history.push(CREATE_NEW_PRODUCT_MAPPING);
  };

  const navigateToHelpCenter = () => {
    window.open(props.helpCenterLink, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div>
        <Grid
          container
          columnSpacing={2}
          direction="row"
          justifyContent="flex-end"
        >
          {selectedProductMappings?.length === 0 ? (
            <Grid item>
              <Button
                id="create-product-profile"
                onClick={() => navigateToCreateProductMapping()}
                color="primary"
                variant="contained"
                size="medium"
                className={globalClasses.marginVertical1rem}
                disabled={
                  !canTakeActionOnModules(
                    INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_SUPERSESSION_DASHBOARD,
                    "create"
                  )
                }
              >
                Create New Mapping
              </Button>
            </Grid>
          ) : (
            props.helpCenterLink && (
              <Grid item>
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
              </Grid>
            )
          )}
        </Grid>
        <Prompt
          isOpen={showEditConfirmationDialog}
          title="Editing Disabled"
          subHeading={DISABLED_EDITING_SUPERSESSION_MAPPING}
          infoList={[]}
          primaryButtonProps={{
            children: common.__ConfirmBtnText,
            onClick: () => navigateToHelpCenter(),
          }}
          tertiaryButtonProps={{
            children: common.__RejectBtnText,
            onClick: () => setShowEditConfirmationDialog(false),
          }}
          variant="warning"
        />
        <CoreComponentScreen
          showFilterLoader={props.inventorysmartFilterLoader}
          // Filter dashboard props
          showFilterDashboard={true}
          filterConfigKey={"productsSupersessionFilterConfiguration"}
          onApplyFilter={onFilterDashboardClick}
        >
          {props.isFiltersValid && (
            <div className={classNames(globalClasses.marginVertical1rem)}>
              <ProductSupersessionDashboard
                setSelectedProductMappings={setSelectedProductMappings}
                editSKULevelMapping={editSKULevelMapping}
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
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductSupersession);
