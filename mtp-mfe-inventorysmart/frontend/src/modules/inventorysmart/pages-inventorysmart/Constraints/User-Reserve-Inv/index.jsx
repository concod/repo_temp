import React, { useState, useEffect } from "react";
import { connect } from "react-redux";

import { cloneDeep, isEmpty } from "lodash";
import { Tabs } from "impact-ui-v3";
import Loader from "core/Utils/Loader/loader";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { addSnack } from "core/actions/snackbarActions";

import UserReserveTableComponent from "./UserReserveTable";
import {
  setConstraintsUserReserveFilterConfig,
  resetConstraintsStoreState,
  setConstraintsUserReserveLoader,
  setUserReserveConfigs
} from "../../../services-inventorysmart/Constraints/constraints-services";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
} from "../../inventorysmart-utility";
import {
  ERROR_MESSAGE,
  CONSTRAINTS_CACHE,
} from "../../../constants-inventorysmart/stringConstants";
import StoreReserveViewComponent from "./StoreReserveView";
import {
  setKeyValueInCache,
  clearActiveModuleCache,
} from "../../../services-inventorysmart/active-module-common-service";
import DCReserveView from "./DCReserveView";
import {
  CONSTRAINTS_OVERRIDEN_CORE_BUTTON_PLACEMENT,
  IS_OVERRIDEN_CORE_BUTTON_WIDTH,
  IS_TAB_OVERRIDEN_WIDTH,
} from "config/constants";
import { getModuleBasedTenantConfig } from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";

