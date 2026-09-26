import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { Tabs, Button, Alert, useTranslation } from "impact-ui-v3";
import { cloneDeep, isEmpty } from "lodash";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import {
  setFilterConfiguration,
} from "core/actions/filterAction";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import DashboardTable from "./Product-Profile-Dashboard/dashboard-table";
import { CREATE_PRODUCT_PROFILE } from "../../constants-inventorysmart/routesConstants";
import {
  ERROR_MESSAGE,
  ROLES_ACCESS_MODULES_MAPPING,
  APP_NAME,
  FULL_ACCESS_PERMISSIONS_LIST,
  INVENTORY_SUBMODULES_NAMES,
  PRODUCT_PROFILE_CACHE,
} from "../../constants-inventorysmart/stringConstants";
import {
  setProductProfileDashboardFilterConfig,
  setUserProductProfileDashboardFilterConfig,
  getIARecommededTableData,
  setIARecommendedTableData,
  setUserCreatedTableData,
  resetProductProfile,
  setProductProfileTableLoader,
  setProductProfileModuleConfig,
} from "../../services-inventorysmart/Product-Profile/product-profile-dashboard-service";
import { setNewProductProfileLoader, setCreateProductProfileModuleConfig } from "../../services-inventorysmart/Product-Profile/create-product-profile-service";
import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
  getModuleBasedTenantConfig,
  setNoOfButtonsNextToTab,
} from "../../services-inventorysmart/common/inventory-smart-common-services";
import {
  isActionAllowedOnSubModule,
  getFilterDimensions,
  fetchFilterConfig,
  fetchFilterOptions,
} from "../inventorysmart-utility";
import {
  setKeyValueInCache,
} from "../../services-inventorysmart/active-module-common-service";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT,IS_TAB_OVERRIDEN_WIDTH } from "config/constants";

