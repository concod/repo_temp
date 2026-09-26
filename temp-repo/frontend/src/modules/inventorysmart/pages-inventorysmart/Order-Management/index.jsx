import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useHistory } from "react-router";
import { ORDER_MANAGEMENT } from "../../constants-inventorysmart/routesConstants";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
} from "../inventorysmart-utility";
import classNames from "classnames";
import {
  ERROR_MESSAGE,
  INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_OMS_MULTI_WEEK,
  INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_OMS_RECEIPT_DATE_MULTI_WEEK,
  TENANT_DATE_FORMAT,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep, isEmpty } from "lodash";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import {
  setInventoryOrderManagementFilterLoader,
  setInventoryOrderManagementFilterElements,
  setInventoryOrderManagementFilterDependency,
  setSelectedFilters,
  setIsFiltersValid,
  resetOrderManagementState,
  setRedirectFromDeepDive,
  setRecommRecieptDate,
  setOmsSku,
  getOmsCoreFiscalCalendar,
  setRopDate,
} from "modules/inventorysmart/services-inventorysmart/Order-Management/order-management-service";
import React from "react";
import OrderManagementMetrics from "./components/OrderManagementMetrics";
import SubClassLevelSummaryTableNewView from "./components/SubClassLevelSummaryTableNewView";
import OrderSKUSummary from "./components/OrderSKUSummary";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
  Grid,
} from "@mui/material";
import moment from "moment";
import { ORDER_MANAGEMENT_FILTER_CONFIG } from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import Loader from "core/Utils/Loader/loader";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";

const KPI_UNITS = "units";
const KPI_COST = "cost";

