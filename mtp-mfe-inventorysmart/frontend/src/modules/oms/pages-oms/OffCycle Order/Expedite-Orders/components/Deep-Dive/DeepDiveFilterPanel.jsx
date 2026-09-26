import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { Divider, Grid } from "@mui/material";
import { Button, Loader } from "impact-ui-v3";
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
import ExpediteOrdersDeepDiveFilterGroup from "./DeepDiveFiltersGroup.jsx";
import {
  setDeepDiveFiltersPayload,
  setDeepDiveWeekRange,
  resetDeepDiveReducersForExpediteOrder,
  refetchExpediteSessionOnFilterApply,
} from "modules/oms/services-oms/Decision-Dashboard/expedite-order-service.js";
import {
  EXPEDITE_LS_KEYS,
  getExpediteActiveArticles,
  overrideExpediteArticleFilter,
} from "modules/oms/pages-oms/OffCycle Order/Expedite-Orders/constants";
import DeepDiveDownload from "modules/oms/pages-oms/Order-Management/Order-Deep-Dive/DeepDiveDownload.jsx";

const useStyles = makeStyles((theme) => ({
  topContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    background: "#FFFFFF",
    padding: "0",
    gap: "0.5rem",
  },
  headerToolbar: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    flexWrap: "nowrap",
    minWidth: 0,
    position: "relative",
    zIndex: 21,
    overflow: "visible",
  },
  headerToolbarDivider: {
    height: 24,
    alignSelf: "center",
    flexShrink: 0,
  },
  weekRangeRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    margin: "0",
    gap: 12,
    padding: "4px 0 8px",
    flexWrap: "wrap",
  },
  weekRangeLeft: {
    display: "flex",
    alignItems: "center",
    flex: "1 1 auto",
    minWidth: 0,
  },
  weekRangeActions: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexShrink: 0,
  },
  leftContainer: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    margin: "0",
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
  weekRangeItem: {
    flex: "0 0 auto",
    marginBottom: 0,
  },
  dividerLine: {
    border: `1px solid  ${theme.palette.background.separaterColor}`,
  },
}));

const ExpediteDeepDiveFilterContext = createContext(null);

const useExpediteDeepDiveFilterContext = () => {
  const context = useContext(ExpediteDeepDiveFilterContext);
  if (!context) {
    throw new Error(
      "Expedite deep-dive filter components must be used within ExpediteOrdersDeepDiveFilterProvider"
    );
  }
  return context;
};

export const useExpediteDeepDiveFilterContextSafe = () =>
  useContext(ExpediteDeepDiveFilterContext);

