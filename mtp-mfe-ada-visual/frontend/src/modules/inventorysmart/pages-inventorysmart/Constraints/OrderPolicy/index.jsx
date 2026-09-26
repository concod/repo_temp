import { useHistory } from "react-router";
import { DASHBOARD } from "../../../constants-inventorysmart/routesConstants";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import {
  getFilterConfiguration,
  setInventorysmartFilterLoader,
  setIsFiltersValid,
} from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import {
  getStoreTableData,
  resetConstraintsStoreState,
  setConstraintsArticles,
  setConstraintsLoader,
  setConstraintsOmsLoader,
  setConstraintsStoreCodes,
  setInventorysmartConstraintsFilterDependency,
  setInventorysmartConstraintsOmsFilterDependency,
  getConstraintOmsFilterConfiguration,
  setInventorysmartConstraintsOmsFilterElements,
  setSelectedOmsFilters,
} from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep, isEmpty } from "lodash";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  fetchFilterConfig,
  filtersPayload,
  fetchFilterOptions,
} from "../../inventorysmart-utility";
import OrderPolicyTable from "./orderPolicyTable";

const InventoryDashboard = (props) => {
  const history = useHistory();

  const [filters, setFilters] = useState([]);
  const [filterDependency, setFilterDependency] = useState([]);
  const [filterPayload, setFilterPayload] = useState([]);
  const [isFiltersValid, updateIsFiltersValid] = useState(false);
  const [isRedirectedFromDifferentPage, setIsRedirectedFromDifferentPage] =
    useState(false);

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

    props.setInventorysmartConstraintsOmsFilterDependency(
      selectedFiltersDependency
    );
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
      props.resetConstraintsStoreState([]);
    };
  }, []);

  useEffect(() => {
    if (!filters || filters?.length === 0) {
      return;
    }
    getFiltersOptions(props.savedFilterSelection);
  }, [filters]);

  const getFiltersOptions = async (selected, current) => {
    try {
      props.setConstraintsOmsLoader(true);
      const selectedFilters = isRedirectedFromDifferentPage
        ? cloneDeep(props.inventorysmartConstraintsOmsFilterDependency)
        : selected;
      let requiredFilterObjParams = {
        allFilters: filters || [],
        appliedFilters: selectedFilters,
        current: current,
        rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
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
      props.setInventorysmartConstraintsOmsFilterElements(filterElements);
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

  const routeOptions = [
    {
      label: "Constraints",
      id: 1,
      action: () => {
        history.push(DASHBOARD);
      },
    },
  ];

  return (
    <>
      <CoreComponentScreen
        showPageRoute={false}
        showPageHeader={true}
        showFilterDashboard={true}
        filterConfigKey={"ConstraintsOrderManagementFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={false}
        filterDependency={filterDependency}
      />
      {isFiltersValid && <OrderPolicyTable />}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    constraintsLoader:
      store.inventorysmartReducer.inventorySmartConstraints.constraintsLoader,
    selectedConstraintArticles:
      store.inventorysmartReducer.inventorySmartConstraints
        .selectedConstraintArticles,
    inventorysmartConstraintsFilterDependency:
      store.inventorysmartReducer.inventorySmartConstraints
        .inventorysmartConstraintsFilterDependency,
    inventorysmartConstraintsOmsFilterDependency:
      store.inventorysmartReducer.inventorySmartConstraints
        .inventorysmartConstraintsOmsFilterDependency,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "ConstraintsOrderManagementFilterConfiguration"
      ],
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    savedFilterSelection: store.filterReducer.savedFilterSelection,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  getStoreTableData: (payload) => dispatch(getStoreTableData(payload)),
  getFilterConfiguration: (payload) =>
    dispatch(getFilterConfiguration(payload)),
  getConstraintOmsFilterConfiguration: (payload) =>
    dispatch(getConstraintOmsFilterConfiguration(payload)),
  setConstraintsOmsLoader: (payload) =>
    dispatch(setConstraintsOmsLoader(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setInventorysmartFilterLoader: (payload) =>
    dispatch(setInventorysmartFilterLoader(payload)),
  setInventorysmartConstraintsOmsFilterDependency: (payload) =>
    dispatch(setInventorysmartConstraintsOmsFilterDependency(payload)),
  setConstraintsArticles: (payload) =>
    dispatch(setConstraintsArticles(payload)),
  setConstraintsStoreCodes: (payload) =>
    dispatch(setConstraintsStoreCodes(payload)),
  resetConstraintsStoreState: (payload) =>
    dispatch(resetConstraintsStoreState(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  setInventorysmartConstraintsOmsFilterElements: (payload) =>
    dispatch(setInventorysmartConstraintsOmsFilterElements(payload)),
  setSelectedOmsFilters: (payload) => dispatch(setSelectedOmsFilters(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(InventoryDashboard);
