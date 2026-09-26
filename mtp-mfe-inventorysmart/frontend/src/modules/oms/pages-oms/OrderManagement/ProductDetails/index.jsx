import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useNavigate } from "react-router-dom-v5-compat";
import {
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import classNames from "classnames";
import moment from "moment";
import { Grid } from "@mui/material";
import { isEmpty, cloneDeep } from "lodash";
import DcFilter from "modules/oms/pages-oms/common/DcFilter";
import {
  ORDER_MANAGEMENT_V3,
  ORDER_MANAGEMENT_V4,
  ORDER_MANAGEMENT_V3_PRODUCT_DETAILS,
  ORDER_MANAGEMENT_V3_CREATE_SCENARIO,
} from "modules/oms/constants-oms/routeConstants";
import {
  getOmsCoreFiscalCalendar,
  getOmsDeepDiveFilters,
  setOrderManagementDeepDiveFilters,
  setOrderManagementProductDetailsFilters,
  setSelectedRowsFromMatrixSummary,
  setOrderManagementDeepDiveFiltersPayload,
  getShipmentModes,
  setSelectedDcs,
  setSelectedFilters,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import StyleOrderSummaryTable from "./StyleOrderSummary/StyleOrderSummaryTable";
import OrderDeepDive from "modules/oms/pages-oms/Order-Management/Order-Deep-Dive";
import CommonDeepDive from "modules/oms/pages-oms/common/DeepDiveChart";
import {
  ERROR_MESSAGE,
  OMS_OM_REDIRECT_DASHBOARD_DCS,
  SKU_CATEGORISATION_CARDS,
  SKU_CATEGORISATION_EMPTY_COUNT_MESSAGE,
  SKU_CATEGORISATION_STOCKOUT_RISK_KEY,
} from "modules/oms/constants-oms/stringConstants";
import ProductDetailsFilters from "./ProductDetailsFilters";
import Loader from "core/Utils/Loader/loader";
import EmptyStateLayout from "modules/oms/pages-oms/Order-Management/components/EmptyStateLayout";
import { useStyles } from "modules/oms/styles-oms/orderingCustomStyles";
import {
  adjustMiddleContentHeight,
  mergeOmsDcIntoFilters,
} from "modules/oms/utils-oms/oms-utility";
import SkuCategorisationKpiPanel, {
  SkuCategorisationHeader,
} from "modules/oms/pages-oms/Order-Management/components/Product-Details-Screen/SkuCategorisation/SkuCategorisationKpiPanel";
import ProductDetailsStockoutRiskTable from "./SkuCategorisation/ProductDetailsStockoutRiskTable";
import ProductDetailsRecoveryWindowChart from "./SkuCategorisation/ProductDetailsRecoveryWindowChart";
import { buildSkuRiskKpiRequestPayload } from "modules/oms/pages-oms/Order-Management/components/Product-Details-Screen/SkuCategorisation/buildSkuRiskKpiRequestPayload";
import { fetchSkuRiskKpiDataV3 } from "./api/skuRiskKpi.api.js";
import {
  selectMatrixHandoff,
  clearMatrixHandoff,
} from "../slices/matrixHandoff.slice.js";
import { resetProductDetailsState } from "./slices/productDetails.slice.js";

const MATRIX_ROUTE_PATHS = [ORDER_MANAGEMENT_V3, ORDER_MANAGEMENT_V4];

const ProductDetailsScreenV3 = (props) => {
  const navigate = useNavigate();

  const globalClasses = globalStyles();
  const classes = useStyles();
  const handoff = props.matrixHandoff;
  const redirectionDetails = JSON.parse(
    localStorage.getItem("omsRedirectionDetails")
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
  const lastSkuKpiPayloadSignatureRef = useRef(null);
  const middleContentRef = useRef(null);
  const deepDiveChartRef = useRef(null);
  const handoffSeededRef = useRef(false);
  const styleOrderSummaryTableRef = useRef(null);
  const hasScrolledToTableRef = useRef(false);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message,
      options: {
        variant: variance,
        ...(onClose && { onClose }),
      },
    });
  };

  const resolveMatrixBackPath = () => {
    if (MATRIX_ROUTE_PATHS.includes(handoff?.sourcePath)) {
      return handoff.sourcePath;
    }
    return ORDER_MANAGEMENT_V4;
  };

  const onBackButtonClickHandler = () => {
    navigate(resolveMatrixBackPath());
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
    if (!showStockoutRiskTable) return null;
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
    { label: "Home", to: "/home" },
    {
      id: 1,
      label: "Order Management",
      action: () => navigate(resolveMatrixBackPath()),
    },
    {
      id: 2,
      label: "Product Details",
      action: () => navigate(ORDER_MANAGEMENT_V3_PRODUCT_DETAILS),
    },
  ];

  // Empty handoff (refresh / direct URL) → redirect back to the matrix.
  useEffect(() => {
    if (!handoff?.isReady && !redirectionDetails?.isRedirection) {
      navigate(ORDER_MANAGEMENT_V4, { replace: true });
    }
  }, [handoff?.isReady, navigate, redirectionDetails?.isRedirection]);

  // Fallback seed only when handoff exists but the click-path did not pre-seed
  // (e.g. hot reload). Prefer seeding in RowSelectionActionCluster before
  // navigate — writing the payload here after mount re-triggers every child
  // effect that depends on orderManagementDeepDiveFiltersPayload.
  useEffect(() => {
    if (!handoff?.isReady || handoffSeededRef.current) return;
    handoffSeededRef.current = true;

    const existingPayloadFilters =
      props?.orderManagementDeepDiveFiltersPayload?.filters;
    if (Array.isArray(existingPayloadFilters)) {
      return;
    }

    props.setSelectedRowsFromMatrixSummary({});
    props.setOrderManagementDeepDiveFiltersPayload({
      filters: Array.isArray(handoff.selectedFilters)
        ? cloneDeep(handoff.selectedFilters)
        : [],
    });
  }, [handoff?.isReady]);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        setShowLoader(true);
        if (
          Array.isArray(handoff?.fiscalCalendarRows) &&
          handoff.fiscalCalendarRows.length > 0
        ) {
          setFiscalCalendarDetails(handoff.fiscalCalendarRows);
          setShowLoader(false);
          return;
        }
        const startYear = moment().year();
        const endYear = moment().year() + 2;
        const queryParams = `?start_fiscal_year=${startYear}&end_fiscal_year=${endYear}`;
        const getFinancialCalendarData = await getOmsCoreFiscalCalendar(
          queryParams
        );
        moment.updateLocale("en", {
          week: {
            dow: getFinancialCalendarData?.data?.data?.week_start_day || 0,
          },
        });
        setFiscalCalendarDetails(
          getFinancialCalendarData?.data?.data?.data || []
        );
        setShowLoader(false);
      } catch (error) {
        setShowLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
        console.log(error);
      }
    };
    if (handoff?.isReady || redirectionDetails?.isRedirection) {
      fetchFilters();
    }
  }, [handoff?.isReady, redirectionDetails?.isRedirection]);

  const deepDiveFiltersConfigFetchedRef = useRef(false);
  useEffect(() => {
    const fetchDeepDiveFilters = async () => {
      if (deepDiveFiltersConfigFetchedRef.current) return;
      deepDiveFiltersConfigFetchedRef.current = true;
      try {
        const deepDiveFilters = await props.getOmsDeepDiveFilters();
        const productDetailsFilters = [];
        if (deepDiveFilters?.data?.data?.length > 0) {
          productDetailsFilters.push(deepDiveFilters?.data?.data[0]);
        }
        props?.setOrderManagementProductDetailsFilters(productDetailsFilters);
        if (deepDiveFilters?.data?.data?.length > 1) {
          props?.setOrderManagementDeepDiveFilters(
            deepDiveFilters?.data?.data?.slice(1)
          );
        }

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
      } catch (error) {
        deepDiveFiltersConfigFetchedRef.current = false;
        displaySnackMessages(ERROR_MESSAGE, "error");
        console.log(error);
      }
    };

    if (
      (handoff?.isReady || redirectionDetails?.isRedirection) &&
      (props?.orderManagementProductDetailsFilters?.length === 0 ||
        props?.orderManagementDeepDiveFilters?.length === 0 ||
        redirectionDetails?.isRedirection)
    ) {
      fetchDeepDiveFilters();
    }
  }, [handoff?.isReady, redirectionDetails?.isRedirection]);

  useEffect(() => {
    const fetchShipmentModes = async () => {
      try {
        const response = await props.getShipmentModes();
        setShipmentModes(response?.data?.data || []);
      } catch (error) {
        console.log(error);
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
    ) {
      return;
    }
    const rafId = requestAnimationFrame(() => {
      adjustMiddleContentHeight(middleContentRef);
    });
    return () => cancelAnimationFrame(rafId);
  }, [props.orderManagementDeepDiveFiltersData]);

  const onProductDetailsFilterApply = () => {
    setReloadComponents((previous) => previous + 1);
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

    // Only fire once we know the style column AND deep-dive returned values
    // for it. The shared payload builder falls back to
    // selectedRowsFromMatrixSummary.values, which on v4 can be hierarchy
    // leftovers (e.g. "Men") before the style column config loads.
    const styleColumn =
      props?.orderManagementProductDetailsFilters?.[0]?.column_name;
    const stylesFromDeepDive = styleColumn
      ? props.orderManagementDeepDiveFiltersData?.[styleColumn]
      : null;
    if (!Array.isArray(stylesFromDeepDive) || stylesFromDeepDive.length === 0) {
      return;
    }

    const payload = buildSkuRiskKpiRequestPayload(props);
    payload.styles = [...stylesFromDeepDive];
    payload.is_v3 =
      typeof handoff?.isV3Schema === "boolean" ? handoff.isV3Schema : false;

    const payloadSignature = JSON.stringify({
      styles: payload.styles,
      filters: payload.filters,
      is_v3: payload.is_v3,
    });
    if (lastSkuKpiPayloadSignatureRef.current === payloadSignature) {
      return;
    }
    lastSkuKpiPayloadSignatureRef.current = payloadSignature;

    try {
      setSkuCategorisationKpiLoading(true);
      const response = await fetchSkuRiskKpiDataV3(payload);
      if (response?.status) {
        setSkuCategorisationKpiData(response?.data || {});
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
    handoff?.isV3Schema,
    props?.filterDashboardConfiguration,
    props?.highLevelSummaryState,
    props?.orderManagementDeepDiveFiltersData,
    props?.orderManagementProductDetailsFilters,
    props?.selectedFilters,
  ]);

  useEffect(() => {
    // Force a fresh KPI call when the user explicitly reloads the screen.
    if (reloadComponents > 0) {
      lastSkuKpiPayloadSignatureRef.current = null;
    }
    fetchSkuCategorisationKpiData();
  }, [fetchSkuCategorisationKpiData, reloadComponents]);

  useEffect(() => {
    const orderPlacementDateRange = localStorage.getItem(
      "omsAlertOrderPlacementDateRange"
    );

    if (
      orderPlacementDateRange &&
      !props?.tableLoader &&
      !hasScrolledToTableRef.current
    ) {
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

  useEffect(() => {
    return () => {
      props.resetProductDetailsState();
    };
  }, []);

  if (!handoff?.isReady && !redirectionDetails?.isRedirection) {
    return <Loader loader={true} minHeight="260px" />;
  }

  const fiscalRows =
    fiscalCalendarDetails?.length > 0
      ? fiscalCalendarDetails
      : handoff.fiscalCalendarRows || [];

  const hasFilterContext =
    props?.isFiltersValid ||
    redirectionDetails?.isRedirection ||
    (Array.isArray(handoff.selectedFilters) &&
      handoff.selectedFilters.length > 0) ||
    (Array.isArray(handoff.globalFilters) && handoff.globalFilters.length > 0);

  return (
    <div className={classes.paddingLayout}>
      <div
        className={globalClasses.marginBottom}
        style={{ display: "grid", gridAutoFlow: "column" }}
      >
        {!redirectionDetails?.isRedirection && (
          <HeaderBreadCrumbs options={routeOptions} />
        )}
        <DcFilter />
      </div>

      {hasFilterContext ? (
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
                <span style={{ fontSize: "14px", fontWeight: "800" }}>
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
                labelOrientation="left"
                isDefaultSelectionNeeded={true}
              />
            </Grid>
          </div>

          {enableSkUCategorisation &&
            !isEmpty(props?.orderManagementDeepDiveFiltersData) && (
              <Loader loader={skuCategorisationKpiLoading} minHeight="126px">
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
              loader={isEmpty(props?.orderManagementDeepDiveFiltersData)}
              minHeight="260px"
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
                      fiscalCalendarDetails={fiscalRows}
                      displaySnackMessages={displaySnackMessages}
                    />
                  ) : isChartModularised ? (
                    <CommonDeepDive
                      reloadFromParent={reloadComponents}
                      fiscalCalendarDetails={fiscalRows}
                      enableSkUCategorisation={enableSkUCategorisation}
                      selectedKpiStyles={selectedKpiStyles}
                      createScenarioRoute={ORDER_MANAGEMENT_V3_CREATE_SCENARIO}
                      useV3DeepDiveTable
                    />
                  ) : (
                    <OrderDeepDive
                      reloadFromParent={reloadComponents}
                      fiscalCalendarDetails={fiscalRows}
                      enableSkUCategorisation={enableSkUCategorisation}
                      selectedKpiStyles={selectedKpiStyles}
                      createScenarioRoute={ORDER_MANAGEMENT_V3_CREATE_SCENARIO}
                      useV3DeepDiveTable
                    />
                  )}
                </div>
                {showStockoutRiskTable ? (
                  <ProductDetailsStockoutRiskTable
                    fiscalCalendarDetails={fiscalRows}
                    reloadFromParent={reloadComponents}
                    ropParentDateRange={
                      handoff.selectedDateRange || props.ropDate
                    }
                    recommRecieptParentDateRange={
                      handoff.selectedDateRange || props.recommRecieptDate
                    }
                    selectedKpiStyles={selectedKpiStyles}
                    onRecoveryWindowViewGraph={handleRecoveryWindowViewGraph}
                  />
                ) : (
                  <div ref={styleOrderSummaryTableRef}>
                    <StyleOrderSummaryTable
                      fiscalCalendarDetails={fiscalRows}
                      reloadFromParent={reloadComponents}
                      onDeepDiveRefresh={onProductDetailsFilterApply}
                      ropParentDateRange={
                        handoff.selectedDateRange || props.ropDate
                      }
                      recommRecieptParentDateRange={
                        handoff.selectedDateRange || props.recommRecieptDate
                      }
                      shipmentModes={shipmentModes}
                    />
                  </div>
                )}
              </div>
            </Loader>
          )}

          {isEmpty(props?.orderManagementDeepDiveFiltersData) && (
            <Loader loader={true} minHeight="260px" />
          )}
        </>
      ) : (
        <div className={globalClasses.centerAlign} style={{ margin: "2rem" }}>
          <EmptyStateLayout onPrimaryButtonClick={onBackButtonClickHandler} />
        </div>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    orderManagementFilterDependency:
      store.omsReducer.orderManagementService.orderManagementFilterDependency,
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
    orderManagementDeepDiveFilters:
      store.omsReducer.orderManagementService.orderManagementDeepDiveFilters,
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
    selectedFilters: store.omsReducer.orderManagementService.selectedFilters,
    selectedDcs: store.omsReducer.orderManagementService.selectedDcs,
    selectedRowsFromMatrixSummary:
      store.omsReducer.orderManagementService.selectedRowsFromMatrixSummary,
    matrixHandoff: selectMatrixHandoff(store),
    tableLoader:
      store.omsReducer.orderManagementService
        .orderManagementDeepDiveTableLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  getOmsDeepDiveFilters: () => dispatch(getOmsDeepDiveFilters()),
  setOrderManagementDeepDiveFilters: (payload) =>
    dispatch(setOrderManagementDeepDiveFilters(payload)),
  setOrderManagementProductDetailsFilters: (payload) =>
    dispatch(setOrderManagementProductDetailsFilters(payload)),
  setSelectedRowsFromMatrixSummary: (payload) =>
    dispatch(setSelectedRowsFromMatrixSummary(payload)),
  setOrderManagementDeepDiveFiltersPayload: (payload) =>
    dispatch(setOrderManagementDeepDiveFiltersPayload(payload)),
  getShipmentModes: () => dispatch(getShipmentModes()),
  setSelectedDcs: (payload) => dispatch(setSelectedDcs(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  clearMatrixHandoff: () => dispatch(clearMatrixHandoff()),
  resetProductDetailsState: () => dispatch(resetProductDetailsState()),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductDetailsScreenV3);
