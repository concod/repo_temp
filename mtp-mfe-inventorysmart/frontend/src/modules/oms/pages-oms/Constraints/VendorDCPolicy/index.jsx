import { useEffect, useState } from "react";
import { connect } from "react-redux";
import {
  resetConstraintsState,
  setConstraintsArticles,
  setConstraintsOmsLoader,
  setConstraintsOmsFilterDependency,
  getConfigurationsOmsFilterConfiguration,
  getConfigurationsOmsVendorFilterConfiguration,
  setConstraintsOmsFilterElements,
  setSelectedOmsFilters,
  resetSelectedOmsFilters,
} from "modules/oms/services-oms/Constraints/constraints-services";
import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep, isEmpty } from "lodash";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  filtersPayload,
  fetchFilterOptions,
} from "modules/oms/utils-oms/oms-utility";
import VendorDCTable from "./vendorDCTable";
import {
  IS_OVERRIDEN_CORE_BUTTON_WIDTH,
  IS_OVERRIDEN_CORE_BUTTON_PLACEMENT,
} from "core/constants";
import { useStyles } from "modules/oms/styles-oms/orderingCustomStyles";

const VendorDCPolicy = (props) => {
  const classes = useStyles();
  const [filters, setFilters] = useState([]);
  const [filterDependency, setFilterDependency] = useState([]);
  const [filterPayload, setFilterPayload] = useState([]);
  const [isFiltersValid, updateIsFiltersValid] = useState(false);
  const [
    isRedirectedFromDifferentPage,
    setIsRedirectedFromDifferentPage,
  ] = useState(false);

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
        const response = props.constraintsConfig?.vendor_dc_policy
          ?.vendor_store_filter
          ? await props.getConfigurationsOmsVendorFilterConfiguration()
          : await props.getConfigurationsOmsFilterConfiguration();
        let data = response.data.data;
        setFilters(data);
        props.setConstraintsOmsLoader(false);
      } catch (error) {
        props.setConstraintsOmsLoader(false);
      }
    };

    if (props?.constraintsConfig) {
      fetchData();
    }

    return () => {
      props.resetConstraintsState([]);
    };
  }, [props?.constraintsConfig]);

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

  useEffect(() => {
    if (typeof props.setIsFilterApplied !== "function") {
      return;
    }
    if (
      props?.constraintsOmsFilterDependency?.length ||
      filterDependency?.length ||
      props?.filterDashboardConfiguration?.appliedFilterData?.dependencyData
        ?.length
    ) {
      props.setIsFilterApplied(true);
    } else {
      props.setIsFilterApplied(false);
    }
  }, [
    filterDependency,
    props?.constraintsOmsFilterDependency,
    props?.filterDashboardConfiguration,
    props.setIsFilterApplied,
  ]);

  return (
    <div style={{ marginTop: IS_OVERRIDEN_CORE_BUTTON_PLACEMENT }}>
      <CoreComponentScreen
        autoHideFilterButton={true}
        IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        showPageRoute={false}
        showPageHeader={true}
        showFilterDashboard={true}
        filterConfigKey={"ConstraintsOrderManagementFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={false}
        filterDependency={filterDependency?.length ? filterDependency : null}
        customClassName={classes.customMarginBlock}
      >
        <VendorDCTable />
      </CoreComponentScreen>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    constraintsOmsFilterDependency:
      store.omsReducer.orderingConstraintsService
        .constraintsOmsFilterDependency,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "ConstraintsOrderManagementFilterConfiguration"
      ],
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    savedFilterSelection: store.filterReducer.savedFilterSelection,

    constraintsConfig:
      store.omsReducer.orderingConstraintsService.omsConstraintsScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  getConfigurationsOmsFilterConfiguration: (payload) =>
    dispatch(getConfigurationsOmsFilterConfiguration(payload)),
  getConfigurationsOmsVendorFilterConfiguration: (payload) =>
    dispatch(getConfigurationsOmsVendorFilterConfiguration(payload)),
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

export default connect(mapStateToProps, mapDispatchToProps)(VendorDCPolicy);
