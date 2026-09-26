import React, { memo, useState, useMemo, useRef } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { Button } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import moment from "moment";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { isEmpty, isEqual } from "lodash";
import { displaySnackMessages } from "../../inventorysmart-utility";
import { isDateRangeConflict } from "core/Utils/functions/helpers/validation-helpers";
import { downloadExcelLink } from "core/Utils/csv-download";


const useStyles = makeStyles(() => ({
  panelWrapper: {
    boxShadow:'0 0 4px 0 rgba(0, 0, 0, 0.12)',
    borderRadius: '8px',
    
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
  },
  panelLabelContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px", // This adds 12px gap between all children
  },
  headerLabel: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#0D152C",
  },
  panelLabel: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#60697D",
  },
  panelActions: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  divider: {
    width: "1px",
    height: "16px",
    backgroundColor: "#D9DDE7",
  },
  linkCell: {
    color: '#0066cc',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  sourceBadge: {
    padding: "2px 8px",
    borderRadius: "1000px",
    fontSize: "12px",
    fontWeight: 500,
    display: "inline-block",
  },
  dcBadge: {
    backgroundColor: "#F6F6F3",
    color: "#8C906A",
  },
  poBadge: {
    backgroundColor: "#E9F7FC",
    color: "#1789A5",
  },
  dc_poBadge: {
    backgroundColor: "#F4F1F9",
    color: "#7552AD",
  },
}));

/**
 * StoreDetailPanel
 *
 * Can be used as:
 * 1. AG Grid master-detail cell renderer (receives params from AG Grid)
 * 2. Standalone component (receives data, columns, and other props directly)
 */
