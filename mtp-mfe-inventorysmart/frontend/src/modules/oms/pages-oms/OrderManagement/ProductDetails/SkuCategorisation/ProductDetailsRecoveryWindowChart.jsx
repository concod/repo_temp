import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import makeStyles from "@mui/styles/makeStyles";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { Badge, Button, EmptyState, Tooltip } from "impact-ui-v3";
import DownloadIcon from "assets/IA_DOWNLOAD.svg";
import moment from "moment";
import { cloneDeep } from "lodash";
import Loader from "core/Utils/Loader/loader";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import {
  getHeaderForExcel,
  replaceSpecialCharacter,
} from "core/Utils/functions/utils";
import { NormalCalendarFiscalMapping } from "core/commonComponents/calendar";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import {
  ERROR_MESSAGE,
  FILE_DOWNLOADING_MESSAGE,
  TENANT_DATE_FORMAT,
} from "modules/oms/constants-oms/stringConstants";
import ExpediteOrdersDeepDiveChart from "modules/oms/pages-oms/OffCycle Order/Expedite-Orders/components/Deep-Dive/DeepDiveChart";
import {
  fetchExpediteRecoveryWindowChart,
  getExpediteOrdersDeepDiveDownloadConfiguration,
  normalizeExpediteChartRows,
} from "modules/oms/services-oms/Decision-Dashboard/expedite-order-service";
import { getOmsDeepDiveDownloadTableData } from "modules/oms/services-oms/Order-Management/order-management-service";
import {
  buildExpediteRecoveryWindowChartRequest,
  getExpediteRowStyleColorValue,
} from "modules/oms/pages-oms/Decision-Dashboard/Ordering-Alerts/utils/helper";

const WEEK_RANGE_ATTRIBUTE = "deep_dive_dates";
const ORDER_PLACEMENT_WEEKS_LIMIT = 26;

const useStyles = makeStyles((theme) => ({
  container: {
    backgroundColor: "#FFFFFF",
    padding: "10px 20px",
    borderRadius: 8,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    padding: "8px 0",
  },
  headerLeft: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
    flexWrap: "wrap",
  },
  title: {
    fontSize: 14,
    lineHeight: "16px",
    fontWeight: 700,
    color: theme.palette.text.primary,
  },
  titleDivider: {
    height: 16,
    alignSelf: "center",
  },
  styleTag: {
    background: `${
      theme.palette.background?.tagBackground || "#F5F6FF"
    } !important`,
    borderRadius: 6,
    "& .tag-text": {
      color: theme.palette.text.secondary,
      fontSize: theme.typography.pxToRem(10),
      lineHeight: theme.typography.pxToRem(18),
      fontWeight: 600,
    },
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  downloadButton: {
    borderWidth: "0 !important",
    backgroundColor: "#f5f6fa !important",
    width: "32px !important",
    padding: "6px !important",
  },
  weekRangeRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "4px 0 8px",
    flexWrap: "wrap",
  },
  weekRangeItem: {
    flex: "0 0 auto",
  },
}));

/**
 * Renders the expedite recovery-window chart (session start + chart APIs) with
 * Lost Sales / Recoverable highlights, inline in place of the deep-dive chart.
 * Mirrors expedite step 1: a "Deep Dive" header with the selected style and a
 * download action, a Week Range filter, and the chart - all inside one card.
 */
