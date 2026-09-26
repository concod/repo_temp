import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import moment from "moment";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import { getOmsCoreFiscalCalendar } from "modules/oms/services-oms/common/common-services";
import { tenantConfigApiCache } from "core/actions/tenantConfigActions";

import {
  setRopDate,
  setRecommRecieptDate,
  getOmsDeepDiveFilters,
  setOrderManagementProductDetailsFilters,
  setOrderManagementDeepDiveFilters,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import OrderDeepDive from "modules/oms/pages-oms/Order-Management/Order-Deep-Dive";
import CommonDeepDive from "modules/oms/pages-oms/common/DeepDiveChart";
import { DECISION_DASHBOARD_DEEP_DIVE_CONFIG } from "modules/oms/constants-oms/apiConstants";

const OrderAlertsDeepDive = function (props) {
  const [isFiltersFetched, setIsFiltersFetched] = useState(false);
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);
  const [showLoader, setShowLoader] = useState(false);
  const [ropDate, setRopDate] = useState(null);
  const [recommRecieptDate, setRecommRecieptDate] = useState(null);
  const [deepDiveConfig, setDeepDiveConfig] = useState(null);
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [isChartModularised, setIsChartModularised] = useState(false);

  //Loads Fiscal Calendar and Filter Config
  useEffect(() => {
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
        const dateParams = {
          attribute_name: "order_placement_recom_date",
          start_date: null,
          end_date: null,
        };
        setRopDate(dateParams);
        props?.setRopDate(dateParams);
        const dateParamsRecommReciept = {
          attribute_name: "not_before_date",
          start_date: null,
          end_date: null,
        };
        setRecommRecieptDate(dateParamsRecommReciept);
        props?.setRecommRecieptDate(dateParamsRecommReciept);
      } catch (error) {
        setShowLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
        console.log(error);
      }
    };
    fetchFilters();
  }, []);

  //Fetches the Config for Decision Dashboard - Deep Dive Chart
  useEffect(() => {
    const getDeepDiveConfiguration = async () => {
      try {
        const deepDiveConfig = await props?.tenantConfigApiCache(1, {
          attribute_name: DECISION_DASHBOARD_DEEP_DIVE_CONFIG,
        });
        const DEEP_DIVE_CONFIG =
          deepDiveConfig.data.data[0]?.attribute_value?.deep_dive || {};
        setDeepDiveConfig(DEEP_DIVE_CONFIG);
        const SHOW_DEEP_DIVE =
          deepDiveConfig.data.data[0]?.attribute_value?.show_deep_dive || false;
        setShowDeepDive(SHOW_DEEP_DIVE);
        const IS_CHART_MODULARISED =
          deepDiveConfig.data.data[0]?.attribute_value
            ?.deep_dive?.is_chart_modularised || false;
        setIsChartModularised(IS_CHART_MODULARISED);
      } catch (error) {
        console.log("Error in Fetching Deep Dive Config", error);
      }
    };
    getDeepDiveConfiguration();
  }, []);

  //Setting Product Details Filters and Deep Dive Filters
  useEffect(() => {
    const fetchDeepDiveFilters = async () => {
      try {
        let deepDiveFilters = await props?.getOmsDeepDiveFilters();
        let productDetailsFilters = [];
        if (deepDiveFilters?.data?.data?.length > 0) {
          productDetailsFilters.push(deepDiveFilters?.data?.data[0]);
        }
        props?.setOrderManagementProductDetailsFilters(productDetailsFilters);
        props?.setOrderManagementDeepDiveFilters(
          deepDiveFilters?.data?.data?.slice(1)
        );
        setIsFiltersFetched(true);
      } catch (err) {
        console.log("err", err);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };

    if (showDeepDive) {
      fetchDeepDiveFilters();
    }
  }, [showDeepDive]);

  const displaySnackMessages = (message, variance) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  return (
    isFiltersFetched && (
      <div
        style={{
          backgroundColor: "#FFFFFF",
          padding: "10px 20px",
          borderRadius: "8px",
          marginTop: "1.5rem",
        }}
      >
        {deepDiveConfig !== null &&
          (isChartModularised ? (
            <CommonDeepDive
              fiscalCalendarDetails={fiscalCalendarDetails}
              showInDashboard={true}
              decisionDashboardDeepDiveConfig={deepDiveConfig}
              useV3DeepDiveTable={Boolean(props.dashboardApiFlags?.useV3Api)}
              isV3Schema={Boolean(props.dashboardApiFlags?.isV3Schema)}
            />
          ) : (
            <OrderDeepDive
              fiscalCalendarDetails={fiscalCalendarDetails}
              showInDashboard={true}
              decisionDashboardDeepDiveConfig={deepDiveConfig}
              useV3DeepDiveTable={Boolean(props.dashboardApiFlags?.useV3Api)}
              isV3Schema={Boolean(props.dashboardApiFlags?.isV3Schema)}
            />
          ))}
      </div>
    )
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters: store.omsReducer.orderingDashboardService.selectedFilters,
    orderAlertsTableDataLoader:
      store.omsReducer.omsOrderingAlertsService.orderAlertsTableDataLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setRecommRecieptDate: (filterConfiguration) =>
    dispatch(setRecommRecieptDate(filterConfiguration)),
  setRopDate: (filterConfiguration) =>
    dispatch(setRopDate(filterConfiguration)),
  getOmsDeepDiveFilters: () => dispatch(getOmsDeepDiveFilters()),
  setOrderManagementProductDetailsFilters: (payload) =>
    dispatch(setOrderManagementProductDetailsFilters(payload)),
  setOrderManagementDeepDiveFilters: (payload) =>
    dispatch(setOrderManagementDeepDiveFilters(payload)),
  tenantConfigApiCache: (payload, queryParams) =>
    dispatch(tenantConfigApiCache(payload, queryParams)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderAlertsDeepDive);
