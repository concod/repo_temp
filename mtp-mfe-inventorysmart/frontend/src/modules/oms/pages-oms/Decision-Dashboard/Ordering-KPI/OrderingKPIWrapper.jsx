import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { Grid, Typography, Box } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import moment from "moment";
import { EventBusy } from "@mui/icons-material";
import { isEmpty } from "lodash";
import {
  ERROR_MESSAGE,
  OMS_ORDERING_DASHBOARD_TABS,
} from "modules/oms/constants-oms/stringConstants";
import { displaySnackMessages } from "modules/oms/utils-oms/oms-utility";
import GenericCardsPanel from "./GenericCardPanel";
import {
  getDashboardOrderKPIData,
  setOrderKPIDataLoader,
  getDashboardOrderAlertData,
} from "modules/oms/services-oms/Decision-Dashboard/ordering-alerts-service";
import { getKPIIconComponent } from "modules/oms/utils-oms/kpiIconUtils";

const OrderingKPIWrapper = (props) => {
  const globalClasses = globalStyles();
  const [kpiData, setKPIData] = useState(null);
  const [hasAttemptedKpiFetch, setHasAttemptedKpiFetch] = useState(false);

  const render3DIcons = props.orderingDecisionDashboardScreensConfig?.render3DIcons ?? false;
  const kpiIconMapping = props.orderingDecisionDashboardScreensConfig?.kpiIconMapping || [];

  // function to get iconType from config mapping - match by label
  const getIconTypeForMetric = (metric) => {
    if (kpiIconMapping.length > 0) {
      const label = metric?.label || metric?.title;
      if (label) {
        const mapping = kpiIconMapping.find(
          (item) => item.label?.toLowerCase() === label.toLowerCase()
        );
        if (mapping?.iconType) return mapping.iconType;
      }
    }
    return null;
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

    (props.selectedFilters || []).forEach((filter) => {
      if (filter.dimension === "product" && filter?.values?.length > 0) {
        filters.product_attributes.push(filter);
      } else if (filter.dimension === "store" && filter?.values?.length > 0) {
        filters.store_attributes.push(filter);
       } else if (filter.dimension === "dc" && filter?.values?.length > 0) {
         filters.product_attributes.push(filter);
      }
    });

    return filters;
  };

  const formatOrderKPIDetails = (kpis) => {
    let panelData = {
      noSubMetrics: false,
      expandedLayout: "center",
      panelHeader: "KPIs",
      cardData: [],
    };
    if (kpis) {
      kpis.forEach((thisMetric, index) => {
        const { label, value, key = "Units" } = thisMetric;
        let subMetrics = [];

        if ("value" in thisMetric) {
          subMetrics.push({
            label: thisMetric?.label.includes(" WOS") ? "Weeks" : key,
            value: value.toLocaleString("en-US"),
          });
        }

        if ("cost" in thisMetric) {
          subMetrics.push({
            label: "Cost ($)",
            value: `$${thisMetric?.cost.toLocaleString("en-US")}`,
          });
        }
        const cardData = {
          title: label,
          metric: "",
          subMetrics,
        };

        const iconType = getIconTypeForMetric(thisMetric);
        if (iconType) {
          cardData.iconType = iconType;
        }
        if (render3DIcons && cardData?.iconType) {
          cardData.renderIcon = () => getKPIIconComponent(cardData.iconType, index);
        }

        panelData.cardData.push(cardData);
      });
    }

    return panelData;
  };

  /** Fetch KPI Data for OMS Tab */
  const fetchDashboardOrderKPIData = async () => {
    try {
      const startDate = moment().subtract(8, "weeks").format("YYYY-MM-DD");
      const endDate = moment().format("YYYY-MM-DD");
      const filters = generateKPIFilterBody(startDate, endDate);
      props.setOrderKPIDataLoader(true);
      setKPIData(null);
      let kpiBody = {
        ...filters,
        vendor_store: props?.isCalledFromVendorStore ?? undefined,
      };

      let response = await props.getDashboardOrderKPIData(
        kpiBody,
        props.dashboardApiFlags
      );

      if (response.data.status) {
        let kpiOrderDetails = formatOrderKPIDetails(response.data.data.kpis);
        setKPIData(kpiOrderDetails);
      }
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      setHasAttemptedKpiFetch(true);
      props.setOrderKPIDataLoader(false);
    }
  };

  const fetchKPIData = () => {
    if (props.screen === OMS_ORDERING_DASHBOARD_TABS.ORDERING_DASHBOARD_ORDER) {
      fetchDashboardOrderKPIData();
    }
  };

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
    props.dashboardApiFlags?.useV3Api,
    props.dashboardApiFlags?.isV3Schema,
  ]);

  const showKpiLoader =
    props?.orderAlertsTableDataLoader || props.orderKPIDataLoader;
  // After a finished fetch with no rows, do not spin forever (e.g. v3 KPI 404).
  const showEmptyKpiPlaceholder =
    !kpiData && !showKpiLoader && hasAttemptedKpiFetch;

  return (
    <LoadingOverlay
      loader={showKpiLoader}
      size="medium"
      text="Loading Kpis"
      minHeight={"150px"}
    >
      <div>
        {kpiData ? (
          <GenericCardsPanel panelData={kpiData} />
        ) : showEmptyKpiPlaceholder ? (
          <Box minHeight="100px" />
        ) : (
          <LoadingOverlay
            loader={!showKpiLoader && !hasAttemptedKpiFetch}
            size="medium"
            text="Loading Kpis"
            minHeight={"100px"}
          ></LoadingOverlay>
        )}
      </div>
    </LoadingOverlay>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters: store.omsReducer.orderingDashboardService.selectedFilters,
    selectedDates: store.omsReducer.orderingDashboardService.selectedDates,
    orderKPIDataLoader:
      store.omsReducer.omsOrderingAlertsService.orderKPIDataLoader,
    orderAlertsTableDataLoader:
      store.omsReducer.omsOrderingAlertsService.orderAlertsTableDataLoader,
    orderingDecisionDashboardScreensConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig.decision_dashboard,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setOrderKPIDataLoader: (payload) => dispatch(setOrderKPIDataLoader(payload)),
  getDashboardOrderKPIData: (payload, apiFlags) =>
    dispatch(getDashboardOrderKPIData(payload, apiFlags)),
  getDashboardOrderAlertData: (payload, apiFlags) =>
    dispatch(getDashboardOrderAlertData(payload, apiFlags)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderingKPIWrapper);