const ProductDetailsRecoveryWindowChart = ({
  rowData,
  selectedFilters,
  alertTopRightOptions,
  dateRange,
  fiscalCalendarDetails,
  displaySnackMessages,
}) => {
  const classes = useStyles();
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [selectedDate, setSelectedDate] = useState({
    fiscalInfoStartDate: null,
    fiscalInfoEndDate: null,
  });
  const [weekRangeFilter, setWeekRangeFilter] = useState(null);
  const downloadLink = useRef(null);

  const rowKey = rowData?.unique_row_id ?? rowData?.article;
  const selectedStyle = getExpediteRowStyleColorValue(rowData);

  const isChartModularised = useSelector(
    (state) =>
      state?.omsReducer?.expediteOrdersService?.expediteOrdersConfig
        ?.expedite_orders?.deep_dive?.is_chart_modularised || false
  );

  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  const baseRequest = useMemo(
    () =>
      rowData
        ? buildExpediteRecoveryWindowChartRequest(
            rowData,
            selectedFilters,
            alertTopRightOptions,
            dateRange
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowKey, rowData, selectedFilters, alertTopRightOptions, dateRange]
  );

  // Merge the Week Range selection into the chart request as a deep_dive_dates
  // entry (same attribute the expedite step 1 week range produces).
  const chartRequest = useMemo(() => {
    if (!baseRequest) return null;
    if (!weekRangeFilter) return baseRequest;
    const date_filter = [...(baseRequest.date_filter || [])];
    const idx = date_filter.findIndex(
      (entry) => entry.attribute_name === WEEK_RANGE_ATTRIBUTE
    );
    if (idx >= 0) {
      date_filter[idx] = { ...date_filter[idx], ...weekRangeFilter };
    } else {
      date_filter.push(weekRangeFilter);
    }
    return { ...baseRequest, date_filter };
  }, [baseRequest, weekRangeFilter]);

  useEffect(() => {
    if (!rowData) {
      setChartData(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const loadChart = async () => {
      setLoading(true);
      setChartData(null);
      try {
        if (!chartRequest) {
          if (!cancelled) displaySnackMessages?.(ERROR_MESSAGE, "error");
          return;
        }

        const envelope = await fetchExpediteRecoveryWindowChart(chartRequest);
        if (!cancelled) setChartData(envelope);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          displaySnackMessages?.(ERROR_MESSAGE, "error");
          setChartData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadChart();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartRequest, rowData]);

  const createWeekRangePayload = (dates) => {
    try {
      const startDate = moment(
        dates?.fiscalInfoStartDate?.calendar_week_start_date
      )
        .utc()
        .startOf("week")
        .format(DATE_FORMAT);
      const endDate = moment(dates?.fiscalInfoEndDate?.calendar_week_start_date)
        .utc()
        .endOf("week")
        .format(DATE_FORMAT);
      return {
        attribute_name: WEEK_RANGE_ATTRIBUTE,
        start_date: startDate,
        end_date: endDate,
      };
    } catch (error) {
      displaySnackMessages?.(ERROR_MESSAGE, "error");
      return null;
    }
  };

  const onWeekRangeChange = (dates) => {
    setSelectedDate(dates);

    const hasCompleteRange =
      dates?.fiscalInfoStartDate && dates?.fiscalInfoEndDate;
    const isCleared =
      !dates?.fiscalInfoStartDate && !dates?.fiscalInfoEndDate;

    if (hasCompleteRange) {
      setWeekRangeFilter(createWeekRangePayload(dates));
    } else if (isCleared) {
      setWeekRangeFilter(null);
    }
  };

  const resetWeekRange = () => {
    setSelectedDate({ fiscalInfoStartDate: null, fiscalInfoEndDate: null });
    setWeekRangeFilter(null);
  };

  const isOutsideRange = (date) => {
    const weekLimit = ORDER_PLACEMENT_WEEKS_LIMIT * 7 - 1;
    const weekStartDay = moment().startOf("week");
    const weekEndDay = moment().endOf("week").day(weekLimit);
    return !moment(date).isBetween(weekStartDay, weekEndDay, undefined, "[]");
  };

  const getFormattedDataForDownload = (dataResponse) =>
    dataResponse.map((obj) =>
      Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
          key,
          typeof value === "string" ? replaceSpecialCharacter(value) : value,
        ])
      )
    );

  const downloadCsv = async () => {
    if (!chartRequest) {
      displaySnackMessages?.(ERROR_MESSAGE, "error");
      return;
    }
    displaySnackMessages?.(FILE_DOWNLOADING_MESSAGE, "info");
    setIsDownloading(true);
    try {
      const columnResponse = await getExpediteOrdersDeepDiveDownloadConfiguration()();
      const columnConfig = columnResponse?.data?.data;
      if (!columnResponse?.data?.status || !columnConfig?.length) {
        displaySnackMessages?.(ERROR_MESSAGE, "error");
        return;
      }

      const payload = {
        filters: cloneDeep(chartRequest.filters || []),
        transform_flag: true,
        ...(chartRequest.date_filter?.length
          ? { date_filter: chartRequest.date_filter }
          : {}),
      };

      const dataResponse = await getOmsDeepDiveDownloadTableData(payload)();
      if (dataResponse?.data?.status && dataResponse?.data?.data?.length > 0) {
        setCsvData(
          cloneDeep(getFormattedDataForDownload(dataResponse.data.data))
        );
        setCsvHeaders(getHeaderForExcel(cloneDeep(columnConfig)));
        downloadLink.current.link.click();
      } else {
        displaySnackMessages?.(ERROR_MESSAGE, "error");
      }
    } catch (error) {
      console.error("Error downloading recovery window CSV:", error);
      displaySnackMessages?.(ERROR_MESSAGE, "error");
    } finally {
      setIsDownloading(false);
    }
  };

  const hasChartData = normalizeExpediteChartRows(chartData)?.length > 0;

  const weekRangeCalendar = (
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
  );

  const downloadButtonNode = (
    <>
      <Tooltip title="Download" variant="tertiary">
        <Button
          variant="text"
          sx={{ mr: 0 }}
          onClick={downloadCsv}
          icon={<DownloadIcon />}
          disabled={isDownloading || loading || !hasChartData}
          className={classes.downloadButton}
        />
      </Tooltip>
      {csvData.length > 0 &&
        csvHeaders.length > 0 &&
        downloadExcelLink(
          csvData,
          "recovery_window_deep_dive",
          downloadLink,
          csvHeaders,
          "",
          "",
          true
        )}
    </>
  );

  // Modularised: let the common chart own the title, selected-style badge,
  // in-chart week-range filter and download. No duplicate header/week-range.
  if (isChartModularised) {
    return (
      <div className={classes.container}>
        <ExpediteOrdersDeepDiveChart
          fiscalCalendarDetails={fiscalCalendarDetails}
          sessionChartData={chartData}
          isLoadingSession={false}
          isSessionChartLoading={loading}
          showInDashboard={true}
          showChartHighlights={true}
          selectedStyleColor={selectedStyle}
          modularFilterContent={weekRangeCalendar}
          modularOnFilterApply={() => {}}
          modularOnFilterReset={resetWeekRange}
          modularDownloadButton={downloadButtonNode}
        />
      </div>
    );
  }

  return (
    <div className={classes.container}>
      <div className={classes.headerRow}>
        <div className={classes.headerLeft}>
          <Typography className={classes.title}>Deep Dive</Typography>
          {selectedStyle ? (
            <>
              <Divider
                orientation="vertical"
                flexItem
                className={classes.titleDivider}
              />
              <Badge
                className={classes.styleTag}
                label={`Selected Style: ${selectedStyle}`}
                color="default"
                size="default"
                variant="subtle"
              />
            </>
          ) : null}
        </div>
        <div className={classes.headerRight}>{downloadButtonNode}</div>
      </div>

      <div className={classes.weekRangeRow}>{weekRangeCalendar}</div>

      {loading ? (
        <Loader loader minHeight="280px" />
      ) : !hasChartData ? (
        <div style={{ minHeight: 280, display: "flex", alignItems: "center" }}>
          <EmptyState
            heading="No Data Found"
            description="Recovery window chart is unavailable for this style."
            primaryButtonLabel={null}
            secondaryButtonLabel={null}
          />
        </div>
      ) : (
        <ExpediteOrdersDeepDiveChart
          fiscalCalendarDetails={fiscalCalendarDetails}
          sessionChartData={chartData}
          isLoadingSession={false}
          isSessionChartLoading={false}
          showInDashboard={true}
          showChartHighlights={true}
        />
      )}
    </div>
  );
};

export default ProductDetailsRecoveryWindowChart;
