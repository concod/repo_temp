import React, { useCallback, useEffect, useState } from "react";
import { connect, useSelector } from "react-redux";
import moment from "moment";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import { getOmsCoreFiscalCalendar } from "modules/oms/services-oms/common/common-services";
import {
  setRopDate,
  setRecommRecieptDate,
  getOmsDeepDiveFilters,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import {
  setDeepDiveFilters,
  setDeepDiveProductFilter,
  refetchExpediteSessionOnFilterApply,
} from "modules/oms/services-oms/Decision-Dashboard/expedite-order-service";
import {
  ExpediteOrdersDeepDiveFilterProviderConnected,
  ExpediteOrdersDeepDiveFilterToolbar,
} from "./DeepDiveFilterPanel";
import ExpediteOrdersPageHeader from "../ExpediteOrdersPageHeader";
import HeaderKPIPanelCompact from "../HeaderKPIPanelCompact";
import { useExpediteOrdersCardsStyles } from "../styles.js";

/** Scroll threshold at which the sticky compact KPI strip appears. */
const KPI_COMPACT_SCROLL_THRESHOLD = 80;

/**
 * Fetches deep-dive filter metadata, provides shared filter context for the
 * page-level toolbar (step 1) and the deep-dive chart section.
 */
const ExpediteOrdersDeepDiveFilterScope = ({
  children,
  breadcrumb,
  scrollContentRef,
  sessionBased,
  showPageLevelFilters,
  pageTitle,
  subtitle,
  beforeAfterControl,
  showCtaCard = true,
  ctaTitle,
  createOffCycleLabel,
  onCreateOffCycle,
  onExpediteOrders,
  ...props
}) => {
  const classes = useExpediteOrdersCardsStyles();
  const [isFiltersFetched, setIsFiltersFetched] = useState(false);
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);

  const showExpediteCtaView = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.showExpediteCtaView
  );

  const baseExpeditePayload = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.baseExpeditePayload
  );

  const deepDiveFiltersPayload = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.deepDiveFiltersPayload
  );

  const styleColorFilter = deepDiveFiltersPayload?.filters?.find((filter) => {
    return (
      filter?.attribute_name === "article_id" ||
      filter?.attribute_name === "article"
    );
  });

  const filterCount = Array.isArray(styleColorFilter?.values)
    ? styleColorFilter.values.length
    : 0;
  const baseCount = Array.isArray(baseExpeditePayload?.data)
    ? baseExpeditePayload.data.length
    : 0;

  const selectedRowCount = filterCount > 0 ? filterCount : baseCount;

  /** When true, render the compact KPI strip in the sticky top bar. */
  const [isKpiCompact, setIsKpiCompact] = useState(false);
  /** Live DOM node for the scroll body; callback ref keeps this in sync across
   *  remounts (the scope re-mounts its subtree when filters fetch completes). */
  const [scrollEl, setScrollEl] = useState(null);

  const setScrollContentRef = useCallback(
    (node) => {
      if (scrollContentRef) {
        scrollContentRef.current = node;
      }
      setScrollEl(node);
    },
    [scrollContentRef]
  );

  /**
   * Track scroll position on `expediteScrollBody`; once user scrolls past the
   * full KPI panel (~141px tall), morph it into the compact sticky strip.
   */
  useEffect(() => {
    if (!scrollEl) return undefined;
    const onScroll = () => {
      const next = scrollEl.scrollTop > KPI_COMPACT_SCROLL_THRESHOLD;
      setIsKpiCompact((prev) => (prev === next ? prev : next));
    };
    onScroll();
    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", onScroll);
  }, [scrollEl]);

  const handleSessionFiltersApplied = useCallback(() => {
    props.refetchExpediteSessionOnFilterApply?.();
  }, [props.refetchExpediteSessionOnFilterApply]);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
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
        setFiscalCalendarDetails(getFinancialCalendarData?.data?.data?.data);
        const dateParams = {
          attribute_name: "order_placement_recom_date",
          start_date: null,
          end_date: null,
        };
        props?.setRopDate(dateParams);
        const dateParamsRecommReciept = {
          attribute_name: "not_before_date",
          start_date: null,
          end_date: null,
        };
        props?.setRecommRecieptDate(dateParamsRecommReciept);
      } catch (error) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        console.log(error);
      }
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    const fetchDeepDiveFilters = async () => {
      try {
        const deepDiveFilters = await props?.getOmsDeepDiveFilters();
        let productDetailsFilters = [];
        if (deepDiveFilters?.data?.data?.length > 0) {
          productDetailsFilters.push(deepDiveFilters?.data?.data[0]);
        }
        props?.setDeepDiveFilters(deepDiveFilters?.data?.data);
        props?.setDeepDiveProductFilter(productDetailsFilters[0]);
        setIsFiltersFetched(true);
      } catch (err) {
        console.log("err", err);
        displaySnackMessages(ERROR_MESSAGE, "error");
        setIsFiltersFetched(true);
      }
    };
    fetchDeepDiveFilters();
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

  const childProps = {
    fiscalCalendarDetails,
    isDeepDiveFiltersReady: isFiltersFetched,
  };

  const pageTitleWithDot = pageTitle ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
      <span>{pageTitle}</span>•
      <span
        style={{
          fontSize: "14px",
          fontStyle: "normal",
          fontWeight: 400,
          lineHeight: "16px",
          color: "#60697D",
        }}
      >
        {" "}
        {selectedRowCount} Style{selectedRowCount !== 1 ? "s" : ""} Selected
      </span>
    </span>
  ) : null;

  const topBar = (
    <div className={classes.expediteTopBar}>
      {breadcrumb}
      {pageTitle && (showPageLevelFilters || beforeAfterControl) ? (
        <ExpediteOrdersPageHeader
          title={pageTitleWithDot}
          subtitle={subtitle}
          beforeAfterControl={beforeAfterControl}
          rightSlot={
            showPageLevelFilters && isFiltersFetched ? (
              <ExpediteOrdersDeepDiveFilterToolbar />
            ) : null
          }
        />
      ) : null}
      {showPageLevelFilters && showExpediteCtaView ? (
        <div
          className={`${classes.kpiCompactStripContainer} ${
            isKpiCompact ? classes.kpiCompactStripContainerVisible : ""
          }`}
          aria-hidden={!isKpiCompact}
        >
          <HeaderKPIPanelCompact
            onCreateOffCycle={onCreateOffCycle}
            onExpediteOrders={onExpediteOrders}
            showCtaCard={showCtaCard}
            ctaTitle={ctaTitle}
            createOffCycleLabel={createOffCycleLabel}
          />
        </div>
      ) : null}
    </div>
  );

  const scopeContent = (
    <div className={classes.expeditePageMain}>
      {topBar}
      <div ref={setScrollContentRef} className={classes.expediteScrollBody}>
        <div className={classes.rows}>
          {React.Children.map(children, (child) =>
            React.isValidElement(child)
              ? React.cloneElement(child, childProps)
              : child
          )}
        </div>
      </div>
    </div>
  );

  if (!isFiltersFetched) {
    return scopeContent;
  }

  return (
    <ExpediteOrdersDeepDiveFilterProviderConnected
      fiscalCalendarDetails={fiscalCalendarDetails}
      sessionBased={Boolean(sessionBased)}
      onChartFiltersApplied={handleSessionFiltersApplied}
    >
      {scopeContent}
    </ExpediteOrdersDeepDiveFilterProviderConnected>
  );
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setRecommRecieptDate: (filterConfiguration) =>
    dispatch(setRecommRecieptDate(filterConfiguration)),
  setRopDate: (filterConfiguration) =>
    dispatch(setRopDate(filterConfiguration)),
  getOmsDeepDiveFilters: () => dispatch(getOmsDeepDiveFilters()),
  setDeepDiveFilters: (payload) => dispatch(setDeepDiveFilters(payload)),
  setDeepDiveProductFilter: (payload) =>
    dispatch(setDeepDiveProductFilter(payload)),
  refetchExpediteSessionOnFilterApply: () =>
    dispatch(refetchExpediteSessionOnFilterApply()),
});

export default connect(
  null,
  mapDispatchToProps
)(ExpediteOrdersDeepDiveFilterScope);
