import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import {
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import classNames from "classnames";
import moment from "moment";
import { Grid } from "@mui/material";
import { isEmpty, cloneDeep } from "lodash";
import DcFilter from "../../../common/DcFilter";
import {
  ORDER_MANAGEMENT,
  ORDER_MANAGEMENT_MATRIX_SUMMARY,
  ORDER_MANAGEMENT_PRODUCT_DETAILS,
  ORDER_MANAGEMENT_CREATE_SCENARIO,
} from "modules/oms/constants-oms/routeConstants";
import {
  setOrderManagementFilterElements,
  setRedirectFromDeepDive,
  getOmsCoreFiscalCalendar,
  setOrderManagementKpiSummaryLoader,
  getOmsDeepDiveFilters,
  setOrderManagementDeepDiveFilters,
  setOrderManagementProductDetailsFilters,
  resetOrderManagementState,
  setSelectedRowsFromMatrixSummary,
  setOrderManagementDeepDiveFiltersPayload,
  setSelectedDcs,
  setSelectedFilters,
  setRedirectionDetails,
  getOmsSkuRiskKpiData,
  getShipmentModes,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import { Button } from "impact-ui-v3";
import StyleOrderSummaryTable from "./Style-Order-Summary/styleOrderSummaryTable";
import OrderDeepDive from "../../Order-Deep-Dive";
import CommonDeepDive from "../../../common/DeepDiveChart";
import {
  ERROR_MESSAGE,
  OMS_OM_REDIRECT_DASHBOARD_DCS,
  SKU_CATEGORISATION_CARDS,
  SKU_CATEGORISATION_EMPTY_COUNT_MESSAGE,
  SKU_CATEGORISATION_STOCKOUT_RISK_KEY,
} from "modules/oms/constants-oms/stringConstants";
import { mergeOmsDcIntoFilters } from "modules/oms/utils-oms/oms-utility";
import ProductDetailsFilters from "./ProductDetailsFilters";
import { getTabProps } from "./Style-Order-Summary/utils";
import Loader from "core/Utils/Loader/loader";
import EmptyStateLayout from "../EmptyStateLayout";
import { setFilterConfiguration } from "core/actions/filterAction";
import { useStyles } from "modules/oms/styles-oms/orderingCustomStyles";
import { adjustMiddleContentHeight } from "../../../../utils-oms/oms-utility";
import SkuCategorisationKpiPanel, {
  SkuCategorisationHeader,
} from "./SkuCategorisation/SkuCategorisationKpiPanel";
import ProductDetailsStockoutRiskTable from "./SkuCategorisation/ProductDetailsStockoutRiskTable";
import ProductDetailsRecoveryWindowChart from "./SkuCategorisation/ProductDetailsRecoveryWindowChart";
import { buildSkuRiskKpiRequestPayload } from "./SkuCategorisation/buildSkuRiskKpiRequestPayload";

const productDetailsScreen = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const history = useHistory();

  const globalClasses = globalStyles();
  const classes = useStyles();

  // Fetching the redirection details from local storage
  const redirectionDetails = JSON.parse(
    localStorage.getItem("omsRedirectionDetails")
  );

  const [
    isRedirectedFromDashboardPage,
    setIsRedirectedFromDashboardPage,
  ] = useState(
    location?.state?.isRedirectedFromDashboardPage
      ? location?.state?.isRedirectedFromDashboardPage
      : false
  );
  const [reloadComponents, setReloadComponents] = useState(0);
  const [showLoader, setShowLoader] = useState(true);
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);
  const [selectedSkuKpiKey, setSelectedSkuKpiKey] = useState("total_skus");
  const [skuCategorisationKpiData, setSkuCategorisationKpiData] = useState({});
  const [
    skuCategorisationKpiLoading,
    setSkuCategorisationKpiLoading,
  ] = useState(false);
  const [recoveryWindowGraph, setRecoveryWindowGraph] = useState(null);
  const [shipmentModes, setShipmentModes] = useState([]);
  const previousDeepDivePayloadRef = useRef(null);
  const type = new URLSearchParams(window.location.search).get("type");
  const isRedirectedFromDifferentPage = type && true;
  const middleContentRef = useRef(null);
  const deepDiveChartRef = useRef(null);
  const styleOrderSummaryTableRef = useRef(null);
  const hasScrolledToTableRef = useRef(false);

  const onBackButtonClickHandler = () => {
    let filterDependency =
      props?.filterDashboardConfiguration?.dependencyData?.length > 0
        ? props?.filterDashboardConfiguration?.dependencyData
        : props?.orderManagementFilterDependency;
    setOrderManagementKpiSummaryLoader(true);
    props.setRedirectFromDeepDive(true);

    navigate(ORDER_MANAGEMENT_MATRIX_SUMMARY, {
      state: {
        isRedirectedFromDeepDive: true,
        disabledFilter: isRedirectedFromDashboardPage,
        filterDependency: filterDependency,
      },
    });
  };

  const navigateToHighLevelSummary = () => {
    props?.setRedirectionDetails({
      target: "high_level_summary",
      source: "matrix_summary",
      dateFilters: props?.redirectDetails?.dateFilters,
    });
    let filterDependency =
      props?.filterDashboardConfiguration?.dependencyData?.length > 0
        ? props?.filterDashboardConfiguration?.dependencyData
        : props?.orderManagementFilterDependency;

    navigate(ORDER_MANAGEMENT, {
      state: {
        isRedirectedFromDeepDive: true,
        disabledFilter: isRedirectedFromDashboardPage,
        filterDependency: filterDependency,
      },
    });
    props.setRedirectFromDeepDive(true);
    setOrderManagementKpiSummaryLoader(true);
    sessionStorage.setItem("isRedirectedFromMatrixSummary", "true");
  };

  const productDetailsScreenTitle =
    props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
      ?.header_tab_title || "Product";
  const productDetailsScreenDetailsHeading = `${productDetailsScreenTitle} Details:`;
  const enableSkUCategorisation =
    props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
      ?.enable_sku_categorisation || false;

  const isChartModularised =
    props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
      ?.is_chart_modularised || false;

  const skuCategorisationCards =
    props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
      ?.sku_categorisation_cards || SKU_CATEGORISATION_CARDS;

  const showStockoutRiskTable =
    enableSkUCategorisation &&
    selectedSkuKpiKey === SKU_CATEGORISATION_STOCKOUT_RISK_KEY;

  const selectedKpiStyles = useMemo(() => {
    if (!showStockoutRiskTable) {
      return null;
    }
    const kpiEntry = skuCategorisationKpiData?.[selectedSkuKpiKey];
    return Array.isArray(kpiEntry?.styles) ? kpiEntry.styles : [];
  }, [showStockoutRiskTable, skuCategorisationKpiData, selectedSkuKpiKey]);

  const stylesSelectedCount = showStockoutRiskTable
    ? selectedKpiStyles?.length || 0
    : props?.selectedRowsFromMatrixSummary?.values?.length || 0;

  const selectedSkuKpiTitle =
    skuCategorisationCards.find((card) => card.key === selectedSkuKpiKey)
      ?.title || "Total SKU's";

  const routeOptions = [
    {
      label: "Home",
      to: "/home",
    },
    {
      id: 1,
      label: "Order Management",
      action: () => {
        navigateToHighLevelSummary();
      },
    },
    {
      id: 2,
      label: "Matrix Summary",
      action: () => {
        navigate(ORDER_MANAGEMENT_MATRIX_SUMMARY);
      },
    },
    {
      id: 3,
      label: "Product Details",
      action: () => {
        navigate(ORDER_MANAGEMENT_PRODUCT_DETAILS);
      },
    },
  ];

  useEffect(() => {
    //Loads Fiscal Calendar and Filter COnfig
    const fetchFilters = async () => {
      try {
        setShowLoader(true);
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
        setShowLoader(false);
      } catch (error) {
        setShowLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
        console.log(error);
      }
    };
    fetchFilters();
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

  const handleChangeTabValue = (_event, newValue) => {
    setTabValue(newValue);
    setReloadComponents(0);
  };

  useEffect(() => {
    //Handling the case where user refreshes the page
    const isRefreshed = !sessionStorage.getItem("productDetailsLoaded");
    if (
      isRefreshed &&
      location.pathname !== ORDER_MANAGEMENT_MATRIX_SUMMARY &&
      location.pathname !== ORDER_MANAGEMENT &&
      location.pathname !== ORDER_MANAGEMENT_CREATE_SCENARIO
    ) {
      props.resetOrderManagementState();
      props.setFilterConfiguration({
        orderManagementFilterConfiguration: undefined,
      });
    }
    sessionStorage.setItem("productDetailsLoaded", "true");

    //Handling the case where user navigates to different screen (out of OMS Module)
    const resetOrderManagementReduxState = history.listen((location) => {
      if (
        location.pathname !== ORDER_MANAGEMENT &&
        location.pathname !== ORDER_MANAGEMENT_MATRIX_SUMMARY &&
        location.pathname !== ORDER_MANAGEMENT_PRODUCT_DETAILS &&
        location.pathname !== ORDER_MANAGEMENT_CREATE_SCENARIO
      ) {
        props.resetOrderManagementState();
        props.setFilterConfiguration({
          orderManagementFilterConfiguration: undefined,
        });
      }
    });
    return () => resetOrderManagementReduxState();
  }, []);

  useEffect(() => {
    const fetchDeepDiveFilters = async () => {
      try {
        let deepDiveFilters = await props.getOmsDeepDiveFilters();

        let productDetailsFilters = [];
        if (deepDiveFilters?.data?.data?.length > 0) {
          productDetailsFilters.push(deepDiveFilters?.data?.data[0]);
        }
        props?.setOrderManagementProductDetailsFilters(productDetailsFilters);

        if (deepDiveFilters?.data?.data?.length > 1) {
          props?.setOrderManagementDeepDiveFilters(
            deepDiveFilters?.data?.data?.slice(1)
          );
        }

        //Handling Redirection cases
        if (redirectionDetails?.isRedirection) {
          const filterSelectedIdsFromMatrix = productDetailsFilters?.[0] || {};
          const selectedIdsFromMatrix =
            redirectionDetails?.selectedRowIds || [];
          const selectedFilters = redirectionDetails?.selectedFilters || [];
          const selectedRowsFilter = {
            filter_type: filterSelectedIdsFromMatrix?.type,
            attribute_name: filterSelectedIdsFromMatrix?.column_name,
            operator: "in",
            dimension: filterSelectedIdsFromMatrix?.dimension,
            values: [...selectedIdsFromMatrix],
          };
          props?.setSelectedRowsFromMatrixSummary(selectedRowsFilter);
          props?.setOrderManagementDeepDiveFiltersPayload({
            filters: selectedFilters,
          });

          const omDcRaw = localStorage.getItem(OMS_OM_REDIRECT_DASHBOARD_DCS);
          let parsedDcs = [];
          if (omDcRaw) {
            try {
              const parsed = JSON.parse(omDcRaw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                parsedDcs = parsed;
                props.setSelectedDcs(parsed);
              }
            } catch (dcErr) {
              console.error(
                "Product details: redirect DC hydrate failed",
                dcErr
              );
            }
            localStorage.removeItem(OMS_OM_REDIRECT_DASHBOARD_DCS);
          }

          const filtersFromRedirect = cloneDeep(
            redirectionDetails?.selectedFilters || []
          );
          if (parsedDcs.length > 0) {
            props.setSelectedFilters(
              mergeOmsDcIntoFilters(filtersFromRedirect, parsedDcs)
            );
          } else if (filtersFromRedirect.length > 0) {
            props.setSelectedFilters(filtersFromRedirect);
          }
        }
      } catch (err) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        console.log(err);
      }
    };

    if (
      props?.orderManagementProductDetailsFilters?.length === 0 ||
      props?.orderManagementDeepDiveFilters?.length === 0 ||
      redirectionDetails?.isRedirection
    ) {
      fetchDeepDiveFilters();
    }
  }, []);

  useEffect(() => {
    const fetchShipmentModes = async () => {
      try {
        const response = await props.getShipmentModes();
        setShipmentModes(response?.data?.data || []);
        console.log(response?.data?.data || []);
      } catch (err) {
        console.log(err);
      }
    };

    if (
      props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
        ?.is_ship_modes_dynamic
    ) {
      fetchShipmentModes();
    }
  }, [props?.orderingScreensConfig]);

  useLayoutEffect(() => {
    if (
      isEmpty(props?.orderManagementDeepDiveFiltersData) ||
      !middleContentRef.current
    )
      return;

    const rafId = requestAnimationFrame(() => {
      adjustMiddleContentHeight(middleContentRef);
    });

    return () => cancelAnimationFrame(rafId);
  }, [props.orderManagementDeepDiveFiltersData]);

  const onProductDetailsFilterApply = () => {
    setReloadComponents((prev) => prev + 1);
  };

  const handleSkuKpiSelect = (kpiKey) => {
    if (kpiKey === selectedSkuKpiKey) return;
    setRecoveryWindowGraph(null);
    setSelectedSkuKpiKey(kpiKey);
  };

  const handleRecoveryWindowViewGraph = useCallback((payload) => {
    setRecoveryWindowGraph(payload);
    requestAnimationFrame(() => {
      deepDiveChartRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const defaultSkuKpiKey = skuCategorisationCards?.[0]?.key || "total_skus";

  const deepDiveFiltersPayloadSignature = useMemo(
    () =>
      JSON.stringify(
        props?.orderManagementDeepDiveFiltersPayload?.filters || []
      ),
    [props?.orderManagementDeepDiveFiltersPayload]
  );

  // When the top-right Style-Color filter changes, reset to the default KPI
  // (Total SKU's) so the page reloads like an initial load: Style Summary +
  // Deep Dive + SKU risk KPI all refetch with the newly filtered style.
  useEffect(() => {
    if (!enableSkUCategorisation) return;
    if (previousDeepDivePayloadRef.current === null) {
      previousDeepDivePayloadRef.current = deepDiveFiltersPayloadSignature;
      return;
    }
    if (
      previousDeepDivePayloadRef.current !== deepDiveFiltersPayloadSignature
    ) {
      previousDeepDivePayloadRef.current = deepDiveFiltersPayloadSignature;
      setRecoveryWindowGraph(null);
      setSelectedSkuKpiKey(defaultSkuKpiKey);
    }
  }, [
    enableSkUCategorisation,
    deepDiveFiltersPayloadSignature,
    defaultSkuKpiKey,
  ]);

  const fetchSkuCategorisationKpiData = useCallback(async () => {
    if (!enableSkUCategorisation) return;
    if (isEmpty(props?.orderManagementDeepDiveFiltersData)) return;

    const payload = buildSkuRiskKpiRequestPayload(props);
    if (!payload.styles?.length) {
      setSkuCategorisationKpiData({});
      setSkuCategorisationKpiLoading(false);
      return;
    }

    try {
      setSkuCategorisationKpiLoading(true);
      const response = await props.getOmsSkuRiskKpiData(payload);
      if (response?.data?.status) {
        setSkuCategorisationKpiData(response?.data?.data || {});
      } else {
        setSkuCategorisationKpiData({});
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch (error) {
      console.error(error);
      setSkuCategorisationKpiData({});
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      setSkuCategorisationKpiLoading(false);
    }
  }, [
    enableSkUCategorisation,
    props?.filterDashboardConfiguration,
    props?.highLevelSummaryState,
    props?.orderManagementDeepDiveFiltersData,
    props?.orderManagementProductDetailsFilters,
    props?.selectedFilters,
    props?.selectedRowsFromMatrixSummary,
    props.getOmsSkuRiskKpiData,
  ]);

  useEffect(() => {
    fetchSkuCategorisationKpiData();
  }, [fetchSkuCategorisationKpiData, reloadComponents]);

  // Auto-scroll to Style Order Summary table when redirected from dashboard alerts
  useEffect(() => {
    const orderPlacementDateRange = localStorage.getItem(
      "omsAlertOrderPlacementDateRange"
    );

    if (
      orderPlacementDateRange &&
      !props?.tableLoader &&
      !hasScrolledToTableRef.current
    ) {
      // Wait longer for both Deep Dive chart and Style Order Summary to fully render
      // Using multiple requestAnimationFrame to ensure DOM is fully painted
      const scrollTimeout = setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (styleOrderSummaryTableRef.current) {
              styleOrderSummaryTableRef.current.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
              hasScrolledToTableRef.current = true;
            }
          });
        });
      }, 2000);

      return () => clearTimeout(scrollTimeout);
    }
  }, [props?.tableLoader]);

  return (
    <div className={classes.paddingLayout}>
      {isRedirectedFromDifferentPage == null && (
        <>
          <div
            className={globalClasses.marginBottom}
            style={{ display: "grid", gridAutoFlow: "column" }}
          >
            {!redirectionDetails?.isRedirection && (
              <HeaderBreadCrumbs options={routeOptions}></HeaderBreadCrumbs>
            )}

            <DcFilter />
          </div>

          {props?.isFiltersValid || redirectionDetails?.isRedirection ? (
            <>
              <div
                className={globalClasses.flexRow}
                style={{
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                {!isEmpty(props?.orderManagementDeepDiveFiltersData) &&
                  (enableSkUCategorisation ? (
                    <SkuCategorisationHeader
                      selectedKpiTitle={selectedSkuKpiTitle}
                      stylesSelectedCount={stylesSelectedCount}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "800",
                      }}
                    >
                      {productDetailsScreenDetailsHeading}
                    </span>
                  ))}
                <Grid
                  item
                  xs={12}
                  display="flex"
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <ProductDetailsFilters
                    labelOrientation={"left"}
                    isDefaultSelectionNeeded={true}
                  />

                  {/* {!isEmpty(props?.orderManagementDeepDiveFiltersData) && (
                      <Button
                        variant="tertiary"
                        onClick={onProductDetailsFilterApply}
                        id="applyBtn"
                        color="primary"
                        disabled={props.isDeepdiveFilterLoading}
                      >
                        Apply
                      </Button> 
                  )} */}
                </Grid>
              </div>
              {enableSkUCategorisation &&
                !isEmpty(props?.orderManagementDeepDiveFiltersData) && (
                  <Loader
                    loader={skuCategorisationKpiLoading}
                    minHeight="126px"
                  >
                    <SkuCategorisationKpiPanel
                      kpiData={skuCategorisationKpiData}
                      cards={skuCategorisationCards}
                      selectedKpiKey={selectedSkuKpiKey}
                      onKpiSelect={handleSkuKpiSelect}
                      onEmptyCountClick={() =>
                        displaySnackMessages(
                          SKU_CATEGORISATION_EMPTY_COUNT_MESSAGE,
                          "error"
                        )
                      }
                    />
                  </Loader>
                )}
              {!isEmpty(props?.orderManagementDeepDiveFiltersData) && (
                <Loader
                  loader={
                    isEmpty(props?.orderManagementDeepDiveFiltersData)
                      ? true
                      : false
                  }
                  minHeight={"260px"}
                >
                  <div
                    ref={middleContentRef}
                    className={classNames(globalClasses.marginTop)}
                  >
                    <div ref={deepDiveChartRef}>
                      {showStockoutRiskTable && recoveryWindowGraph ? (
                        <ProductDetailsRecoveryWindowChart
                          rowData={recoveryWindowGraph.rowData}
                          selectedFilters={recoveryWindowGraph.selectedFilters}
                          alertTopRightOptions={
                            recoveryWindowGraph.alertTopRightOptions
                          }
                          dateRange={recoveryWindowGraph.dateRange}
                          fiscalCalendarDetails={fiscalCalendarDetails}
                          displaySnackMessages={displaySnackMessages}
                        />
                      ) : isChartModularised ? (
                        <CommonDeepDive
                          reloadFromParent={reloadComponents}
                          fiscalCalendarDetails={fiscalCalendarDetails}
                          enableSkUCategorisation={enableSkUCategorisation}
                          selectedKpiStyles={selectedKpiStyles}
                        />
                      ) : (
                        <OrderDeepDive
                          reloadFromParent={reloadComponents}
                          fiscalCalendarDetails={fiscalCalendarDetails}
                          enableSkUCategorisation={enableSkUCategorisation}
                          selectedKpiStyles={selectedKpiStyles}
                        />
                      )}
                    </div>
                    {showStockoutRiskTable ? (
                      <ProductDetailsStockoutRiskTable
                        fiscalCalendarDetails={fiscalCalendarDetails}
                        reloadFromParent={reloadComponents}
                        ropParentDateRange={props.ropDate}
                        recommRecieptParentDateRange={props.recommRecieptDate}
                        selectedKpiStyles={selectedKpiStyles}
                        onRecoveryWindowViewGraph={
                          handleRecoveryWindowViewGraph
                        }
                      />
                    ) : (
                      <div ref={styleOrderSummaryTableRef}>
                        <StyleOrderSummaryTable
                          fiscalCalendarDetails={fiscalCalendarDetails}
                          reloadFromParent={reloadComponents}
                          onDeepDiveRefresh={onProductDetailsFilterApply}
                          ropParentDateRange={props.ropDate}
                          recommRecieptParentDateRange={props.recommRecieptDate}
                          shipmentModes={shipmentModes}
                        />
                      </div>
                    )}
                  </div>
                </Loader>
              )}

              {isEmpty(props?.orderManagementDeepDiveFiltersData) && (
                <Loader loader={true} minHeight={"260px"}></Loader>
              )}
            </>
          ) : (
            <div
              className={globalClasses.centerAlign}
              style={{ margin: "2rem" }}
            >
              <EmptyStateLayout
                onPrimaryButtonClick={navigateToHighLevelSummary}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    redirectFromDeepDive:
      store.omsReducer.orderManagementService.redirectFromDeepDive,
    orderManagementFilterElements:
      store.omsReducer.orderManagementService.orderManagementFilterElements,
    orderManagementFilterDependency:
      store.omsReducer.orderManagementService.orderManagementFilterDependency,
    backButtonClicked:
      store.omsReducer.orderManagementService.backButtonClicked,
    formFilters: store.omsReducer.orderManagementService.formFilters,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderManagementFilterConfiguration"
      ]?.appliedFilterData,
    orderingScreensConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig,
    orderManagementDeepDiveFiltersData:
      store.omsReducer.orderManagementService
        .orderManagementDeepDiveFiltersData,
    orderManagementProductDetailsFilters:
      store.omsReducer.orderManagementService
        .orderManagementProductDetailsFilters,
    orderManagementDeepDiveFiltersPayload:
      store.omsReducer.orderManagementService
        .orderManagementDeepDiveFiltersPayload,
    highLevelSummaryState:
      store.omsReducer.orderManagementService.highLevelSummaryState,
    recommRecieptDate:
      store.omsReducer.orderManagementService.recommRecieptDate,
    ropDate: store.omsReducer.orderManagementService.ropDate,
    isFiltersValid: store.omsReducer.orderManagementService.isFiltersValid,
    isDeepdiveFilterLoading:
      store.omsReducer.orderManagementService.isDeepdiveFilterLoading,
    redirectDetails: store.omsReducer.orderManagementService.redirectDetails,
    selectedFilters: store.omsReducer.orderManagementService.selectedFilters,
    selectedDcs: store.omsReducer.orderManagementService.selectedDcs,
    selectedRowsFromMatrixSummary:
      store.omsReducer.orderManagementService.selectedRowsFromMatrixSummary,
    tableLoader:
      store.omsReducer.orderManagementService
        .orderManagementDeepDiveTableLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setOrderManagementFilterElements: (payload) =>
    dispatch(setOrderManagementFilterElements(payload)),
  setRedirectFromDeepDive: (payload) =>
    dispatch(setRedirectFromDeepDive(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setOrderManagementKpiSummaryLoader: (payload) =>
    dispatch(setOrderManagementKpiSummaryLoader(payload)),
  getOmsDeepDiveFilters: () => dispatch(getOmsDeepDiveFilters()),
  setOrderManagementDeepDiveFilters: (payload) =>
    dispatch(setOrderManagementDeepDiveFilters(payload)),
  setOrderManagementProductDetailsFilters: (payload) =>
    dispatch(setOrderManagementProductDetailsFilters(payload)),
  setSelectedRowsFromMatrixSummary: (payload) =>
    dispatch(setSelectedRowsFromMatrixSummary(payload)),
  setOrderManagementDeepDiveFiltersPayload: (payload) =>
    dispatch(setOrderManagementDeepDiveFiltersPayload(payload)),
  setRedirectionDetails: (payload) => dispatch(setRedirectionDetails(payload)),
  resetOrderManagementState: () => dispatch(resetOrderManagementState()),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  setSelectedDcs: (payload) => dispatch(setSelectedDcs(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  getOmsSkuRiskKpiData: (payload) => dispatch(getOmsSkuRiskKpiData(payload)),
  getShipmentModes: () => dispatch(getShipmentModes()),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(productDetailsScreen);
