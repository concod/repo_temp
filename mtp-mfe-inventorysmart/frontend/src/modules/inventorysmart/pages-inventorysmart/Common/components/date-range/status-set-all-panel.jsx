import React, { useState } from "react";
import { Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import { Button, DatePicker, Panel } from "impact-ui-v3";
import moment from "moment";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";
import {
  formatDateRangeLabel,
  validateStatusDateRanges,
} from "core/Utils/functions/helpers/validation-helpers";

const API_DATE_FORMAT = "YYYY-MM-DD";

const useStyles = makeStyles(() => ({
  sectionHeader: {
    alignItems: "center",
    display: "flex",
    gap: "0.5rem",
    justifyContent: "space-between",
    marginBottom: "1rem",
  },
  sectionTitle: {
    color: "#1F2B4D",
    fontFamily: "Manrope",
    fontSize: 14,
    fontWeight: 600,
  },
  headerActions: {
    alignItems: "center",
    display: "flex",
    gap: "0.5rem",
  },
  /**
   * One card per date range. Its top padding is the band that the field labels
   * and the delete box are positioned into, matching the exclusions panel.
   */
  rangeCard: {
    alignSelf: "stretch",
    background: "#F5F6FA",
    border: "1px solid #D9DDE7",
    borderRadius: 8,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 12,
    padding: "12px 8px",
    position: "relative",
  },
  rangeCardHeader: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  rangeCardTitle: {
    color: "#1F2B4D",
    fontFamily: "Manrope",
    fontSize: 12,
    fontWeight: 600,
  },
  fieldsRow: {
    alignItems: "flex-end",
    display: "flex",
    flexDirection: "row",
    gap: 12,
  },
  field: {
    flex: "1 1 0",
    minWidth: 135,
  },
  fieldLabel: {
    color: "#60697D",
    display: "block",
    fontFamily: "Manrope",
    fontSize: 12,
    fontWeight: 500,
    lineHeight: "16px",
    marginBottom: 4,
    textTransform: "capitalize",
  },
  /**
   * The exclude rows reserve the same trailing width as the base range row so
   * that both sets of pickers line up down the card.
   */
  exclusionRow: {
    alignItems: "flex-end",
    display: "flex",
    gap: 12,
    marginTop: 8,
  },
  deleteButton: {
    "&.ia-styles.ia-btn": {
      background: "#F8F9FB",
      border: "1px solid #D9DDE7",
      borderRadius: 8,
      height: 32,
      maxHeight: 32,
      minHeight: 32,
      minWidth: 32,
      padding: 8,
      width: 32,
    },
    "& svg": {
      height: 16,
      width: 16,
    },
    "& svg path": {
      fill: "#B4BAC7",
    },
  },
  excludeButton: {
    marginTop: 4,
    "&.ia-styles.ia-btn": {
      color: "#4259EE",
      fontFamily: "Manrope",
      fontSize: 12,
      fontWeight: 500,
      padding: 0,
    },
  },
}));

let keySeed = 0;
const nextKey = (prefix) => {
  keySeed += 1;
  return `${prefix}-${keySeed}`;
};

const createExclusion = () => ({
  key: nextKey("exclude"),
  start_time: null,
  end_time: null,
});

const createRange = () => ({
  key: nextKey("range"),
  start_time: null,
  end_time: null,
  exclusions: [],
});

const toApiRange = (row) => ({
  start_time: row.start_time
    ? moment(row.start_time).format(API_DATE_FORMAT)
    : null,
  end_time: row.end_time ? moment(row.end_time).format(API_DATE_FORMAT) : null,
});

const rangeTitle = (index) =>
  `Date range_${String(index + 1).padStart(2, "0")}`;

/**
 * Set All for status date ranges. Each card is one normal range and owns the
 * exclude ranges that sit inside it, so the three save checks can be run per
 * card before anything is applied. Shared by Product and Store status; the
 * section title is passed in so each screen can label it accordingly.
 */
const StatusSetAllPanel = ({
  open,
  onClose,
  onApply,
  onError,
  title = "Status",
  tenantDateFormat = API_DATE_FORMAT,
  existingRanges = [],
  additionalContainer = null,
  // Single-range callers (e.g. DC status) keep one date range but may still add
  // several exclusion ranges inside it.
  singleRange = false,
}) => {
  const classes = useStyles();
  const [ranges, setRanges] = useState([createRange()]);

  const updateRange = (key, changes) =>
    setRanges((previous) =>
      previous.map((range) =>
        range.key === key ? { ...range, ...changes } : range
      )
    );

  const handleRangeDateChange = (key, field, value) =>
    updateRange(key, { [field]: value });

  const handleAddRange = () =>
    setRanges((previous) => [...previous, createRange()]);

  const handleDeleteRange = (key) =>
    setRanges((previous) => {
      const remaining = previous.filter((range) => range.key !== key);
      // The panel always keeps one card so there is something to fill in
      return remaining.length ? remaining : [createRange()];
    });

  const handleReset = () => setRanges([createRange()]);

  const handleAddExclusion = (rangeKey) =>
    setRanges((previous) =>
      previous.map((range) =>
        range.key === rangeKey
          ? { ...range, exclusions: [...range.exclusions, createExclusion()] }
          : range
      )
    );

  const handleDeleteExclusion = (rangeKey, exclusionKey) =>
    setRanges((previous) =>
      previous.map((range) =>
        range.key === rangeKey
          ? {
              ...range,
              exclusions: range.exclusions.filter(
                (exclusion) => exclusion.key !== exclusionKey
              ),
            }
          : range
      )
    );

  const handleExclusionDateChange = (rangeKey, exclusionKey, field, value) =>
    setRanges((previous) =>
      previous.map((range) =>
        range.key === rangeKey
          ? {
              ...range,
              exclusions: range.exclusions.map((exclusion) =>
                exclusion.key === exclusionKey
                  ? { ...exclusion, [field]: value }
                  : exclusion
              ),
            }
          : range
      )
    );

  const conflictMessage = (failure, label) => {
    const failed = formatDateRangeLabel(failure.range, tenantDateFormat);
    const conflicting = formatDateRangeLabel(failure.conflict, tenantDateFormat);

    if (failure.type === "rangeOverlap") {
      return `${label} (${failed}) overlaps the existing date range ${conflicting}.`;
    }
    if (failure.type === "excludeOverlap") {
      return `Exclude date range ${failed} in ${label} overlaps the exclude date range ${conflicting}.`;
    }
    return `Exclude date range ${failed} must stay within ${label} (${conflicting}).`;
  };

  const getValidationError = () => {
    const incomplete = ranges.find((range) => !range.start_time || !range.end_time);
    if (incomplete) {
      return "Please select a start and end date for every date range.";
    }

    const invertedRange = ranges.find((range) =>
      moment(range.start_time).isAfter(moment(range.end_time), "day")
    );
    if (invertedRange) {
      return "Start date cannot be greater than end date.";
    }

    for (const range of ranges) {
      const incompleteExclusion = range.exclusions.find(
        (exclusion) => !exclusion.start_time || !exclusion.end_time
      );
      if (incompleteExclusion) {
        return "Please select a start and end date for every exclude date range.";
      }
      const invertedExclusion = range.exclusions.find((exclusion) =>
        moment(exclusion.start_time).isAfter(moment(exclusion.end_time), "day")
      );
      if (invertedExclusion) {
        return "Exclude date range start date cannot be greater than end date.";
      }
    }

    // Checks each card against the other cards and against any existing ranges
    // the caller was able to supply.
    for (let index = 0; index < ranges.length; index++) {
      const range = ranges[index];
      const otherRanges = [
        ...ranges
          .filter((item) => item.key !== range.key)
          .map(toApiRange),
        ...(existingRanges || []),
      ];
      const failure = validateStatusDateRanges({
        range: toApiRange(range),
        exclusions: range.exclusions.map(toApiRange),
        otherRanges,
      });
      if (failure) {
        return conflictMessage(failure, rangeTitle(index));
      }
    }

    return null;
  };

  const handleApply = () => {
    const error = getValidationError();
    if (error) {
      onError?.(error);
      return;
    }

    onApply(
      ranges.map((range) => ({
        ...toApiRange(range),
        exclusions: range.exclusions.map(toApiRange),
      }))
    );
  };

  const renderDateField = (label, value, onChange, bounds = {}) => (
    <div className={classes.field}>
      <span className={classes.fieldLabel}>{label}</span>
      <DatePicker
        displayFormat={tenantDateFormat}
        placeholder="Select"
        selectedDate={value ? moment(value) : null}
        setSelectedDate={onChange}
        handleDateChange={onChange}
        showMonthYearSelect
        withPortal
        fullWidth
        {...bounds}
      />
    </div>
  );

  return (
    <Panel
      anchor="right"
      open={open}
      onClose={onClose}
      title="Set all"
      width={466}
      primaryButtonLabel="Apply"
      secondaryButtonLabel="Cancel"
      onPrimaryButtonClick={handleApply}
      onSecondaryButtonClick={onClose}
    >
      <div className={classes.sectionHeader}>
        <Typography className={classes.sectionTitle}>{title}</Typography>
        <div className={classes.headerActions}>
          <Button variant="secondary" size="small" onClick={handleReset}>
            Reset
          </Button>
          {!singleRange && (
            <Button variant="primary" size="small" onClick={handleAddRange}>
              Add date range
            </Button>
          )}
        </div>
      </div>

      {ranges.map((range, index) => {
        const hasBaseRange = Boolean(range.start_time && range.end_time);
        return (
          <div className={classes.rangeCard} key={range.key}>
            <div className={classes.rangeCardHeader}>
              <Typography className={classes.rangeCardTitle}>
                {rangeTitle(index)}
              </Typography>
              {!singleRange && (
                <DeleteActionButton
                  className={classes.deleteButton}
                  size="small"
                  title="Delete date range"
                  onClick={() => handleDeleteRange(range.key)}
                />
              )}
            </div>

            <div className={classes.fieldsRow}>
              {renderDateField("Start Date", range.start_time, (value) =>
                handleRangeDateChange(range.key, "start_time", value)
              )}
              {renderDateField("End Date", range.end_time, (value) =>
                handleRangeDateChange(range.key, "end_time", value)
              )}
            </div>

            <Button
              className={classes.excludeButton}
              variant="url"
              size="small"
              iconPlacement="left"
              icon={<AddCircleIcon />}
              disabled={!hasBaseRange}
              onClick={() => handleAddExclusion(range.key)}
            >
              Exclude Date Range
            </Button>

            {range.exclusions.map((exclusion) => (
              <div className={classes.exclusionRow} key={exclusion.key}>
                {renderDateField(
                  "Start Date",
                  exclusion.start_time,
                  (value) =>
                    handleExclusionDateChange(
                      range.key,
                      exclusion.key,
                      "start_time",
                      value
                    ),
                  {
                    minDate: range.start_time ? moment(range.start_time) : undefined,
                    maxDate: range.end_time ? moment(range.end_time) : undefined,
                  }
                )}
                {renderDateField(
                  "End Date",
                  exclusion.end_time,
                  (value) =>
                    handleExclusionDateChange(
                      range.key,
                      exclusion.key,
                      "end_time",
                      value
                    ),
                  {
                    minDate: range.start_time ? moment(range.start_time) : undefined,
                    maxDate: range.end_time ? moment(range.end_time) : undefined,
                  }
                )}
                <DeleteActionButton
                  className={classes.deleteButton}
                  size="small"
                  title="Delete exclude date range"
                  onClick={() =>
                    handleDeleteExclusion(range.key, exclusion.key)
                  }
                />
              </div>
            ))}
          </div>
        );
      })}

      {additionalContainer}
    </Panel>
  );
};

export default StatusSetAllPanel;
