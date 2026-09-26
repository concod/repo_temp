import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Loader from "core/Utils/Loader/loader";
import classNames from "classnames";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { tenantConfigApiCache } from "core/actions/tenantConfigActions";
import { cloneDeep, isEmpty, sortBy } from "lodash";
import { Tabs } from "impact-ui-v3";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import {
  ERROR_MESSAGE,
  tableArticleFilter,
} from "modules/oms/constants-oms/stringConstants";
import ApprovedOrders from "../Approved-Orders";
import OrderRepositoryMetrics from "../components/OrderRepositoryMetrics";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
} from "modules/oms/utils-oms/oms-utility";
import { ORDER_REPOSITORY_FILTER_CONFIG_FOR_VENDOR_DC } from "modules/oms/constants-oms/apiConstants";
import {
  resetOrderRepositoryState,
  setFilterElements,
  setFilterLoader,
  setSelectedFilters,
  setIsFiltersValid,
  setFilterDependency,
  setOrderRepoSku,
} from "modules/oms/services-oms/Order-Repository/order-repository-service";

const VendorDCOrderRepository = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [tabValue, setTabValue] = useState("approved_orders");
  const [filters, setFilters] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [filterDependency, setFilterDependency] = useState([]);
  const [selectedDates, setSelectedDates] = useState({
    fiscalInfoStartDate: null,
    fiscalInfoEndDate: null,
  });
  const [startEndDate, setStartEndDate] = useState({
    start_date: null,
    end_date: null,
  });
  const [tabOptionsData, setTabOptionsData] = useState([]);
  const [reloadKpi, setReloadKpi] = useState(false);
  const [pageLoader, setPageLoader] = useState(false);
  const [
    isRedirectedFromDifferentPage,
    setIsRedirectedFromDifferentPage,
  ] = useState(false);
  const [tabList, setTabList] = useState([]);

  const type = new URLSearchParams(window.location.search).get("type");
  const savedFiltersDependency =
    JSON.parse(localStorage.getItem("selectedFiltersDependency")) || [];
  const storedSku = JSON.parse(localStorage.getItem("selectedSku"));

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  //OMS Order Repository Configuration
  useEffect(() => {
    //Getting Data from Roles Config
    const moduleConfigData = props?.screenConfig || [];
    const tabOptions = [];
    if (moduleConfigData.length) {
      moduleConfigData?.map((data) => {
        tabOptions.push(data);
      });
    }

    setTabOptionsData(cloneDeep(tabOptions));
    if (tabOptions?.length) {
      const sortedTabs = sortBy(
        tabOptions,
        (tabOption) => tabOption?.tab_display_order || 99999
      );
      setTabValue(sortedTabs[0]?.value || "approved_orders");
    }
  }, [props?.screenConfig]);

  useEffect(() => {
    if (isRedirectedFromDifferentPage) {
      if (props?.isFiltersValid) setPageLoader(false);
      else setPageLoader(true);
    }
  }, [isRedirectedFromDifferentPage, props.isFiltersValid]);

  const applyFilters = (filterElements, filterDependency, filterDates) => {
    const payload = filtersPayload(
      filterElements,
      filterDependency || props.filterDependency,
      true,
      true,
      true
    );
    props.setSelectedFilters(payload.reqBody);
    props.setIsFiltersValid(payload.isValid);
  };

  const getFiltersOptions = async (selected, current) => {
    try {
      props.setFilterLoader(true);
      const selectedFilters = isRedirectedFromDifferentPage
        ? cloneDeep(props.filterDependency)
        : [];
      let requiredFilterObjParams = {
        allFilters: filters || [],
        appliedFilters: selectedFilters,
        current: current,
        rolesBasedAccess: props?.roleBasedAccess,
        screenName: props.screenName,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);
      if (
        isEmpty(props.filterDashboardConfiguration) ||
        props?.filterDashboardConfiguration?.isRedirectedFromDifferentPage
      ) {
        const filterConfigData = [
          {
            filterDashboardData: [...response],
            isCrossDimensionFilter: true,
            screen_name: props.screenName,
          },
        ];
        const filterConfig = formattedFilterConfiguration(
          "orderRepositoryFilterConfiguration",
          filterConfigData,
          "Order Repository",
          selectedFilters
        );
        if (isRedirectedFromDifferentPage) {
          const formattedSelectedFilters = formatSelectedFiltersData(
            filterConfigData,
            "Order Repository",
            selectedFilters
          );
          filterConfig[
            "orderRepositoryFilterConfiguration"
          ].isRedirectedFromDifferentPage = isRedirectedFromDifferentPage;
          onFilterDashboardClick(selectedFilters, response);
          setFilterDependency(formattedSelectedFilters);
        }
        props.setFilterConfiguration(filterConfig);
      }
      setFilterData(response);
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setFilterLoader(false);
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
      storedSku?.length > 0 ? storedSku : props.OrderRepoSelectedSku;
    props.setOrderRepoSku(selectedSku);
    if (storedSku?.length > 0) {
      let storedArticlePayload = JSON.parse(JSON.stringify(tableArticleFilter));
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
    props.setFilterDependency(selectedFiltersDependency);

    const redirectedFromDifferentPage = type && true;
    setIsRedirectedFromDifferentPage(redirectedFromDifferentPage);

    const fetchFilters = async () => {
      try {
        props.setFilterLoader(true);
        setFilters([]);
        const response = await fetchFilterConfig(
          ORDER_REPOSITORY_FILTER_CONFIG_FOR_VENDOR_DC
        );
        const redirectedFromDifferentPage = type && true;
        if (redirectedFromDifferentPage) {
          response.forEach((filter) => {
            filter.is_mandatory = false;
            filter.is_required = false;
          });
        }
        setFilters(response);
      } catch (error) {
        props.setFilterLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
        console.log("Error in Fetching Filters", error);
      }
    };
    if (filters?.length === 0) fetchFilters();

    return () => {
      props.resetOrderRepositoryState();
    };
  }, []);

  const onFilterDashboardClick = (dependencyData, filterData) => {
    applyFilters(filterData, dependencyData); //dates);
  };

  // for tab values
  const handleChangeTabValue = (_event, newValue) => {
    setTabValue(newValue);
  };

  const tabProps = (tabOption) => {
    return {
      id: `simple-tab-${tabOption?.label}`,
      label: tabOption?.label,
      value: tabOption?.value,
      "aria-controls": `simple-tabpanel-${tabOption?.label}`,
      data: tabOption,
    };
  };

  const renderTabComponents = () => {
    let tabData = tabOptionsData.filter((val) => {
      if (val?.value === tabValue) {
        return val;
      }
    });
    const tabPanels = tabList.map((tabOption) => {
      return (
        <div>
          {tabValue === tabOption.value && (
            <ApprovedOrders
              startEndDate={startEndDate}
              data={tabData}
              setReloadKpi={setReloadKpi}
              isRedirectedFromDifferentPage={isRedirectedFromDifferentPage}
            />
          )}
        </div>
      );
    });
    return tabPanels;
  };

  useEffect(() => {
    let tabList = [];
    props?.screenConfig?.length !== 0 &&
      sortBy(
        props?.screenConfig,
        (tabOption) => tabOption.tab_display_order || 99999
      ).map((tabOption) => {
        tabList.push({ ...tabProps(tabOption) });
      });
    setTabList(tabList);
  }, [props?.screenConfig]);

  return (
    <>
      <div>
        <CoreComponentScreen
          showPageRoute={false}
          showPageHeader={true}
          showFilterDashboard={true}
          showChipsOnLoad={isRedirectedFromDifferentPage}
          disableFilters={isRedirectedFromDifferentPage}
          preventFilterPreselection={isRedirectedFromDifferentPage}
          autoApplyEnabled={!isRedirectedFromDifferentPage}
          filterConfigKey={"orderRepositoryFilterConfiguration"}
          onApplyFilter={onFilterDashboardClick}
          contained={true}
          filterDependency={filterDependency?.length ? filterDependency : null}
        >
          <Loader loader={pageLoader}>
            {props?.isFiltersValid && (
              <div>
                <OrderRepositoryMetrics
                  isRedirectedFromDifferentPage={isRedirectedFromDifferentPage}
                  startEndDate={startEndDate}
                  selectedDates={selectedDates}
                  reloadKpi={reloadKpi}
                  setReloadKpi={setReloadKpi}
                />
              </div>
            )}

            {props?.isFiltersValid &&
              (props?.screenConfig.length !== 0 ? (
                <div className={classNames(globalClasses.marginVertical1rem)}>
                  <Tabs
                    value={tabValue}
                    onChange={handleChangeTabValue}
                    aria-label="allocation-reports-tab"
                    tabNames={[...tabList]}
                    tabPanels={renderTabComponents()}
                  />
                </div>
              ) : (
                <Stack spacing={2} sx={{ width: "100%" }}>
                  <Alert severity="info">
                    Order Repository Order Status Tabs Error!
                  </Alert>
                </Stack>
              ))}
          </Loader>
        </CoreComponentScreen>
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    OrderRepoSelectedSku: store.omsReducer?.orderRepositoryService.selectedSku,
    screenConfig:
      store.omsReducer.orderingCommonService?.orderRepositoryVendorDCConfig,
    isFiltersValid: store.omsReducer?.orderRepositoryService.isFiltersValid,
    filterLoader: store.omsReducer?.orderRepositoryService.filterLoader,
    filterElements: store.omsReducer?.orderRepositoryService.filterElements,
    filterDependency: store.omsReducer?.orderRepositoryService.filterDependency,
    backButtonClicked:
      store.omsReducer?.orderRepositoryService.backButtonClicked,
    formFilters: store.omsReducer?.orderRepositoryService.formFilters,
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderRepositoryFilterConfiguration"
      ],
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    roleBasedAccess:
      store.omsReducer.orderingCommonService.genericTenantConfig
        ?.roleBasedAccess,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setFilterLoader: (payload) => dispatch(setFilterLoader(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setFilterElements: (payload) => dispatch(setFilterElements(payload)),
  setFilterDependency: (payload) => dispatch(setFilterDependency(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  resetOrderRepositoryState: () => dispatch(resetOrderRepositoryState()),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  setOrderRepoSku: (payload) => dispatch(setOrderRepoSku(payload)),
  tenantConfigApiCache: (application, queryParam) =>
    dispatch(tenantConfigApiCache(application, queryParam)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(VendorDCOrderRepository);
