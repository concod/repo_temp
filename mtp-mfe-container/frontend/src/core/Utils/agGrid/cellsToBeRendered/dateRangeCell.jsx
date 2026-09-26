import React from "react";
import moment from "moment";
import { makeStyles } from "@mui/styles";
import { Button, DatePicker } from "impact-ui-v3";
import { pxToRem } from "core/Utils/functions/utils";
import colours from "core/Styles/colours";
import { DEFAULT_DATE_RANGE_KEYS } from "core/Utils/agGrid/constants";

const useStyles = makeStyles(() => ({
  container: {
    alignItems: "center",
    display: "flex",
    gap: pxToRem(8),
    height: "100%",
    maxHeight: "100%",
    width: "100%",
  },
  /**
   * The two pickers plus the exclusions button are wider than the column, so the
   * editable row scrolls horizontally instead of clipping its content.
   */
  editableContainer: {
    boxSizing: "border-box",
    maxHeight: pxToRem(52),
    minHeight: pxToRem(30),
    overflowX: "auto",
    overflowY: "hidden",
    padding: pxToRem(3),
    scrollbarWidth: "thin",
    "&:hover": {
      background: colours.backgroundChat,
    },
    "&::-webkit-scrollbar": {
      height: pxToRem(6),
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: colours.lightGrey,
      borderRadius: pxToRem(3),
    },
    "&::-webkit-scrollbar-track": {
      backgroundColor: "transparent",
    },
  },
  summaryLabel: {
    flex: "1 1 auto",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  inactiveBadge: {
    color: colours.orangePeel,
    flex: "0 0 auto",
    fontSize: pxToRem(11),
    lineHeight: pxToRem(16),
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  },
  /**
   * The field is capped at 32px so it stays inside the row, whose height is
   * driven by the table's content density setting rather than by this cell.
   */
  picker: {
    flex: "1 1 0",
    maxHeight: pxToRem(32),
    minWidth: pxToRem(135),
    "& input": {
      color: colours.cloudBurst,
      fontFamily: "Manrope",
      fontSize: pxToRem(14),
      fontWeight: 500,
      lineHeight: pxToRem(20),
      maxHeight: "100%",
      minHeight: 0,
      paddingBottom: 0,
      paddingTop: 0,
    },
  },
  /**
   * The label switches between "Exclude" and "Excluded(n)", so the width is
   * fixed to keep the date fields the same size on every row.
   */
  exclusionsButton: {
    flex: "0 0 auto",
    whiteSpace: "nowrap",
    "&.ia-styles.ia-btn": {
      color: colours.brightRoyalBlue,
      fontFamily: "Manrope",
      fontSize: pxToRem(14),
      fontWeight: 500,
      gap: pxToRem(2),
      justifyContent: "flex-start",
      lineHeight: pxToRem(20),
      padding: 0,
      textTransform: "capitalize",
      width: pxToRem(110),
    },
    "& svg": {
      height: 16,
      width: 16,
    },
  },
}));

export const getDateRangeKeys = (colDef) => {
  const customLabels = colDef?.extra?.labels || {};
  return {
    rangeKey: colDef?.extra?.rangeKey || DEFAULT_DATE_RANGE_KEYS.rangeKey,
    startKey: colDef?.extra?.rangeStartKey || DEFAULT_DATE_RANGE_KEYS.startKey,
    endKey: colDef?.extra?.rangeEndKey || DEFAULT_DATE_RANGE_KEYS.endKey,
    exclusionsKey:
      colDef?.extra?.exclusionsKey || DEFAULT_DATE_RANGE_KEYS.exclusionsKey,
    // Flat, single-range tables carry their one range on the top-level row, so
    // the pickers must render at level 0 instead of on expanded child rows.
    rootEditable: Boolean(colDef?.extra?.rootEditable),
    labels: {
      noRanges: customLabels.noRanges || DEFAULT_DATE_RANGE_KEYS.labels.noRanges,
      inactive: customLabels.inactive || DEFAULT_DATE_RANGE_KEYS.labels.inactive,
      multipleRanges:
        customLabels.multipleRanges ||
        DEFAULT_DATE_RANGE_KEYS.labels.multipleRanges,
    },
  };
};

/**
 * A record's ranges live either in an array on the row, or - when the record has
 * a single range - flattened onto the row itself by the table data formatter.
 */
export const getDateRanges = (data, keys) => {
  const ranges = data?.[keys.rangeKey];
  if (Array.isArray(ranges) && ranges.length) {
    return ranges;
  }
  if (data?.[keys.startKey] || data?.[keys.endKey]) {
    return [data];
  }
  return [];
};

const DateRangeCell = (props) => {
  const classes = useStyles();
  const {
    data,
    colDef,
    node,
    tenantDateFormat,
    onDateRangeChange,
    onExclusionsClick,
    isDisabled,
  } = props;

  const keys = getDateRangeKeys(colDef);
  const formatDate = (value) =>
    value && moment(value).isValid() ? moment(value).format(tenantDateFormat) : "-";

  // Child rows represent a single range and are editable. Flat tables opt in
  // via rootEditable so their level-0 rows expose the same pickers.
  if (node?.level !== 0 || keys.rootEditable) {
    const exclusions = data?.[keys.exclusionsKey] || [];
    return (
      <div className={`${classes.container} ${classes.editableContainer}`}>
        <div className={classes.picker}>
          <DatePicker
            id={`date-range-start-${node?.id}`}
            displayFormat={tenantDateFormat}
            placeholder="From"
            selectedDate={
              data?.[keys.startKey] ? moment(data[keys.startKey]) : null
            }
            setSelectedDate={(value) =>
              onDateRangeChange?.(node, keys.startKey, value)
            }
            handleDateChange={(value) =>
              onDateRangeChange?.(node, keys.startKey, value)
            }
            isDisabled={isDisabled}
            showMonthYearSelect
            withPortal
            fullWidth
            isAgGridCellRenderer
          />
        </div>
        <div className={classes.picker}>
          <DatePicker
            id={`date-range-end-${node?.id}`}
            displayFormat={tenantDateFormat}
            placeholder="To"
            selectedDate={data?.[keys.endKey] ? moment(data[keys.endKey]) : null}
            setSelectedDate={(value) =>
              onDateRangeChange?.(node, keys.endKey, value)
            }
            handleDateChange={(value) =>
              onDateRangeChange?.(node, keys.endKey, value)
            }
            isDisabled={isDisabled}
            showMonthYearSelect
            withPortal
            fullWidth
            isAgGridCellRenderer
          />
        </div>
        {onExclusionsClick && (
          <Button
            size="small"
            variant="url"
            className={classes.exclusionsButton}
            disabled={isDisabled}
            onClick={() => onExclusionsClick(node)}
          >
            {exclusions.length ? `Excluded(${exclusions.length})` : "Exclude"}
          </Button>
        )}
      </div>
    );
  }

  // Collapsed rows summarise how many ranges the record has.
  const ranges = getDateRanges(data, keys);

  if (!ranges.length) {
    return (
      <div className={classes.container}>
        <span className={classes.summaryLabel}>{keys.labels.noRanges}</span>
        <span className={classes.inactiveBadge}>{keys.labels.inactive}</span>
      </div>
    );
  }

  if (ranges.length > 1) {
    return (
      <div className={classes.container}>
        <span className={classes.summaryLabel}>
          {keys.labels.multipleRanges(ranges.length)}
        </span>
      </div>
    );
  }

  return (
    <div className={classes.container}>
      <span className={classes.summaryLabel}>
        {`${formatDate(ranges[0][keys.startKey])} - ${formatDate(
          ranges[0][keys.endKey]
        )}`}
      </span>
    </div>
  );
};

export default DateRangeCell;
