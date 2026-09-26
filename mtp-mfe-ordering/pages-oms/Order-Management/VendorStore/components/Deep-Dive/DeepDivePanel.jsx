import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import React, { useEffect, useState, useRef } from "react";
import { Divider, Grid } from "@mui/material";
import { Button, Tooltip } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep, isEmpty } from "lodash";
import moment from "moment";
import { NormalCalendarFiscalMapping } from "core/commonComponents/calendar";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import {
  ERROR_MESSAGE,
  TENANT_DATE_FORMAT,
} from "modules/oms/constants-oms/stringConstants";
import DeepDiveFilters from "./DeepDiveFilters";
import DeepDiveTableChart from "./DeepDiveTableChart";
import {
  setDeepDiveFiltersPayload,
  setDeepDiveWeekRange,
  resetDeepDiveReducersForVendorStore,
} from "modules/oms/services-oms/Order-Management/order-management-vendor-to-store-service";
import { setCreateScenarioFiltersData } from "modules/oms/services-oms/Order-Management/order-management-service";
import { ORDER_MANAGEMENT_CREATE_SCENARIO } from "modules/oms/constants-oms/routeConstants";

const useStyles = makeStyles((theme) => ({
  topContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    background: "#F7F7F7",
    padding: "1rem",
  },
  leftContainer: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    margin: "1rem 0",
    gap: "0.5rem",
  },
  filterContainer: {
    display: "flex",
    alignItems: "center",
    columnGap: "1rem",
    justifyContent: "flex-start",
    flexWrap: "wrap",
  },
  filterItem: { flex: "0 0 20%", marginBottom: "1rem" },
  dividerLine: {
    border: `1px solid  ${theme.palette.background.separaterColor}`,
  },
}));

