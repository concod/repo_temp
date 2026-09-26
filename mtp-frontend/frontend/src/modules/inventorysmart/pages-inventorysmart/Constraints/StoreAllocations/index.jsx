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
  getConstraintOmsFilterConfiguration,
  setPopUpLinkFromDashbaord,
  getWeekFilterOptions,
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
  getFilterDimensions,
} from "../../inventorysmart-utility";
import ConstraintsTables from "./components/constraints-tables";
import {
  APP_NAME,
  ERROR_MESSAGE,
  FULL_ACCESS_PERMISSIONS_LIST,
  ROLES_ACCESS_MODULES_MAPPING,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { setInventorySmartModulesPermissions } from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import {
  EIGHT_WEEK_SELECTION_ERROR,
  FISCAL_YEAR_WEEK_ID,
  MAX_FILTER_ID,
  MAX_LABEL,
  MIN_FILTER_ID,
  MIN_LABEL,
  WOS_ID,
  WOS_LABEL,
} from "./constants";
import {
  convertCommaSepStrFilterValuesToIntArr,
  createWeekDropdownOptionsFromWeekData,
  getTextField,
  getWeeksDropdown,
} from "./utils";

const StoreAllocation = (props) => {
  const history = useHistory();

  const [filters, setFilters] = useState([]);
  const [filterDependency, setFilterDependency] = useState([]);
  const [filterPayload, setFilterPayload] = useState([]);
  const [isFiltersValid, updateIsFiltersValid] = useState(false);
  const [
    isRedirectedFromDifferentPage,
    setIsRedirectedFromDifferentPage,
  ] = useState(false);
  const [next31Weeks, setNext31Weeks] = useState([]);

  const type = new URLSearchParams(window.location.search).get("type");

  const savedFiltersDependency =
    JSON.parse(localStorage.getItem("selectedFiltersDependency")) || [];
  const articles = JSON.parse(localStorage.getItem("selectedArticles")) || [];
  const storeCodes = JSON.parse(localStorage.getItem("storeCodes")) || [];

  const { tpc_store_week } =
    props.inventorysmartScreenConfig?.inventorysmart_constraints || {};

  const onFilterDashboard = async (elements, dependency) => {
    const payload = filtersPayload(elements, dependency, true);
    payload.reqBody = payload.reqBody.filter(
      (item) =>
        ["sale_type", "store_capacity"].indexOf(item.attribute_name) === -1
    );

    setFilterPayload(dependency);
    updateIsFiltersValid(
      (isRedirectedFromDifferentPage && tpc_store_week) || payload.isValid
    );
  };

  const l_popUpLinkFromDashboard = JSON.parse(
    localStorage.getItem("popupLink") || null
  );

  useEffect(() => {
    if (props.inventorysmartScreenConfig) {
      const fetchModulesAccess = async () => {
        try {
          // props.setInventorySmartPermissionLoader(true);
          props.setConstraintsLoader(true);
          // props.module is fetched  from routes
          const moduleName = props?.module;
          const subModules = ROLES_ACCESS_MODULES_MAPPING[props?.module] || [];

          let rolesBasedModulesPermission = {};

          // identifying if its for vb or signet
          if (props.inventorysmartScreenConfig.roleBasedAccess) {
            let accessDataResponse = await getModuleLevelAccessUtility({
              app: APP_NAME,
              module: subModules,
            })();
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
        } catch (error) {
          displaySnackMessages(ERROR_MESSAGE, "error");
        } finally {
          props.setConstraintsLoader(false);
        }
      };

      // The user permissions for Constraints module is fetched in the Constraints component
      // fetchModulesAccess();
      return () => {
        props.resetConstraintsStoreState([]);
      };
    }
  }, [props.inventorysmartScreenConfig]);

  useEffect(() => {
    const selectedArticles =
      articles?.length > 0 ? articles : props.selectedConstraintArticles;
    const selectedFiltersDependency =
      savedFiltersDependency?.length > 0
        ? savedFiltersDependency
        : props.filterDashboardConfiguration?.appliedFilterData?.dependencyData;
    const redirectedFromDifferentPage = type && selectedArticles?.length > 0;

    props.setInventorysmartConstraintsFilterDependency(
      selectedFiltersDependency
    );
    props.setConstraintsArticles(articles);
    props.setConstraintsStoreCodes(storeCodes);
    setIsRedirectedFromDifferentPage(redirectedFromDifferentPage);

    const fetchData = async () => {
      props.setConstraintsLoader(true);
      try {
        //fetch the filter levels
        let response = await fetchFilterConfig("Inventorysmart Constraints");
        setFilters(response);
        props.setConstraintsLoader(false);
      } catch (error) {
        props.setConstraintsLoader(false);
      }
    };

    fetchData();
    props.setPopUpLinkFromDashbaord(l_popUpLinkFromDashboard);
    localStorage.removeItem("popupLink");
    return () => {
      props.resetConstraintsStoreState([]);
    };
  }, []);

  useEffect(() => {
    if (
      !filters ||
      filters?.length === 0 ||
      isEmpty(props.inventorysmartScreenConfig)
    ) {
      return;
    }
    getFiltersOptions(props.savedFilterSelection);
  }, [filters, props.inventorysmartScreenConfig]);

  const getFiltersOptions = async (selected, current) => {
    try {
      props.setConstraintsLoader(true);
      const selectedFilters = isRedirectedFromDifferentPage
        ? cloneDeep(props.inventorysmartConstraintsFilterDependency)
        : [];
      let requiredFilterObjParams = {
        allFilters: filters || [],
        appliedFilters: selectedFilters,
        current: current,
        rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
        screenName: props.screenName,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);
      let filtersIncludingCustom = [...cloneDeep(response)];
      if(props.inventorysmartScreenConfig?.client === 'signet'){
      const weeksResponse = await props.getWeekFilterOptions();
      const weeksList = weeksResponse?.data?.data?.attribute ?? [];
      const weeksDropdownOptions = weeksList.map(
        createWeekDropdownOptionsFromWeekData
      );

      setNext31Weeks(weeksDropdownOptions);

      const weeksDropdown = getWeeksDropdown(weeksDropdownOptions);
      const minTextField = getTextField(MIN_LABEL, MIN_FILTER_ID);
      const maxTextField = getTextField(MAX_LABEL, MAX_FILTER_ID);
      const wosTextField = getTextField(WOS_LABEL, WOS_ID);

      

      if (tpc_store_week) {
        filtersIncludingCustom.push(
          weeksDropdown,
          minTextField,
          maxTextField,
          wosTextField
        );
      }

    }
      

      if (
        isEmpty(props.filterDashboardConfiguration) ||
        props?.filterDashboardConfiguration?.isRedirectedFromDifferentPage
      ) {
        const filterConfigData = [
          {
            filterDashboardData: filtersIncludingCustom,
            expectedFilterDimensions: getFilterDimensions(
              filtersIncludingCustom
            ),
            isCrossDimensionFilter: true,
            screen_name: props.screenName,
          },
        ];
        const filterConfig = formattedFilterConfiguration(
          "constraintsFilterConfiguration",
          filterConfigData,
          "Constraints Screen",
          selectedFilters,
          { custom: "Custom (Custom Filters Apply only to Store Week Tab)" }
        );

        if (isRedirectedFromDifferentPage) {
          const formattedSelectedFilters = formatSelectedFiltersData(
            filterConfigData,
            "Constraints Screen",
            selectedFilters
          );
          filterConfig[
            "constraintsFilterConfiguration"
          ].isRedirectedFromDifferentPage = isRedirectedFromDifferentPage;
          onFilterDashboardClick(selectedFilters, filtersIncludingCustom);
          setFilterDependency(formattedSelectedFilters);
        }
        props.setFilterConfiguration(filterConfig);
      }
    } catch (error) {
      props.addSnack({
        message: "Error while fetching options",
        options: {
          variant: "error",
        },
      });
    } finally {
      props.setConstraintsLoader(false);
    }
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    const weekObj = dependencyData.find(
      (filterObj) => filterObj.filter_id === FISCAL_YEAR_WEEK_ID
    );
    const noOfWeeksSelected = weekObj?.values?.length ?? 0;

    if (noOfWeeksSelected > 8) {
      displaySnackMessages(EIGHT_WEEK_SELECTION_ERROR, "error");

      return;
    }

    dependencyData.forEach(convertCommaSepStrFilterValuesToIntArr);

    updateIsFiltersValid(false);
    onFilterDashboard(filterData, dependencyData);
  };

  const updateDependencyHandler = (
    _dependency,
    _dimension,
    _filter,
    _initialFilterElements,
    selectionDependency
  ) => {
    const weekObj = selectionDependency.find(
      (filterObj) => filterObj.filter_id === FISCAL_YEAR_WEEK_ID
    );

    if (weekObj?.values.length > 8) {
      displaySnackMessages(EIGHT_WEEK_SELECTION_ERROR, "error");
    }
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
        routeOptions={routeOptions}
        // Filter dashboard props
        showChipsOnLoad={isRedirectedFromDifferentPage}
        disableFilters={isRedirectedFromDifferentPage}
        showFilterDashboard={true}
        doNotUpdateDefaultValue={false}
        filterDependency={filterDependency}
        filterConfigKey={"constraintsFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={false}
        updateDependencyHandler={updateDependencyHandler}
      />
      {isFiltersValid && (
        <ConstraintsTables
          filterDependency={filterPayload}
          {...props}
          isRedirectedFromDifferentPage={isRedirectedFromDifferentPage}
          next31Weeks={next31Weeks}
        />
      )}
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
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "constraintsFilterConfiguration"
      ],
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  getStoreTableData: (payload) => dispatch(getStoreTableData(payload)),
  setPopUpLinkFromDashbaord: (payload) =>
    dispatch(setPopUpLinkFromDashbaord(payload)),
  getFilterConfiguration: (payload) =>
    dispatch(getFilterConfiguration(payload)),
  setConstraintsLoader: (payload) => dispatch(setConstraintsLoader(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setInventorysmartFilterLoader: (payload) =>
    dispatch(setInventorysmartFilterLoader(payload)),
  setInventorysmartConstraintsFilterDependency: (payload) =>
    dispatch(setInventorysmartConstraintsFilterDependency(payload)),
  setConstraintsArticles: (payload) =>
    dispatch(setConstraintsArticles(payload)),
  setInventorySmartModulesPermissions: (payload) =>
    dispatch(setInventorySmartModulesPermissions(payload)),
  setConstraintsStoreCodes: (payload) =>
    dispatch(setConstraintsStoreCodes(payload)),
  resetConstraintsStoreState: (payload) =>
    dispatch(resetConstraintsStoreState(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  getWeekFilterOptions: () => dispatch(getWeekFilterOptions()),
});

export default connect(mapStateToProps, mapDispatchToProps)(StoreAllocation);