const ProductProfileComponent = (props) => {
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState(0);
  const [onFilterReqBody, setOnFilterReqBody] = useState({});
  const [showDataGrid, setShowDataGrid] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [isCreated, setIsCreated] = useState(false);

  const paths = [
    {
      label: t("inventorysmart.home"),
      to: "/home",
    },
    {
      label: `${dynamicLabelsBasedOnTenant("article")} ${t(
        "inventorysmart.profile"
      )}`,
      to: "#",
    },
  ];

  const globalClasses = globalStyles();

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  useEffect(() => {
    const fetchModuleConfigs = async () => {
      try {
        props.setInventorySmartPermissionLoader(true);
        let reqBody = {
          module_name: "IA Recommended Product Profile",
          screen_name: props.screenName,
        };
        let response = null;
        if (
          props.cache[PRODUCT_PROFILE_CACHE] &&
          props.cache[PRODUCT_PROFILE_CACHE]["PP-CONFIGS"]
        ) {
          response = props.cache[PRODUCT_PROFILE_CACHE]["PP-CONFIGS"];
        } else {
          response = await props.getModuleBasedTenantConfig(reqBody);
          props.setKeyValueInCache({
            key: "PP-CONFIGS",
            value: response,
            module: PRODUCT_PROFILE_CACHE,
            persist: true,
          });
        }
        props.setProductProfileModuleConfig(response);

        const createPPConfig = await props.getModuleBasedTenantConfig({
          module_name: "Create Product Profile Form",
        });
        props.setCreateProductProfileModuleConfig(createPPConfig);
        
      } catch (e) {
        handleErrorMessage(e);
      } finally {
        props.setInventorySmartPermissionLoader(false);
      }
    };
    fetchModuleConfigs();
    return () => {
      props.resetProductProfile();
      props.setNoOfButtonsNextToTab(undefined);
    };
  }, []);

  useEffect(() => {
    if (props.inventorysmartScreenConfig) {
      const fetchModulesAccess = async () => {
        try {
          props.setInventorySmartPermissionLoader(true);
          // props.module is fetched  from routes
          const moduleName = props?.module;
          const subModules = ROLES_ACCESS_MODULES_MAPPING[props?.module];

          let rolesBasedModulesPermission = {};

          // identifying if its for vb or signet
          if (props.inventorysmartScreenConfig.roleBasedAccess) {
            let accessDataResponse = null;
            if (
              props.cache[PRODUCT_PROFILE_CACHE] &&
              props.cache[PRODUCT_PROFILE_CACHE][
                "getModuleLevelAccessUtility-PP"
              ]
            ) {
              accessDataResponse =
                props.cache[PRODUCT_PROFILE_CACHE][
                  "getModuleLevelAccessUtility-PP"
                ];
            } else {
              accessDataResponse = await getModuleLevelAccessUtility({
                app: APP_NAME,
                module: subModules,
              })();
              props.setKeyValueInCache({
                key: "getModuleLevelAccessUtility-PP",
                value: accessDataResponse,
                module: PRODUCT_PROFILE_CACHE,
                persist: true,
              });
            }
            rolesBasedModulesPermission = Object.fromEntries(
              Object.entries(accessDataResponse).map(([module, actions]) => [
                module,
                Object.keys(actions),
              ])
            );
          } else {
            subModules.map(async (subModule) => {
              rolesBasedModulesPermission[
                subModule
              ] = FULL_ACCESS_PERMISSIONS_LIST;
            });
          }
          props?.setInventorySmartModulesPermissions({
            [moduleName]: rolesBasedModulesPermission,
          });
        } catch (e) {
          handleErrorMessage(e);
        } finally {
          props.setInventorySmartPermissionLoader(false);
        }
      };
      fetchModulesAccess();
      return () => {
        props.resetProductProfile();
      };
    }
  }, [props.inventorysmartScreenConfig]);

  const getInitialFilterConfiguration = async () => {
    try {
      let response = [];
      let filterConfigKey =
        tabValue === 0
          ? "productProfileDashboardFilterConfig"
          : "userProductProfileDashboardFilterConfig";
      if (tabValue === 0) {
        if (
          props.filterDashboardConfiguration &&
          props?.filterDashboardConfiguration[filterConfigKey]
            ?.filterConfig?.[0]?.originalFilterDashboardData?.length > 0
        ) {
          props.setProductProfileDashboardFilterConfig(
            props?.filterDashboardConfiguration[filterConfigKey]
              ?.filterConfig?.[0]?.originalFilterDashboardData
          );
        } else {
          response = await fetchFilterConfig("product profile");
          props.setProductProfileDashboardFilterConfig(response);
        }
      } else {
        if (
          props.filterDashboardConfiguration &&
          props?.filterDashboardConfiguration[filterConfigKey]
            ?.filterConfig?.[0]?.originalFilterDashboardData?.length > 0
        ) {
          props.setUserProductProfileDashboardFilterConfig(
            props?.filterDashboardConfiguration[filterConfigKey]
              ?.filterConfig?.[0]?.originalFilterDashboardData
          );
        } else {
          response = await fetchFilterConfig("create product profile");
          props.setUserProductProfileDashboardFilterConfig(response);
        }
      }
    } catch (e) {
      handleErrorMessage(e);
    }
  };

  useEffect(() => {
    setOnFilterReqBody({});
    setShowDataGrid(false);
    getInitialFilterConfiguration();
    props.setNoOfButtonsNextToTab(undefined);
  }, [tabValue]);

  useEffect(() => {
    let filterConfigKey =
      tabValue === 0
        ? "productProfileDashboardFilterConfig"
        : "userProductProfileDashboardFilterConfig";
    /* this useEffect is called for the first time when we navigate to pp dashboard screen
     when we switch to diff module we clear the productProfileDashboardFilterConfig states along with other states in this screen
     and based on the above useEffect props.filterDashboardConfiguration is not empty as it is not cleared and it has savedFilterSelection in originalSelections
     hence when u come back our filter configurations are filtered out
     */
    if (
      isEmpty(props.filterDashboardConfiguration[filterConfigKey]) &&
      !isEmpty(props[filterConfigKey])
    ) {
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props[filterConfigKey]),
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
              screen_name:
                tabValue === 0 ? props.screenName : "Product Profile User",
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            filterConfigKey,
            filterConfigData,
            "Product Profile Screen"
          );
          props.setFilterConfiguration(filterConfig);
        } catch (e) {
          handleErrorMessage(e);
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [
    props.productProfileDashboardFilterConfig,
    props.userProductProfileDashboardFilterConfig,
    props.savedFilterSelection,
    tabValue,
  ]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const handleChangeTabValue = (_event, newValue) => {
    setTabValue(newValue);
  };

  const applyFilters = (_filterElements, dependency) => {
    props.setProductProfileTableLoader(true);
    let body = {
      filters: dependency,
    };
    setOnFilterReqBody(body);
    setShowDataGrid(true);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    applyFilters(filterData, dependencyData);
  };

  const navigateToCreatePP = () => {
    props.setNewProductProfileLoader(true);
    props.history.push(CREATE_PRODUCT_PROFILE);
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  const addExtraButton = () => {
    let extraButtons = [];
    extraButtons.push(
      <Button
        id="create-product-profile"
        onClick={() => navigateToCreatePP()}
        size="large"
        type="default"
        variant="primary"
        disabled={
          !canTakeActionOnModules(
            INVENTORY_SUBMODULES_NAMES.INVENTORY_USER_CREATED_PRODUCT_PROFILE,
            "create"
          )
        }
      >
        {t("inventorysmart.create")} {dynamicLabelsBasedOnTenant("article")}{" "}
        {t("inventorysmart.profile")}{" "}
      </Button>
    );

    return extraButtons;
  };

  const calculateTabWidth = () => {
    if (props.no_of_buttons_next_to_tab === undefined) return "100%";
    if (props.no_of_buttons_next_to_tab === 1) return `calc(100% - 140px)`;
    return `calc(100% - ${140 + (props.no_of_buttons_next_to_tab - 1) * 142}px)`;
  };

  useEffect(() => {
    const filterConfigKey = tabValue === 0 ? "productProfileDashboardFilterConfig" : "userProductProfileDashboardFilterConfig";
    const hasFiltersApplied = showDataGrid || (props.filterDashboardConfiguration?.[filterConfigKey]?.appliedFilterData?.dependencyData?.length > 0);
    props.setNoOfButtonsNextToTab(hasFiltersApplied ? 1 : undefined);
  }, [showDataGrid, props.filterDashboardConfiguration, tabValue]);

  useEffect(() => () => props.setNoOfButtonsNextToTab(undefined), []);

  useEffect(() => {
    const location = props.router?.location || props.location;
    if (location?.state?.showSuccessAlert) {
      setShowSuccessAlert(true);
      setIsCreated(location.state.isCreated || !location.state.isUpdated);
      if (props.history?.replace) {
        props.history.replace({
          ...location,
          state: undefined
        });
      }
    }
  }, [props.router?.location?.state?.showSuccessAlert, props.location?.state?.showSuccessAlert]);

  useEffect(() => {
    if (showSuccessAlert && showDataGrid) {
      const timer = setTimeout(() => {
        setShowSuccessAlert(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [showSuccessAlert, showDataGrid]);

  const handleUndoAction = () => {
    setShowSuccessAlert(false);
  };

  const handleCloseAlert = () => {
    setShowSuccessAlert(false);
  };

  const getTopCenterOptions = () => {
    if (showSuccessAlert) {
      return (
        <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <Alert
            actionName="Undo"
            description=""
            onAction={handleUndoAction}
            onClose={handleCloseAlert}
            severity="success"
            subtleBackground
            title={
              isCreated
                ? `${dynamicLabelsBasedOnTenant("article")} ${t("inventorysmart.profile")} created successfully.`
                : `${dynamicLabelsBasedOnTenant("article")} ${t("inventorysmart.profile")} updated successfully.`
            }
          />
        </div>
      );
    }
    return null;
  };

  return (
    <div className={globalClasses.paddingAroundNew}>
      <div className={globalClasses.breadcrumbPadding}>
        <HeaderBreadCrumbs options={paths} />
      </div>
      <div>
        <Tabs
          sx={{ width: calculateTabWidth(), marginTop: "12px" }}
          value={tabValue}
          onChange={handleChangeTabValue}
          orientation="horizontal"
          tabNames={[
            { label: t("inventorysmart.iaRecommended"), value: 0 },
            { label: t("inventorysmart.userCreated"), value: 1 },
          ]}
          tabPanels={[
            <div key="ia-recommended-panel" style={{marginTop:IS_OVERRIDEN_CORE_BUTTON_PLACEMENT}}>
              <CoreComponentScreen
                IscoreButtonWidth = {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
                showFilterDashboard={true}
                filterConfigKey={"productProfileDashboardFilterConfig"}
                onApplyFilter={onFilterDashboardClick}
                resetFilterChips={true}
                autoHideFilterButton={true}
                emptyStateSecondaryButtonLabel={`${t(
                  "inventorysmart.create"
                )} ${dynamicLabelsBasedOnTenant("article")} ${t(
                  "inventorysmart.profile"
                )}`}
                emptyStateSecondaryButtonClick={() => navigateToCreatePP()}
                secondaryButtonProps={{
                  disabled: !canTakeActionOnModules(
                    INVENTORY_SUBMODULES_NAMES.INVENTORY_USER_CREATED_PRODUCT_PROFILE,
                    "create"
                  ),
                }}
              >
                {showDataGrid && (
                  <Loader loader={props.productProfileTableLoader}>
                    <DashboardTable
                      selectedDependencyValue={onFilterReqBody}
                      tabState={0}
                      module={props.module}
                      setKeyValueInCache={props?.setKeyValueInCache}
                      cache={props.cache}
                      topRightPPDetailsTableOptions={addExtraButton()}
                      topCenterOptions={getTopCenterOptions()}
                    />
                  </Loader>
                )}
              </CoreComponentScreen>
            </div>,
            <div key="user-created-panel" style={{marginTop:IS_OVERRIDEN_CORE_BUTTON_PLACEMENT}}>
              <CoreComponentScreen
                IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
                showFilterDashboard={true}
                filterConfigKey={"userProductProfileDashboardFilterConfig"}
                onApplyFilter={onFilterDashboardClick}
                resetFilterChips={true}
                autoHideFilterButton={true}
                emptyStateSecondaryButtonLabel={`${t(
                  "inventorysmart.create"
                )} ${dynamicLabelsBasedOnTenant("article")} ${t(
                  "inventorysmart.profile"
                )}`}
                emptyStateSecondaryButtonClick={() => navigateToCreatePP()}
                secondaryButtonProps={{
                  disabled: !canTakeActionOnModules(
                    INVENTORY_SUBMODULES_NAMES.INVENTORY_USER_CREATED_PRODUCT_PROFILE,
                    "create"
                  ),
                }}
              >
                {showDataGrid && (
                  <Loader loader={props.productProfileTableLoader}>
                    <DashboardTable
                      selectedDependencyValue={onFilterReqBody}
                      tabState={1}
                      module={props.module}
                      setKeyValueInCache={props?.setKeyValueInCache}
                      cache={props.cache}
                      topRightPPDetailsTableOptions={addExtraButton()}
                      topCenterOptions={getTopCenterOptions()}
                    />
                  </Loader>
                )}
              </CoreComponentScreen>
            </div>,
          ]}
        />
      </div>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    productProfileTableLoader:
      inventorysmartReducer.productProfileDashboardReducer
        .productProfileTableLoader,
    productProfileDashboardFilterConfig:
      inventorysmartReducer.productProfileDashboardReducer
        .productProfileDashboardFilterConfig,
    tableDataIARecommended:
      inventorysmartReducer.productProfileDashboardReducer
        .tableDataIARecommended,
    inventorySmartPermissionLoader:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorySmartPermissionLoader,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    filterDashboardConfiguration: filterReducer.filterDashboardConfiguration,
    savedFilterSelection: filterReducer.savedFilterSelection,
    userProductProfileDashboardFilterConfig:
      inventorysmartReducer.productProfileDashboardReducer
        .userProductProfileDashboardFilterConfig,
    cache: inventorysmartReducer?.activeModulesCacheService?.cache,
    no_of_buttons_next_to_tab:
      inventorysmartReducer?.inventorySmartCommonService
        ?.no_of_buttons_next_to_tab,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setProductProfileDashboardFilterConfig: (body) =>
      dispatch(setProductProfileDashboardFilterConfig(body)),
    getIARecommededTableData: (body) =>
      dispatch(getIARecommededTableData(body)),
    setIARecommendedTableData: (body) =>
      dispatch(setIARecommendedTableData(body)),
    setUserCreatedTableData: (body) => dispatch(setUserCreatedTableData(body)),
    resetProductProfile: (body) => dispatch(resetProductProfile(body)),
    setNewProductProfileLoader: (body) =>
      dispatch(setNewProductProfileLoader(body)),
    setInventorySmartPermissionLoader: (payload) =>
      dispatch(setInventorySmartPermissionLoader(payload)),
    setInventorySmartModulesPermissions: (payload) =>
      dispatch(setInventorySmartModulesPermissions(payload)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setProductProfileTableLoader: (body) =>
      dispatch(setProductProfileTableLoader(body)),
    setUserProductProfileDashboardFilterConfig: (body) =>
      dispatch(setUserProductProfileDashboardFilterConfig(body)),
    getModuleBasedTenantConfig: (module) =>
      dispatch(getModuleBasedTenantConfig(module)),
    setProductProfileModuleConfig: (body) =>
      dispatch(setProductProfileModuleConfig(body)),
    setKeyValueInCache: (keyValuePair) =>
      dispatch(setKeyValueInCache(keyValuePair)),
    setNoOfButtonsNextToTab: (value) =>
      dispatch(setNoOfButtonsNextToTab(value)),
    setCreateProductProfileModuleConfig: (payload) =>
      dispatch(setCreateProductProfileModuleConfig(payload)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductProfileComponent);
