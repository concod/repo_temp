import PropTypes from "prop-types";
import React, { useEffect, useRef, useState } from "react";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import globalStyles from "core/Styles/globalStyles";
import DCStoreStrategytListTable, {
  handleErrorMessage,
} from "./dCStoreStrategyTable";
import StoreStrategyMasterDetailTable from "./StoreStrategyMasterDetailTable";
import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep, isEmpty } from "lodash";
import { setFilterConfiguration } from "core/actions/filterAction";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { Grid, Paper, Box } from "@mui/material";
import { Button, useTranslation } from "impact-ui-v3";
import { connect } from "react-redux";
import {
  displaySnackMessages,
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
} from "../../inventorysmart-utility";
import {
  ERROR_MESSAGE,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getStoreDcPolicyRulesList,
  setDcStorePolicyFilterConfig,
  setDcStorePolicyDataLoader,
  downloadDcStoreStrategy,
} from "modules/inventorysmart/services-inventorysmart/DC-Store-Policy/dc-store-strategy";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { EDIT_RULES } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { useLocation } from "react-router";
import { formatSelectedFiltersData } from "../../../../../core/commonComponents/coreComponentScreen/utils";
import { downloadDcNetworkStoreStrategy } from "modules/inventorysmart/services-inventorysmart/DC-Store-Policy/dc-store-strategy";
import { getModuleBasedTenantConfig, setNoOfButtonsNextToTab } from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { setRulesConstraintsConfigs } from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH, IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "config/constants";

// Matches dcStorePolicy tabPanelStyle paddingTop in Configuration tab-layout.
const STORE_POLICY_TAB_PANEL_PADDING = "16px";

// leaveSpaceForCore pulls header buttons onto the sub-tab row (-57px). Store Policy
// adds 16px tab-panel padding above this panel; Network (redirectedFromNetworkTab)
// does not, so only Store Policy needs the extra -16px in the calc.
const getCoreButtonRowMarginTop = (redirectedFromNetworkTab) =>
  redirectedFromNetworkTab
    ? IS_OVERRIDEN_CORE_BUTTON_PLACEMENT
    : `calc(${IS_OVERRIDEN_CORE_BUTTON_PLACEMENT.toLowerCase()} - ${STORE_POLICY_TAB_PANEL_PADDING})`;