const ExpediteOrdersDeepDiveFilterProviderInner = (props) => {
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
  const [isFiltersLoading, setIsFiltersLoading] = useState(true);

  const SHOW_WEEK_RANGE = props?.deepDiveConfig?.show_date_range || false;
  const SHOW_APPLY_RESET_BUTTONS =
    props?.deepDiveConfig?.show_apply_reset_buttons || false;
  const SHOW_DIVIDER_FOR_FILTER_GROUP =
    props?.deepDiveConfig?.show_divider_for_filter_group || false;
  const ORDER_PLACEMENT_WEEKS_LIMIT =
    props?.deepDiveConfig?.order_placement_weeks_limit || 26;

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

  const applyWeekRangeFromDates = (dates) => {
    if (dates?.fiscalInfoStartDate && dates?.fiscalInfoEndDate) {
      const weekRangePayload = createDatePayload(dates);
      setWeekRange(weekRangePayload);
      props?.setDeepDiveWeekRange(weekRangePayload);
      setReloadComponents(!reloadComponents);
    } else {
      setWeekRange({});
      props?.setDeepDiveWeekRange({});
      setReloadComponents(!reloadComponents);
    }
  };

  const applyWeekRangeToStore = () => {
    applyWeekRangeFromDates(selectedDate);
  };

  const onProductFiltersApply = () => {
    // Refetch is now handled by debounced call in DeepDiveFilter.js
    // to prevent duplicate API calls
    props?.onChartFiltersApplied?.();
  };

  const onFilterApply = () => {
    try {
      applyWeekRangeToStore();
      if (props?.refetchExpediteSessionOnFilterApply) {
        props.refetchExpediteSessionOnFilterApply();
      }
      props?.onChartFiltersApplied?.();
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

    const hasCompleteRange =
      dates?.fiscalInfoStartDate && dates?.fiscalInfoEndDate;
    const isCleared = !dates?.fiscalInfoStartDate && !dates?.fiscalInfoEndDate;

    if (!hasCompleteRange && !isCleared) {
      return;
    }

    try {
      applyWeekRangeFromDates(dates);
      props?.onChartFiltersApplied?.();
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const resetProductFilterDropdowns = () => {
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
  };

  const handleProductFiltersReset = () => {
    resetProductFilterDropdowns();
  };

  const handleResetFilters = () => {
    resetProductFilterDropdowns();
    setSelectedDate(undefined);
    setWeekRange({});
    props?.setDeepDiveWeekRange({});
    setReloadComponents(!reloadComponents);
  };

  useEffect(() => {
    if (!props?.deepDiveFiltersPayload?.filters) {
      let initialFilters = [];
      let expediteChoiceCombinations = [];
      const expeditePayloadRaw = localStorage.getItem(
        EXPEDITE_LS_KEYS.ALERT_PAYLOAD
      );
      if (expeditePayloadRaw) {
        try {
          const expeditePayload = JSON.parse(expeditePayloadRaw);
          initialFilters = Array.isArray(expeditePayload?.filters)
            ? expeditePayload.filters
            : [];
          expediteChoiceCombinations = Array.isArray(
            expeditePayload?.choiceDcCombinations
          )
            ? expeditePayload.choiceDcCombinations
            : [];
        } catch (err) {
          console.log("Error in parsing expedite payload", err);
        }
      }

      if (!initialFilters.length) {
        const redirectionDetails = JSON.parse(
          localStorage.getItem("omsRedirectionDetails")
        );
        initialFilters = redirectionDetails?.isRedirection
          ? redirectionDetails?.selectedFilters || []
          : [];
      }

      let seededFilters = cloneDeep(initialFilters);
      if (props?.sessionBased) {
        const activeArticles = getExpediteActiveArticles(
          expediteChoiceCombinations,
          props?.generatedOrders
        );
        seededFilters = overrideExpediteArticleFilter(
          seededFilters,
          activeArticles
        );
      }

      props?.setDeepDiveFiltersPayload({ filters: seededFilters });
      setIsFiltersLoading(false);
    }
    return () => {
      props?.resetDeepDiveReducers();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const generatedOrdersSignature = JSON.stringify(
    (props?.generatedOrders || []).map((generatedOrder) =>
      (generatedOrder?.constraints || [])
        .map((constraintRow) => constraintRow?.choice)
        .filter(Boolean)
        .sort()
    )
  );
  useEffect(() => {
    if (!props?.sessionBased) return;
    const currentFilters = props?.deepDiveFiltersPayload?.filters;
    if (!Array.isArray(currentFilters)) return;

    let choiceDcCombinations = [];
    try {
      const raw = localStorage.getItem(EXPEDITE_LS_KEYS.ALERT_PAYLOAD);
      if (raw) {
        const parsed = JSON.parse(raw);
        choiceDcCombinations = Array.isArray(parsed?.choiceDcCombinations)
          ? parsed.choiceDcCombinations
          : [];
      }
    } catch {
      // swallow — fall back to empty list; downstream call guards on values.
    }

    const activeArticles = getExpediteActiveArticles(
      choiceDcCombinations,
      props?.generatedOrders
    );

    const existingArticleValues =
      currentFilters.find(
        (filterEntry) => filterEntry?.attribute_name === "article"
      )?.values || [];
    const isSameArticleSet =
      existingArticleValues.length === activeArticles.length &&
      existingArticleValues.every((articleId) =>
        activeArticles.includes(articleId)
      );
    if (isSameArticleSet) return;

    props?.setDeepDiveFiltersPayload({
      filters: overrideExpediteArticleFilter(currentFilters, activeArticles),
    });
  }, [generatedOrdersSignature, props?.sessionBased]); // eslint-disable-line react-hooks/exhaustive-deps

  const isOutsideRange = (date) => {
    let weekLimit = ORDER_PLACEMENT_WEEKS_LIMIT * 7 - 1;
    let weekStartDay = moment().startOf("week");
    let weekEndDay = moment().endOf("week").day(weekLimit);
    return !moment(date).isBetween(weekStartDay, weekEndDay, undefined, "[]");
  };

  const contextValue = {
    classes,
    globalClasses,
    isFiltersLoading,
    SHOW_WEEK_RANGE,
    SHOW_APPLY_RESET_BUTTONS,
    selectedDate,
    weekRange,
    resetFilters,
    setResetFilters,
    fiscalCalendarDetails: props.fiscalCalendarDetails,
    onWeekRangeChange,
    isOutsideRange,
    handleResetFilters,
    handleProductFiltersReset,
    onFilterApply,
    onProductFiltersApply,
    sessionBased: props.sessionBased,
    isDeepDiveFiltersLoading: props.isDeepDiveFiltersLoading,
    deepDiveFiltersData: props.deepDiveFiltersData,
  };

  return (
    <ExpediteDeepDiveFilterContext.Provider value={contextValue}>
      {props.children}
    </ExpediteDeepDiveFilterContext.Provider>
  );
};

export const ExpediteOrdersDeepDiveFilterToolbar = () => {
  const {
    SHOW_APPLY_RESET_BUTTONS,
    SHOW_DIVIDER_FOR_FILTER_GROUP,
    classes,
    isFiltersLoading,
    resetFilters,
    setResetFilters,
    handleProductFiltersReset,
    onProductFiltersApply,
    sessionBased,
    isDeepDiveFiltersLoading,
    deepDiveFiltersData,
  } = useExpediteDeepDiveFilterContext();

  if (isFiltersLoading) {
    return <Loader progress="" size="small" text="" />;
  }

  return (
    <div className={classes.headerToolbar}>
      <ExpediteOrdersDeepDiveFilterGroup
        resetDeepDiveFilters={resetFilters}
        setResetDeepDiveFilters={setResetFilters}
        compactLayout
        autoApplyOnBlur={!SHOW_APPLY_RESET_BUTTONS}
        SHOW_DIVIDER_FOR_FILTER_GROUP={SHOW_DIVIDER_FOR_FILTER_GROUP}
        onFilterApply={onProductFiltersApply}
      />

      {(sessionBased || !isEmpty(deepDiveFiltersData)) &&
        SHOW_APPLY_RESET_BUTTONS && (
          <>
            <Divider
              orientation="vertical"
              variant="middle"
              flexItem
              className={classes.headerToolbarDivider}
            />
            <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
              <Button
                id="resetBtn"
                onClick={handleProductFiltersReset}
                color="primary"
                variant="secondary"
              >
                Reset
              </Button>

              <Button
                variant="primary"
                onClick={onProductFiltersApply}
                id="applyBtn"
                color="primary"
                disabled={isDeepDiveFiltersLoading}
              >
                Apply
              </Button>
            </div>
          </>
        )}
    </div>
  );
};

export const ExpediteOrdersDeepDiveFilterWeekRange = () => {
  const {
    classes,
    isFiltersLoading,
    SHOW_WEEK_RANGE,
    selectedDate,
    weekRange,
    fiscalCalendarDetails,
    onWeekRangeChange,
    isOutsideRange,
  } = useExpediteDeepDiveFilterContext();

  if (isFiltersLoading || !SHOW_WEEK_RANGE) {
    return null;
  }

  return (
    <div className={classes.weekRangeRow}>
      <div className={classes.weekRangeLeft}>
        <div className={classes.weekRangeItem}>
          <NormalCalendarFiscalMapping
            fiscalCalendarData={fiscalCalendarDetails}
            disablePastWeeks={true}
            showDefaultLabel={false}
            selectedDate={selectedDate}
            onDateChange={onWeekRangeChange}
            resetOptions={true}
            isOutsideRange={isOutsideRange}
            label="Week Range"
          />
        </div>
      </div>

      <div className={classes.weekRangeActions}>
        <DeepDiveDownload weekRange={weekRange} isCalledFromExpediteOrders />
      </div>
    </div>
  );
};

export const ExpediteOrdersDeepDiveFilterWeekRangeInline = () => {
  const {
    classes,
    isFiltersLoading,
    SHOW_WEEK_RANGE,
    selectedDate,
    fiscalCalendarDetails,
    onWeekRangeChange,
    isOutsideRange,
  } = useExpediteDeepDiveFilterContext();

  if (isFiltersLoading || !SHOW_WEEK_RANGE) {
    return null;
  }

  return (
    <div className={classes.filterItem}>
      <NormalCalendarFiscalMapping
        fiscalCalendarData={fiscalCalendarDetails}
        disablePastWeeks={true}
        showDefaultLabel={false}
        selectedDate={selectedDate}
        onDateChange={onWeekRangeChange}
        resetOptions={true}
        isOutsideRange={isOutsideRange}
        label="Week Range"
      />
    </div>
  );
};

export const ExpediteOrdersDeepDiveFilterPanelFull = () => {
  const {
    classes,
    isFiltersLoading,
    SHOW_APPLY_RESET_BUTTONS,
    weekRange,
    resetFilters,
    setResetFilters,
    handleResetFilters,
    onFilterApply,
    sessionBased,
    isDeepDiveFiltersLoading,
    deepDiveFiltersData,
  } = useExpediteDeepDiveFilterContext();

  if (isFiltersLoading) {
    return <Loader progress="" size="small" text="" />;
  }

  return (
    <div className={classes.topContainer}>
      <div className={classes.leftContainer}>
        <div className={classes.filterContainer}>
          <ExpediteOrdersDeepDiveFilterWeekRangeInline />
          <ExpediteOrdersDeepDiveFilterGroup
            resetDeepDiveFilters={resetFilters}
            setResetDeepDiveFilters={setResetFilters}
            autoApplyOnBlur={!SHOW_APPLY_RESET_BUTTONS}
            onFilterApply={onFilterApply}
          />
        </div>
      </div>

      <Divider
        orientation="vertical"
        variant="middle"
        flexItem
        style={{ height: 24, alignSelf: "center", marginTop: "1rem" }}
      />

      <div style={{ marginTop: "0.5rem" }}>
        <DeepDiveDownload weekRange={weekRange} isCalledFromExpediteOrders />
      </div>

      {SHOW_APPLY_RESET_BUTTONS && (
        <>
          <Divider
            orientation="vertical"
            variant="middle"
            flexItem
            style={{ height: 24, alignSelf: "center", marginTop: "1rem" }}
          />
          {(sessionBased || !isEmpty(deepDiveFiltersData)) && (
            <Grid
              item
              xs={2}
              style={{
                display: "flex",
                gap: "12px",
                marginTop: "0.5rem",
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
                disabled={isDeepDiveFiltersLoading}
              >
                Apply
              </Button>
            </Grid>
          )}
        </>
      )}
    </div>
  );
};

const ExpediteOrdersDeepDiveFilterPanel = (props) => (
  <ExpediteOrdersDeepDiveFilterProviderInner {...props}>
    <ExpediteOrdersDeepDiveFilterPanelFull />
  </ExpediteOrdersDeepDiveFilterProviderInner>
);

const mapStateToProps = (store) => {
  return {
    screenConfig: store.omsReducer.orderingCommonService.orderingScreensConfig,
    deepDiveConfig:
      store.omsReducer.expediteOrdersService.expediteOrdersConfig
        ?.expedite_orders?.deep_dive,
    deepDiveFiltersData:
      store.omsReducer.expediteOrdersService.deepDiveFiltersData,
    deepDiveFilters: store.omsReducer.expediteOrdersService.deepDiveFilters,
    deepDiveFiltersPayload:
      store.omsReducer.expediteOrdersService.deepDiveFiltersPayload,
    isDeepDiveFiltersLoading:
      store.omsReducer.expediteOrdersService.isDeepDiveFiltersLoading,
    generatedOrders: store.omsReducer.expediteOrdersService.generatedOrders,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  setDeepDiveFiltersPayload: (payload) =>
    dispatch(setDeepDiveFiltersPayload(payload)),
  setDeepDiveWeekRange: (payload) => dispatch(setDeepDiveWeekRange(payload)),
  resetDeepDiveReducers: () =>
    dispatch(resetDeepDiveReducersForExpediteOrder()),
  refetchExpediteSessionOnFilterApply: () =>
    dispatch(refetchExpediteSessionOnFilterApply()),
});

const ConnectedProvider = connect(
  mapStateToProps,
  mapDispatchToProps
)(ExpediteOrdersDeepDiveFilterProviderInner);

export { ConnectedProvider as ExpediteOrdersDeepDiveFilterProviderConnected };

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ExpediteOrdersDeepDiveFilterPanel);
