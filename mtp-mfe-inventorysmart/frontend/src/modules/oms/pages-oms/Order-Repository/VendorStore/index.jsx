import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import classNames from "classnames";
import { capitalize, cloneDeep, isEmpty, isArray, sortBy } from "lodash";
import React from "react";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { Tabs, ButtonGroup } from "impact-ui-v3";
import { mapDataToLabel } from "core/commonComponents/coreComponentScreen/utils";
import FilterChips from "core/commonComponents/filters/filterChips";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Loader from "core/Utils/Loader/loader";
import { tenantConfigApiCache } from "core/actions/tenantConfigActions";
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
  ERROR_MESSAGE,
  tableArticleFilter,
} from "modules/oms/constants-oms/stringConstants";
import { ORDER_REPOSITORY_FILTER_CONFIG_FOR_VENDOR_STORE } from "modules/oms/constants-oms/apiConstants";
import OrderRepositoryMetrics from "../components/OrderRepositoryMetrics";
import ApprovedOrders from "../Approved-Orders";
import {
  fetchFilterConfig,
  filtersPayload,
  fetchFilterOptions,
} from "modules/oms/utils-oms/oms-utility";
import DcFilter from "../../common/DcFilter";

const VendorStoreRepository = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

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
  const [reloadKpi, setReloadKpi] = useState(false);
  const [pageLoader, setPageLoader] = useState(false);
  const [
    isRedirectedFromDifferentPage,
    setIsRedirectedFromDifferentPage,
  ] = useState(false);

  const [tabValue, setTabValue] = useState("approved_orders");
  const [tabOptionsData, setTabOptionsData] = useState([]);
  const [tabList, setTabList] = useState([]);

  const type = new URLSearchParams(window.location.search).get("type");
  const savedFiltersDependency =
    JSON.parse(localStorage.getItem("selectedFiltersDependency")) || [];
  const storedSku = JSON.parse(localStorage.getItem("selectedSku"));
  const [customChipData, setCustomChipData] = useState(null);
  const [redirectedFilterDependency, setRedirectedFilterDependency] = useState(
    localStorage.getItem("selectedFiltersDependency")
      ? JSON.parse(localStorage.getItem("selectedFiltersDependency"))
      : []
  );

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
    const screenConfig = props?.screenConfig || [];
    const sortedTabs = sortBy(
      screenConfig,
      (tab) => tab.tab_display_order ?? 99999
    );
    const tabList = sortedTabs.map((tab) => ({ ...tabProps(tab) }));
    setTabList(tabList);

    setTabOptionsData(cloneDeep(screenConfig));

    if (sortedTabs.length) {
      setTabValue(sortedTabs[0]?.value || "approved_orders");
    }
  }, [props?.screenConfig]);

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
    if (isRedirectedFromDifferentPage) {
      props.setSelectedFilters(redirectedFilterDependency);
      props.setIsFiltersValid(true);
    } else {
      props.setSelectedFilters(payload.reqBody);
      props.setIsFiltersValid(payload.isValid);
    }
  };

  const getFiltersOptions = async (selected, current) => {
    try {
      props.setFilterLoader(true);
      const selectedFilters = isRedirectedFromDifferentPage
        ? cloneDeep(redirectedFilterDependency)
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
          "orderRepositoryVendorStoreFilterConfiguration",
          filterConfigData,
          "Order Repository",
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
          const formattedSelectedFilters = formatSelectedFiltersData(
            filterConfigData,
            "Order Repository",
            redirectedFilters
          );
          let filterConfigRedirected = formattedFilterConfiguration(
            "orderRepositoryVendorStoreFilterConfiguration",
            filterConfigData,
            "Order Repository",
            redirectedFilters
          );
          filterConfigRedirected[
            "orderRepositoryVendorStoreFilterConfiguration"
          ].isRedirectedFromDifferentPage = isRedirectedFromDifferentPage;

          if (redirectedFilters) {
            let chipsDependencyData = [];
            cloneDeep(redirectedFilters)?.map((item) => {
              if (isArray(item.values)) {
                item.values = item.values.map((value) => {
                  if (typeof value === "boolean")
                    return mapDataToLabel(value.toString().toUpperCase());
                  else return mapDataToLabel(value);
                });
              } else {
                item.values = [mapDataToLabel(item.values)];
              }
              if (item.values?.length > 0) {
                chipsDependencyData.push(item);
              }
              if (!item.filter_name) {
                item.filter_name = item.label || capitalize(item.dimension);
              }
            });
            const labelMap = response.reduce((map, config) => {
              map[config.column_name] = config.label;
              return map;
            }, {});

            const chips = chipsDependencyData.map((filter) => ({
              ...filter,
              label: labelMap[filter.attribute_name] || filter?.label || null,
              filter_name:
                labelMap[filter.attribute_name] || filter?.filter_name || null,
            }));
            setCustomChipData(chips);
          }
          setFilterDependency(formattedSelectedFilters);
          onFilterDashboardClick(redirectedFilters, response);
          props?.setFilterConfiguration(filterConfigRedirected);
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
          ORDER_REPOSITORY_FILTER_CONFIG_FOR_VENDOR_STORE
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
    fetchFilters();
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
    const tabData = tabOptionsData.filter((val) => val?.value === tabValue);
    const tabPanels = tabList.map((tabOption) => {
      return (
        <div>
          {tabValue === tabOption.value && (
            <ApprovedOrders
              startEndDate={startEndDate}
              data={tabData}
              setReloadKpi={setReloadKpi}
              isRedirectedFromDifferentPage={isRedirectedFromDifferentPage}
              isCalledFromVendorStore
            />
          )}
        </div>
      );
    });
    return tabPanels;
  };

  return (
    <>
      <CoreComponentScreen
        autoHideFilterButton={true}
        headerBreadCrumb={props.orderRepositoryBreadcrumbsOnly}
        extraButtons={[
          <DcFilter key="order-repository-dc-filter" variant="order_repository" />,
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
        disableFilters={isRedirectedFromDifferentPage}
        preventFilterPreselection={isRedirectedFromDifferentPage}
        autoApplyEnabled={!isRedirectedFromDifferentPage}
        filterConfigKey={"orderRepositoryVendorStoreFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        filterDependency={filterDependency?.length ? filterDependency : null}
      >
        {customChipData?.length > 0 && isRedirectedFromDifferentPage && (
          <FilterChips
            filterConfig={customChipData}
            isDateLabelDerivedFromDimension={true}
          ></FilterChips>
        )}

        <Loader loader={pageLoader}>
          {props?.isFiltersValid && (
            <div>
              <OrderRepositoryMetrics
                isRedirectedFromDifferentPage={isRedirectedFromDifferentPage}
                startEndDate={startEndDate}
                selectedDates={selectedDates}
                reloadKpi={reloadKpi}
                setReloadKpi={setReloadKpi}
                isCalledFromVendorStore
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
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    OrderRepoSelectedSku: store.omsReducer?.orderRepositoryService.selectedSku,
    screenConfig:
      store.omsReducer.orderingCommonService
        ?.orderRepositoryVendorToStoreConfig,
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
        "orderRepositoryVendorStoreFilterConfiguration"
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
  setOrderRepositoryDcDistributionStatus: (payload) =>
    dispatch(setOrderRepositoryDcDistributionStatus(payload)),
  tenantConfigApiCache: (application, queryParam) =>
    dispatch(tenantConfigApiCache(application, queryParam)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(VendorStoreRepository);
