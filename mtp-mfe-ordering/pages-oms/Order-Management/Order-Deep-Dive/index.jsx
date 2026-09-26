import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import moment from "moment";
import OrderDeepDiveTable from "./OrderDeepDiveTable";
import {
  setOrderManagementFilterElements,
  setIsFiltersValid,
  setRedirectFromDeepDive,
  setOrderManagementKpiSummaryLoader,
  resetDeepDiveReducers,
  setCreateScenarioFiltersData,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import {
  ERROR_MESSAGE,
  TENANT_DATE_FORMAT,
  OMS_DEEP_DIVE_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import { Divider, Grid } from "@mui/material";
import { Button } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import { NormalCalendarFiscalMapping } from "core/commonComponents/calendar";
import ProductDetailsFilters from "../components/Product-Details-Screen/ProductDetailsFilters";
import { ORDER_MANAGEMENT_CREATE_SCENARIO } from "modules/oms/constants-oms/routeConstants";
import { cloneDeep, isEmpty } from "lodash";
import { setOrderManagementDeepDiveFiltersPayload } from "modules/oms/services-oms/Order-Management/order-management-service";
import DeepDiveDownload from "./DeepDiveDownload";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import { getSafeDisplayFormat } from "./utils";

const useStyles = makeStyles((theme) => ({
  // orderDeepDiveWrapper: {
  //   backgroundColor: "white",
  //   borderRadius: "8px",
  //   // padding: "12px 12px 0px 12px",
  // },
  filterContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
  },
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
    const previousCustomFiltersData = cloneDeep(
      props?.orderManagementDeepDiveFiltersPayload
    )?.filters;
    const deepDiveFilterNames = [];
    props?.orderManagementDeepDiveFilters.map((filter) =>
      deepDiveFilterNames.push(filter.column_name)
    );
    previousCustomFiltersData.map((filter) => {
      if (deepDiveFilterNames.includes(filter.attribute_name)) {
        filter.values = [];
      }
    });
    props?.setOrderManagementDeepDiveFiltersPayload({
      filters: previousCustomFiltersData,
    });

    setSelectedDate(undefined);
    setWeekRange({});
    setReloadComponents(!reloadComponents);
  };

  useEffect(() => {
    return () => {
      props?.resetDeepDiveReducers();
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
      ...props?.orderManagementProductDetailsFilters,
      ...props?.orderManagementDeepDiveFilters,
    ]);

    const appliedFilters = props?.orderManagementDeepDiveFiltersData;
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
        props?.orderManagementProductDetailsFilters[0]?.column_name;

      const totalSelectedIds =
        props?.orderManagementDeepDiveFiltersData[restrictionKey];
      if (totalSelectedIds.length === 1) return false;

      // if table selections are not present, then check if there is only key selected in product filters dropdown
      const filteredValues = props?.orderManagementDeepDiveFiltersPayload?.filters?.filter(
        (item) => item.attribute_name === restrictionKey
      );
      return !(
        filteredValues.length === 1 && filteredValues[0]?.values.length === 1
      );
    } catch (error) {
      console.log("Error in isCreateScenarioRestricted", error);
    }
  };

  const getFilters = () => {
    return (
      <div>
        <div className={classes.filterContainer}>
          {SHOW_WEEK_RANGE && <NormalCalendarFiscalMapping
            fiscalCalendarData={props?.fiscalCalendarDetails}
            disablePastWeeks={true}
            showDefaultLabel={false}
            selectedDate={selectedDate}
            onDateChange={onWeekRangeChange}
            resetOptions={true}
            isOutsideRange={isOutsideRange}
            label="Week Range"
            displayFormat={DATE_FORMAT}
            labelOrientation={"top"}
          />}
          <ProductDetailsFilters
            isDeepDiveFilters={true}
            resetDeepDiveFilters={resetFilters}
            setResetDeepDiveFilters={setResetFilters}
            showInDashboard={props?.showInDashboard}
            labelOrientation={"top"}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* <div className={classes.rightContainer}>
        <div className={classes.filterContainer}>
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

          <ProductDetailsFilters
            isDeepDiveFilters={true}
            resetDeepDiveFilters={resetFilters}
            setResetDeepDiveFilters={setResetFilters}
            showInDashboard={props?.showInDashboard}
            labelOrientation={props?.showInDashboard ? "left" : "top"}
          />

          {!props?.showInDashboard && (
            <Divider
              orientation="vertical"
              variant="middle"
              style={{ height: "16px" }}
            />
          )}
        </div>

        {!props?.showInDashboard && isUserHasDownloadAccess && (
          <>
            <DeepDiveDownload weekRange={weekRange} />
            <Divider
              orientation="vertical"
              variant="middle"
              style={{ height: "16px" }}
            />
          </>
        )}

        {!isEmpty(props?.orderManagementDeepDiveFiltersData) && (
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
      </div> */}

      <div>
        <OrderDeepDiveTable
          isRedirectFromDifferentPage={isRedirectedFromDifferentPage}
          reloadComponents={reloadComponents}
          setReloadComponents={setReloadComponents}
          weekRange={weekRange}
          navigateToCreateScenario={navigateToCreateScenario}
          isCreateScenarioRestricted={isCreateScenarioRestricted}
          showInDashboard={props?.showInDashboard}
          orderManagementDeepDiveFiltersData={props?.orderManagementDeepDiveFiltersData}
          handleResetFilters={handleResetFilters}
          onFilterApply={onFilterApply}
          downloadButton={!props?.showInDashboard && isUserHasDownloadAccess && (
              <DeepDiveDownload weekRange={weekRange} />
          )}
          filters={getFilters()}
        />
      </div>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
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
    screenConfig: store.omsReducer.orderingCommonService.orderingScreensConfig,
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
  };
};

const mapDispatchToProps = (dispatch) => ({
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setOrderManagementFilterElements: (payload) =>
    dispatch(setOrderManagementFilterElements(payload)),
  setRedirectFromDeepDive: (payload) =>
    dispatch(setRedirectFromDeepDive(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setOrderManagementKpiSummaryLoader: (payload) =>
    dispatch(setOrderManagementKpiSummaryLoader(payload)),
  setCreateScenarioFiltersData: (payload) =>
    dispatch(setCreateScenarioFiltersData(payload)),
  setOrderManagementDeepDiveFiltersPayload: (payload) =>
    dispatch(setOrderManagementDeepDiveFiltersPayload(payload)),
  resetDeepDiveReducers: () => dispatch(resetDeepDiveReducers()),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderDeepDive);