const OrderDeepDive = (props) => {
  const navigate = useNavigate();
  let location = useLocation();
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [selectedDate, setSelectedDate] = useState({
    fiscalInfoStartDate: null,
    fiscalInfoEndDate: null,
  });
  const [weekRange, setWeekRange] = useState({});
  const [reloadComponents, setReloadComponents] = useState(null);
  const [resetFilters, setResetFilters] = useState(false);

  const SHOW_WEEK_RANGE =
    props?.screenConfig?.oms_dashboard?.deep_dive?.show_date_range || false;
  const ORDER_PLACEMENT_WEEKS_LIMIT =
    props?.screenConfig?.oms_dashboard?.deep_dive
      ?.order_placement_weeks_limit || 26;

  const redirectData = useRef();
  const type = new URLSearchParams(window.location.search).get("type");
  const isRedirectedFromDifferentPage = type && true;

  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  const createDatePayload = (selectedDate) => {
    try {
      const currentDate = moment().format(DATE_FORMAT);
      const endDate = moment(
        selectedDate?.fiscalInfoEndDate?.calendar_week_start_date
      )
        .utc()
        .endOf("week")
        .format(DATE_FORMAT);
      const startDate = moment(
        selectedDate?.fiscalInfoStartDate?.calendar_week_start_date
      )
        .utc()
        .startOf("week")
        .format(DATE_FORMAT);
      let dateParams = {
        attribute_name: "deep_dive_dates",
        start_date: startDate,
        end_date: endDate,
      };
      return dateParams;
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const onFilterApply = () => {
    try {
      if (
        selectedDate === undefined ||
        (selectedDate?.fiscalInfoStartDate === null &&
          selectedDate?.fiscalInfoEndDate === null)
      ) {
        setWeekRange({});
        props?.setDeepDiveWeekRange({});
        setReloadComponents(!reloadComponents);
      }

      if (
        selectedDate?.fiscalInfoStartDate ||
        selectedDate?.fiscalInfoEndDate
      ) {
        const weekRangePayload = createDatePayload(selectedDate);
        setWeekRange(weekRangePayload);
        props?.setDeepDiveWeekRange(weekRangePayload);
        setReloadComponents(!reloadComponents);
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  useEffect(() => {
    if (props?.reloadFromParent) {
      onFilterApply();
    }
  }, [props?.reloadFromParent]);

  const onWeekRangeChange = (dates) => {
    setSelectedDate(dates);
  };

  const handleResetFilters = () => {
    setResetFilters(true);
    const previousCustomFiltersData = cloneDeep(props?.deepDiveFiltersPayload)
      ?.filters;
    const deepDiveFilterNames = [];
    props?.deepDiveFilters.map((filter) =>
      deepDiveFilterNames.push(filter.column_name)
    );
    previousCustomFiltersData.map((filter) => {
      if (deepDiveFilterNames.includes(filter.attribute_name)) {
        filter.values = [];
      }
    });
    props?.setDeepDiveFiltersPayload({
      filters: previousCustomFiltersData,
    });

    setSelectedDate(undefined);
    setWeekRange({});
    props?.setDeepDiveWeekRange({});
    setReloadComponents(!reloadComponents);
  };

  useEffect(() => {
    return () => {
      props?.resetDeepDiveReducersForVendorStore();
    };
  }, []);

  //For Order Placement Date
  const isOutsideRange = (date) => {
    let weekLimit = ORDER_PLACEMENT_WEEKS_LIMIT * 7 - 1;
    let weekStartDay = moment().startOf("week");
    let weekEndDay = moment().endOf("week").day(weekLimit);
    return !moment(date).isBetween(weekStartDay, weekEndDay, undefined, "[]");
  };

  const navigateToCreateScenario = () => {
    const customFilters = cloneDeep([
      ...props?.vendorToStoreScreenConfig?.selected_product_filter,
      ...props?.deepDiveFilters,
    ]);

    const appliedFilters = props?.deepDiveFiltersData;
    if (customFilters?.length && !isEmpty(appliedFilters)) {
      customFilters.find((customFilter) => {
        const filter = customFilter.column_name;
        if (appliedFilters[filter]?.length) {
          customFilter.values = appliedFilters[filter];
        } else {
          customFilter.values = [];
        }
      });
    }
    props?.setCreateScenarioFiltersData(customFilters);
    const url = `${ORDER_MANAGEMENT_CREATE_SCENARIO}?step=0`;
    navigate(url, {
      state: {
        filters: customFilters,
      },
    });
  };

  const isCreateScenarioRestricted = () => {
    try {
      const restrictionKey =
        props?.vendorToStoreScreenConfig?.selected_product_filter?.[0]
          ?.column_name;

      const totalSelectedIds = props?.deepDiveFiltersData[restrictionKey];
      if (totalSelectedIds.length === 1) return false;

      // if table selections are not present, then check if there is only key selected in product filters dropdown
      const filteredValues = props?.deepDiveFiltersPayload?.filters?.filter(
        (item) => item.attribute_name === restrictionKey
      );
      return !(
        filteredValues.length === 1 && filteredValues[0]?.values.length === 1
      );
    } catch (error) {
      console.log("Error in isCreateScenarioRestricted", error);
    }
  };

  return (
    <>
      <div className={classes.topContainer}>
        <div className={classes.leftContainer}>
          <div className={classes.filterContainer}>
            {SHOW_WEEK_RANGE && (
              <div className={classes.filterItem}>
                <NormalCalendarFiscalMapping
                  fiscalCalendarData={props?.fiscalCalendarDetails}
                  disablePastWeeks={true}
                  showDefaultLabel={false}
                  selectedDate={selectedDate}
                  onDateChange={onWeekRangeChange}
                  resetOptions={true}
                  isOutsideRange={isOutsideRange}
                  label="Week Range"
                  displayFormat={DATE_FORMAT}
                />
              </div>
            )}

            <DeepDiveFilters
              resetDeepDiveFilters={resetFilters}
              setResetDeepDiveFilters={setResetFilters}
            />
          </div>
        </div>

        {/* <Divider orientation="vertical" variant="middle" flexItem /> */}

        {/* <Divider orientation="vertical" variant="middle" flexItem /> */}

        {!isEmpty(props?.deepDiveFiltersData) && (
          <Grid
            item
            xs={2}
            style={{
              display: "flex",
              gap: "12px",
            }}
          >
            <Button
              id="resetBtn"
              onClick={handleResetFilters}
              color="primary"
              variant="secondary"
            >
              Reset
            </Button>

            <Button
              variant="primary"
              onClick={onFilterApply}
              id="applyBtn"
              color="primary"
              disabled={props.isDeepDiveFiltersLoading}
            >
              Apply
            </Button>
          </Grid>
        )}
      </div>

      <div>
        <DeepDiveTableChart
          isRedirectFromDifferentPage={isRedirectedFromDifferentPage}
          reloadComponents={reloadComponents}
          setReloadComponents={setReloadComponents}
          weekRange={weekRange}
          navigateToCreateScenario={navigateToCreateScenario}
          isCreateScenarioRestricted={isCreateScenarioRestricted}
          showInDashboard={props?.showInDashboard}
          isChartDisplayed={props?.isChartDisplayed}
          isViewedByWeek={props?.isViewedByWeek}
        />
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    screenConfig: store.omsReducer.orderingCommonService.orderingScreensConfig,
    deepDiveFiltersData:
      store.omsReducer.orderManagementVendorToStoreService.deepDiveFiltersData,
    deepDiveFilters:
      store.omsReducer.orderManagementVendorToStoreService.deepDiveFilters,
    deepDiveFiltersPayload:
      store.omsReducer.orderManagementVendorToStoreService
        .deepDiveFiltersPayload,
    isDeepDiveFiltersLoading:
      store.omsReducer.orderManagementVendorToStoreService
        .isDeepDiveFiltersLoading,
    fiscalCalendarDetails:
      store.omsReducer.orderManagementVendorToStoreService.fiscalCalendarData,
    vendorToStoreScreenConfig:
      store.omsReducer.orderingCommonService.orderingVendorToStoreConfig
        ?.oms_dashboard?.deep_dive,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  setCreateScenarioFiltersData: (payload) =>
    dispatch(setCreateScenarioFiltersData(payload)),
  setDeepDiveFiltersPayload: (payload) =>
    dispatch(setDeepDiveFiltersPayload(payload)),
  setDeepDiveWeekRange: (payload) => dispatch(setDeepDiveWeekRange(payload)),
  resetDeepDiveReducersForVendorStore: () =>
    dispatch(resetDeepDiveReducersForVendorStore()),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderDeepDive);
