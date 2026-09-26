import React from "react";
import moment from "moment";
import { MATRIX_SUMMARY_ROQ_STATUS_LEGEND } from "modules/oms/constants-oms/stringConstants";
import { Typography } from "@mui/material";

// Checks if KPI is MOQ
const getErrorHighlightFlagForKpi = (kpi) => {
  return kpi === "min_order_quantity_style";
};

// Renders the ROQ Status Legend on the Bottom of the Grid
export const renderRoqStatusLegend = () => {
  if (!Array.isArray(MATRIX_SUMMARY_ROQ_STATUS_LEGEND)) return null;

  const isLargeScreen = window.innerWidth >= 1600;

  return MATRIX_SUMMARY_ROQ_STATUS_LEGEND.map((item) => (
    <div
      key={item.label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        minWidth: 0,
        ...(!isLargeScreen && { flex: 1 }),
      }}
    >
      <div
        id="legend-block"
        style={{
          width: "10px",
          height: "10px",
          backgroundColor: item.backgroundColor,
          borderRadius: "2px",
          border: item.border,
          flexShrink: 0,
        }}
      ></div>
      <Typography variant="body2" style={{ fontSize: "12px" }}>
        {item.label}
      </Typography>
    </div>
  ));
};

// Renders the ROQ Status Cell Background Color
export const renderRoqStatusCell = (cellProps) => {
  const { value, data, column } = cellProps || {};

  if (!data || !column?.colId) return;

  const [week, suffix] = column.colId.split(".");
  if (suffix !== "adjusted") return;

  const weekData = data?.[week];
  if (!weekData) return;

  const legendConfig = MATRIX_SUMMARY_ROQ_STATUS_LEGEND.find(
    (config) => config.key && weekData?.[config.key]
  );

  if (!legendConfig) return;

  const baseStyle = {
    textAlign: "right",
    padding: "4px 8px",
    borderRadius: "4px",
    position: "relative",
    cursor: "help",
  };

  return (
    <div
      style={{
        ...baseStyle,
        backgroundColor: legendConfig.backgroundColor,
      }}
      title={legendConfig.label}
    >
      {value}
    </div>
  );
};

export const getErrorHighlightCellStyle = (selectedKpi, params) => {
  const errorHighlightFlag = getErrorHighlightFlagForKpi(selectedKpi);

  if (!errorHighlightFlag) {
    return;
  }

  const { column, data } = params;
  const { colId } = column;
  const [columnName, _subColumnName] = colId?.split?.(".") || [];
  const weekData = data[columnName];
  const { order_quantity_eaches, adjusted, Kpi: kpi } = weekData || {};
  const orderQty = order_quantity_eaches ?? adjusted; // if order_quantity_eaches present then compare MOQ with it else with orderQty

  const areOrderQtyAndKpiNumbers =
    typeof orderQty === "number" && typeof kpi === "number";
  const isOrderQtyLessThanKpi = orderQty < kpi;

  if (areOrderQtyAndKpiNumbers && isOrderQtyLessThanKpi) {
    return {
      backgroundColor: "#F6CCCC",
    };
  }
};

// Function to determine fiscal week start day
const determineFiscalWeekStartDay = (fiscalCalendarData) => {
  if (!fiscalCalendarData?.length) return 1; // Default to Monday if no data

  // Get the first fiscal date and its corresponding moment
  const firstFiscalDate = fiscalCalendarData[0];
  const firstWeekStart = moment.utc(firstFiscalDate.calendar_week_start_date);

  // Get the day of week (0-6, where 0 is Sunday)
  const startDay = firstWeekStart.day();
  // Convert to ISO weekday format (1-7, where 1 is Monday, 7 is Sunday)
  return startDay === 0 ? 7 : startDay;
};

export const getFiscalWeekStart = (momentDay, fiscalCalendarData) => {
  const fiscalWeekStartDay = determineFiscalWeekStartDay(fiscalCalendarData);
  // Get the current day's weekday (1-7, where 1 is Monday)
  const currentWeekday = momentDay.isoWeekday();
  // Calculate how many days to subtract to get to the fiscal week start
  let daysToSubtract = (currentWeekday - fiscalWeekStartDay + 7) % 7;
  // If the current day is the fiscal week start day, daysToSubtract will be 0
  // If the current day is after the fiscal week start day, subtract the difference
  return moment(momentDay).subtract(daysToSubtract, "days");
};
