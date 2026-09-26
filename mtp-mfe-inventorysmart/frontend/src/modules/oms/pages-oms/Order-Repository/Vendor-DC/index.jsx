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
import { Tabs, BottomSheet, Button, ButtonGroup } from "impact-ui-v3";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import {
  ERROR_MESSAGE,
  ORDER_REPOSITORY_SUMMARY_TAB_LIST,
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
  setOrderRepositoryDcDistributionStatus,
} from "modules/oms/services-oms/Order-Repository/order-repository-service";
import {
  getOmsCoreFiscalCalendar,
  getOmsReceiptCalendarData,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import OrderRepoSummary from "../Order-Repo-Summary";
import { isPresentNumericCellValue } from "modules/oms/utils-oms/orderRepoPacksEaches.util";
import moment from "moment";
import DcFilter from "../../common/DcFilter";

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
  const [reloadSummary, setReloadSummary] = useState(false);
  const [pageLoader, setPageLoader] = useState(false);
  const [
    isRedirectedFromDifferentPage,
    setIsRedirectedFromDifferentPage,
  ] = useState(false);
  const [tabList, setTabList] = useState([]);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [bottomSheetTabValue, setBottomSheetTabValue] = useState("");
  const [clickedOrderData, setClickedOrderData] = useState(null);

  const type = new URLSearchParams(window.location.search).get("type");
  const savedFiltersDependency =
    JSON.parse(localStorage.getItem("selectedFiltersDependency")) || [];
  const storedSku = JSON.parse(localStorage.getItem("selectedSku"));

  const TAB_LIST_OPTIONS =
    props?.orderSummaryScreenConfig?.month_week_tab_list ||
    ORDER_REPOSITORY_SUMMARY_TAB_LIST;

  const [selectedMonthTab, setSelectedMonthTab] = useState(
    TAB_LIST_OPTIONS[1].value
  );

  const SHOW_ROQ_DATE_OPTIONS =
    props.orderSummaryScreenConfig?.show_roq_date_options || false;

  const HIDE_KPI_METRICS =
    props.orderSummaryScreenConfig?.hide_kpi_metrics || false;

  const [selectedRoqDateTab, setSelectedRoqDateTab] = useState(
    "roq_placement_date"
  );

  const [selectedHierarchy, setSelectedHierarchy] = useState(null);
  const [secondaryHierarchy, setSecondaryHierarchy] = useState(null);

  const [viewByDropdownOptions, setViewByDropdownOptions] = useState([]);
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);
  const [receiptCalendarDetails, setReceiptCalendarDetails] = useState([]);

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
    console.log(!props?.orderSummaryScreenConfig);
    if (props?.orderSummaryScreenConfig?.isShowNewOrderRepoFeature) {
      if (!props?.orderSummaryScreenConfig) return;

      const VIEWBY_DROPDOWN_OPTIONS =
        props?.orderSummaryScreenConfig?.dropdown_options;

      setViewByDropdownOptions([...VIEWBY_DROPDOWN_OPTIONS]);
    }
  }, [props?.orderSummaryScreenConfig]);

  useEffect(() => {
    if (!tabOptionsData?.length || tabValue == null || tabValue === "") {
      props.setOrderRepositoryDcDistributionStatus(null);
      return;
    }
    const tab = tabOptionsData.find((t) => t?.value === tabValue);
    const raw = tab?.status;
    props.setOrderRepositoryDcDistributionStatus(
      Array.isArray(raw) && raw.length > 0 ? [...raw] : null
    );
  }, [tabValue, tabOptionsData, props.setOrderRepositoryDcDistributionStatus]);

  //Fetches Fiscal Calendar Data for the Receipt Date Option
  useEffect(() => {
    const fetchReceiptCalendarData = async () => {
      try {
        let startYear = moment().year();
        let endYear = moment().year() + 2;
        let queryParams = `?start_fiscal_year=${startYear}&end_fiscal_year=${endYear}`;
        const receiptCalendarData = await getOmsReceiptCalendarData(
          queryParams
        );
        moment.updateLocale("en", {
          week: {
            dow: receiptCalendarData?.data?.data?.week_start_day || 6,
          },
        });
        setReceiptCalendarDetails(receiptCalendarData?.data?.data?.data);
      } catch (error) {
        console.log("Error in fetchReceiptCalendarData", error);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    if (SHOW_ROQ_DATE_OPTIONS && isEmpty(receiptCalendarDetails)) {
      fetchReceiptCalendarData();
    }
  }, [SHOW_ROQ_DATE_OPTIONS, receiptCalendarDetails]);

  const handleOpenBottomSheet = (
    orderType,
    columnName,
    value,
    rowData,
    parentData
  ) => {
    if (!isPresentNumericCellValue(value)) {
      return;
    }

    // orderType is now passed directly as the tab value (Send_for_Approval_1, Push_Back, approved_orders)
    const tabValue = orderType;
    // Enhance rowData with parent hierarchy value if parentData is provided
    const enhancedRowData = { ...rowData };
    if (parentData && selectedHierarchy && parentData[selectedHierarchy]) {
      enhancedRowData[selectedHierarchy] = parentData[selectedHierarchy];
    }

    setBottomSheetTabValue(tabValue);
    setTabValue(tabValue); // Set the main tab value to the clicked order type
    setClickedOrderData({
      orderType,
      columnName,
      value,
      rowData: enhancedRowData,
    });
    setIsBottomSheetOpen(true);
  };

  const handleCloseBottomSheet = () => {
    setIsBottomSheetOpen(false);
    setBottomSheetTabValue("");
    setClickedOrderData(null);
    setReloadKpi((prev) => !prev);
    setReloadSummary((prev) => !prev);
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

    // When in bottom sheet, only render the selected tab
    const tabsToRender = isBottomSheetOpen
      ? tabList.filter((tab) => tab.value === bottomSheetTabValue)
      : tabList;

    const tabPanels = tabsToRender.map((tabOption) => {
      return (
        <div key={tabOption.value}>
          {tabValue === tabOption.value && (
            <ApprovedOrders
              startEndDate={startEndDate}
              data={tabData}
              setReloadKpi={setReloadKpi}
              isRedirectedFromDifferentPage={isRedirectedFromDifferentPage}
              dateRange={clickedOrderData?.columnName}
              roqDateOption={selectedRoqDateTab}
              selectedHierarchy={selectedHierarchy}
              secondaryHierarchy={secondaryHierarchy}
              clickedColumnData={clickedOrderData}
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

  const handleMonthTab = (event, newSelection) => {
    if (newSelection !== null) {
      setSelectedMonthTab(newSelection);
    }
  };

  const handleRoqDateTabChange = (event, newValue) => {
    if (newValue !== null) {
      setSelectedRoqDateTab(newValue);
    }
  };

  const handleHierarchyChange = (primary, secondary) => {
    setSelectedHierarchy(primary);
    setSecondaryHierarchy(secondary);
  };

  return (
    <>
      <div>
        <CoreComponentScreen
          autoHideFilterButton={true}
          headerBreadCrumb={props.orderRepositoryBreadcrumbsOnly}
          extraButtons={[
            <DcFilter
              key="order-repository-dc-filter"
              variant="order_repository"
            />,
          ]}
          renderAboveFilterDashboard={
            props.groupOptions ? (
              <div
                className={`${globalClasses.centerAlign} ${globalClasses.marginBottom}`}
              >
                <ButtonGroup
                  onChange={props.onOrderRepositoryGroupChange}
                  options={props.groupOptions}
                  selectedOption={props.selectedGroup}
                />
              </div>
            ) : null
          }
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
            {props?.isFiltersValid && !HIDE_KPI_METRICS && (
              <div className={classNames(globalClasses.marginVertical1rem)}>
                <OrderRepositoryMetrics
                  isRedirectedFromDifferentPage={isRedirectedFromDifferentPage}
                  startEndDate={startEndDate}
                  selectedDates={selectedDates}
                  reloadKpi={reloadKpi}
                  setReloadKpi={setReloadKpi}
                  syncOrderStatusSummaryWithRepoSummary={
                    props?.orderSummaryScreenConfig?.isShowNewOrderRepoFeature
                  }
                />
              </div>
            )}

            {props?.isFiltersValid &&
              props?.orderSummaryScreenConfig?.isShowNewOrderRepoFeature &&
              viewByDropdownOptions?.length > 0 && (
                <div>
                  <OrderRepoSummary
                    isRedirectedFromDifferentPage={
                      isRedirectedFromDifferentPage
                    }
                    selectedMonthTab={selectedMonthTab}
                    onOrderColumnClick={handleOpenBottomSheet}
                    handleMonthTab={handleMonthTab}
                    handleRoqDateTabChange={handleRoqDateTabChange}
                    handleHierarchyChange={handleHierarchyChange}
                    viewByDropdownOptions={viewByDropdownOptions}
                    fiscalCalendarDetails={fiscalCalendarDetails}
                    receiptCalendarDetails={receiptCalendarDetails}
                    reloadSummary={reloadSummary}
                    setReloadSummary={setReloadSummary}
                  />
                </div>
              )}

            {props?.isFiltersValid &&
              !props?.orderSummaryScreenConfig?.isShowNewOrderRepoFeature &&
              (props?.screenConfig.length !== 0 ? (
                <div className={classNames(globalClasses.marginVertical1rem)}>
                  <Tabs
                    value={tabValue}
                    onChange={handleChangeTabValue}
                    aria-label="order-repository-status-tab"
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

        {/* Bottom Sheet for Order Details */}
        {isBottomSheetOpen && (
          <BottomSheet
            title={
              tabList.find((tab) => tab.value === bottomSheetTabValue)?.label ||
              bottomSheetTabValue
            }
            label="Default"
            open={isBottomSheetOpen}
            isExpanded={true}
            footerOptions={
              <Button onClick={handleCloseBottomSheet} variant="url">
                Close
              </Button>
            }
            onClose={handleCloseBottomSheet}
          >
            <div style={{ padding: "0 0.5rem" }}>
              {props?.screenConfig.length !== 0 ? (
                <Tabs
                  value={bottomSheetTabValue}
                  onChange={handleChangeTabValue}
                  aria-label="order-repository-tab"
                  tabNames={tabList.filter(
                    (tab) => tab.value === bottomSheetTabValue
                  )}
                  tabPanels={renderTabComponents()}
                />
              ) : (
                <Stack spacing={2} sx={{ width: "100%" }}>
                  <Alert severity="info">
                    Order Repository Order Status Tabs Error!
                  </Alert>
                </Stack>
              )}
            </div>
          </BottomSheet>
        )}
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
    orderSummaryScreenConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig
        ?.order_repository,
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
  setOrderRepositoryDcDistributionStatus: (payload) =>
    dispatch(setOrderRepositoryDcDistributionStatus(payload)),
  tenantConfigApiCache: (application, queryParam) =>
    dispatch(tenantConfigApiCache(application, queryParam)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(VendorDCOrderRepository);
