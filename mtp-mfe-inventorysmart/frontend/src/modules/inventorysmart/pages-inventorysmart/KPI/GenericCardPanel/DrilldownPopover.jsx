import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import ReactDOM from "react-dom";
import { Typography, CircularProgress } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { AgGridReact } from "ag-grid-react";
import "core/Utils/agGrid/ag-theme-mtp.scss";
import { useStyles } from "./kpi-styles";

const DrilldownPopover = ({ 
  title, 
  data, 
  columnDefs: tcmColumnDefs,
  loading, 
  onClose, 
  anchorPosition 
}) => {
  const classes = useStyles();
  const popoverRef = useRef(null);
  const [adjustedPosition, setAdjustedPosition] = useState(null);

  useEffect(() => {
    if (!anchorPosition) return;
    const POPOVER_WIDTH = 560;
    const POPOVER_HEIGHT = 340;
    const MARGIN = 12;

    let top = anchorPosition.top ?? 0;
    let left = anchorPosition.left ?? 0;

    // Keep within viewport bounds
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (left + POPOVER_WIDTH > vw - MARGIN) {
      left = vw - POPOVER_WIDTH - MARGIN;
    }
    if (left < MARGIN) {
      left = MARGIN;
    }
    if (top + POPOVER_HEIGHT > vh - MARGIN) {
      top = anchorPosition.top - POPOVER_HEIGHT - 8;
    }
    if (top < MARGIN) {
      top = MARGIN;
    }

    setAdjustedPosition({ top, left });
  }, [anchorPosition]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Build AG Grid column definitions from TCM columnDefs (from getColumnsAg)
  const columnDefs = useMemo(() => {
    if (!data?.length || !tcmColumnDefs?.length) return [];

    return tcmColumnDefs.map((col, idx) => ({
      ...col,
      cellStyle: idx === 0
        ? { fontWeight: 500, color: '#394960' }
        : { fontWeight: 600, color: '#1D2B3E', textAlign: 'center' },
      headerClass: idx === 0 ? 'drilldown-header-left' : 'drilldown-header-center',
    }));
  }, [data, tcmColumnDefs]);

  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 110,
    resizable: false,
    suppressMovable: true,
    filter: false,
    suppressMenu: true,
  }), []);

  const onGridReady = useCallback((params) => {
    params.api.sizeColumnsToFit();
  }, []);

  if (!adjustedPosition) return null;

  const popoverContent = (
    <>
      <div className={classes.drilldownOverlay} onClick={onClose} />
      <div
        ref={popoverRef}
        className={classes.drilldownPopover}
        style={{ top: adjustedPosition.top, left: adjustedPosition.left }}
      >
        <div className={classes.drilldownHeader}>
          <Typography className={classes.drilldownTitle}>
            {title}
          </Typography>
          <div className={classes.drilldownCloseBtn} onClick={onClose}>
            <CloseIcon fontSize="small" />
          </div>
        </div>
        <div className={classes.drilldownTableContainer}>
          {loading ? (
            <div className={classes.drilldownLoader}>
              <CircularProgress size={24} />
            </div>
          ) : data && data.length > 0 ? (
            <div className={`ag-theme-alpine ${classes.drilldownAgGrid}`}>
              <AgGridReact
                columnDefs={columnDefs}
                rowData={data}
                defaultColDef={defaultColDef}
                onGridReady={onGridReady}
                domLayout="autoHeight"
                headerHeight={36}
                rowHeight={38}
                suppressHorizontalScroll={true}
                suppressCellFocus={true}
                suppressRowClickSelection={true}
                animateRows={false}
              />
            </div>
          ) : (
            <div className={classes.drilldownLoader}>
              <Typography variant="body2" color="textSecondary">
                No data available
              </Typography>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return ReactDOM.createPortal(popoverContent, document.body);
};

export default DrilldownPopover;
