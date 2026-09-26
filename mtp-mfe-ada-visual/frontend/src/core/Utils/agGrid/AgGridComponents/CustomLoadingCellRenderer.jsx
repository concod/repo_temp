import Skeleton from "@mui/material/Skeleton";
import { useState, useEffect, useCallback } from "react";
import makeStyles from "@mui/styles/makeStyles";
import { SKELETON_ROW_COUNT, DEFAULT_ROW_HEIGHT, SKELETON_LOADER_HEIGHT } from '../constants'
import { pxToRem } from "core/Utils/functions/utils";

const useStyles = makeStyles((theme) => ({
  skeletonRow: {
    display: "flex",
    height: DEFAULT_ROW_HEIGHT,
    borderBottom: `1px solid ${theme?.palette?.colours?.agCellBorder}`,
  },
  skeletonCell: {
    display: "flex",
    alignItems: "center",
    padding: `0 ${pxToRem(8)}`,
    boxSizing: "border-box",
    borderRight: `1px solid ${theme?.palette?.colours?.agCellBorder}`,
  },
  positionAbsolute:{
    position:"absolute",
  }
}));

const CustomLoadingCellRenderer = (props) => {
  const { api, columnApi, isClientSideTable = false} = props;
  const classes = useStyles();

  const getColumnWidths = useCallback(() => {
    if (!columnApi) return [];
    const allColumns = columnApi.getAllDisplayedColumns() || [];
    return allColumns.map((col) => ({
      colId: col.getColId(),
      width: col.getActualWidth(),
    }));
  }, [columnApi]);

  const [columns, setColumns] = useState(getColumnWidths);

  useEffect(() => {
    if (!api) return;
    const onColumnResized = () => {
      setColumns(getColumnWidths());
    };
    api.addEventListener("columnResized", onColumnResized);
    return () => {
      api.removeEventListener("columnResized", onColumnResized);
    };
  }, [api, getColumnWidths]);

  return (
    <div className={isClientSideTable && classes.positionAbsolute + ` ag-client-side-loader`}>
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, rowIndex) => (
        <div key={"ag-skeleton-row-"+rowIndex} className={classes.skeletonRow}>
          {columns?.map((col, index) => (
            <div
              key={"ag-skeleton-cell-"+col.colId+"-"+index}
              className={classes.skeletonCell}
              style={{ width: col?.width, minWidth: col?.width }}
            >
              <Skeleton width={col?.width} height={SKELETON_LOADER_HEIGHT} animation="wave" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default CustomLoadingCellRenderer;
