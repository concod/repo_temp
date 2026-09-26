import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { Grid, Typography, Box } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import LoadingOverlay from "core/Utils/Loader/loader";
import { useTranslation } from "impact-ui-v3";
import {
  ERROR_MESSAGE,
  SCREENS_LIST_MAP,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getInventoryDashboardForecastKPIData,
  getInventoryDashboardStoreInventoryKPIData,
  getInventoryDashboardKPIData,
  setInventoryDashboardKPIConfigLoader,
  setInventoryDashboardKPIDataLoader,
  setInventoryDashboardForecastKPIDataLoader,
  setInventoryDashboardOrderKPIDataLoader,
  getForecastKPIDrilldownData,
} from "modules/inventorysmart/services-inventorysmart/KPI-Matrix/kpi-services";
import { addSnack } from "core/actions/snackbarActions";
import { EventBusy } from "@mui/icons-material";
import { isEmpty } from "lodash";
import { displaySnackMessages } from "../inventorysmart-utility";
import { getKPIIconComponent } from "../../utils-inventorysmart/utilityFunctions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import GenericCardsPanel from "./GenericCardPanel";
import moment from "moment";
import KPIAlertsData from "./component/KPIAlertsData";

const KPIWrapper = (props) => {
  const { t } = useTranslation();
  const globalClasses = globalStyles();
  const [kpiData, setKPIData] = useState(null);
  const [rosType, setRosType] = useState("high");
  const [drilldownState, setDrilldownState] = useState({
    visible: false,
    cardIndex: null,
    metricIndex: null,
    metricLabel: "",
    data: null,
    loading: false,
    anchorPosition: null,
  });

  const enableRosToggle = props.ddScreenConfigs?.dashboard?.drillDown?.enableRosToggle ?? false;
  const drilldownColsRef = useRef({});

  // Map card index to time_horizon for drilldown API
  const CARD_INDEX_TO_TIME_HORIZON = {
    0: "last_week",
    1: "last_4_weeks",
    2: "last_8_weeks",
  };

  // Map metric index to metric type for drilldown API
  const METRIC_INDEX_TO_TYPE = {
    0: "ia_forecast",
    1: "adjusted_forecast",
  };

  const generateKPIFilterBody = (startDate, endDate) => {
    const filters = {
      product_attributes: [],
      store_attributes: [],
      other_attributes: [
        {
          attribute_name: "start_date",
          attribute_value: startDate,
        },
        {
          attribute_name: "end_date",
          attribute_value: endDate,
        },
      ],
    };

    props.selectedFilters.forEach((filter) => {
      if (filter.dimension === "product" && filter?.values?.length > 0) {
        filters.product_attributes.push(filter);
      } else if (filter.dimension === "store" && filter?.values?.length > 0) {
        filters.store_attributes.push(filter);
      }
    });

    return filters;
  };

  const formatOrderInventoryKPIDetails = (kpis) => {
    let panelData = {
      noSubMetrics: true,
      expandedLayout: "center",
      panelHeader: t("inventorysmart.kpiPanelHeader"),
      cardData: [],
    };
    if (kpis) {
      kpis.forEach((thisMetric) => {
        const { label, value, key = "Units" } = thisMetric;
        let metrics = [];

        if ("value" in thisMetric) {
          metrics.push({
            label: thisMetric?.label.includes(" WOS")
              ? t("inventorysmart.kpiWeeks")
              : key,
            value: value.toLocaleString("en-US"),
          });
        }

        if ("cost" in thisMetric) {
          metrics.push({
            label: t("inventorysmart.kpiCost"),
            value: `$${thisMetric?.cost.toLocaleString("en-US")}`,
          });
        }
        panelData.cardData.push({
          type: "kpi_order_inventory",
          title: label,
          actualValue: value.toLocaleString("en-US"),
          actualLabel: t("inventorysmart.kpiActual"),
          metrics,
          icon: "stock", // Icon name - can be changed based on KPI type
        });
      });
    }

    return panelData;
  };

  const TAB_HEADER_MAPPING = {
    store: `${
      dynamicLabelsBasedOnTenant("store", "core") || "Store"
    } Inventory`,
    forecast: t("inventorysmart.kpiForecast"),
    store_inventory: `${
      dynamicLabelsBasedOnTenant("store", "core") || "Store"
    } Inventory`,
    dc: t("inventorysmart.kpiDC"),
  };

  const getPanelHeader = (tabValue) => {
    if (!tabValue) return t("inventorysmart.kpiPanelHeader");
    const tabName = tabValue.toLowerCase();
    return TAB_HEADER_MAPPING[tabName] || tabValue;
  };

  // Tooltip messages for KPI metrics
  const KPI_TOOLTIPS = {
    ia_forecast_accuracy: t("inventorysmart.kpiTooltipIAForecastAccuracy"),
    adjusted_forecast_accuracy: t(
      "inventorysmart.kpiTooltipAdjustedForecastAccuracy"
    ),
    override_success: t("inventorysmart.kpiTooltipOverrideSuccess"),
    ia_forecast_wos_deviation: t(
      "inventorysmart.kpiTooltipIAForecastWOSDeviation"
    ),
    adjusted_forecast_wos_deviation: t(
      "inventorysmart.kpiTooltipAdjustedForecastWOSDeviation"
    ),
    actual_sales_units: t("inventorysmart.kpiTooltipActualSalesUnits"),
  };

  // Format forecast KPI data from the new BE response structure
  // BE returns: data.kpi_cards[] → each has { time_horizon, label, kpis[] }
  // Each kpi: { key, label, value, raw_value, drilldown_enabled }
  const formatRosKPIData = (kpiCards) => {
    let panelData = {
      noSubMetrics: false,
      expandedLayout: "center",
      panelHeader: getPanelHeader(props.tabValue),
      cardData: [],
    };

    if (kpiCards && kpiCards.length > 0) {
      kpiCards.forEach((card) => {
        const salesKpi = card.kpis?.find(k => k.key === "actual_sales_units");
        const otherKpis = card.kpis?.filter(k => k.key !== "actual_sales_units") || [];

        panelData.cardData.push({
          type: "kpi_forecast_sales",
          title: card.label,
          timeHorizon: card.time_horizon,
          salesValue: salesKpi?.value ?? "-",
          metrics: otherKpis.map((kpi) => ({
            label: kpi.label,
            key: kpi.key,
            value: kpi.value ?? "-",
            rawValue: kpi.raw_value,
            drilldownEnabled: kpi.drilldown_enabled ?? false,
            tooltip: kpi.label || KPI_TOOLTIPS[kpi.key] || "",
          })),
        });
      });
    }

    return panelData;
  };

  // Handle ROS toggle
  const handleRosToggle = (newRosType) => {
    if (newRosType !== rosType) {
      setRosType(newRosType);
      setDrilldownState(prev => ({ ...prev, visible: false }));
    }
  };

  // Handle metric click for drilldown
  const handleMetricClick = async (cardIndex, metricIndex, metricLabel, anchorPosition, metricKey, timeHorizon) => {
    setDrilldownState({
      visible: true,
      cardIndex,
      metricIndex,
      metricLabel,
      data: null,
      loading: true,
      anchorPosition,
    });

    try {
      // Map metric key to drilldown API metric param
      const metricKeyToParam = {
        ia_forecast_accuracy: "ia_forecast",
        adjusted_forecast_accuracy: "adjusted_forecast",
        ia_forecast_wos_deviation: "ia_forecast",
        adjusted_forecast_wos_deviation: "adjusted_forecast",
      };

      const postBody = {
        filters: props.selectedFilters,
        ros_type: rosType === "high" ? "high_ros" : "low_ros",
        time_horizon: timeHorizon || CARD_INDEX_TO_TIME_HORIZON[cardIndex] || "last_week",
        metric: metricKeyToParam[metricKey] || METRIC_INDEX_TO_TYPE[metricIndex] || "ia_forecast",
      };

      // Fetch TCM columns per rosType and cache
      const tcmTable = rosType === "high" ? "kpi_high_ros_drilldown" : "kpi_low_ros_drilldown";
      if (!drilldownColsRef.current[rosType]) {
        drilldownColsRef.current[rosType] = await getColumnsAg(`table_name=${tcmTable}`)();
      }

      const response = await props.getForecastKPIDrilldownData(postBody);
      const rawDistribution = response?.data?.data?.distribution || [];

      setDrilldownState(prev => ({
        ...prev,
        data: rawDistribution,
        columnDefs: drilldownColsRef.current[rosType],
        loading: false,
      }));
    } catch (err) {
      setDrilldownState(prev => ({
        ...prev,
        data: [],
        loading: false,
      }));
      displaySnackMessages("Failed to fetch drilldown data", "error");
    }
  };

  // Handle drilldown close
  const handleDrilldownClose = () => {
    setDrilldownState(prev => ({ ...prev, visible: false }));
  };

  // Helper function to check if a KPI should be visible based on kpisConfig (store or dc)
  const isKpiVisible = (metric, tabValue) => {
    // Get the appropriate config based on tab (store or dc)
    const kpisConfig = tabValue === "dc" 
      ? props.ddScreenConfigs?.dcKpisConfig 
      : props.ddScreenConfigs?.storeKpisConfig;
    if (!kpisConfig || Object.keys(kpisConfig).length === 0) {
      // No config means show all KPIs
      return true;
    }
    const metricLabel = metric?.label || metric?.title;
    if (!metricLabel) return true;
    // Find matching config by label
    const matchingConfig = Object.values(kpisConfig).find(
      (config) => config.label?.toLowerCase() === metricLabel.toLowerCase()
    );
    // If no matching config found, show the KPI (backward compatibility)
    if (!matchingConfig) return true;
    return matchingConfig.visible !== false;
  };

  /** Fetch KPI Data for Store Inventory Tab */
  const fetchInventoryDashboardStoreInventoryKPIData = async () => {
    try {
      props.setInventoryDashboardKPIDataLoader(true);
      let body = {
        filters: props.selectedFilters,
      };
      //  To do - Add a condition for KPI data to be rendered based on the tab selected (store/dc) , adding a cond in tenant attr master to show there r kpi's with multiple tabs
      const isForecastTab = props.tabValue === "forecast";
      const requestPayload = {
        body: enableRosToggle && isForecastTab ? { ...body, ros_type: rosType === "high" ? "high_ros" : "low_ros" } : body,
        type: props.tabValue,
      };
      let response = await props.getInventoryDashboardStoreInventoryKPIData(requestPayload);

      // Check if BE returned the new ROS KPI structure (kpi_cards array)
      const kpiCards = response.data.data?.kpi_cards;
      const hasRosResponse = isForecastTab && enableRosToggle && kpiCards && kpiCards.length > 0;

      if (hasRosResponse) {
        const formattedData = formatRosKPIData(kpiCards);
        setKPIData(formattedData);
        props.setInventoryDashboardKPIDataLoader(false);
        return;
      }

      // Fallback: existing flat response format for non-ROS or other tabs
      // Filter KPIs based on visible flag from kpisConfig (store or dc based on tab)
      let kpiDetails = response.data.data?.filter((metric) => isKpiVisible(metric, props.tabValue)) || [];

      const hasForecastSalesKPI = kpiDetails?.some(
        (metric) => metric.type === "kpi_forecast_sales"
      );

      const render3DIcons = props.ddScreenConfigs?.render3DIcons ?? false;
      const kpisConfig = props.tabValue === "dc" 
        ? props.ddScreenConfigs?.dcKpisConfig || {}
        : props.ddScreenConfigs?.storeKpisConfig || {};
      
      const getIconTypeForMetric = (metric) => {
        const label = metric?.label || metric?.title;
        if (!label) return null;
        const matchingConfig = Object.values(kpisConfig).find(
          (config) => config.label?.toLowerCase() === label.toLowerCase()
        );
        return matchingConfig?.iconType || null;
      };

      if (isForecastTab && hasForecastSalesKPI) {
        const formattedData = formatRosKPIData(
          kpiDetails
            .filter((m) => m.type === "kpi_forecast_sales")
            .map((m) => ({
              time_horizon: m.time_horizon || "",
              label: m.label,
              kpis: [
                {
                  key: "actual_sales_units",
                  label: "Actual Sales Units",
                  value: m.sales_value?.toLocaleString("en-US") || "-",
                  drilldown_enabled: false,
                },
                {
                  key: "ia_forecast_accuracy",
                  label: "IA Forecast Accuracy",
                  value:
                    m.ia_forecast_accuracy != null
                      ? `${(
                          100 -
                          Math.abs(m.ia_forecast_accuracy) * 100
                        ).toFixed(2)}%`
                      : "-",
                  drilldown_enabled: enableRosToggle,
                },
                {
                  key: "adjusted_forecast_accuracy",
                  label: "Adjusted Forecast Accuracy",
                  value:
                    m.adjusted_forecast_accuracy != null
                      ? `${(
                          100 -
                          Math.abs(m.adjusted_forecast_accuracy) * 100
                        ).toFixed(2)}%`
                      : "-",
                  drilldown_enabled: enableRosToggle,
                },
                {
                  key: "override_success",
                  label: "Override Success",
                  value:
                    m.override_success != null
                      ? (() => {
                          const p =
                            typeof m.override_success === "string"
                              ? parseFloat(m.override_success)
                              : Number(m.override_success);
                          return !isNaN(p) && isFinite(p)
                            ? `${(Math.abs(p) * 100).toFixed(2)}%`
                            : "-";
                        })()
                      : "-",
                  drilldown_enabled: false,
                },
              ],
            }))
        );
        setKPIData(formattedData);
        props.setInventoryDashboardKPIDataLoader(false);
        return;
      }

      let panelData = {
        noSubMetrics: false,
        expandedLayout: "center",
        panelHeader: getPanelHeader(props.tabValue),
        cardData: [],
      };

      if (kpiDetails && kpiDetails.length > 0) {
        kpiDetails.forEach((thisMetric, index) => {
          let metricType = thisMetric.type;
          if (metricType === "kpi_details_right_ali") {
            metricType = "kpi_details_right_aligned";
          }

          switch (metricType) {
            case "kpi_details_right_aligned":
              // Right-aligned KPI with forecast comparisons
              const {
                label,
                value,
                ia_forecast_value,
                user_adj_forecast_value,
                override_success,
                ia_forecast_accuracy,
                adjusted_forecast_accuracy,
              } = thisMetric;

              const iaForecastDiff = ia_forecast_value - value;
              const userAdjForecastDiff = user_adj_forecast_value - value;

              // Format the differences with proper sign
              const formatDifference = (diff) => {
                const formattedValue = Math.abs(diff).toLocaleString("en-US");
                return diff >= 0 ? `+${formattedValue}` : `-${formattedValue}`;
              };

              // Calculate IA Forecast Accuracy
              // Formula: 1 - |IA forecast deviation| / Actual
              const iaForecastAccuracy = ia_forecast_accuracy !== undefined && ia_forecast_accuracy !== null
                ? ia_forecast_accuracy
                : (value !== 0 ? (1 - Math.abs(iaForecastDiff) / value) : 0);
              
              // Calculate Adjusted Forecast Accuracy
              // Formula: 1 - |Adjusted forecast deviation| / Actual
              const adjustedForecastAccuracy = adjusted_forecast_accuracy !== undefined && adjusted_forecast_accuracy !== null
                ? adjusted_forecast_accuracy
                : (value !== 0 ? (1 - Math.abs(userAdjForecastDiff) / value) : 0);

              
              const iaForecastAccuracyPercent = `${(100-(Math.abs(iaForecastAccuracy) * 100)).toFixed(2)}%`;
              const adjustedForecastAccuracyPercent = `${(100-(Math.abs(adjustedForecastAccuracy) * 100)).toFixed(2)}%`;
              
              // Calculate Override Success
              // If override_success is provided by backend, use it
              // Otherwise, calculate based on whether adjusted accuracy is better than IA accuracy
              let overrideSuccessValue;
              if (override_success !== undefined && override_success !== null) {
                const parsedValue = typeof override_success === 'string' 
                  ? parseFloat(override_success) 
                  : Number(override_success);
                
                 if (!isNaN(parsedValue) && isFinite(parsedValue)) {
                  overrideSuccessValue = parsedValue;
                } else {
                   const iaDeviation = Math.abs(iaForecastDiff);
                  const adjDeviation = Math.abs(userAdjForecastDiff);
                  
                  if (iaDeviation !== 0) {
                    const improvement = (iaDeviation - adjDeviation) / iaDeviation;
                    overrideSuccessValue = improvement > 0 ? improvement : 0;
                  } else {
                    overrideSuccessValue = adjDeviation === 0 ? 1 : 0;
                  }
                }
              } else {
                // Calculate: if adjusted forecast is closer to actual than IA forecast
                // Override success = 1 if adjusted accuracy > IA accuracy, else 0
                // For aggregate level, we show the improvement percentage
                const iaDeviation = Math.abs(iaForecastDiff);
                const adjDeviation = Math.abs(userAdjForecastDiff);
                
                if (iaDeviation !== 0) {
                  // Calculate improvement: (IA deviation - Adjusted deviation) / IA deviation
                  const improvement = (iaDeviation - adjDeviation) / iaDeviation;
                  overrideSuccessValue = improvement > 0 ? improvement : 0;
                } else {
                  overrideSuccessValue = adjDeviation === 0 ? 1 : 0;
                }
              }

               const safeOverrideSuccessValue = (typeof overrideSuccessValue === 'number' && !isNaN(overrideSuccessValue) && isFinite(overrideSuccessValue))
                ? overrideSuccessValue
                : 0;
              
              const overrideSuccessPercent = `${(Math.abs(safeOverrideSuccessValue) * 100).toFixed(2)}%`;

              panelData.cardData.push({
                type: "kpi_details_right_aligned",
                title: label,
                actualValue: value.toLocaleString("en-US"),
                comparisons: [
                  {
                    label: "IA Forecast Accuracy",
                    value: ia_forecast_value.toLocaleString("en-US"),
                    difference: formatDifference(iaForecastDiff),
                    percentage: iaForecastAccuracyPercent,
                    isPositive: iaForecastAccuracy >= 0,
                    tooltip: KPI_TOOLTIPS.ia_forecast_accuracy,
                  },
                  {
                    label: "Adjusted Forecast Accuracy",
                    value: user_adj_forecast_value.toLocaleString("en-US"),
                    difference: formatDifference(userAdjForecastDiff),
                    percentage: adjustedForecastAccuracyPercent,
                    isPositive: adjustedForecastAccuracy >= 0,
                    tooltip: KPI_TOOLTIPS.adjusted_forecast_accuracy,
                  },
                  {
                    label: "Override Success",
                    value: safeOverrideSuccessValue.toFixed(4),
                    difference: "",
                    percentage: overrideSuccessPercent,
                    isPositive: safeOverrideSuccessValue > 0,
                    tooltip: KPI_TOOLTIPS.override_success,
                  },
                ],
              });
              break;

            case "kpi_details_cost":
              // KPI with cost - differentiate based on kpiType
              if (props?.kpiType === "dg-dd-kpi") {
                // DG style: KPI with sub-metrics
                const {
                  label: dgLabel,
                  value: dgValue,
                  key,
                  cost,
                } = thisMetric;
                let subMetrics = [
                  {
                    label: key,
                    value: dgValue,
                  },
                ];
                if (cost) {
                  subMetrics.push({
                    label: "$",
                    value: cost,
                  });
                }
                const dgCardData = {
                  title: dgLabel,
                  metric: "",
                  subMetrics,
                };
                const dgIconType = getIconTypeForMetric(thisMetric);
                if (dgIconType) {
                  dgCardData.iconType = dgIconType;
                }
                if (render3DIcons && dgCardData?.iconType) {
                  dgCardData.renderIcon = () => getKPIIconComponent(dgCardData?.iconType, index);
                }
                panelData.cardData.push(dgCardData);
              } else if (props?.kpiType === "carters-dd-kpi") {
                // Carters style: Simple KPI without sub-metrics
                const cardData = {
                  ...thisMetric,
                };
                
                // Get iconType from config/backend/label (like Deep Dive)
                const iconType = getIconTypeForMetric(thisMetric);
                if (iconType) {
                  cardData.iconType = iconType;
                }
                
                if (render3DIcons && cardData?.iconType) {
                  cardData.renderIcon = () => getKPIIconComponent(cardData?.iconType, index);
                }
                
                panelData.cardData.push(cardData);
                panelData.noSubMetrics = true;
              }
              break;

            case "kpi_details_dynamic_inventory":
              // KPI with data array (VS style)
              const { label: vsLabel, data } = thisMetric;
              const cardData = {
                title: vsLabel,
                metric: "",
                subMetrics: [...data],
              };
              const iconType = getIconTypeForMetric(thisMetric);
              if (iconType) {
                cardData.iconType = iconType;
              }
              if (render3DIcons && cardData?.iconType) {
                cardData.renderIcon = () => getKPIIconComponent(cardData?.iconType, index);
              }
              panelData.cardData.push(cardData);
              break;

            case "kpi_forecast_sales":
              // New Forecast Sales KPI format
              const {
                label: fsLabel,
                sales_value,
                ia_forecast_accuracy: fsia,
                adjusted_forecast_accuracy: fsadj,
                override_success: fsos,
              } = thisMetric;

              panelData.cardData.push({
                type: "kpi_forecast_sales",
                title: fsLabel,
                salesValue: sales_value?.toLocaleString("en-US") || "-",
                metrics: [
                  {
                    label: "IA Forecast Accuracy",
                    value: fsia !== undefined && fsia !== null 
                      ? `${(100-(Math.abs(fsia) * 100)).toFixed(2)}%` 
                      : "-",
                    tooltip: KPI_TOOLTIPS.ia_forecast_accuracy,
                  },
                  {
                    label: "Adjusted Forecast Accuracy",
                    value: fsadj !== undefined && fsadj !== null 
                      ? `${(100-(Math.abs(fsadj) * 100)).toFixed(2)}%` 
                      : "-",
                    tooltip: KPI_TOOLTIPS.adjusted_forecast_accuracy,
                  },
                  {
                    label: "Override Success",
                    value: fsos !== undefined && fsos !== null 
                      ? (() => {
                          const parsedValue = typeof fsos === 'string' 
                            ? parseFloat(fsos) 
                            : Number(fsos);
                    
                          if (!isNaN(parsedValue) && isFinite(parsedValue)) {
                            return `${(Math.abs(parsedValue) * 100).toFixed(2)}%`;
                          }
                          return "-";
                        })()
                      : "-",
                    tooltip: KPI_TOOLTIPS.override_success,
                  },
                ],
              });
              break;

            default:
              panelData.cardData.push(thisMetric);
              break;
          }
        });
      }
      setKPIData(panelData);
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setInventoryDashboardKPIDataLoader(false);
    }
  };

  /** Fetch KPI Data for OMS Tab */
  const fetchInventoryDashboardOrderInventoryKPIData = async () => {
    try {
      const startDate = moment().subtract(8, "weeks").format("YYYY-MM-DD");
      const endDate = moment().format("YYYY-MM-DD");
      const filters = generateKPIFilterBody(startDate, endDate);
      props.setInventoryDashboardOrderKPIDataLoader(true);
      let kpiBody = {
        ...filters,
        vendor_store: props?.isCalledFromVendorStore ?? undefined,
      };

      //let response = await props.getInventoryDashboardOrderKPIData(kpiBody);

      if (response.data.status) {
        let kpiOrderDetails = formatOrderInventoryKPIDetails(
          response.data.data.kpis
        );
        setKPIData(kpiOrderDetails);
      }
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setInventoryDashboardOrderKPIDataLoader(false);
    }
  };

  const fetchKPIData = () => {
    if (
      props.screen === SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_STORE_INVENTORY
    ) {
      fetchInventoryDashboardStoreInventoryKPIData();
    } else if (
      props.screen === SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_FORECAST
    ) {
      // fetchInventoryDashboardForecastKPIData();
    } else if (
      props.screen === SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_ORDER
    ) {
      fetchInventoryDashboardOrderInventoryKPIData();
    } else {
      fetchInventoryDashboardStoreInventoryKPIData();
    }
  };

  useEffect(() => {
    setKPIData(null);
  }, [props.tabValue]);

  useEffect(() => {
    if (enableRosToggle && props.tabValue === "forecast") {
      setKPIData(null);
      setDrilldownState(prev => ({ ...prev, visible: false }));
      !isEmpty(props.selectedFilters) && fetchKPIData();
    }
  }, [rosType]);
  
  useEffect(() => {
    !isEmpty(props.selectedFilters) &&
      (!props.showDateFilter ||
        (props.showDateFilter &&
          props.selectedDates?.fiscalInfoStartDate &&
          props.selectedDates.fiscalInfoEndDate)) &&
      fetchKPIData();
  }, [
    props.selectedFilters,
    props.selectedDates,
    props?.reloadKpi,
    props.tabValue,
  ]);

  return (
    <LoadingOverlay
      loader={
        props.screen == SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_ORDER
          ? props?.inventoryDashboardOrderKPIDataLoader
          : props.inventoryDashboardKPIDataLoader ||
            props.inventoryDashboardForecastKPIDataLoader ||
            props.inventorysmartDatesLoader
      }
      size="medium"
      text={t("inventorysmart.kpiLoadingKpis")}
      minHeight={"170px"}
    >
      <div>
        {props.screen !== SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_ORDER && (
          <Grid container columnSpacing={2} key={"date_range_1"}>
            {props.showDateFilter && (
              <Grid
                item
                xs={12}
                display={"flex"}
                justifyContent={"space-between"}
                alignItems={"center"}
              >
                <Grid item display={"flex"} alignItems={"center"}>
                  {/* <DateRangeFilter displayRow={true} /> */}
                </Grid>
                <Grid item display={"flex"} alignItems={"center"}>
                  <EventBusy className={globalClasses.marginHorizontal} />
                  <Typography variant="body1">
                    Date range not applicable
                  </Typography>
                </Grid>
              </Grid>
            )}
          </Grid>
        )}

        {kpiData &&
          (props?.screen === "inventorysmart_dashboard_store_inventory" ? (
            <GenericCardsPanel
              panelData={kpiData}
              renderKpiForGeneric={!!props?.kpiIconsForGeneric}
              tabValue={props.tabValue}
              isForecastSeparate={props.isForecastSeparate}
              rosType={rosType}
              onRosToggle={handleRosToggle}
              onMetricClick={handleMetricClick}
              drilldownState={drilldownState}
              onDrilldownClose={handleDrilldownClose}
              enableRosToggle={enableRosToggle}
            />
          ) : (
            <GenericCardsPanel 
              panelData={kpiData} 
              tabValue={props.tabValue}
              isForecastSeparate={props.isForecastSeparate}
              rosType={rosType}
              onRosToggle={handleRosToggle}
              onMetricClick={handleMetricClick}
              drilldownState={drilldownState}
              onDrilldownClose={handleDrilldownClose}
              enableRosToggle={enableRosToggle}
            />
          ))}
      </div>
    </LoadingOverlay>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartDashboardService
        .selectedFilters,
    selectedDates:
      store.inventorysmartReducer.inventorySmartDashboardService.selectedDates,
    inventoryDashboardAlertCount:
      store.inventorysmartReducer.inventorySmartKPIService
        .inventoryDashboardAlertCount,
    inventorysmartDatesLoader:
      store.inventorysmartReducer.inventorySmartDashboardService
        .inventorysmartDatesLoader,
    inventoryDashboardKPIConfigLoader:
      store.inventorysmartReducer.inventorySmartKPIService
        .inventoryDashboardKPIConfigLoader,
    inventoryDashboardKPIDataLoader:
      store.inventorysmartReducer.inventorySmartKPIService
        .inventoryDashboardKPIDataLoader,
    inventoryDashboardForecastKPIDataLoader:
      store.inventorysmartReducer.inventorySmartKPIService
        .inventoryDashboardForecastKPIDataLoader,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    ddScreenConfigs:
      store.inventorysmartReducer.inventorySmartDashboardService
        .ddScreenConfigs,
    kpiStyles:
      store.inventorysmartReducer.inventorySmartDashboardService
        ?.ddScreenConfigs?.dashboard?.kpiStyles,
    inventoryDashboardOrderKPIDataLoader:
      store.inventorysmartReducer.inventorySmartKPIService
        .inventoryDashboardOrderKPIDataLoader,
    isNewStyles:
      store.inventorysmartReducer.inventorySmartDashboardService
        ?.ddScreenConfigs?.dashboard?.drillDown?.newStyles,
    kpiType:
      store.inventorysmartReducer.inventorySmartDashboardService.ddScreenConfigs
        ?.kpiType,
    kpiIconsForGeneric:
      store.inventorysmartReducer.inventorySmartDashboardService.ddScreenConfigs
        ?.dashboard?.drillDown?.enableApiSummaryBtn,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventoryDashboardKPIConfigLoader: (payload) =>
    dispatch(setInventoryDashboardKPIConfigLoader(payload)),
  setInventoryDashboardKPIDataLoader: (payload) =>
    dispatch(setInventoryDashboardKPIDataLoader(payload)),
  setInventoryDashboardForecastKPIDataLoader: (payload) =>
    dispatch(setInventoryDashboardForecastKPIDataLoader(payload)),
  setInventoryDashboardOrderKPIDataLoader: (payload) =>
    dispatch(setInventoryDashboardOrderKPIDataLoader(payload)),
  getInventoryDashboardKPIData: (payload) =>
    dispatch(getInventoryDashboardKPIData(payload)),
  getInventoryDashboardForecastKPIData: (payload) =>
    dispatch(getInventoryDashboardForecastKPIData(payload)),
  getInventoryDashboardStoreInventoryKPIData: (payload) =>
    dispatch(getInventoryDashboardStoreInventoryKPIData(payload)),
  getForecastKPIDrilldownData: (payload) =>
    dispatch(getForecastKPIDrilldownData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(KPIWrapper);
