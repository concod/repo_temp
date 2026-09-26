import React, { useEffect, useMemo, useState } from "react";
import { Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Alert, Button, DatePicker, Panel, Tooltip } from "impact-ui-v3";
import moment from "moment";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";

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
    alignItems: "center",
    color: "#1F2B4D",
    display: "flex",
    fontSize: "0.875rem",
    fontWeight: 600,
    gap: "0.25rem",
  },
  headerActions: {
    alignItems: "center",
    display: "flex",
    gap: "0.5rem",
  },
  infoIcon: {
    color: "#60697D",
    fontSize: "1rem",
  },
  /**
   * Each exclude range is a card. The generous top padding is what the field
   * labels and the delete box are positioned into.
   */
  exclusionCard: {
    alignItems: "flex-start",
    alignSelf: "stretch",
    background: "#F5F6FA",
    border: "1px solid #D9DDE7",
    borderRadius: 8,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 8,
    padding: "30px 8px 12px",
    position: "relative",
  },
  fieldsRow: {
    alignItems: "flex-start",
    display: "flex",
    flexDirection: "row",
    gap: 12,
    height: 32,
    // Leaves room for the delete box pinned at the top right
    width: "calc(100% - 44px)",
  },
  field: {
    flex: "1 1 0",
    height: 32,
    minWidth: 135,
    position: "relative",
  },
  fieldLabel: {
    color: "#60697D",
    fontFamily: "Manrope",
    fontSize: 12,
    fontWeight: 500,
    left: 0,
    lineHeight: "16px",
    position: "absolute",
    textTransform: "capitalize",
    top: -22,
    whiteSpace: "nowrap",
  },
  /**
   * The card lays out as a column, so the delete box is positioned out of flow
   * into the card's top padding. The wrapper owns the positioning because the
   * button itself is wrapped in a tooltip element.
   */
  deleteWrapper: {
    position: "absolute",
    right: 8,
    top: 8,
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
  emptyText: {
    color: "#7A8294",
    fontSize: "0.8125rem",
    padding: "0.5rem 0",
  },
  alertWrapper: {
    marginBottom: "1rem",
  },
}));

let rowKeySeed = 0;
const nextRowKey = () => {
  rowKeySeed += 1;
  return `exclusion-${rowKeySeed}`;
};

const toRows = (exclusions = []) =>
  (exclusions || []).map((item) => ({
    key: nextRowKey(),
    start_time: item?.start_time || null,
    end_time: item?.end_time || null,
  }));

