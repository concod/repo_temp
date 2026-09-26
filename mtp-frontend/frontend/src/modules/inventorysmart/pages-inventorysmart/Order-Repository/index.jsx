import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useHistory } from "react-router";
import { ORDER_REPOSITORY } from "../../constants-inventorysmart/routesConstants";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
} from "../inventorysmart-utility";
import classNames from "classnames";
import {
  ERROR_MESSAGE,
  tableArticleFilter,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep, isEmpty } from "lodash";
import React from "react";
import OrderRepositoryMetrics from "./components/OrderRepositoryMetrics";
import { Tabs, Tab } from "@mui/material";
import ApprovedOrders from "./Approved-Orders";
import {
  resetOrderRepositoryState,
  setInventoryOrderRepositoryFilterElements,
  setInventoryOrderRepositoryFilterLoader,
  setSelectedFilters,
  setIsFiltersValid,
  setInventoryOrderRepositoryFilterDependency,
  setOrderRepoSku,
} from "modules/inventorysmart/services-inventorysmart/Order-Repository/order-repository-service";
import {
  getOmsCoreFiscalCalendar,
  setRedirectFromDeepDive,
} from "modules/inventorysmart/services-inventorysmart/Order-Management/order-management-service";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { setFilterConfiguration } from "core/actions/filterAction";
import moment from "moment";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { ORDER_REPOSITORY_FILTER_CONFIG } from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import SubClassLevelSummaryTableNewViewOR from "./components/SubClassLevelSummaryTableNewViewOR";
import { Typography, Grid } from "@mui/material";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Loader from "core/Utils/Loader/loader";