const UserReserveInvComponent = (props) => {
  const [userReserveDetails, setUserReserveDetails] = useState(false);
  const [filterValuesOnRender, setFilterValuesOnRender] = useState([]);
  const [columndef, setcolumndef] = useState(false);
  const [selectedTab, setSelectedTab] = useState(null);

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
    props.setConstraintsUserReserveLoader(false);
  };

  useEffect(() => {
    fetchModuleConfigs();
  },[])

  useEffect(() => {
    if (selectedTab === null) {
      const getInitialFilterConfiguration = async () => {
        try {
          props.setConstraintsUserReserveLoader(true);
          let response = await fetchFilterConfig(
            "Inventorysmart Constraints User Reserve"
          );
          props.setConstraintsUserReserveFilterConfig(response);
          props.setConstraintsUserReserveLoader(false);
        } catch (e) {
          handleErrorMessage(e);
        }
      };
      getInitialFilterConfiguration();
    }
    return () => {
      props.resetConstraintsStoreState();
      props.clearActiveModuleCache(CONSTRAINTS_CACHE);
      // Clear filter configuration so it gets re-initialized on next mount
      props.setFilterConfiguration({
        constraintsUserReserveFilterConfig: {},
      });
    };
  }, [selectedTab]);

  useEffect(() => {
    if (
      selectedTab === null &&
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.constraintsUserReserveFilterConfig)
    ) {
      props.setConstraintsUserReserveLoader(true);
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.constraintsUserReserveFilterConfig),
            appliedFilters: selected,
            current: current,
            rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: props.screenName,
            customDependency: [
              getActiveEntityFilter("product"),
              getActiveEntityFilter("store"),
            ],
            tenantFilterUamConfig: props.tenantFilterUamConfig,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);
          const filterConfigData = [
            {
              filterDashboardData: [...response],
              expectedFilterDimensions: getFilterDimensions(response),
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "constraintsUserReserveFilterConfig",
            filterConfigData,
            "User Reserve Inv Screen"
          );
          props.setFilterConfiguration(filterConfig);
          props.setConstraintsUserReserveLoader(false);
        } catch (e) {
          handleErrorMessage(e);
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [
    props.constraintsUserReserveFilterConfig,
    props.savedFilterSelection,
    selectedTab,
  ]);

  useEffect(() => {
    if (props.showUserReserveTabs?.length) {
      const defaultValue = props.showUserReserveTabs[0];
      setSelectedTab(defaultValue.value);
    } else setSelectedTab(null);
  }, [props.showUserReserveTabs]);

  const fetchModuleConfigs = async () => {
    try {
      let reqBody = {
        module_name: "user_reserve_configs",
        screen_name: props.screenName,
      };
      let response = await props.getModuleBasedTenantConfig(reqBody);
      props.setUserReserveConfigs(response);
    } catch (e) {
      handleErrorMessage(e);
    }
  };

  const displaySnackMessages = (
    message,
    variance,
    disableOnClose = false,
    autoHideDuration
  ) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        disableOnClose: disableOnClose,
        ...(autoHideDuration && { autoHideDuration }),
      },
    });
  };

  const applyFilters = async (_filterElements, dependency) => {
    props.setConstraintsUserReserveLoader(true);
    try {
      setFilterValuesOnRender(dependency);
      setcolumndef(true);
      props.setConstraintsUserReserveLoader(false);
      setUserReserveDetails(true);
    } catch (e) {
      handleErrorMessage(e);
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    applyFilters(filterData, dependencyData);
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  return selectedTab !== null ? (
    <Tabs
      sx={{ width: IS_TAB_OVERRIDEN_WIDTH }}
      value={selectedTab}
      onChange={handleTabChange}
      aria-label="constraints-user-reserve-sub-tab"
      tabNames={
        props.showUserReserveTabs?.map((item) => ({
          label: item.label,
          value: item.value,
        })) || []
      }
      tabPanels={[
        <div
          key="store_reserve-panel"
          style={{ marginTop: CONSTRAINTS_OVERRIDEN_CORE_BUTTON_PLACEMENT }}
        >
          <StoreReserveViewComponent
            {...props}
            screenName={props.screenName}
            module={props.module}
            setKeyValueInCache={props?.setKeyValueInCache}
          />
        </div>,
        <div
          key="dc_reserve-panel"
          style={{ marginTop: CONSTRAINTS_OVERRIDEN_CORE_BUTTON_PLACEMENT }}
        >
          <DCReserveView
            {...props}
            screenName={props.screenName}
            module={props.module}
            setKeyValueInCache={props?.setKeyValueInCache}
          />
        </div>,
      ]}
    />
  ) : (
    <div style={{ marginTop: CONSTRAINTS_OVERRIDEN_CORE_BUTTON_PLACEMENT }}>
      <CoreComponentScreen
        IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        showFilterDashboard={true}
        filterConfigKey={"constraintsUserReserveFilterConfig"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        autoHideFilterButton={true}
      >
        {userReserveDetails && (
          <Loader loader={props.constraintsUserReserveLoader}>
            <UserReserveTableComponent
              columndef={columndef}
              setcolumndef={setcolumndef}
              displaySnackMessages={displaySnackMessages}
              selectedFilters={filterValuesOnRender}
              enableDownload={props.enableDownload}
              module={props.module}
            />
          </Loader>
        )}
      </CoreComponentScreen>
    </div>
  );
};
const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    constraintsUserReserveLoader:
      inventorysmartReducer.inventorySmartConstraints
        .constraintsUserReserveLoader,
    constraintsUserReserveFilterConfig:
      inventorysmartReducer.inventorySmartConstraints
        .constraintsUserReserveFilterConfig,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "constraintsUserReserveFilterConfig"
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    showUserReserveTabs:
      inventorysmartReducer.inventorySmartConstraints.userReserveConfigs?.userReserveTabs,
    cache: inventorysmartReducer?.activeModulesCacheService?.cache,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setConstraintsUserReserveFilterConfig: (body) =>
      dispatch(setConstraintsUserReserveFilterConfig(body)),
    resetConstraintsStoreState: (body) =>
      dispatch(resetConstraintsStoreState(body)),
    setConstraintsUserReserveLoader: (body) =>
      dispatch(setConstraintsUserReserveLoader(body)),
    setFilterConfiguration: (body) => dispatch(setFilterConfiguration(body)),
    clearActiveModuleCache: (module) =>
      dispatch(clearActiveModuleCache(module)),
    setKeyValueInCache: (keyValuePair) =>
      dispatch(setKeyValueInCache(keyValuePair)),
    getModuleBasedTenantConfig: (module) =>
      dispatch(getModuleBasedTenantConfig(module)),
    setUserReserveConfigs:(body) => dispatch(setUserReserveConfigs(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(UserReserveInvComponent);