const ExcludeDateRangePanel = ({
  open,
  onClose,
  baseRange,
  exclusions,
  tenantDateFormat,
  onApply,
  onError,
}) => {
  const classes = useStyles();
  const [rows, setRows] = useState([]);
  const [showBaseRangeInfo, setShowBaseRangeInfo] = useState(true);

  useEffect(() => {
    if (open) {
      setRows(toRows(exclusions));
      setShowBaseRangeInfo(true);
    }
  }, [open, exclusions]);

  const formatDate = (value) =>
    value && moment(value).isValid() ? moment(value).format(tenantDateFormat) : "-";

  const baseStart = baseRange?.start ? moment(baseRange.start) : null;
  const baseEnd = baseRange?.end ? moment(baseRange.end) : null;

  const isDirty = useMemo(() => {
    const original = (exclusions || []).map((item) => ({
      start_time: item?.start_time || null,
      end_time: item?.end_time || null,
    }));
    const current = rows.map((row) => ({
      start_time: row.start_time || null,
      end_time: row.end_time || null,
    }));
    return JSON.stringify(original) !== JSON.stringify(current);
  }, [exclusions, rows]);

  const handleAdd = () =>
    setRows((previous) => [
      ...previous,
      { key: nextRowKey(), start_time: null, end_time: null },
    ]);

  const handleReset = () => setRows(toRows(exclusions));

  const handleDelete = (key) =>
    setRows((previous) => previous.filter((row) => row.key !== key));

  const handleDateChange = (key, field, value) =>
    setRows((previous) =>
      previous.map((row) => (row.key === key ? { ...row, [field]: value } : row))
    );

  /**
   * An exclude range only makes sense inside the range it belongs to, so it must
   * be fully contained by the base range's start/end dates.
   */
  const getValidationError = () => {
    for (let index = 0; index < rows.length; index += 1) {
      const { start_time: startTime, end_time: endTime } = rows[index];

      if (!startTime || !endTime) {
        return "Select both dates for every exclude date range.";
      }

      const start = moment(startTime);
      const end = moment(endTime);

      if (!start.isValid() || !end.isValid()) {
        return "Select a valid date for every exclude date range.";
      }

      if (end.isBefore(start, "day")) {
        return "An exclude range's second date must be on or after the first.";
      }

      if (
        (baseStart && start.isBefore(baseStart, "day")) ||
        (baseEnd && end.isAfter(baseEnd, "day"))
      ) {
        return `Exclude ranges must stay within ${formatDate(
          baseRange?.start
        )} - ${formatDate(baseRange?.end)}.`;
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
      rows.map((row) => ({
        start_time: moment(row.start_time).format(API_DATE_FORMAT),
        end_time: moment(row.end_time).format(API_DATE_FORMAT),
      }))
    );
  };

  const isOutsideBaseRange = (day) =>
    Boolean(
      (baseStart && day.isBefore(baseStart, "day")) ||
        (baseEnd && day.isAfter(baseEnd, "day"))
    );

  return (
    <Panel
      anchor="right"
      open={open}
      onClose={onClose}
      title="Exclude date range"
      width={466}
      primaryButtonLabel="Apply"
      secondaryButtonLabel="Cancel"
      onPrimaryButtonClick={handleApply}
      onSecondaryButtonClick={onClose}
    >
      {showBaseRangeInfo && (
        <div className={classes.alertWrapper}>
          <Alert
            severity="info"
            title={`Exclude date range from ${formatDate(
              baseRange?.start
            )} - ${formatDate(baseRange?.end)}.`}
            onClose={() => setShowBaseRangeInfo(false)}
            subtleBackground
          />
        </div>
      )}

      <div className={classes.sectionHeader}>
        <Typography className={classes.sectionTitle}>
          Exclude Date range
          <Tooltip title="Days inside an exclude range are not covered by this date range.">
            <InfoOutlinedIcon className={classes.infoIcon} />
          </Tooltip>
        </Typography>
        <div className={classes.headerActions}>
          {isDirty && (
            <Button size="small" variant="tertiary" onClick={handleReset}>
              Reset
            </Button>
          )}
          <Button size="small" variant="primary" onClick={handleAdd}>
            Add
          </Button>
        </div>
      </div>

      {rows.length === 0 && (
        <Typography className={classes.emptyText}>
          No exclude date ranges added.
        </Typography>
      )}

      {rows.map((row) => (
        <div className={classes.exclusionCard} key={row.key}>
          <div className={classes.fieldsRow}>
            <div className={classes.field}>
              <span className={classes.fieldLabel}>Select Date</span>
              <DatePicker
                displayFormat={tenantDateFormat}
                placeholder="Select"
                selectedDate={row.start_time ? moment(row.start_time) : null}
                setSelectedDate={(value) =>
                  handleDateChange(row.key, "start_time", value)
                }
                handleDateChange={(value) =>
                  handleDateChange(row.key, "start_time", value)
                }
                isOutsideRange={isOutsideBaseRange}
                minDate={baseStart}
                maxDate={baseEnd}
                showMonthYearSelect
                withPortal
                fullWidth
              />
            </div>
            <div className={classes.field}>
              <span className={classes.fieldLabel}>Select Date</span>
              <DatePicker
                displayFormat={tenantDateFormat}
                placeholder="Select"
                selectedDate={row.end_time ? moment(row.end_time) : null}
                setSelectedDate={(value) =>
                  handleDateChange(row.key, "end_time", value)
                }
                handleDateChange={(value) =>
                  handleDateChange(row.key, "end_time", value)
                }
                isOutsideRange={isOutsideBaseRange}
                minDate={baseStart}
                maxDate={baseEnd}
                showMonthYearSelect
                withPortal
                fullWidth
              />
            </div>
          </div>
          <div className={classes.deleteWrapper}>
            <DeleteActionButton
              className={classes.deleteButton}
              size="small"
              title="Delete exclude date range"
              onClick={() => handleDelete(row.key)}
            />
          </div>
        </div>
      ))}
    </Panel>
  );
};

export default ExcludeDateRangePanel;
