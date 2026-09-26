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
import {
  IS_TAB_OVERRIDEN_WIDTH,
  IS_OVERRIDEN_CORE_BUTTON_PLACEMENT,
  IS_OVERRIDEN_CORE_BUTTON_WIDTH,
} from "config/constants";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";

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

  return (
    <>
      {/* {tabOptions?.length > 1 && (
        <div
          className={`${globalClasses.centerAlign} ${globalClasses.marginBottom}`}
        >
          <ButtonGroup
            onChange={handleTabChange}
            options={tabOptions}
            selectedOption={selectedTabVendor}
          />
        </div>
      )} */}
      {selectedTabVendor === "vendor_dc" ? (
        <>
          <div
            style={{
              marginTop: IS_OVERRIDEN_CORE_BUTTON_PLACEMENT,
            }}
          >
            <CoreComponentScreen
              showPageRoute={false}
              IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
              showPageHeader={true}
              showFilterDashboard={true}
              filterConfigKey={"ConstraintsOrderManagementFilterConfiguration"}
              onApplyFilter={onFilterDashboardClick}
              contained={false}
              filterDependency={
                filterDependency?.length ? filterDependency : null
              }
              customClassName={classes.customMarginBlock}
            />
          </div>
          {tabOptions?.length > 1 && (
            <div
              className={`${globalClasses.centerAlign} ${globalClasses.marginBottom}`}
            >
              <ButtonGroup
                onChange={handleTabChange}
                options={[
                  {
                    label: "Option 1",
                    value: "opt1",
                  },
                  {
                    label: "Option 2",
                    value: "opt2",
                  },
                ]}
                // selectedOption={selectedTabVendor}
              />
            </div>
          )}
          {props?.selectedTab === "Lead Time" && <LeadTime />}
          {props?.selectedTab === "Qc Time" && <QcTime />}
        </>
      ) : (
        <>
          {true > 1 && (
            <div
              className={`${globalClasses.centerAlign} ${globalClasses.marginBottom}`}
            >
              <ButtonGroup
                onChange={handleTabChange}
                options={[
                  {
                    label: "Option 1",
                    value: "opt1",
                  },
                  {
                    label: "Option 2",
                    value: "opt2",
                  },
                ]}
                // selectedOption={selectedTabVendor}
              />
            </div>
          )}
          <LeadTimeVendorStore />
        </>
      )}
    </>
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
        ?.constraints?.safety_stock,
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
