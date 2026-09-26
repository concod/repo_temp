import { SIZE_CHOICE_TABLE_PAYLOAD, UPPER_HIERARCHY_TOTAL_METRICS } from "./constants";

export const getChoiceIdFromRow = (row) =>
  row?.choice ??
  row?.choice_id ??
  row?.choice_code ??
  row?.article ??
  row?.aggr_column ??
  null;

export const cleanPoRebalanceFilters = (filters) => {
  if (!Array.isArray(filters)) return [];
  return filters.filter(
    (filter) =>
      filter?.values &&
      Array.isArray(filter.values) &&
      filter.values.length > 0
  );
};

/** Same row shaping as PORebalanceTable.manualCallPoRebalance for review sheet APIs. */
export const transformPoRebalanceTableRows = (rows) => {
  if (!Array.isArray(rows)) return [];

  return rows.map((item) => {
    const {
      aggr_column,
      l6_name,
      status_obj,
      savetype,
      fiscal_year_week_draft,
    } = item;

    const summedData = {};
    const transformedStatusObj = (status_obj || []).map((statusItem) => {
      const { channel, ...weekData } = statusItem;
      const flattenedData = { channel };

      Object.entries(weekData).forEach(([weekId, metrics]) => {
        if (metrics && typeof metrics === "object") {
          Object.entries(metrics).forEach(([metricName, value]) => {
            const columnKey = `${metricName}_${weekId}`;
            flattenedData[columnKey] = value ?? null;

            if (typeof value === "number") {
              if (
                UPPER_HIERARCHY_TOTAL_METRICS.some((prefix) =>
                  metricName.startsWith(prefix)
                )
              ) {
                summedData[`${columnKey}_count`] =
                  (summedData[`${columnKey}_count`] || 0) + 1;
                summedData[columnKey] = (summedData[columnKey] || 0) + value;
                summedData[columnKey] =
                  summedData[columnKey] / summedData[`${columnKey}_count`];
              } else {
                summedData[columnKey] = (summedData[columnKey] || 0) + value;
              }
            } else if (value === null) {
              summedData[columnKey] = 0;
            } else {
              summedData[columnKey] = value;
            }
          });
        }
      });

      return flattenedData;
    });

    return {
      aggr_column,
      l6_name,
      savetype,
      fiscal_year_week_draft,
      ...summedData,
      ...item,
      status_obj: transformedStatusObj,
    };
  });
};

export const getFiscalWeekColumnsForPopUp = (columns) =>
  (columns || []).filter((col) => /^\d{6}$/.test(String(col.column_name)));

/** Loads PO rebalance choice + week columns when opening review UI from an alert row. */
export const loadPoRebalanceChoiceContextForAlert = async ({
  alertRow,
  selectedFilters,
  omsScreenConfig,
  fetchFiscalWeeksApi,
  fetchTableFields,
  fetchTableData,
}) => {
  const choiceId = getChoiceIdFromRow(alertRow);
  if (!choiceId) {
    return { ok: false, message: "Choice is missing on this alert row.", variant: "error" };
  }

  const hierarchyKey = omsScreenConfig?.hierarchy_key || "l6_id";

  let startDateParam = alertRow?.start_week;
  let endDateParam = alertRow?.target_week;
  if (!startDateParam || !endDateParam) {
    const currentDate = new Date();
    const datePlus8Weeks = new Date(currentDate);
    datePlus8Weeks.setDate(currentDate.getDate() + 8 * 7);
    startDateParam = currentDate.toISOString().split("T")[0];
    endDateParam = datePlus8Weeks.toISOString().split("T")[0];
  }

  const fiscalResponse = await fetchFiscalWeeksApi(
    startDateParam,
    endDateParam
  );
  const fiscalDatesInfo = fiscalResponse?.data?.data?.start_date;
  const startFw = fiscalDatesInfo?.start_fw;
  const endFw = fiscalDatesInfo?.end_fw;
  if (!startFw || !endFw) {
    return { ok: false, message: "Unable to resolve fiscal week range.", variant: "error" };
  }

  const cleanedFilters = cleanPoRebalanceFilters(selectedFilters);
  const columnsResponse = await fetchTableFields({
    ...SIZE_CHOICE_TABLE_PAYLOAD,
    module: omsScreenConfig?.hierarchy_label || "Choice",
    start_week_id: startFw,
    end_week_id: endFw,
    filters: cleanedFilters,
  });

  if (!columnsResponse?.data?.status) {
    return { ok: false, message: "Failed to load week columns.", variant: "error" };
  }

  const choiceTableColumns = (columnsResponse?.data?.data || []).map((col) => ({
    ...col,
    headerName: col.headerName || col.label,
  }));

  const dataResponse = await fetchTableData({
    meta: {
      search: [],
      range: [],
      sort: [],
      limit: { limit: 10, page: 1 },
    },
    filters: [
      ...cleanedFilters,
      {
        filter_type: "cascaded",
        attribute_name: hierarchyKey,
        operator: "in",
        dimension: "product",
        values: [String(choiceId)],
      },
    ],
    aggregation_level: "W",
    start_agg_id: startFw,
    end_agg_id: endFw,
    aggregation_type: "style",
    aggregation_value: "",
    kpi: "min_order_quantity_style",
  });

  if (!dataResponse?.data?.status) {
    return { ok: false, message: "Failed to load choice data.", variant: "error" };
  }

  const transformed = transformPoRebalanceTableRows(dataResponse?.data?.data || []);
  const matched =
    transformed.find((row) => String(row.aggr_column) === String(choiceId)) ||
    transformed[0];

  if (!matched) {
    return {
      ok: false,
      message: "No PO rebalance data found for this choice.",
      variant: "info",
    };
  }

  return {
    ok: true,
    startWeekId: startFw,
    endWeekId: endFw,
    choiceTableColumns,
    selectedChoice: matched.aggr_column,
    selectedRecords: [matched],
  };
};