const OrderRepository = (props) => {
  const history = useHistory();
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [tabValue, setTabValue] = useState("approved_orders");
  const [tabData, setTabData] = useState();
  const [openModal, setOpenModal] = useState(false);
  const [filters, setFilters] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);
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
  useEffect(() => {
    if (isRedirectedFromDifferentPage) {
      if (props?.isFiltersValid) setPageLoader(false);
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
      props.setInventoryOrderRepositoryFilterLoader(true);
      const selectedFilters = isRedirectedFromDifferentPage
        ? cloneDeep(props.inventoryOrderRepositoryFilterDependency)
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
      props.setInventoryOrderRepositoryFilterLoader(false);
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
    props.setInventoryOrderRepositoryFilterDependency(
      selectedFiltersDependency
    );
    localStorage.removeItem("selectedFiltersDependency");

    const redirectedFromDifferentPage = type && true;
    setIsRedirectedFromDifferentPage(redirectedFromDifferentPage);

    const fetchFilters = async () => {
      try {
        props.setInventoryOrderRepositoryFilterLoader(true);
        setFilters([]);
        const response = await fetchFilterConfig(
          ORDER_REPOSITORY_FILTER_CONFIG
        );
        setFilters(response);
        if (response) {
          if (props?.inventorysmartOmsRepoConfig.length != 0) {
            props?.inventorysmartOmsRepoConfig?.map((data) => {
              tabOptionsData.push(data);
            });
          }
        }
      } catch (error) {
        props.setInventoryOrderRepositoryFilterLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchFilters();
    props.setRedirectFromDeepDive(false);
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
    switch (tabValue) {
      case tabValue:
        return (
          <ApprovedOrders
            startEndDate={startEndDate}
            data={tabData}
            setReloadKpi={setReloadKpi}
            isRedirectedFromDifferentPage={isRedirectedFromDifferentPage}
          />
        );
      default:
        return;
    }
  };

  return (
    <>
      <HeaderBreadCrumbs
        options={[
          {
            label: "Order Repository",
            id: 1,
            action: () => {
              history.push(ORDER_REPOSITORY);
            },
          },
        ]}
      ></HeaderBreadCrumbs>
      <CoreComponentScreen
        showPageRoute={false}
        showPageHeader={true}
        showFilterDashboard={true}
        showChipsOnLoad={isRedirectedFromDifferentPage}
        disableFilters={isRedirectedFromDifferentPage}
        filterConfigKey={"orderRepositoryFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        filterDependency={filterDependency}
      >
        <Loader loader={pageLoader}>
          {props?.isFiltersValid && (
            <div className={classNames(globalClasses.marginVertical1rem)}>
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
            (props?.inventorysmartOmsRepoConfig.length != 0 ? (
              <div className={classNames(globalClasses.marginVertical1rem)}>
                <Tabs
                  style={{ paddingTop: "1rem" }}
                  value={tabValue}
                  onChange={handleChangeTabValue}
                  aria-label="allocation-reports-tab"
                >
                  {props?.inventorysmartOmsRepoConfig.length != 0 &&
                    props?.inventorysmartOmsRepoConfig?.map((tabOption) => (
                      <Tab {...tabProps(tabOption)} />
                    ))}
                </Tabs>
                {renderTabComponents()}
              </div>
            ) : (
              <Stack spacing={2} sx={{ width: "100%" }}>
                <Alert severity="info">
                  Order Repository Order Status Tabs Error!
                </Alert>
              </Stack>
            ))}

          {props?.isFiltersValid && (
            <>
              <Grid
                container
                style={{ marginTop: "45px" }}
                justifyContent={"space-between"}
              >
                <Grid container alignItems={"center"} item xs={6} lg={6}>
                  <Typography variant="h6">Subclass Level Summary</Typography>
                </Grid>
              </Grid>
              <div className={classNames(globalClasses.marginVertical1rem)}>
                <SubClassLevelSummaryTableNewViewOR
                  isRedirectedFromDifferentPage={isRedirectedFromDifferentPage}
                  startEndDate={startEndDate}
                  orderRepo={true}
                  reloadKpi={reloadKpi}
                  // setReloadKpi={setReloadKpi}
                />
              </div>
            </>
          )}
        </Loader>
      </CoreComponentScreen>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    OrderRepoSelectedSku:
      store.inventorysmartReducer.inventorySmartOrderRepositoryService
        .selectedSku,
    inventorysmartOmsRepoConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartOmsRepoConfig,
    isFiltersValid:
      store.inventorysmartReducer.inventorySmartOrderRepositoryService
        .isFiltersValid,
    inventoryOrderRepositoryFilterLoader:
      store.inventorysmartReducer.inventorySmartOrderRepositoryService
        .inventoryOrderRepositoryFilterLoader,
    inventoryOrderRepositoryFilterElements:
      store.inventorysmartReducer.inventorySmartOrderRepositoryService
        .inventoryOrderRepositoryFilterElements,
    inventoryOrderRepositoryFilterDependency:
      store.inventorysmartReducer.inventorySmartOrderRepositoryService
        .inventoryOrderRepositoryFilterDependency,
    backButtonClicked:
      store.inventorysmartReducer.inventorySmartOrderRepositoryService
        .backButtonClicked,
    formFilters:
      store.inventorysmartReducer.inventorySmartOrderRepositoryService
        .formFilters,
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderRepositoryFilterConfiguration"
      ],
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventoryOrderRepositoryFilterLoader: (payload) =>
    dispatch(setInventoryOrderRepositoryFilterLoader(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setInventoryOrderRepositoryFilterElements: (payload) =>
    dispatch(setInventoryOrderRepositoryFilterElements(payload)),
  setInventoryOrderRepositoryFilterDependency: (payload) =>
    dispatch(setInventoryOrderRepositoryFilterDependency(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  resetOrderRepositoryState: () => dispatch(resetOrderRepositoryState()),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  setRedirectFromDeepDive: (payload) =>
    dispatch(setRedirectFromDeepDive(payload)),
  setOrderRepoSku: (payload) => dispatch(setOrderRepoSku(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderRepository);