const DCStorePolicyStrategy = (props) => {
  const { t } = useTranslation();
  let location = useLocation();
  const classes = useStyles();
  const globalClasses = globalStyles();
  const isPOStrategyFlow = props.is_po_strategy_flow || false;
  sessionStorage.setItem('is_po_strategy_flow', JSON.stringify(isPOStrategyFlow));
  const [onFilterReqBody, setOnFilterReqBody] = useState({});
  const [filterDependency, setFilterDependency] = useState([]);
  const [downloadDisabled, setDownloadDisabled] = useState(true);
  const [hasFiltersApplied, setHasFiltersApplied] = useState(false);
  const onFilterDependency = useRef([]);
  const downloadDcStoreStrategy = async () => {
    try {
      let response = props.redirectedFromNetworkTab
        ? await props.dcNetworkStoreStrategyDownload(onFilterReqBody)
        : await props.dcStoreStrategyDownload(onFilterReqBody);
      displaySnackMessages(response?.data?.data?.message, "success", props);
    } catch (err) {
      handleErrorMessage(err, props);
    }
  };

  useEffect(() => {
    fetchModuleConfigs();
    return () => {
      props.setNoOfButtonsNextToTab(undefined);
    };
  }, [])

  useEffect(() => {
    if (location.state?.filterValues?.length) {
      setHasFiltersApplied(true);
      onFilterDashboardClick(location.state?.filterValues, []);
    }
  }, [location.state?.filterValues]);

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let filterKey = props.redirectedFromNetworkTab
          ? "RCLSupplyNetwork"
          : isPOStrategyFlow
          ? "PO-Store-Policy-Strategy"
          : "DC-Store-Policy-Strategy";
        let response = await fetchFilterConfig(filterKey);
        if (response?.data?.show_message) {
          displaySnackMessages(response?.data?.message, "success", props);
        }
        props?.setDcStorePolicyFilterConfig(response);
      } catch (e) {
        handleErrorMessage(e, props);
      }
    };
    getInitialFilterConfiguration();
    return () => {};
  }, [isPOStrategyFlow]);

  useEffect(() => {
    if (
      (isEmpty(props.filterDashboardConfiguration) ||
        location.state?.filterValues?.length) &&
      !isEmpty(props.dcStorePolicyFilterConfigs)
    ) {
      getFilterValues(props.savedFilterSelection);
    }
  }, [
    props.dcStorePolicyFilterConfigs,
    props.savedFilterSelection,
    location.state?.filterValues,
  ]);

  const fetchModuleConfigs = async () => {
    try {
      let reqBody = {
        module_name: "rules_constraints_configs",
        screen_name: props.screenName,
      };
      let response = await props.getModuleBasedTenantConfig(reqBody);
      props.setRulesConstraintsConfigs(response);
    } catch (e) {
      handleErrorMessage(e,props);
    } 
  };

  function downloadButtonStateChange(state) {
    setDownloadDisabled(state);
  }

  const getFilterValues = async (selected, current) => {
    try {
      let requiredFilterObjParams = {
        allFilters: cloneDeep(props.dcStorePolicyFilterConfigs),
        appliedFilters: selected,
        current: current,
        rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
        screenName: props.screenName,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);
      let filterKey = props.redirectedFromNetworkTab
        ? "RCLSupplyNetwork"
        : isPOStrategyFlow
        ? "PO-Store-Policy-Strategy"
        : "DC-Store-Policy-Strategy";

      const filterConfigData = [
        {
          filterDashboardData: response,
          expectedFilterDimensions: getFilterDimensions(response),
          isCrossDimensionFilter: true,
          screen_name: props.screenName,
          saved_filter_screen_name: filterKey,
          update_filter_dimension_on_apply: !props.inventorysmart_product_supersession_v3,
        },
      ];
      const filterConfig = formattedFilterConfiguration(
        "dcStorePolicyFilterConfigs",
        filterConfigData,
        filterKey
      );
      if (location.state?.filterValues?.length) {
        const formattedSelectedFilters = formatSelectedFiltersData(
          filterConfigData,
          filterKey,
          location.state?.filterValues
        );
        setFilterDependency(formattedSelectedFilters);
      }
      props.setFilterConfiguration(filterConfig);
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error", props);
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    onFilterDependency.current = dependencyData;
    setHasFiltersApplied(dependencyData?.length > 0);
    applyFilters(filterData, dependencyData);
  };

  const applyFilters = async (_filterElements, dependency) => {
    let body = {
      meta: tableConfigurationMetaData.meta,
      filters: !isEmpty(dependency) ? dependency : [],
      is_po_strategy_flow: isPOStrategyFlow,
    };
    setOnFilterReqBody(body);
  };
  const handleManageRcl = () => {
    props?.history?.push({
      pathname: EDIT_RULES,
      state: {
        filterHistoryValues: onFilterDependency.current,
        redirectedFromNetworkTab: props.redirectedFromNetworkTab,
        is_po_strategy_flow: isPOStrategyFlow,
      },
    });
    sessionStorage.setItem("isConstraintsFlow", "false");
    sessionStorage.setItem("isOMSConstraintsFlow", "false");
    localStorage.removeItem("rclCreatedTableName");
  };

 useEffect(() => {
    const shouldShowManageRclButton =
      hasFiltersApplied &&
      props.rulesConstraintsConfigs?.headerButtons?.includes("editRclConstraints");
    
    if (shouldShowManageRclButton) {
      props.setNoOfButtonsNextToTab(2);
    } else {
      props.setNoOfButtonsNextToTab(undefined);
    }
  }, [hasFiltersApplied, props.rulesConstraintsConfigs?.headerButtons]);

  const addExtraButton = () => {
    let extraButtons = [];
    if (
      onFilterDependency?.current?.length > 0 &&
      props.rulesConstraintsConfigs?.headerButtons?.includes("editRclConstraints")
    ) {
      extraButtons.push(
        <Button
          id="manageRclButton"
          variant="secondary"
          onClick={handleManageRcl}
          style={{
            width: IS_OVERRIDEN_CORE_BUTTON_WIDTH,
            marginBottom: "8px",
          }}
        >
          {t("inventorysmart.dcStorePolicyManageRCLButton")}
        </Button>
      );
    }
    return extraButtons;
  };

  // Function to handle opening filter modal for secondary button
  const handleOpenFilterModal = () => {
    // Find and click the filter toggle button to open the modal
    const filterButton = document.getElementById("filterToggleBtn");
    if (filterButton) {
      filterButton.click();
    }
  };

  return (
    <>
      <div style={{ marginTop: getCoreButtonRowMarginTop(props.redirectedFromNetworkTab) }}>
        <CoreComponentScreen
          IscoreButtonWidth = {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
          showFilterDashboard={true}
          filterConfigKey={"dcStorePolicyFilterConfigs"}
          onApplyFilter={(dependencyData, filterData) =>
            onFilterDashboardClick(dependencyData, filterData)
          }
          hideNoDataFound={Boolean(location.state?.filterValues?.length)}
          label={"label"} // What is this used for?
          showPageRoute={false} // When true pageLabel shows within container above Select Filters
          showPageHeader={false} // To show pageLabel Alone as header in same line as extra buttons
          pageLabel={"pageLabel"} // Just bold page label on left of Select Filters
          extraButtons={addExtraButton()}
          contained={true} //  To render children after clicking on Apply
          filterDependency={
            location.state?.filterValues?.length && filterDependency
          }
          chipsDependency={
            location.state?.filterValues?.length
              ? location.state?.filterValues
              : null
          }
          autoHideFilterButton={true}
          emptyStateSecondaryButtonLabel={
            props.rulesConstraintsConfigs?.headerButtons?.includes(
              "editRclConstraints"
            )
              ? t("inventorysmart.dcStorePolicyManageRCLButton")
              : undefined
          }
          emptyStateSecondaryButtonClick={
            props.rulesConstraintsConfigs?.headerButtons?.includes("editRclConstraints")
              ? handleManageRcl
              : undefined
          }
        >
        {onFilterDependency?.current?.length > 0 && (
          <Grid>
            <div className={globalClasses.marginVertical1rem}>
              {props.inventorysmartScreenConfig?.inventorysmart_configuration?.drillDown?.showStoreSourceColumn  ? (
                <StoreStrategyMasterDetailTable
                  selectedDependencyValue={onFilterReqBody}
                  history={props?.history}
                  redirectedFromNetworkTab={props.redirectedFromNetworkTab}
                  is_po_strategy_flow={isPOStrategyFlow}
                  module={"inventorysmart_configuration"}
                  downloadButtonStateChange={downloadButtonStateChange}
                  showDownload={props?.showDownload}
                  downloadDisabled={downloadDisabled}
                  downloadDcStoreStrategy={downloadDcStoreStrategy}
                />
              ) : (
                <DCStoreStrategytListTable
                  selectedDependencyValue={onFilterReqBody}
                  history={props?.history}
                  redirectedFromNetworkTab={props.redirectedFromNetworkTab}
                  is_po_strategy_flow={isPOStrategyFlow}
                  module={"inventorysmart_configuration"}
                  downloadButtonStateChange={downloadButtonStateChange}
                  showDownload={props?.showDownload}
                  downloadDisabled={downloadDisabled}
                  downloadDcStoreStrategy={downloadDcStoreStrategy}
                />
              )}
            </div>
          </Grid>
        )}
        </CoreComponentScreen>
      </div>
    </>
  );
};

DCStorePolicyStrategy.propTypes = {
  getStoreDcPolicyRulesList: PropTypes.func,
  dcStorePolicyFilterConfigs: PropTypes.any,
  setDcStorePolicyFilterConfig: PropTypes.func,
  setDcStorePolicyDataLoader: PropTypes.func,
  filterDashboardConfiguration: PropTypes.any,
  history: PropTypes.shape({
    push: PropTypes.func,
  }),
  inventorysmartScreenConfig: PropTypes.shape({
    roleBasedAccess: PropTypes.any,
  }),
  savedFilterSelection: PropTypes.any,
  screenName: PropTypes.any,
  setFilterConfiguration: PropTypes.func,
  tenantFilterUamConfig: PropTypes.any,
  is_po_strategy_flow: PropTypes.bool
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    dcStorePolicyFilterConfigs:
      inventorysmartReducer?.dcStoreStrategyReducer?.dcStorePolicyFilterConfigs,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration["dcStorePolicyFilterConfigs"],
    savedFilterSelection: filterReducer.savedFilterSelection,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    rulesConstraintsConfigs:
      inventorysmartReducer?.rulesConstraintsReducer?.rulesConstraintsConfigs,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    inventorysmart_product_supersession_v3:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_product_supersession_v3,
    showDownload:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_configuration?.drillDown
        ?.download_dc_store_strategy,
    dc_store_child_table_view:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_configuration?.drillDown
        ?.dc_store_child_table_view,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setDcStorePolicyFilterConfig: (body) =>
      dispatch(setDcStorePolicyFilterConfig(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setDcStorePolicyDataLoader: (body) =>
      dispatch(setDcStorePolicyDataLoader(body)),
    getStoreDcPolicyRulesList: (body) =>
      dispatch(getStoreDcPolicyRulesList(body)),
    dcStoreStrategyDownload: (body) => dispatch(downloadDcStoreStrategy(body)),
    dcNetworkStoreStrategyDownload: (body) =>
      dispatch(downloadDcNetworkStoreStrategy(body)),
    getModuleBasedTenantConfig: (module) =>
      dispatch(getModuleBasedTenantConfig(module)),
    setRulesConstraintsConfigs: (body) =>
      dispatch(setRulesConstraintsConfigs(body)),
    setNoOfButtonsNextToTab: (value) =>
      dispatch(setNoOfButtonsNextToTab(value)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DCStorePolicyStrategy);
