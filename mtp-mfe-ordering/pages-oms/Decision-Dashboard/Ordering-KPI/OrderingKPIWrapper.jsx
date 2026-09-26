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

const OrderingKPIWrapper = (props) => {
  const globalClasses = globalStyles();
  const [kpiData, setKPIData] = useState(null);

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

  const formatOrderKPIDetails = (kpis) => {
    let panelData = {
      noSubMetrics: false,
      expandedLayout: "center",
      panelHeader: "KPIs",
      cardData: [],
    };
    if (kpis) {
      kpis.forEach((thisMetric) => {
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
        panelData.cardData.push({
          title: label,
          metric: "",
          subMetrics,
        });
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
      let kpiBody = {
        ...filters,
        vendor_store: props?.isCalledFromVendorStore ?? undefined,
      };

      let response = await props.getDashboardOrderKPIData(kpiBody);

      if (response.data.status) {
        let kpiOrderDetails = formatOrderKPIDetails(response.data.data.kpis);
        setKPIData(kpiOrderDetails);
      }
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
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
  ]);

  return (
    <LoadingOverlay
      loader={props?.orderAlertsTableDataLoader || props.orderKPIDataLoader}
      size="medium"
      text="Loading Kpis"
      minHeight={"150px"}
    >
      <div>
        {kpiData ? (
          <GenericCardsPanel panelData={kpiData} />
        ) : (
          <LoadingOverlay
            loader={
              !props?.orderAlertsTableDataLoader && !props.orderKPIDataLoader
            }
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
  };
};

const mapDispatchToProps = (dispatch) => ({
  setOrderKPIDataLoader: (payload) => dispatch(setOrderKPIDataLoader(payload)),
  getDashboardOrderKPIData: (payload) =>
    dispatch(getDashboardOrderKPIData(payload)),
  getDashboardOrderAlertData: (payload) =>
    dispatch(getDashboardOrderAlertData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderingKPIWrapper);