const StoreDetailPanel = (props) => {
  const classes = useStyles();
  const columns =  props?.columns || [];
  // Configure mode props
  const isConfigureMode = props?.isConfigureMode || false;
  const source = props?.source;
  const showConfigureButton = props?.showConfigureButton !== false; // Default true for AG Grid mode
  const downloadLink = useRef();
  // Handle adding a new row
  const handleAddRow = (params) => {
    let isAllDatePresent = true;
    // Read directly from AG Grid's live data to avoid stale closure issues
    params.api.forEachNode((node) => {
      if (!node.data.start_date || !node.data.end_date) {
        isAllDatePresent = false;
      }
    });
    
    if (!isAllDatePresent && !props?.isPartialSetAll) {
       displaySnackMessages(
          "Please provide start date and end date before adding new",
          "error",
          props
        );
      return;
    }
    
    // Pass the source to parent for row creation
    props.onAddRow(source);
  };

  // Handle download
  const handleDownload = () => {
    if (!props.data || props.data.length === 0) {
      displaySnackMessages("No data to download", "error", props);
      return;
    }

    // Get column headers from the columns prop
    const headers = columns.map(col => ({
      label: col.headerName || col.field || col.column_name || col.colId,
      key: col.field || col.column_name || col.colId
    }));

    // Trigger the download
    downloadLink.current.link.click();
  };

  // Handle cell value changes
  const handleCellValueChanged = (params) => {
    let isInputValueSame = false;
    if (moment.isMoment(params.newValue)) {
      isInputValueSame = moment(params.newValue).isSame(params.oldValue);
    } else {
      isInputValueSame = isEqual(params.oldValue, params.newValue);
    }

    let hasConflict = false;
    
    if (!isInputValueSame) {
      let start_date = params.node.data.start_date;
      let end_date = params.node.data.end_date;
      
      // Normalize dates to YYYY-MM-DD since edited values are stored as MM-DD-YYYY
      // and backend/existing rows may have ISO format with time (e.g. "2025-09-10T00:00:00.000Z")
      const normalizeDate = (val) => {
        if (!val) return null;
        // Strip time component if present (e.g. "2025-09-10T00:00:00.000Z" → "2025-09-10")
        // to avoid timezone shifts when formatting
        const dateStr = typeof val === 'string' ? val.split('T')[0] : val;
        // Try strict parsing with known formats
        const strict = moment(dateStr, ["YYYY-MM-DD", "MM-DD-YYYY"], true);
        if (strict.isValid()) return strict.format("YYYY-MM-DD");
        // Fallback: lenient parsing for Date objects, other formats
        const lenient = moment(val);
        if (lenient.isValid()) return lenient.format("YYYY-MM-DD");
        return val;
      };

      // Check if end date is before start date (only when both are set on current row)
      if (start_date && end_date) {
        let normStart = normalizeDate(start_date);
        let normEnd = normalizeDate(end_date);
        if (moment(normEnd, "YYYY-MM-DD").isBefore(moment(normStart, "YYYY-MM-DD"))) {
          displaySnackMessages(
            "To date should be after From Date",
            "error",
            props
          );
          hasConflict = true;
        }
      }
      
      // Check Date range conflicts across ALL rows
      // Read from AG Grid's live node data (not props.data) to include the just-edited value
      // Only include rows that have BOTH dates set
      let start_end_list = [];
      params.api.forEachNode((node) => {
        if (node.data.start_date && node.data.end_date) {
          start_end_list.push({
            start_time: normalizeDate(node.data.start_date),
            end_time: normalizeDate(node.data.end_date),
          });
        }
      });
      
      if (start_end_list.length > 1 && isDateRangeConflict(start_end_list, "YYYY-MM-DD", "[]")) {
        // Conflict Exists
        hasConflict = true;
        displaySnackMessages("Conflicting Dates", "error", props);
      }
      
      let smallerToDateCheck = false;
      start_end_list.forEach((thisDate) => {
        if (
          moment(thisDate.end_time, "YYYY-MM-DD").isBefore(
            moment(thisDate.start_time, "YYYY-MM-DD")
          )
        ) {
          smallerToDateCheck = true;
        }
      });
      
      if (smallerToDateCheck) {
        hasConflict = true;
        displaySnackMessages(
          "To date should be after From Date",
          "error",
          props
        );
      }
    }
    
    // Pass params to parent with conflict status
    if (props.onCellValueChanged) {
      params.hasConflict = hasConflict;
      props.onCellValueChanged(params);
    }
  };



  // Transform columns for configure mode
  const transformedColumns = useMemo(() => {
    // Read-only mode: only format date columns for display, leave others as-is
    if (!isConfigureMode) {
      return columns.map((column) => {
        const field = column.field || column.colId;
        const isDateField = field && (
          field.toLowerCase().includes('start_date') ||
          field.toLowerCase().includes('end_date')
        );
        if (!isDateField) return column;
        return {
          ...column,
          valueFormatter: (params) => {
            const val = params.value;
            if (!val) return "-";
            const parsed = moment(val, ["YYYY-MM-DD", "MM-DD-YYYY", "DD-MM-YYYY"], true);
            return parsed.isValid() ? parsed.format("MM-DD-YYYY") : val;
          },
        };
      });
    }

    // Configure mode: make fields editable
    const mapped = columns.map((column) => {
      const field = column.field || column.colId;

      // Check if this is a date field
      const isDateField = field && (
        field.toLowerCase().includes('start_date') ||
        field.toLowerCase().includes('end_date')
      );

      if (isDateField) {
        // Make date fields editable with date picker using CellRenderers
        const item = {
          ...column,
          cellRenderer: (cellProps, extraProps) => {
            return (
              <CellRenderers
                cellData={cellProps}
                column={item}
                extraProps={extraProps}
              />
            );
          },
        };
        return item;
      } else {
        // Make other fields editable and look like links using CellRenderers
        const item = {
          ...column,
          type: "link",
          is_editable: true,
          cellRenderer: (cellProps, extraProps) => {
            return (
              <CellRenderers
                cellData={cellProps}
                column={item}
                extraProps={extraProps}
              />
            );
          },
        };

        // Set onClick directly on the item, matching dCStoreStrategyTable pattern
        item.onClick = (tableInfo) => {
          const fieldName = column.field || column.colId || column.column_name;
          const fieldValue = tableInfo?.cellData?.data?.[fieldName];
          const parentData = tableInfo?.cellData?.data;
          if (props?.onFieldClick) {
            props.onFieldClick(fieldName, fieldValue, parentData);
          }
        };

        return item;
      }
    });

    // Add Action column at the end, pinned to right
    const actionColumn = {
      headerName: "",
      disableSortBy: true,
      isFixed: true,
      minWidth: 75,
      width: 75,
      sticky: "right",
      isFrozen: true,
      pinned: "right",
      suppressMenu: true,
      cellRenderer: (params, extraProps) => {
        const rowIndex = params.rowIndex;
        const isFirstRow = rowIndex === 0;
        if (isFirstRow) {
          return (
            <Button
              variant="tertiary"
              onClick={() => handleAddRow(params)}
              title="Add"
              size="large"
              disabled={params.api.getDisplayedRowCount() > 2}
            >
              <AddIcon fontSize="small"></AddIcon>
            </Button>
          );
        } else {
          return (
            <Button
              variant="tertiary"
              onClick={() => props.onDeleteRow(params.data.id)}
              title="Delete"
              size="large"
            >
              <DeleteIcon fontSize="small"></DeleteIcon>
            </Button>
          );
        }
      },
    };

    return [...mapped, actionColumn];
  }, [columns, isConfigureMode]); 


  const tableHeader = () => {
    return (
          <div className={classes.panelHeader}>
            <div className={classes.panelLabelContainer}>
              <span className={classes.panelLabel}>
                Source : {props?.source === "po" ? "PO" : props?.source === "dc" ? "DC" : "DC + PO"}
              </span>
            </div>
          </div>
    );
  };

  return (
    <div className={classes.panelWrapper}>
      <AgGridComponent
        tableHeader={(!props?.isPartialSetAll && !props?.hideTableHeader)?  tableHeader() : null}
        rowdata={JSON.parse(JSON.stringify(props?.data))}
        // rowdata={props?.data}
        columns={transformedColumns}
        pagination={false}   
        rowModelType={undefined}
        adjustTableHeight={true}
        suppressClickEdit={!isConfigureMode}
        cardContainer={false}
        showDownloadButton={true}
        onDownloadButtonClick={handleDownload}
        uniqueRowId={"id"}
        loadTableInstance={props?.loadTableInstance}
        onCellValueChanged={handleCellValueChanged}
      />
      
      {/* Hidden CSV download link */}
      {downloadExcelLink(
        props.data,
        `store-details-${source}`,
        downloadLink,
        columns.map(col => ({
          label: col.headerName || col.field || col.column_name || col.colId,
          key: col.field || col.column_name || col.colId
        }))
      )}
    </div>
  );
};

export default StoreDetailPanel;
