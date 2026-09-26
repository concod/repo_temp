import React, { useEffect, useRef } from "react";
import { connect, useSelector } from "react-redux";
import ExpediteOrdersDeepDiveChart from "./DeepDiveChart";
import ExpediteOrdersDeepDiveHeader from "./DeepDiveHeader";
import {
  ExpediteOrdersDeepDiveFilterWeekRange,
  ExpediteOrdersDeepDiveFilterPanelFull,
} from "./DeepDiveFilterPanel";
import ExpediteOrdersAlertsDetailsTable from "./ExpediteOrdersAlertsDetailsTable";
import { getExpediteRowStyleColorValue } from "modules/oms/pages-oms/Decision-Dashboard/Ordering-Alerts/utils/helper";

/**
 * @param {object} props
 * @param {boolean} [props.sessionBased] - When true, reads chart data from
 *   Redux (beforeChart / afterChart) instead of the legacy deep-dive APIs.
 * @param {string} [props.selectedDeepDiveOption] - "before" | "after"
 * @param {(value: "before"|"after") => void} [props.onDeepDiveOptionChange] - Before/After toggle.
 * @param {boolean} [props.showDeepDiveControls] - Shows Before/After toggle and comparison button (step 2 only).
 * @param {boolean} [props.showAlertsDetailsTable] - Shows alerts details table below chart (step 1 only).
 * @param {boolean} [props.isDeepDiveFiltersReady] - Set by ExpediteOrdersDeepDiveFilterScope.
 * @param {Array<any>} [props.fiscalCalendarDetails] - Fiscal calendar passed from filter scope.
 * @param {string} [props.selectedMetricCard] - Currently selected metric card key for data filtering.
 */
const ExpediteOrdersDeepDiveSection = function (props) {
  const deepDiveChartRef = useRef(null);

  const beforeChart = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.beforeChart
  );
  const afterChart = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.afterChart
  );
  const isLoadingSession = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.isLoadingSession
  );
  const isBeforeChartLoading = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.isBeforeChartLoading
  );
  const isAfterChartLoading = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.isAfterChartLoading
  );
  const recoveryWindowChartRow = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.recoveryWindowChartRow
  );
  const recoveryWindowChartData = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.recoveryWindowChartData
  );
  const isRecoveryWindowChartLoading = useSelector(
    (state) =>
      state?.omsReducer?.expediteOrdersService?.isRecoveryWindowChartLoading
  );
  const baseExpeditePayload = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.baseExpeditePayload
  );

  const isChartModularised = useSelector(
    (state) =>
      state?.omsReducer?.expediteOrdersService?.expediteOrdersConfig
        ?.expedite_orders?.deep_dive?.is_chart_modularised || false
  );

  const isRecoveryWindowView = Boolean(recoveryWindowChartRow);

  const selectedArticlesCount = Array.isArray(baseExpeditePayload?.data)
    ? baseExpeditePayload.data.length
    : 0;
  const showChartHighlights =
    isRecoveryWindowView || selectedArticlesCount === 1;

  const sessionChartData = isRecoveryWindowView
    ? recoveryWindowChartData
    : props.selectedDeepDiveOption === "after"
    ? afterChart
    : beforeChart;

  const isSessionChartLoading = isRecoveryWindowView
    ? isRecoveryWindowChartLoading
    : props.selectedDeepDiveOption === "after"
    ? isAfterChartLoading
    : isBeforeChartLoading;

  useEffect(() => {
    if (!recoveryWindowChartRow || !deepDiveChartRef.current) return;
    deepDiveChartRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [recoveryWindowChartRow]);

  if (props.isDeepDiveFiltersReady === false) {
    return null;
  }

  const selectedStyleColor = isRecoveryWindowView
    ? getExpediteRowStyleColorValue(recoveryWindowChartRow)
    : null;

  return (
    <div>
      {!isChartModularised && (
        <ExpediteOrdersDeepDiveHeader
          fiscalCalendarDetails={props.fiscalCalendarDetails}
          showInDashboard={true}
          selectedDeepDiveOption={props.selectedDeepDiveOption}
          onDeepDiveOptionChange={props.onDeepDiveOptionChange}
          showDeepDiveControls={props.showDeepDiveControls}
          selectedStyleColor={isChartModularised ? null : selectedStyleColor}
          hideTitle={isChartModularised}
        />
      )}

      {!isChartModularised &&
        (!props.showDeepDiveControls ? (
          <ExpediteOrdersDeepDiveFilterWeekRange />
        ) : (
          <ExpediteOrdersDeepDiveFilterPanelFull />
        ))}

      <div id="expedite-deep-dive-chart" ref={deepDiveChartRef}>
        {props.sessionBased ? (
          <ExpediteOrdersDeepDiveChart
            key={`chart-${props.selectedMetricCard || "default"}-${
              props.selectedDeepDiveOption || "before"
            }`}
            fiscalCalendarDetails={props.fiscalCalendarDetails}
            showInDashboard={true}
            sessionChartData={sessionChartData}
            isLoadingSession={isLoadingSession}
            isSessionChartLoading={isSessionChartLoading}
            selectedDeepDiveOption={props.selectedDeepDiveOption}
            selectedChartScenario={props.selectedMetricCard}
            showChartHighlights={showChartHighlights}
            selectedStyleColor={selectedStyleColor}
          />
        ) : (
          <ExpediteOrdersDeepDiveChart
            fiscalCalendarDetails={props.fiscalCalendarDetails}
            showInDashboard={true}
            selectedStyleColor={selectedStyleColor}
          />
        )}
      </div>

      {props.sessionBased && props.showAlertsDetailsTable && (
        <ExpediteOrdersAlertsDetailsTable />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters: store.omsReducer.orderingDashboardService.selectedFilters,
    orderAlertsTableDataLoader:
      store.omsReducer.omsOrderingAlertsService.orderAlertsTableDataLoader,
  };
};

export default connect(mapStateToProps)(ExpediteOrdersDeepDiveSection);
