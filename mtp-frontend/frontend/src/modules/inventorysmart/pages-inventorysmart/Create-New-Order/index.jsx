import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useHistory } from "react-router";
import { CREATE_NEW_ORDER } from "../../constants-inventorysmart/routesConstants";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
} from "../inventorysmart-utility";
import {
  ERROR_MESSAGE,
  tableArticleFilter,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep, isArray, isEmpty } from "lodash";
import classNames from "classnames";
import React from "react";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
  mapDataToLabel,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import { CREATE_NEW_ORDER_FILTER_CONFIG } from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import {
  resetCreateNewOrderState,
  setCreateNewOrderFilterDependency,
  setCreateNewOrderFilterElements,
  setCreateNewOrderFilterLoader,
  setSelectedFilters,
  setIsFiltersValid,
  setCreateNewOrderSku,
} from "modules/inventorysmart/services-inventorysmart/Create-New-Order/create-new-order-service";
import CreateNewOrderTable from "./components/CreateNewOrderTable";
import Loader from "core/Utils/Loader/loader";
import moment from "moment";
import { getOmsCoreFiscalCalendar } from "modules/inventorysmart/services-inventorysmart/Order-Management/order-management-service";

const CreateNewOrder = (props) => {
  const history = useHistory();
  const globalClasses = globalStyles();

  const [filters, setFilters] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);
  const [pageLoader, setPageLoader] = useState(false);
  const [filterDependency, setFilterDependency] = useState([]);
  const [
    isRedirectedFromDifferentPage,
    setIsRedirectedFromDifferentPage,
  ] = useState(false);
  const [customChipData, setCustomChipData] = useState(null);
  const [redirectedFilterDependency, setRedirectedFilterDependency] = useState(
    localStorage.getItem("selectedFiltersDependency")
      ? JSON.parse(localStorage.getItem("selectedFiltersDependency"))
      : null
  );
  const [isFilterReadyToLoad, setIsFilterReadyToLoad] = useState(false);

  const savedFiltersDependency =
    JSON.parse(localStorage.getItem("selectedFiltersDependency")) || [];
  const startDateDashboard = localStorage.getItem("startDate");
  const endDatedashboard = localStorage.getItem("endDate");
  const storedSku = JSON.parse(localStorage.getItem("selectedSku")) || [];
  var sD;
  var eD;
  const type = new URLSearchParams(window.location.search).get("type");

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  useEffect(() => {
    if (isRedirectedFromDifferentPage) {
      if (props.isFiltersValid) setPageLoader(false);
      else setPageLoader(true);
    }
  }, [isRedirectedFromDifferentPage, props.isFiltersValid]);

  const applyFilters = (filterElements, filterDependency, filterDates) => {
    const payload = filtersPayload(
      filterElements,
      filterDependency || props.inventoryOrderManagementFilterDependency,
      true
    );
    props.setSelectedFilters(payload.reqBody);
    props.setIsFiltersValid(payload.isValid);
  };

  const getFiltersOptions = async (selected, current) => {
    try {
      props.setCreateNewOrderFilterLoader(true);

      const selectedFilters = isRedirectedFromDifferentPage
        ? cloneDeep(props.createNewOrderFilterDependency)
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

      if (
        isRedirectedFromDifferentPage ||
        isEmpty(props?.filterDashboardConfiguration) ||
        props?.filterDashboardConfiguration?.isRedirectedFromDifferentPage
      ) {
        const filterConfigData = [
          {
            filterDashboardData: [...response],
            expectedFilterDimensions: getFilterDimensions(response),
            isCrossDimensionFilter: true,
            screen_name: props.screenName,
          },
        ];
        const filterConfig = formattedFilterConfiguration(
          "createNewOrderFilterConfiguration",
          filterConfigData,
          "Create New Order",
          selectedFilters
        );
        if (isRedirectedFromDifferentPage) {
          let redirectedFilters = redirectedFilterDependency?.map((item) => {
            if (item.dimension !== "custom")
              return {
                ...item,
                filter_id: item.attribute_name,
                filter_type: "cascaded",
                display_type: "dropdown",
              };
          });

          let formattedSelectedFilters = formatSelectedFiltersData(
            filterConfigData,
            "Create New Order",
            redirectedFilters
          );
          let filterConfigRedirected = formattedFilterConfiguration(
            "createNewOrderFilterConfiguration",
            filterConfigData,
            "Create New Order",
            redirectedFilters
          );
          filterConfigRedirected[
            "createNewOrderFilterConfiguration"
          ].isRedirectedFromDifferentPage = isRedirectedFromDifferentPage;

          // This code is used to explicitly set the Chip data that core components handles on applying filter.
          if (redirectedFilters) {
            let chipsDependencyData = cloneDeep(redirectedFilters)?.map(
              (item) => {
                if (isArray(item.values)) {
                  item.values = item.values.map((value) => {
                    if (typeof value === "boolean")
                      return mapDataToLabel(value.toString().toUpperCase());
                    else return mapDataToLabel(value);
                  });
                } else item.values = [mapDataToLabel(item.values)];
                return item;
              }
            );
            setCustomChipData(chipsDependencyData);
          }

          setFilterDependency(formattedSelectedFilters);
          onFilterDashboardClick(redirectedFilters, response);
          props?.setFilterConfiguration(filterConfigRedirected);
        } else {
          props?.setFilterConfiguration(filterConfig);
        }
      }

      setIsFilterReadyToLoad(true);
      setFilterData(response);
      // let filterElements = cloneDeep(response);
      //props.setCreateNewOrderFilterElements(filterElements);
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setCreateNewOrderFilterLoader(false);
    }
  };

  useEffect(() => {
    if (!filters || filters?.length === 0) {
      return;
    }
    getFiltersOptions(props.savedFilterSelection);
  }, [filters]);

  useEffect(() => {
    const selectedSku =
      storedSku?.length > 0 ? storedSku : props.selectedCreateNewOrderSku;
    props.setCreateNewOrderSku(selectedSku);
    if (storedSku?.length > 0) {
      var storedArticlePayload = JSON.parse(JSON.stringify(tableArticleFilter));
      storedArticlePayload.values = [...storedSku];
      localStorage.removeItem("selectedSku");
      if (savedFiltersDependency?.length > 0) {
        savedFiltersDependency.push(storedArticlePayload);
      }
    }

    const selectedFiltersDependency =
      savedFiltersDependency?.length > 0
        ? savedFiltersDependency
        : props.filterDashboardConfiguration?.appliedFilterData?.dependencyData;
    props.setCreateNewOrderFilterDependency(selectedFiltersDependency);
    localStorage.removeItem("selectedFiltersDependency");

    sD = startDateDashboard;
    eD = endDatedashboard;
    localStorage.removeItem("startDate");
    localStorage.removeItem("endDate");

    const redirectedFromDifferentPage = type && true;
    setIsRedirectedFromDifferentPage(redirectedFromDifferentPage);

    const fetchFilters = async () => {
      try {
        props.setCreateNewOrderFilterLoader(true);
        const response = await fetchFilterConfig(
          CREATE_NEW_ORDER_FILTER_CONFIG
        );
        setFilters(response);
      } catch (error) {
        props.setCreateNewOrderFilterLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchFilters();
    return () => {
      props.resetCreateNewOrderState();
    };
  }, []);

  useEffect(() => {
    if (props.backButtonClicked) {
      setFilters([]);
      setFilterData([]);
    }
  }, [props.backButtonClicked, props.formFilters]);

  const onFilterDashboardClick = (dependencyData, filterData) => {
    let datesIndex = -1;

    const dates = dependencyData.find((dataItem, index) => {
      if (dataItem.attribute_name === "fiscal_date_range") {
        datesIndex = index;
      }
      return dataItem.attribute_name === "fiscal_date_range";
    });

    filterData = filterData.filter(
      (item) => item.column_name !== "fiscal_date_range"
    );

    if (datesIndex > -1) {
      dependencyData.splice(datesIndex, 1);
    }
    applyFilters(filterData, dependencyData, dates);
  };

  useEffect(() => {
    const fetchFiscalCalendar = async () => {
      try {
        setPageLoader(false);
        let startYear = moment().year();
        let endYear = moment().year() + 2;
        let queryParams = `?start_fiscal_year=${startYear}&end_fiscal_year=${endYear}`;
        const getFinancialCalendarData = await getOmsCoreFiscalCalendar(
          queryParams
        );
        moment.updateLocale("en", {
          week: {
            dow: getFinancialCalendarData?.data?.data?.week_start_day || 0,
          },
        });
        setFiscalCalendarDetails(getFinancialCalendarData?.data?.data?.data);
      } catch (error) {
        setPageLoader(true);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchFiscalCalendar();
  }, []);

  return (
    <>
      <HeaderBreadCrumbs
        options={[
          {
            label: "Create New Order",
            id: 1,
            action: () => {
              history.push(CREATE_NEW_ORDER);
            },
          },
        ]}
      ></HeaderBreadCrumbs>

      {isFilterReadyToLoad && (
        <CoreComponentScreen
          showPageRoute={false}
          showPageHeader={true}
          showFilterDashboard={true}
          contained={true}
          filterConfigKey={"createNewOrderFilterConfiguration"}
          showChipsOnLoad={isRedirectedFromDifferentPage}
          disableFilters={isRedirectedFromDifferentPage}
          filterDependency={filterDependency}
          chipsDependency={customChipData ? customChipData : null}
          onApplyFilter={onFilterDashboardClick}
        >
          <Loader loader={pageLoader}>
            {props?.isFiltersValid && (
              <div className={classNames(globalClasses.marginVertical2rem)}>
                <CreateNewOrderTable
                  isRedirectedFromDifferentPage={isRedirectedFromDifferentPage}
                  fiscalCalendarData={fiscalCalendarDetails}
                />
              </div>
            )}
          </Loader>
        </CoreComponentScreen>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedCreateNewOrderSku:
      store.inventorysmartReducer.inventoryCreateNewOrderService.selectedSku,
    isFiltersValid:
      store.inventorysmartReducer.inventoryCreateNewOrderService.isFiltersValid,
    backButtonClicked:
      store.inventorysmartReducer.inventoryCreateNewOrderService
        .backButtonClicked,
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    formFilters:
      store.inventorysmartReducer.inventoryCreateNewOrderService.formFilters,
    createNewOrderFilterLoader:
      store.inventorysmartReducer.inventoryCreateNewOrderService
        .createNewOrderFilterLoader,
    createNewOrderFilterElements:
      store.inventorysmartReducer.inventoryCreateNewOrderService
        .createNewOrderFilterElements,
    createNewOrderFilterDependency:
      store.inventorysmartReducer.inventoryCreateNewOrderService
        .createNewOrderFilterDependency,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "createNewOrderFilterConfiguration"
      ],
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setCreateNewOrderFilterLoader: (payload) =>
    dispatch(setCreateNewOrderFilterLoader(payload)),
  setCreateNewOrderFilterElements: (payload) =>
    dispatch(setCreateNewOrderFilterElements(payload)),
  setCreateNewOrderFilterDependency: (filterConfiguration) =>
    dispatch(setCreateNewOrderFilterDependency(filterConfiguration)),
  resetCreateNewOrderState: () => dispatch(resetCreateNewOrderState()),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  setCreateNewOrderSku: (payload) => dispatch(setCreateNewOrderSku(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(CreateNewOrder);
