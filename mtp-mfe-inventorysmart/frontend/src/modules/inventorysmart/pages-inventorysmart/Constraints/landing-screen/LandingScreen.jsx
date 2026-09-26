import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { Tabs } from "impact-ui-v3";
import { AllRulesComponent } from "./AllRulesComponent";
import { RuleGroupsComponent } from "./RuleGroupsComponent";
import { ExceptionComponent } from "./ExceptionComponent";
import RuleResolutionComponent from "./RuleResolutionComponent";
import { resetCreateNewRuleFlowState } from "../create-new-rule-flow/createNewRuleFlowSession";
import { cloneDeep, isEmpty } from "lodash";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { CREATE_NEW_RULE, EDIT_CREATE_EXCEPTION_SCREEN } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { connect } from "react-redux";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
} from "../../inventorysmart-utility";
import {
  APP_NAME,
  ERROR_MESSAGE,
  FULL_ACCESS_PERMISSIONS_LIST,
  INVENTORY_SUBMODULES_NAMES,
  ROLES_ACCESS_MODULES_MAPPING,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  downloadStoreConstraints,
  saveEditedRules,
  saveRuleName,
  setRulesConstraintsFilterConfig,
  setRulesTableLoader,
  stateRulesDataOnServer,
  saveEditedRCL,
  setRclSelectedProductLevel,
  setProductsLevelDataForBackFlow,
  setSelectedRulesList,
  setAllModalVisibility,
} from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import {
  saveEditedExceptions,
  setExceptionConfigs,
  setSelectedExceptionList,
  setAllModalVisibility as setExceptionSetAllModalVisibility,
} from "modules/inventorysmart/services-inventorysmart/Exception-Constriants/exception-constraint-services";
import { addSnack } from "core/actions/snackbarActions";
import { resetFilterConfiguration, setFilterConfiguration } from "core/actions/filterAction";
import { updateBackedRules } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { handleErrorMessage } from "../Rules-Constraints/add-rcl-component";
import { getColumnsAg } from "actions/tableColumnActions";
import { formatActionColumn } from "./constraintsCommonUtils";
import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
  getModuleBasedTenantConfig,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import { displaySnackMessages } from "../../inventorysmart-utility";
import {
  CONSTRAINTS_OVERRIDEN_CORE_BUTTON_PLACEMENT,
} from "config/constants";

import { useLocation } from "react-router-dom";
import {
  LANDING_SCREEN_TAB,
  LANDING_SCREEN_TABS,
  isConstraintsLandingPath,
  resolveLandingScreenTab,
} from "./landingScreenConstants";

const MANAGE_RCL_PERMISSION_MODULE = "inventorysmart_add_rules";
const RULES_CONSTRAINT_TABLE_COLUMNS_QUERY =
  "table_name=rules_constraint_table";

let rulesConstraintTableColumnsRequest = null;

const fetchRulesConstraintTableColumns = () => {
  if (!rulesConstraintTableColumnsRequest) {
    rulesConstraintTableColumnsRequest = getColumnsAg(
      RULES_CONSTRAINT_TABLE_COLUMNS_QUERY
    )().catch((error) => {
      rulesConstraintTableColumnsRequest = null;
      throw error;
    });
  }
  return rulesConstraintTableColumnsRequest;
};

