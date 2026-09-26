import { useHistory } from "react-router";
import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep, isEmpty } from "lodash";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { Button } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import classNames from "classnames";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";

import {
  resetConstraintsState,
  setConstraintsArticles,
  setConstraintsOmsLoader,
  setConstraintsOmsFilterDependency,
  setConstraintsOmsFilterElements,
  setSelectedOmsFilters,
  getOmsRulesConstraintsFilterConfiguration,
  resetSelectedOmsFilters,
} from "modules/oms/services-oms/Constraints/constraints-services";

import VendorConstraintsTable from "./vendorConstraintsTable";
import { EDIT_RULES } from "modules/oms/constants-oms/routeConstants";
import {
  OMS_CONSTRAINTS_SCREENNAME,
  OMS_VENDOR_CONSTRAINTS_SCREENNAME,
  OMS_CONSTRAINTS_SCREENNAME_KEY,
  tableConfigurationMetaData,
} from "modules/oms/constants-oms/stringConstants";
import {
  fetchFilterOptions,
  filtersPayload,
} from "modules/oms/utils-oms/oms-utility";
import {
  IS_OVERRIDEN_CORE_BUTTON_PLACEMENT,
  IS_OVERRIDEN_CORE_BUTTON_WIDTH,
} from "config/constants";
import { useStyles } from "modules/oms/styles-oms/orderingCustomStyles";

