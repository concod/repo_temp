import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import moment from "moment";
import { ENV } from "config/api";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import { getOmsCoreFiscalCalendar } from "modules/oms/services-oms/common/common-services";

import {
  setRopDate,
  setRecommRecieptDate,
  getOmsDeepDiveFilters,
  setOrderManagementProductDetailsFilters,
  setOrderManagementDeepDiveFilters,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import OrderDeepDive from "modules/oms/pages-oms/Order-Management/Order-Deep-Dive";

const OrderAlertsDeepDive = function (props) {
  const [isFiltersFetched, setIsFiltersFetched] = useState(false);
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);
  const [showLoader, setShowLoader] = useState(false);
  const [ropDate, setRopDate] = useState(null);
  const [recommRecieptDate, setRecommRecieptDate] = useState(null);

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

    if (!(ENV === "uat" || ENV === "impactsmartsuite")) {
      fetchDeepDiveFilters();
    }
  }, []);

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
      <div>
        <OrderDeepDive
          fiscalCalendarDetails={fiscalCalendarDetails}
          showInDashboard={true}
        />
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
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderAlertsDeepDive);