const OrderManagement = (props) => {
  const history = useHistory();
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [kpiCostChecked, setKpiCostChecked] = useState(true);
  const [radioButtonValue, setRadioButtonValue] = useState("cost");
  const [isAccordionExpanded, setIsAccordionExpanded] = useState(true);
  const [pageLoader, setPageLoader] = useState(false);
  const [filters, setFilters] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);
  const [filterDependency, setFilterDependency] = useState([]);
  const [reloadKpi, setReloadKpi] = useState(null);

  const [ropDate, setRopDate] = useState({
    start_date: null,
    end_date: null,
  });
  const [recommRecieptDate, setRecommRecieptDate] = useState({
    start_date: null,
    end_date: null,
  });

  const [isRedirectedFromDifferentPage, setIsRedirectedFromDifferentPage] =
    useState(false);
  const [redirectfromDeepDive, setRedirectFromDeepDiveOMS] = useState(
    props?.location?.isRedirectedFromDeepDive
      ? props?.location?.isRedirectedFromDeepDive
      : false
  );
  const [disabledFilter, setDisabledFilter] = useState(
    props?.location?.disabledFilter ? props?.location?.disabledFilter : false
  );
  const [redirectToDifferentScreen, setRedirectToDifferentScreen] =
    useState(false);

  const type = new URLSearchParams(window.location.search).get("type");

  const savedFiltersDependency =
    JSON.parse(localStorage.getItem("selectedFiltersDependency")) || [];
  const startDateDashboard = JSON.parse(localStorage.getItem("startDate"));
  const endDatedashboard = JSON.parse(localStorage.getItem("endDate"));
  const storedSku = JSON.parse(localStorage.getItem("selectedSku")) || [];
  // const poCode = JSON.parse(localStorage.getItem("po_code") || null);
  var sD;
  var eD;
  var flag = true;

  useEffect(() => {
    if (isRedirectedFromDifferentPage) {
      if (props.isFiltersValid) setPageLoader(false);
      else setPageLoader(true);
    }
    if (isRedirectedFromDifferentPage) {
      if (storedSku.length > 0) localStorage.removeItem("selectedSku");
    }
  }, [isRedirectedFromDifferentPage, props.isFiltersValid]);

  useEffect(() => {
    const selectedFiltersDependency =
      savedFiltersDependency?.length > 0
        ? savedFiltersDependency
        : props.filterDashboardConfiguration?.appliedFilterData?.dependencyData;
    const selectedSku =
      storedSku?.length > 0 ? storedSku : props.selectedOmsSku;

    const redirectedFromDifferentPage = type ? true : false;
    sD = startDateDashboard;
    eD = endDatedashboard;
    props.setInventoryOrderManagementFilterDependency(
      selectedFiltersDependency
    );
    props.setOmsSku(selectedSku);
    localStorage.removeItem("selectedFiltersDependency");
    setIsRedirectedFromDifferentPage(redirectedFromDifferentPage);

    //Loads Fiscal Calendar and Filter COnfig
    const fetchFilters = async () => {
      try {
        props.setInventoryOrderManagementFilterLoader(true);
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
        const response = await fetchFilterConfig(
          ORDER_MANAGEMENT_FILTER_CONFIG
        );
        setFilters(response);
      } catch (error) {
        props.setInventoryOrderManagementFilterLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchFilters();

    if (props.redirectFromDeepDive && redirectfromDeepDive) {
      props.setIsFiltersValid(true);
      return props.setRedirectFromDeepDive(false);
    } else {
      if (props.redirectFromDeepDive && !redirectfromDeepDive) {
        return props.resetOrderManagementState();
      }
      if (!props.redirectFromDeepDive && !redirectedFromDifferentPage) {
        return props.resetOrderManagementState();
      }
    }
  }, []);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  const applyFilters = (
    filterElements,
    filterDependency,
    filterRopDates,
    filterRecommDates
  ) => {
    // let isFilterDatesSelected = false; // To verify if user has provided a date range
    const payload = filtersPayload(
      filterElements,
      filterDependency || props.inventoryOrderManagementFilterDependency,
      true
    );

    const currentDate = moment().format(TENANT_DATE_FORMAT);
    const selectedFilters = {
      filters: payload.reqBody.filter((filter) => {
        return filter.values?.length > 0;
      }),
      fiscal_year_week: null,
      fiscal_year_week_type: null,
    };

    //Recommended Order Placement Filter Dates
    if (
      !localStorage.getItem("startDate") &&
      !localStorage.getItem("endDate")
    ) {
      var dates = filterRopDates?.values;
    }
    if (dates) {
      if (!dates?.fiscalInfoStartDate || !dates?.fiscalInfoEndDate) {
        //payload.isValid = false;
        //isFilterDatesSelected = false;
      } else {
        const endDate = moment(
          dates?.fiscalInfoEndDate?.calendar_week_start_date
        )
          .endOf("week")
          .format(TENANT_DATE_FORMAT);
        const isFuturisticDate = moment(endDate).isSameOrAfter(
          currentDate,
          "day"
        );
        selectedFilters.fiscal_year_week =
          dates.fiscalInfoEndDate?.fiscal_year_week;
        selectedFilters.fiscal_year_week_type = isFuturisticDate
          ? "future"
          : "historical";

        const startDate = moment(
          dates?.fiscalInfoStartDate?.calendar_week_start_date
        )
          .startOf("week")
          .format(TENANT_DATE_FORMAT);

        let dateParams = {
          attribute_name: "order_placement_recom_date",
          start_date: startDate ? startDate : startDateDashboard,
          end_date: endDate ? endDate : endDatedashboard,
        };
        setRopDate(dateParams);
        props?.setRopDate(dateParams);
        //isFilterDatesSelected = true;
      }
    } else {
      let dateParams = {
        attribute_name: "order_placement_recom_date",
        start_date: null,
        end_date: null,
      };
      setRopDate(dateParams);
      props?.setRopDate(dateParams);
    }
    if (localStorage.getItem("startDate") && localStorage.getItem("endDate")) {
      let dateParams = {
        attribute_name: "order_placement_recom_date",
        start_date: JSON.parse(localStorage.getItem("startDate")),
        end_date: JSON.parse(localStorage.getItem("endDate")),
      };
      setRopDate(dateParams);
      props?.setRopDate(dateParams);
      //isFilterDatesSelected = true;
    }
    localStorage.removeItem("startDate");
    localStorage.removeItem("endDate");

    //Recom Receipt Date Filter Dates
    var recommReceiptFilterDates = filterRecommDates?.values;

    if (recommReceiptFilterDates) {
      if (
        recommReceiptFilterDates?.fiscalInfoStartDate ||
        recommReceiptFilterDates?.fiscalInfoEndDate
      ) {
        const endReceiptDate = moment(
          recommReceiptFilterDates?.fiscalInfoEndDate?.calendar_week_start_date
        )
          .endOf("week")
          .format(TENANT_DATE_FORMAT);
        const isFuturisticDate = moment(endReceiptDate).isSameOrAfter(
          currentDate,
          "day"
        );
        selectedFilters.fiscal_year_week =
          recommReceiptFilterDates.fiscalInfoEndDate?.fiscal_year_week;
        selectedFilters.fiscal_year_week_type = isFuturisticDate
          ? "future"
          : "historical";
        const startReceiptDate = moment(
          recommReceiptFilterDates?.fiscalInfoStartDate
            ?.calendar_week_start_date
        )
          .startOf("week")
          .format(TENANT_DATE_FORMAT);
        let dateParams = {
          attribute_name: "not_before_date",
          start_date: startReceiptDate,
          end_date: endReceiptDate,
        };
        setRecommRecieptDate(dateParams);
        props?.setRecommRecieptDate(dateParams);
      }
    } else {
      let dateParams = {
        attribute_name: "not_before_date",
        start_date: null,
        end_date: null,
      };
      setRecommRecieptDate(dateParams);
      props?.setRecommRecieptDate(dateParams);
    }

    props.setSelectedFilters(payload.reqBody);
    props.setIsFiltersValid(payload.isValid);
    setReloadKpi(null);
  };

  //For Reco Order Placement Date
  const isOutsideRange = (date) => {
    let weekStartDay = moment().startOf("week");
    let weekEndDay = moment().endOf("week").day(27);
    return !moment(date).isBetween(weekStartDay, weekEndDay, undefined, "[]");
  };

  //For Order Receipt date
  const isReceiptDateOutsideRange = (date) => {
    let weekStartDay = moment().startOf("week");
    let weekEndDay = moment().add(1, "years").endOf("week");
    return !moment(date).isBetween(weekStartDay, weekEndDay, undefined, "[]");
  };

  const getFiltersOptions = async (selected, current) => {
    try {
      props.setInventoryOrderManagementFilterLoader(true);
      const selectedFilters = isRedirectedFromDifferentPage
        ? cloneDeep(props.inventoryOrderManagementFilterDependency)
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

      //For Recomm Reciept Date Filter
      const recommRecieptCalendarConfig = JSON.parse(
        JSON.stringify(
          INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_OMS_MULTI_WEEK
        )
      );
      recommRecieptCalendarConfig.fc_code = response[0]?.fc_code;
      recommRecieptCalendarConfig.initialData = fiscalCalendarDetails;
      recommRecieptCalendarConfig.isOutsideRange = isOutsideRange;

      //For Rop Date Filter
      const ropCalendarConfig = JSON.parse(
        JSON.stringify(
          INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_OMS_RECEIPT_DATE_MULTI_WEEK
        )
      );
      ropCalendarConfig.fc_code = response[0]?.fc_code;
      ropCalendarConfig.initialData = fiscalCalendarDetails;
      ropCalendarConfig.isOutsideRange = isReceiptDateOutsideRange;

      const responseWithFiscalCalendarConfig = [
        ...response,
        recommRecieptCalendarConfig,
        ropCalendarConfig,
      ];

      if (
        isEmpty(props.filterDashboardConfiguration) ||
        props?.filterDashboardConfiguration?.isRedirectedFromDifferentPage
      ) {
        const filterConfigData = [
          {
            filterDashboardData: responseWithFiscalCalendarConfig,
            isCrossDimensionFilter: true,
            screen_name: props.screenName,
          },
        ];
        const filterConfig = formattedFilterConfiguration(
          "orderManagementFilterConfiguration",
          filterConfigData,
          "Order Management",
          selectedFilters
        );
        if (isRedirectedFromDifferentPage) {
          const formattedSelectedFilters = formatSelectedFiltersData(
            filterConfigData,
            "Order Management",
            selectedFilters
          );
          filterConfig[
            "orderManagementFilterConfiguration"
          ].isRedirectedFromDifferentPage = isRedirectedFromDifferentPage;
          onFilterDashboardClick(selectedFilters, response);
          setFilterDependency(formattedSelectedFilters);
        }
        //onFilterDashboardClick(filterConfig,response);
        props.setFilterConfiguration(filterConfig);
      }
      let filterElements = cloneDeep(response);
      setFilterData(response);
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setInventoryOrderManagementFilterLoader(false);
    }
  };

  useEffect(() => {
    if (!filters || filters?.length === 0) {
      return;
    }
    if (!isEmpty(fiscalCalendarDetails))
      getFiltersOptions(props.savedFilterSelection);
  }, [filters, fiscalCalendarDetails]);

  useEffect(() => {
    if (props.backButtonClicked) {
      setFilters([]);
      setFilterData([]);
    }
  }, [props.backButtonClicked, props.formFilters]);

  const onFilterDashboardClick = (dependencyData, filterData) => {
    const fiscal_date_range = dependencyData?.find(
      (dataItem) => dataItem.attribute_name === "fiscal_date_range"
    );
    const fiscal_date_range_receipt = dependencyData?.find(
      (dataItem) => dataItem.attribute_name === "fiscal_date_range_receipt"
    );
    filterData = filterData.filter(
      (item) =>
        item.column_name !== "fiscal_date_range" &&
        item.column_name !== "fiscal_date_range_receipt"
    );

    applyFilters(
      filterData,
      dependencyData,
      fiscal_date_range,
      fiscal_date_range_receipt
    );
  };

  const onKpiSummarySelectChange = (event) => {
    let userSelection = event.target.value;
    setRadioButtonValue(userSelection);
    if (userSelection === KPI_UNITS) setKpiCostChecked(false);
    else setKpiCostChecked(true);
  };

  const accordionOnChange = (event, isExpanded) => {
    setIsAccordionExpanded(isExpanded);
  };

  return (
    <>
      <HeaderBreadCrumbs
        options={[
          {
            label: "Order Management",
            id: 1,
            action: () => {
              history.push(ORDER_MANAGEMENT);
            },
          },
        ]}
      ></HeaderBreadCrumbs>

      <CoreComponentScreen
        showPageRoute={false}
        showPageHeader={true}
        showFilterDashboard={true}
        showChipsOnLoad={
          isRedirectedFromDifferentPage || props.redirectFromDeepDive
        }
        disableFilters={isRedirectedFromDifferentPage || disabledFilter}
        filterConfigKey={"orderManagementFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        isDateLabelDerivedFromDimension={true}
      >
        <Loader loader={pageLoader}>
          {props?.isFiltersValid && (
            <div className={classNames(globalClasses.marginVertical1rem)}>
              <CustomAccordion label="KPIs" onChange={accordionOnChange}>
                <div className={classes.kpiValueText}>
                  <FormControl>
                    <RadioGroup
                      row
                      name="radio-buttons-group"
                      aria-labelledby="radio-buttons-group-label"
                      value={radioButtonValue}
                      onChange={onKpiSummarySelectChange}
                    >
                      <FormControlLabel
                        value={KPI_UNITS}
                        control={<Radio size="small" />}
                        label="Units"
                      />
                      <FormControlLabel
                        value={KPI_COST}
                        control={<Radio size="small" />}
                        label="Cost"
                      />
                    </RadioGroup>
                  </FormControl>
                </div>

                <OrderManagementMetrics
                  kpiCostChecked={kpiCostChecked}
                  ropDate={props?.ropDate}
                  recommRecieptDate={props?.recommRecieptDate}
                  reloadKpi={reloadKpi}
                  setReloadKpi={setReloadKpi}
                  isRedirectedFromDifferentPage={
                    isRedirectedFromDifferentPage || disabledFilter
                  }
                />
              </CustomAccordion>
            </div>
          )}

          {props?.isFiltersValid && (
            <div className={classNames(globalClasses.marginVertical2rem)}>
              <OrderSKUSummary
                isDeepDriveScreen={false}
                ropDate={props?.ropDate}
                recommRecieptDate={props?.recommRecieptDate}
                isRedirectedFromDifferentPage={
                  isRedirectedFromDifferentPage || disabledFilter
                }
                setRedirectToDifferentScreen={setRedirectToDifferentScreen}
                setReloadKpi={setReloadKpi}
                fiscalCalendarData={fiscalCalendarDetails}
              />
            </div>
          )}

          {props?.isFiltersValid && (
            <>
              <Grid
                container
                className={globalClasses.marginVertical1rem}
                justifyContent={"space-between"}
              >
                <Grid container alignItems={"center"} item xs={6} lg={6}>
                  <Typography variant="h6">Subclass Level Summary</Typography>
                </Grid>
              </Grid>
              <div className={classNames(globalClasses.marginVertical2rem)}>
                <SubClassLevelSummaryTableNewView
                  ropDate={props?.ropDate}
                  recommRecieptDate={props?.recommRecieptDate}
                  reloadKpi={reloadKpi}
                  isRedirectedFromDifferentPage={
                    isRedirectedFromDifferentPage || disabledFilter
                  }
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
    selectedOmsSku:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .selectedSku,
    isFiltersValid:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .isFiltersValid,
    inventoryOrderManagementFilterLoader:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .inventoryOrderManagementFilterLoader,
    inventoryOrderManagementFilterElements:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .inventoryOrderManagementFilterElements,
    inventoryOrderManagementFilterDependency:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .inventoryOrderManagementFilterDependency,
    backButtonClicked:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .backButtonClicked,
    formFilters:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .formFilters,
    redirectFromDeepDive:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .redirectFromDeepDive,
    recommRecieptDate:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .recommRecieptDate,
    ropDate:
      store.inventorysmartReducer.inventorySmartOrderManagementService.ropDate,
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderManagementFilterConfiguration"
      ],
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventoryOrderManagementFilterLoader: (payload) =>
    dispatch(setInventoryOrderManagementFilterLoader(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setInventoryOrderManagementFilterElements: (payload) =>
    dispatch(setInventoryOrderManagementFilterElements(payload)),
  setInventoryOrderManagementFilterDependency: (payload) =>
    dispatch(setInventoryOrderManagementFilterDependency(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  resetOrderManagementState: () => dispatch(resetOrderManagementState()),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  setRedirectFromDeepDive: (filterConfiguration) =>
    dispatch(setRedirectFromDeepDive(filterConfiguration)),
  setRecommRecieptDate: (filterConfiguration) =>
    dispatch(setRecommRecieptDate(filterConfiguration)),
  setRopDate: (filterConfiguration) =>
    dispatch(setRopDate(filterConfiguration)),
  setOmsSku: (payload) => dispatch(setOmsSku(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderManagement);
