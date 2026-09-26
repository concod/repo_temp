import { useNavigate } from "react-router-dom-v5-compat";
import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep, isEmpty } from "lodash";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { ButtonGroup } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  IS_OVERRIDEN_CORE_BUTTON_PLACEMENT,
  IS_OVERRIDEN_CORE_BTN_PLACEMENT_TWO_TABS,
  IS_OVERRIDEN_CORE_BUTTON_WIDTH,
} from "config/constants";

import {
  fetchFilterOptions,
  filtersPayload,
} from "modules/oms/utils-oms/oms-utility";
import {
  resetConstraintsState,
  setConstraintsOmsLoader,
  setConstraintsOmsFilterDependency,
  getConstraintOmsFilterConfiguration,
  setConstraintsOmsFilterElements,
  setSelectedOmsFilters,
  setIsFilterOmsValid,
  resetSelectedOmsFilters,
} from "modules/oms/services-oms/Constraints/constraints-services";

import LeadTime from "./leadTime";
import LeadTimeVendorStore from "./leadTimeVendorStore";
import QcTime from "./qcTime";
import { useStyles } from "modules/oms/styles-oms/orderingCustomStyles.js";

const OrderingDelivery = (props) => {
  const navigate = useNavigate();
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [filters, setFilters] = useState([]);
  const [filterDependency, setFilterDependency] = useState([]);
  const [filterPayload, setFilterPayload] = useState([]);
  const [isFiltersValid, updateIsFiltersValid] = useState(false);
  const [
    isRedirectedFromDifferentPage,
    setIsRedirectedFromDifferentPage,
  ] = useState(false);

  const tabOptions = props.vendorToStoreScreenConfig?.headers_tab;

  const [selectedTabVendor, setSelectedTabVendor] = useState(
    tabOptions?.length > 0 ? tabOptions[0].value : "vendor_dc"
  );

  const type = new URLSearchParams(window.location.search).get("type");

  const savedFiltersDependency =
    JSON.parse(localStorage.getItem("selectedFiltersDependency")) || [];

  const onFilterDashboard = async (filterElements, filterDependency) => {
    const payload = filtersPayload(filterElements, filterDependency, true);
    payload.reqBody = payload.reqBody.filter(
      (item) =>
        ["sale_type", "store_capacity"].indexOf(item.attribute_name) === -1
    );
    //setFilterPayload(dependency);
    updateIsFiltersValid(payload.isValid);
    props?.setIsFilterOmsValid(payload.isValid);
    props.setSelectedOmsFilters(payload.reqBody);
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
        //fetch the filter levels
        const response = await props.getConstraintOmsFilterConfiguration();
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
          "ConstraintsOrderManagementFilterConfiguration",
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
            "ConstraintsOrderManagementFilterConfiguration"
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

  const handleTabChange = (event, newValue) => {
    props.resetSelectedOmsFilters();
    setSelectedTabVendor(newValue);
  };

  const getFilterButtonPlacementStyle = () => {
    if (tabOptions?.length > 1)
      return {
        marginTop: IS_OVERRIDEN_CORE_BTN_PLACEMENT_TWO_TABS,
      };
    return {
      marginTop: IS_OVERRIDEN_CORE_BUTTON_PLACEMENT,
    };
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

  return (
    <div id="deliveryComponent">
      {tabOptions?.length > 1 && (
        <div
          className={`${globalClasses.centerAlign} ${globalClasses.marginBottom}`}
        >
          <ButtonGroup
            onChange={handleTabChange}
            options={tabOptions}
            selectedOption={selectedTabVendor}
          />
        </div>
      )}

      {selectedTabVendor === "vendor_dc" ? (
        <>
          <div
            style={getFilterButtonPlacementStyle()}
            className={
              tabOptions?.length > 1
                ? classes.withOuterTabs
                : classes.withoutOuterTabs
            }
          >
            <CoreComponentScreen
              autoHideFilterButton={true}
              showPageRoute={false}
              showPageHeader={true}
              showFilterDashboard={true}
              filterConfigKey={"ConstraintsOrderManagementFilterConfiguration"}
              onApplyFilter={onFilterDashboardClick}
              contained={false}
              filterDependency={
                filterDependency?.length ? filterDependency : null
              }
              IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
              customClassName={classes.customMarginBlock}
            >
              {props?.selectedTab === "Lead Time" && <LeadTime />}
              {props?.selectedTab === "Qc Time" && <QcTime />}
            </CoreComponentScreen>
          </div>
        </>
      ) : (
        <LeadTimeVendorStore />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "ConstraintsOrderManagementFilterConfiguration"
      ],
    constraintsLoader:
      store.omsReducer.orderingConstraintsService.constraintsLoader,
    selectedConstraintArticles:
      store.omsReducer.orderingConstraintsService.selectedConstraintArticles,
    constraintsOmsFilterDependency:
      store.omsReducer.orderingConstraintsService
        .constraintsOmsFilterDependency,
    roleBasedAccess:
      store.omsReducer.orderingCommonService.genericTenantConfig
        ?.roleBasedAccess,
    vendorToStoreScreenConfig:
      store.omsReducer.orderingCommonService?.orderingVendorToStoreConfig
        ?.constraints?.lead_time,
    orderingScreensConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  getConstraintOmsFilterConfiguration: (payload) =>
    dispatch(getConstraintOmsFilterConfiguration(payload)),
  setConstraintsOmsLoader: (payload) =>
    dispatch(setConstraintsOmsLoader(payload)),
  setIsFilterOmsValid: (payload) => dispatch(setIsFilterOmsValid(payload)),
  setConstraintsOmsFilterDependency: (payload) =>
    dispatch(setConstraintsOmsFilterDependency(payload)),
  resetConstraintsState: (payload) => dispatch(resetConstraintsState(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  setConstraintsOmsFilterElements: (payload) =>
    dispatch(setConstraintsOmsFilterElements(payload)),
  setSelectedOmsFilters: (payload) => dispatch(setSelectedOmsFilters(payload)),
  resetSelectedOmsFilters: () => dispatch(resetSelectedOmsFilters()),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderingDelivery);