/** New constraints landing flow — rendered only when `showNewConstraintFlow` is true. */
const LandingScreen = (props) => {
  const location = useLocation();
  const [onFilterReqBody, setOnFilterReqBody] = useState({});
  const [constraintRulesPayload, setConstraintRulesPayload] = useState([]);
  const onFilterDependency = useRef([]);
  const filterAppliedByUser = useRef(false);
  const hasInitializedFilterDashboardRef = useRef(false);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [
    rulesConstraintColumnsFromParent,
    setRulesConstraintColumnsFromParent,
  ] = useState(null);
  const [landingTabValue, setLandingTabValue] = useState(() =>
    resolveLandingScreenTab(location)
  );
  const previousPathnameRef = useRef();
  // Set when a rule group is created from the All Rules tab, so we can surface
  // an "Added" badge on the Rule Groups tab header until the user visits it.
  const [ruleGroupAdded, setRuleGroupAdded] = useState(false);

  const landingTabs = useMemo(
    () =>
      LANDING_SCREEN_TABS.map((tab) =>
        tab.value === "rule_groups" && ruleGroupAdded
          ? {
              ...tab,
              label: (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  Rule Groups
                  <span
                    style={{
                      backgroundColor: "#EBF7F1",
                      color: "#26734B",
                      fontSize: "12px",
                      fontWeight: 600,
                      lineHeight: "16px",
                      padding: "0px 6px",
                      borderRadius: "1000px",
                    }}
                  >
                    Added
                  </span>
                </span>
              ),
            }
          : tab
      ),
    [ruleGroupAdded]
  );

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = location.pathname;

    if (!isConstraintsLandingPath(location.pathname)) {
      return;
    }

    const enteredFromOutside =
      Boolean(previousPathname) &&
      !isConstraintsLandingPath(previousPathname);
    const hasReturnHint = Boolean(location.state?.preselectedTab);

    if (!enteredFromOutside && !hasReturnHint) {
      return;
    }

    setLandingTabValue(resolveLandingScreenTab(location));
    if (hasReturnHint) {
      props.history.replace({ ...props.history.location, state: {} });
    }
  }, [location.key, location.pathname, location.state?.preselectedTab]);

  // Clear pending edits when leaving this screen so Apply does not show
  // stale Redux state after navigating away and coming back.
  useEffect(() => {
    return () => {
      props.saveEditedRules([]);
      props.saveEditedExceptions([]);
    };
  }, []);

  useEffect(() => {
    const fetchExceptionConfigs = async () => {
      try {
        const reqBody = {
          module_name: "exception_configs",
          screen_name: props.screenName,
        };
        const response = await props.getModuleBasedTenantConfig(reqBody);
        props.setExceptionConfigs(response);
      } catch (e) {
        handleErrorMessage(e, props);
      }
    };
    fetchExceptionConfigs();
  }, []);

  const [filterConfigLoading, setFilterConfigLoading] = useState(false);
  const [shouldOpenFilterModal, setShouldOpenFilterModal] = useState(false);
  const [pendingFilterModalOpen, setPendingFilterModalOpen] = useState(false);
  const hasRulesConstraintsFilterConfig =
    Array.isArray(props.rulesConstraintsFilterConfig) &&
    props.rulesConstraintsFilterConfig.length > 0;

  const loadRulesConstraintsFilterConfig = useCallback(async () => {
    if (hasRulesConstraintsFilterConfig) {
      return true;
    }

    setFilterConfigLoading(true);
    try {
      const response = await fetchFilterConfig("Rules Constraints");
      props?.setRulesConstraintsFilterConfig(response);
      return true;
    } catch (e) {
      handleErrorMessage(e, props);
      return false;
    } finally {
      setFilterConfigLoading(false);
    }
  }, [hasRulesConstraintsFilterConfig, props.setRulesConstraintsFilterConfig]);

  useEffect(() => {
    loadRulesConstraintsFilterConfig();
  }, [loadRulesConstraintsFilterConfig]);

  const handleEmptyStateAddFilter = useCallback(async () => {
    if (hasRulesConstraintsFilterConfig) {
      setShouldOpenFilterModal(true);
      return;
    }

    setPendingFilterModalOpen(true);
    const loaded = await loadRulesConstraintsFilterConfig();
    if (!loaded) {
      setPendingFilterModalOpen(false);
    }
  }, [hasRulesConstraintsFilterConfig, loadRulesConstraintsFilterConfig]);

  useEffect(() => {
    if (!pendingFilterModalOpen || !hasRulesConstraintsFilterConfig) {
      return;
    }
    setPendingFilterModalOpen(false);
    setShouldOpenFilterModal(true);
  }, [pendingFilterModalOpen, hasRulesConstraintsFilterConfig]);

  useEffect(() => {
    if (!shouldOpenFilterModal) {
      return;
    }
    setShouldOpenFilterModal(false);
  }, [shouldOpenFilterModal]);

  const downloadStoreConstraintsHandler = async () => {
    const payload = cloneDeep(constraintRulesPayload);
    delete payload?.meta?.limit;
    try {
      const response = await props.storeConstraintsDownload(payload);
      displaySnackMessages(response?.data?.data?.message, "success", props);
    } catch (err) {
      handleErrorMessage(err, props);
    }
  };

  useEffect(() => {
    if (!filtersApplied || rulesConstraintColumnsFromParent) {
      return;
    }

    let cancelled = false;

    fetchRulesConstraintTableColumns()
      .then((columns) => {
        if (!cancelled) {
          setRulesConstraintColumnsFromParent(formatActionColumn(columns));
        }
      })
      .catch((e) => {
        if (!cancelled) {
          handleErrorMessage(e, props);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filtersApplied, rulesConstraintColumnsFromParent]);

  useEffect(() => {
    if (
      !hasRulesConstraintsFilterConfig ||
      hasInitializedFilterDashboardRef.current
    ) {
      return;
    }
    // Rebuild on each landing-screen mount so a previous visit's applied
    // filters are not reused. That avoids flashing tabs/tables before
    // auto-apply finishes, and lets the filter loader run first.
    hasInitializedFilterDashboardRef.current = true;
    const getFilterValues = async (selected, current) => {
      try {
        const requiredFilterObjParams = {
          allFilters: cloneDeep(props.rulesConstraintsFilterConfig),
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
            saved_filter_screen_name: "Rules Constraints",
            update_filter_dimension_on_apply: !props.inventorysmart_product_supersession_v3,
          },
        ];
        const filterConfig = formattedFilterConfiguration(
          "rulesConstraintsFilterConfig",
          filterConfigData,
          "Rules Constraints"
        );
        props.setFilterConfiguration(filterConfig);
      } catch (err) {
        handleErrorMessage(err, props);
      }
    };
    getFilterValues(props.savedFilterSelection);
  }, [hasRulesConstraintsFilterConfig, props.savedFilterSelection]);

  // Syncs onFilterReqBody when Redux appliedFilterData changes (e.g. page refresh / initial load).
  // Skips setOnFilterReqBody when the change was already handled by applyFilters (user click)
  // to avoid duplicate API calls in child components.
  useEffect(() => {
    const dependencyData =
      props.filterDashboardConfiguration?.appliedFilterData?.dependencyData ||
      [];
    const hasAppliedFilters = dependencyData.length > 0;
    setFiltersApplied(hasAppliedFilters);
    if (hasAppliedFilters) {
      onFilterDependency.current = dependencyData;
      if (filterAppliedByUser.current) {
        // applyFilters already called setOnFilterReqBody — reset flag and skip to prevent duplicate calls
        filterAppliedByUser.current = false;
      } else {
        setOnFilterReqBody({
          meta: tableConfigurationMetaData.meta,
          filters: dependencyData,
        });
      }
    }
  }, [props.filterDashboardConfiguration?.appliedFilterData?.dependencyData]);

  const onFilterDashboardClick = (dependencyData, filterData) => {
    onFilterDependency.current = dependencyData;
    setFiltersApplied(dependencyData?.length > 0);
    applyFilters(filterData, dependencyData);
  };

  const applyFilters = async (_filterElements, dependency) => {
    props.setRulesTableLoader(true);
    filterAppliedByUser.current = true;
    const body = {
      meta: tableConfigurationMetaData.meta,
      filters: !isEmpty(dependency) ? dependency : [],
    };
    setOnFilterReqBody(body);
  };

  const saveDataOnApply = () => {
    updateBackedRules(props);
  };

  const fetchManageRclModuleHierarchyAccess = async () => {
    const module = MANAGE_RCL_PERMISSION_MODULE;
    const subModules = ROLES_ACCESS_MODULES_MAPPING[module];
    const rolesBasedModulesPermission = {};

    props.setInventorySmartPermissionLoader(true);
    try {
      if (props.inventorysmartScreenConfig?.roleBasedAccess) {
        const accessDataResponse = await getModuleLevelAccessUtility({
          app: APP_NAME,
          module: subModules,
        })();
        Object.assign(
          rolesBasedModulesPermission,
          Object.fromEntries(
            Object.entries(accessDataResponse).map(([mod, actions]) => [
              mod,
              Object.keys(actions),
            ])
          )
        );
      } else {
        subModules.forEach((subModule) => {
          rolesBasedModulesPermission[subModule] = FULL_ACCESS_PERMISSIONS_LIST;
        });
      }

      props.setInventorySmartModulesPermissions({
        [module]: rolesBasedModulesPermission,
      });

      const createRulesConstraintActions =
        rolesBasedModulesPermission[
          INVENTORY_SUBMODULES_NAMES.INVENTORY_CREATE_RULES_CONSTRAINT
        ];
      const hasEditPermission =
        !props.inventorysmartScreenConfig?.roleBasedAccess ||
        createRulesConstraintActions?.includes("edit");

      return { hasEditPermission };
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error", props);
      throw error;
    } finally {
      props.setInventorySmartPermissionLoader(false);
    }
  };

  const handleCreateNewRule = async () => {
    sessionStorage.setItem("isOMSConstraintsFlow", "false");
    sessionStorage.setItem("isConstraintsFlow", "true");
    resetCreateNewRuleFlowState({
      setRclSelectedProductLevel: props.setRclSelectedProductLevel,
      setProductsLevelDataForBackFlow: props.setProductsLevelDataForBackFlow,
      saveEditedRCL: props.saveEditedRCL,
      resetFilterConfiguration: props.resetFilterConfiguration,
    });
    try {
      const { hasEditPermission } = await fetchManageRclModuleHierarchyAccess();
      if (!hasEditPermission) {
        displaySnackMessages(
          "You don't have permission to create new rules.",
          "warning",
          props
        );
        return;
      }
      props?.history?.push({
        pathname: CREATE_NEW_RULE,
        state: {
          showNewConstraintFlow: props.showNewConstraintFlow,
          preselectedTab: LANDING_SCREEN_TAB.ALL_RULES,
        },
      });
    } catch {
      // fetchManageRclModuleHierarchyAccess already surfaced ERROR_MESSAGE
    }
  };

  const handleAddExceptions = () => {
    const filters = onFilterDependency.current || [];
    const ruleList = (props.selectedRulesPlan || [])
      .filter((row) => !row.is_default)
      .map((row) => ({
        id: row.key,
        psa_code: row.psa_code,
        rcl_code: row.rcl_code,
        rule_code: row.rule_code,
      }));
    sessionStorage.setItem(
      "inventorysmart_constraints_exception_filters",
      JSON.stringify({ filters, source: "all_rules", rule_list: ruleList, table_name: "" })
    );
    props?.history?.push(EDIT_CREATE_EXCEPTION_SCREEN);
  };

  const saveRuleNameOnBlur = async (
    params,
    row,
    column,
    _payload,
    agGridInstance
  ) => {
    if (column.colId === "rule_name") {
      saveDataOnApply();
      const rulePayload = {
        rule_name: params?.target?.value,
        rule_code: row?.rule_code,
      };
      props?.setRulesTableLoader(true);
      const response = await saveRuleName(rulePayload);
      if (response?.data?.message) {
        displaySnackMessages(response?.data?.message, "success", props);
      }
      setTimeout(() => {
        agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
      }, 0);
      props?.setRulesTableLoader(false);
    }
  };

  const handleLandingTabChange = (_event, newValue) => {
    // Discard pending cell edits when leaving a tab so Apply does not
    // reappear with stale Redux state after coming back.
    if (landingTabValue === "all_rules" && newValue !== "all_rules") {
      props.saveEditedRules([]);
    }
    if (landingTabValue === "exceptions" && newValue !== "exceptions") {
      props.saveEditedExceptions([]);
    }
    // Reset shared states used by Rule Groups (constraints + exceptions sub-tabs)
    if (landingTabValue === "rule_groups" && newValue !== "rule_groups") {
      props.saveEditedRules([]);
      props.setSelectedRulesList([]);
      props.setAllModalVisibility(false);
      props.saveEditedExceptions([]);
      props.setSelectedExceptionList([]);
      props.setExceptionSetAllModalVisibility(false);
    }
    setLandingTabValue(newValue);
    // Clear the "Added" indicator once the user opens the Rule Groups tab.
    if (newValue === "rule_groups") {
      setRuleGroupAdded(false);
    }
  };

  const handleRuleGroupCreated = () => {
    setRuleGroupAdded(true);
  };

  const renderLandingTabPanels = () => [
    <RuleGroupsComponent
      key="rule_groups"
      onFilterReqBody={onFilterReqBody}
      isTabActive={landingTabValue === "rule_groups"}
      history={props.history}
      module={props.module}
      screenName={props.screenName}
      addSnack={props.addSnack}
    />,
    <AllRulesComponent
      key="all_rules"
      isNewConstraintsFlow={props.isNewFlow}
      rulesTableLoader={props.rulesTableLoader}
      onFilterReqBody={onFilterReqBody}
      isTabActive={landingTabValue === "all_rules"}
      addSnack={props.addSnack}
      history={props.history}
      module={props.module}
      screenName={props.screenName}
      callRulesSaveOnBlur={(params, row, column, payload, agGridInstance) =>
        saveRuleNameOnBlur(params, row, column, payload, agGridInstance)
      }
      setConstraintRulesPayload={setConstraintRulesPayload}
      constraintRulesPayload={constraintRulesPayload}
      downloadStoreConstraints={downloadStoreConstraintsHandler}
      onApply={saveDataOnApply}
      rulesConstraintColumnsFromParent={rulesConstraintColumnsFromParent}
      showNewConstraintFlow={true}
      onCreateNewRule={handleCreateNewRule}
      onAddExceptions={handleAddExceptions}
      onRuleGroupCreated={handleRuleGroupCreated}
      selectedRules={props.selectedRulesPlan}
    />,
    <ExceptionComponent
      key="exceptions"
      history={props.history}
      module={props.module}
      isNewConstraintsFlow={props.isNewFlow}
      screenName={props.screenName}
      filterDependency={onFilterReqBody.filters}
    />,
    <RuleResolutionComponent key="rule_resolution" {...props} />,
  ];

  return (
    <div
      style={{
        marginTop: filtersApplied
          ? CONSTRAINTS_OVERRIDEN_CORE_BUTTON_PLACEMENT
          : undefined,
      }}
    >
      <CoreComponentScreen
        showFilterDashboard={true}
        filterConfigKey="rulesConstraintsFilterConfig"
        onApplyFilter={(dependencyData, filterData) =>
          onFilterDashboardClick(dependencyData, filterData)
        }
        autoHideFilterButton={true}
        hideNoDataFound={filtersApplied}
        defaultOpenModel={shouldOpenFilterModal}
        emptyStateOnPrimaryButtonClick={handleEmptyStateAddFilter}
        primaryButtonProps={{ disabled: filterConfigLoading }}
        emptyStatePrimaryButtonLabel={
          filterConfigLoading ? "Loading filters..." : undefined
        }
      >
        {filtersApplied && (
          <Tabs
            value={landingTabValue}
            onChange={handleLandingTabChange}
            orientation="horizontal"
            aria-label="constraints-landing-tabs"
            tabNames={landingTabs}
            tabPanels={renderLandingTabPanels()}
          />
        )}
      </CoreComponentScreen>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    rulesTableLoader:
      inventorysmartReducer.rulesConstraintsReducer.rulesTableLoader,
    selectedRulesPlan:
      inventorysmartReducer.rulesConstraintsReducer.selectedRulesPlan,
    rulesConstraintsFilterConfig:
      inventorysmartReducer?.rulesConstraintsReducer
        ?.rulesConstraintsFilterConfig,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration.rulesConstraintsFilterConfig,
    savedFilterSelection: filterReducer.savedFilterSelection,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    getSavedEditedRules:
      inventorysmartReducer?.rulesConstraintsReducer.editedRules,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    inventorysmart_product_supersession_v3:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_product_supersession_v3,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (snack) => dispatch(addSnack(snack)),
  setInventorySmartModulesPermissions: (body) =>
    dispatch(setInventorySmartModulesPermissions(body)),
  setInventorySmartPermissionLoader: (body) =>
    dispatch(setInventorySmartPermissionLoader(body)),
  setRulesConstraintsFilterConfig: (body) =>
    dispatch(setRulesConstraintsFilterConfig(body)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  setRulesTableLoader: (body) => dispatch(setRulesTableLoader(body)),
  saveEditedRules: (body) => dispatch(saveEditedRules(body)),
  setSelectedRulesList: (body) => dispatch(setSelectedRulesList(body)),
  setAllModalVisibility: (body) => dispatch(setAllModalVisibility(body)),
  saveEditedExceptions: (body) => dispatch(saveEditedExceptions(body)),
  setSelectedExceptionList: (body) => dispatch(setSelectedExceptionList(body)),
  setExceptionSetAllModalVisibility: (body) => dispatch(setExceptionSetAllModalVisibility(body)),
  saveEditedRCL: (body) => dispatch(saveEditedRCL(body)),
  setRclSelectedProductLevel: (body) => dispatch(setRclSelectedProductLevel(body)),
  setProductsLevelDataForBackFlow: (body) =>
    dispatch(setProductsLevelDataForBackFlow(body)),
  resetFilterConfiguration: (body) => dispatch(resetFilterConfiguration(body)),
  stateRulesDataOnServer: (body) => dispatch(stateRulesDataOnServer(body)),
  storeConstraintsDownload: (body) => dispatch(downloadStoreConstraints(body)),
  getModuleBasedTenantConfig: (body) => dispatch(getModuleBasedTenantConfig(body)),
  setExceptionConfigs: (body) => dispatch(setExceptionConfigs(body)),
});

export default connect(mapStateToProps, mapDispatchToProps)(LandingScreen);