const VendorConstraints = (props) => {
  const history = useHistory();
  const classes = useStyles();
  const globalClasses = globalStyles();

  const [filters, setFilters] = useState([]);
  const [filterDependency, setFilterDependency] = useState([]);
  const [filterPayload, setFilterPayload] = useState([]);
  const [isFiltersValid, updateIsFiltersValid] = useState(false);
  const [
    isRedirectedFromDifferentPage,
    setIsRedirectedFromDifferentPage,
  ] = useState(false);
  const [onFilterReqBody, setOnFilterReqBody] = useState({});

  const type = new URLSearchParams(window.location.search).get("type");

  const savedFiltersDependency =
    JSON.parse(localStorage.getItem("selectedFiltersDependency")) || [];

  const HIDE_MANAGE_RULES_BUTTON =
    props?.constraintsConfig?.disable_manage_rules_button || false;

  // user access for vendor constraints manage rules button
  const constraintsAccess = props.userAccess?.find(
    (item) =>
      item.module === "vendor_constraints" &&
      item.screen === OMS_CONSTRAINTS_SCREENNAME_KEY
  );
  const canManageRules = constraintsAccess?.isManageRulesButton || false;

  const onFilterDashboard = async (filterElements, filterDependency) => {
    const payload = filtersPayload(filterElements, filterDependency, true);
    payload.reqBody = payload.reqBody.filter(
      (item) =>
        ["sale_type", "store_capacity"].indexOf(item.attribute_name) === -1
    );
    //setFilterPayload(dependency);
    updateIsFiltersValid(payload.isValid);
    props.setSelectedOmsFilters(payload.reqBody);
    let body = {
      meta: tableConfigurationMetaData.meta,
      filters: !isEmpty(filterDependency) ? filterDependency : [],
    };
    setOnFilterReqBody(body);
  };

  useEffect(() => {
    const selectedFiltersDependency =
      savedFiltersDependency?.length > 0
        ? savedFiltersDependency
        : props.filterDashboardConfiguration?.appliedFilterData?.dependencyData;

    props.setConstraintsOmsFilterDependency(selectedFiltersDependency);
    localStorage.removeItem("selectedFiltersDependency");
    localStorage.removeItem("selectedArticles");
    localStorage.removeItem("storeCodes");

    const fetchData = async () => {
      props.setConstraintsOmsLoader(true);
      try {
        const filterConfig =
          props?.filterConfigScreenName ||
          props.constraintsConfig?.vendor_constraints?.vendor_store_filter
            ? OMS_VENDOR_CONSTRAINTS_SCREENNAME
            : OMS_CONSTRAINTS_SCREENNAME;
        const response = await props.getOmsRulesConstraintsFilterConfiguration(
          filterConfig
        );
        let data = response.data.data;
        setFilters(data);
        props.setConstraintsOmsLoader(false);
      } catch (error) {
        props.setConstraintsOmsLoader(false);
      }
    };

    fetchData();

    return () => {
      props.resetConstraintsState([]);
    };
  }, []);

  useEffect(() => {
    if (!filters || filters?.length === 0) {
      return;
    }
    getFiltersOptions(props.savedFilterSelection);
  }, [filters]);

  useEffect(() => {
    return () => {
      props.setFilterConfiguration({
        vendorConstraintsOrderManagementFilterConfiguration: undefined,
        ConstraintsOrderManagementFilterConfiguration: undefined,
      });
      props.resetSelectedOmsFilters();
    };
  }, []);

  const getFiltersOptions = async (selected, current) => {
    try {
      props.setConstraintsOmsLoader(true);
      const selectedFilters = isRedirectedFromDifferentPage
        ? cloneDeep(props.constraintsOmsFilterDependency)
        : selected;
      let requiredFilterObjParams = {
        allFilters: filters || [],
        appliedFilters: selectedFilters,
        current: current,
        rolesBasedAccess: props?.roleBasedAccess,
        screenName: props.screenName,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);
      if (isEmpty(props.filterDashboardConfiguration)) {
        const filterConfigData = [
          {
            filterDashboardData: response,
            isCrossDimensionFilter: true,
            screen_name: props.screenName,
          },
        ];
        const filterConfig = formattedFilterConfiguration(
          "vendorConstraintsOrderManagementFilterConfiguration",
          filterConfigData,
          "Constraints Oms Screen",
          selectedFilters
        );
        if (isRedirectedFromDifferentPage) {
          const formattedSelectedFilters = formatSelectedFiltersData(
            filterConfigData,
            "Constraints Oms Screen",
            selectedFilters
          );
          filterConfig[
            "vendorConstraintsOrderManagementFilterConfiguration"
          ].isRedirectedFromDifferentPage = isRedirectedFromDifferentPage;
          // onFilterDashboardClick(selectedFilters, response);
          setFilterDependency(formattedSelectedFilters);
        }
        props.setFilterConfiguration(filterConfig);
      }
      //props.setFilterConfiguration(filterConfig);
      let filterElements = cloneDeep(response);
      //setFilters(response);
      props.setConstraintsOmsFilterElements(filterElements);
    } catch (error) {
      props.addSnack({
        message: "Error while fetching options",
        options: {
          variant: "error",
        },
      });
    } finally {
      props.setConstraintsOmsLoader(false);
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    onFilterDashboard(filterData, dependencyData);
  };

  useEffect(() => {
    if (
      props?.constraintsOmsFilterDependency?.length ||
      filterDependency?.length ||
      props?.filterDashboardConfiguration?.appliedFilterData?.dependencyData
        ?.length
    ) {
      props?.setIsFilterApplied(true);
    } else {
      props?.setIsFilterApplied(false);
    }
  }, [
    filterDependency,
    props?.constraintsOmsFilterDependency,
    props?.filterDashboardConfiguration,
  ]);

  const handleManageRules = () => {
    sessionStorage.setItem("isOMSConstraintsFlow", "true");
    sessionStorage.setItem("isConstraintsFlow", "true");
    history.push({
      pathname: EDIT_RULES,
    });
    localStorage.removeItem("rclCreatedTableName");
  };

  const addExtraButton = () => {
    let extraButtons = [];

    // Determine if Manage Rules button should be shown
    const shouldShowManageRules = !isEmpty(props?.userAccess)
      ? !HIDE_MANAGE_RULES_BUTTON && canManageRules
      : !HIDE_MANAGE_RULES_BUTTON &&
        props?.orderingAccessControl?.isEditButton?.isVisible;

    const isFilterApplied =
      props?.filterDashboardConfiguration?.appliedFilterData?.dependencyData
        ?.length;

    if (shouldShowManageRules && isFilterApplied) {
      extraButtons.push(
        <Button
          id="editRclConstraints"
          variant="secondary"
          onClick={handleManageRules}
        >
          Manage Rules
        </Button>
      );
    }

    return extraButtons;
  };

  return (
    <div style={{ marginTop: IS_OVERRIDEN_CORE_BUTTON_PLACEMENT }}>
      <CoreComponentScreen
        autoHideFilterButton={true}
        showPageRoute={false}
        showPageHeader={true}
        showFilterDashboard={true}
        filterConfigKey={"vendorConstraintsOrderManagementFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={false}
        filterDependency={filterDependency.length ? filterDependency : null}
        extraButtons={addExtraButton()}
        IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        customClassName={classes.customMarginBlock}
      >
        <VendorConstraintsTable selectedDependencyValue={onFilterReqBody} />
      </CoreComponentScreen>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    constraintsLoader:
      store.omsReducer.orderingConstraintsService.constraintsLoader,
    selectedConstraintArticles:
      store.omsReducer.orderingConstraintsService.selectedConstraintArticles,

    constraintsOmsFilterDependency:
      store.omsReducer.orderingConstraintsService
        .constraintsOmsFilterDependency,

    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "vendorConstraintsOrderManagementFilterConfiguration"
      ],
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    savedFilterSelection: store.filterReducer.savedFilterSelection,

    constraintsConfig:
      store.omsReducer.orderingConstraintsService.omsConstraintsScreenConfig
        ?.vendor_constraints,

    orderingScreensConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig,
    filterConfigScreenName:
      store.omsReducer.orderingCommonService.orderingScreensConfig?.constraints
        ?.vendor_constraints?.filter_config,
    orderingAccessControl:
      store.omsReducer.orderingCommonService.orderingAccessControl,
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
    roleBasedAccess:
      store.omsReducer.orderingCommonService.genericTenantConfig
        ?.roleBasedAccess,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  getOmsRulesConstraintsFilterConfiguration: (filterConfig) =>
    dispatch(getOmsRulesConstraintsFilterConfiguration(filterConfig)),
  setConstraintsOmsLoader: (payload) =>
    dispatch(setConstraintsOmsLoader(payload)),
  setConstraintsOmsFilterDependency: (payload) =>
    dispatch(setConstraintsOmsFilterDependency(payload)),
  setConstraintsArticles: (payload) =>
    dispatch(setConstraintsArticles(payload)),

  resetConstraintsState: (payload) => dispatch(resetConstraintsState(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  setConstraintsOmsFilterElements: (payload) =>
    dispatch(setConstraintsOmsFilterElements(payload)),
  setSelectedOmsFilters: (payload) => dispatch(setSelectedOmsFilters(payload)),
  resetSelectedOmsFilters: () => dispatch(resetSelectedOmsFilters()),
});

export default connect(mapStateToProps, mapDispatchToProps)(VendorConstraints);
