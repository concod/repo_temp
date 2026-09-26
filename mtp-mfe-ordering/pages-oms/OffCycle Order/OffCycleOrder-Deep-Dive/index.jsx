import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import moment from "moment";
import { Divider, Grid } from "@mui/material";
import { Button } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import { cloneDeep, isEmpty } from "lodash";
import { NormalCalendarFiscalMapping } from "core/commonComponents/calendar";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";

import DeepDiveDownload from "./DeepDiveDownload";
import ChartFilterWrapper from "./ChartFilterWrapper";
import OrderDeepDiveTable from "./OrderDeepDiveTable";
import {
  ERROR_MESSAGE,
  TENANT_DATE_FORMAT,
  OMS_DEEP_DIVE_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import { getSafeDisplayFormat } from "./utils";
import {
  setOffCycleOrderDeepDiveFiltersPayload,
  resetOffCycleDeepDiveReducers,
} from "modules/oms/services-oms/Create-New-Order/off-cycle-order-service";

const useStyles = makeStyles((theme) => ({
  deepDiveContainer: {
    backgroundColor: "#FFFFFF",
    padding: "1.5rem 1rem",
    marginTop: "1rem",
    borderRadius: "10px",
  },
  rightContainer: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    margin: "0",
    padding: "0 1rem 1rem",
    gap: "1rem",
    marginTop: "1rem",
  },
  filterContainer: {
    display: "flex",
    alignItems: "flex-end",
  },
  dividerLine: {
    border: `1px solid  ${theme.palette.background.separaterColor}`,
  },
}));

const OffCycleOrderDeepDive = (props) => {
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

  // reload components on HighLevelAggregateView save
  useEffect(() => {
    if (
      props.reloadTrigger !== undefined &&
      props.reloadTrigger !== null &&
      props.reloadTrigger > 0
    ) {
      setReloadComponents((prev) => !prev);
    }
  }, [props.reloadTrigger]);

  // Access control state for download button
  const [isUserHasDownloadAccess, setIsUserHasDownloadAccess] = useState(true);

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
      const safeFormat = getSafeDisplayFormat();
      const currentDate = moment().format(safeFormat);
      const endDate = moment(
        selectedDate?.fiscalInfoEndDate?.calendar_week_start_date
      )
        .utc()
        .endOf("week")
        .format(safeFormat);
      const startDate = moment(
        selectedDate?.fiscalInfoStartDate?.calendar_week_start_date
      )
        .utc()
        .startOf("week")
        .format(safeFormat);
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
        setReloadComponents(!reloadComponents);
      }

      if (
        selectedDate?.fiscalInfoStartDate ||
        selectedDate?.fiscalInfoEndDate
      ) {
        const weekRangePayload = createDatePayload(selectedDate);
        setWeekRange(weekRangePayload);
        setReloadComponents(!reloadComponents);
        // Notify parent component about weekRange change
        if (props.onWeekRangeChange) {
          props.onWeekRangeChange(weekRangePayload);
        }
      } else {
        // Clear weekRange when no date is selected
        if (props.onWeekRangeChange) {
          props.onWeekRangeChange({});
        }
      }

      // Notify parent component that filters were applied
      if (props.onFilterApply) {
        props.onFilterApply();
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

  // Access control for Download button
  useEffect(() => {
    if (!isEmpty(props.userAccess)) {
      // If userAccess exists, use the new access control
      const deepDiveAccess = props.userAccess?.find(
        (item) => item.screen === OMS_DEEP_DIVE_SCREENNAME_KEY
      );
      const canDownload = deepDiveAccess?.isDownloadButton || false;
      setIsUserHasDownloadAccess(canDownload);
    } else {
      // Fallback to default behavior
      setIsUserHasDownloadAccess(true);
    }
  }, [props.userAccess]);

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
    setReloadComponents(!reloadComponents);
    // Notify parent component about weekRange reset
    if (props.onWeekRangeChange) {
      props.onWeekRangeChange({});
    }
  };

  useEffect(() => {
    return () => {
      props?.resetOffCycleDeepDiveReducers();
    };
  }, []);

  //For Order Placement Date
  const isOutsideRange = (date) => {
    let weekLimit = ORDER_PLACEMENT_WEEKS_LIMIT * 7 - 1;
    let weekStartDay = moment().startOf("week");
    let weekEndDay = moment().endOf("week").day(weekLimit);
    return !moment(date).isBetween(weekStartDay, weekEndDay, undefined, "[]");
  };

  return (
    <>
      <div className={classes.rightContainer}>
        <div className={classes.filterContainer}>
          <ChartFilterWrapper
            isProductFilter={true}
            isDeepDiveFilters={true}
            draftId={props?.draftId}
            resetFilters={resetFilters}
            setResetFilters={setResetFilters}
            showInDashboard={props?.showInDashboard}
            labelOrientation={"top"}
          />

          {SHOW_WEEK_RANGE && (
            <div style={{ marginRight: "1rem" }}>
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
                labelOrientation={props?.showInDashboard ? "left" : "top"}
              />
            </div>
          )}

          <ChartFilterWrapper
            isProductFilter={false}
            isDeepDiveFilters={true}
            draftId={props?.draftId}
            resetFilters={resetFilters}
            setResetFilters={setResetFilters}
            showInDashboard={props?.showInDashboard}
            labelOrientation={"top"}
          />
        </div>

        <>
          <Divider
            orientation="vertical"
            style={{ height: "32px", display: "flex" }}
          />
          {isUserHasDownloadAccess && (
            <>
              <DeepDiveDownload
                weekRange={weekRange}
                draftId={props?.draftId}
              />
            </>
          )}
          <Divider
            orientation="vertical"
            style={{ height: "32px", display: "flex" }}
          />
        </>

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
            >
              Apply
            </Button>
          </Grid>
        )}
      </div>

      <div className={classes.deepDiveContainer}>
        <div>
          <OrderDeepDiveTable
            isRedirectFromDifferentPage={isRedirectedFromDifferentPage}
            reloadComponents={reloadComponents}
            setReloadComponents={setReloadComponents}
            weekRange={weekRange}
            draftId={props?.draftId}
            isUserHasDownloadAccess={isUserHasDownloadAccess}
          />
        </div>
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
    screenConfig: store.omsReducer.orderingCommonService.orderingScreensConfig,
    deepDiveFiltersData:
      store.omsReducer.offCycleOrderService.offCycleOrderDeepDiveFiltersData,
    deepDiveFilters:
      store.omsReducer.offCycleOrderService.offCycleOrderDeepDiveFilters,
    deepDiveFiltersPayload:
      store.omsReducer.offCycleOrderService.offCycleOrderDeepDiveFiltersPayload,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  setDeepDiveFiltersPayload: (payload) =>
    dispatch(setOffCycleOrderDeepDiveFiltersPayload(payload)),
  resetOffCycleDeepDiveReducers: () =>
    dispatch(resetOffCycleDeepDiveReducers()),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OffCycleOrderDeepDive);
