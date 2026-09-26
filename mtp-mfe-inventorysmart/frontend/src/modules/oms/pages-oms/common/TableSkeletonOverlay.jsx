import Skeleton from "@mui/material/Skeleton";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useCallback, useEffect, useMemo, useState } from "react";
import makeStyles from "@mui/styles/makeStyles";
import { DEFAULT_ROW_HEIGHT, SKELETON_LOADER_HEIGHT, NUMBER_CELL_TYPES } from "core/Utils/agGrid/constants";
import { pxToRem } from "core/Utils/functions/utils";

const HEADER_ROW_HEIGHT = 40;
const CHECKBOX_COLUMN_WIDTH = 56;
const HEADER_BORDER_COLOR = "#c3c8d4";
const GROUP_HEADER_STRIP_COLOR_EVEN = "#ad97ce";
const GROUP_HEADER_STRIP_COLOR_ODD = "#e1bc29";

const useStyles = makeStyles((/** @type {any} */ theme) => ({
    wrapper: {
      position: "relative",
      width: "100%",
    },
    overlay: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 700,
      background: "#fff",
      borderRadius: 8,
      boxShadow: "0px 0px 4px 0px rgba(171,171,171,0.25)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    },
    rowsList: {
      flex: 1,
      overflow: "hidden",
    },
    toolbarRow: {
      display: "flex",
      alignItems: "center",
      height: 60,
      flexShrink: 0,
      padding: `12px 16px 16px 16px`,
      fontSize: pxToRem(14),
      fontWeight: 700,
      borderBottom: `1px solid ${theme?.palette?.colours?.agCellBorder}`,
    },
    headerRow: {
      display: "flex",
      flexShrink: 0,
      background: "#f5f6fa",
    },
    headerGroupCell: {
      display: "flex",
      flexDirection: "column",
      boxSizing: "border-box",
      borderRight: `1px solid ${HEADER_BORDER_COLOR}`,
    },
    headerChildrenRow: {
      display: "flex",
      flex: 1,
    },
    skeletonHeaderCell: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: `0 ${pxToRem(20)}`,
      boxSizing: "border-box",
      fontWeight: 700,
      fontSize: pxToRem(14),
    },
    checkboxCell: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxSizing: "border-box",
      flexShrink: 0,
      borderRight: `1px solid ${HEADER_BORDER_COLOR}`,
    },
    skeletonRow: {
      display: "flex",
      height: DEFAULT_ROW_HEIGHT,
      flexShrink: 0,
      borderBottom: `1px solid ${theme?.palette?.colours?.agCellBorder}`,
    },
    skeletonCell: {
      display: "flex",
      alignItems: "center",
      padding: `0 ${pxToRem(8)}`,
      boxSizing: "border-box",
      borderRight: `1px solid ${theme?.palette?.colours?.agCellBorder}`,
    },
    headerCellText: {
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    groupChevron: {
      fontSize: pxToRem(18),
      marginLeft: 2,
      flexShrink: 0,
    },
    footerRow: {
      display: "flex",
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "space-between",
      height: 54,
      padding: `0 ${pxToRem(16)}`,
      boxSizing: "border-box",
      borderTop: `1px solid ${theme?.palette?.colours?.agCellBorder}`,
    },
  })
);

/**
 * @param {any} instance
 */
const resolveGridInstance = (instance) =>
  instance && Object.prototype.hasOwnProperty.call(instance, "current")
    ? instance.current
    : instance;

/** @param {any} col */
const isColumnHidden = (col) => Boolean(col?.is_hidden || col?.hide);

/** @param {number} index */
const getGroupHeaderStripColor = (index) =>
  (index + 1) % 2 === 1 ? GROUP_HEADER_STRIP_COLOR_ODD : GROUP_HEADER_STRIP_COLOR_EVEN;

const RIGHT_ALIGN_OVERRIDE_CLASS_PATTERN = /(?:^|\s)(?:number-cell|flex-reverse-column|flex-reverse-cell|ag-right-aligned-header|ag-right-aligned-cell)(?:\s|$)/;

/** @param {any} col */
const hasRightAlignOverride = (col) => {
  const classNames = ` ${col?.headerClass || ""} ${col?.cellClass || ""} ${col?.extra?.headerClass || ""} `;
  return RIGHT_ALIGN_OVERRIDE_CLASS_PATTERN.test(classNames);
};

/** @param {any} col */
const getHeaderJustifyContent = (col) =>
  hasRightAlignOverride(col) || NUMBER_CELL_TYPES.includes(col?.type || "")
    ? "flex-end"
    : "flex-start";

/**
 * @param {any} col
 * @param {number} index
 * @param {Record<string, number>} widthByColId
 */
const buildColumnNode = (col, index, widthByColId) => {
  const colId = col?.colId || col?.field || col?.column_name || `sk-col-${index}`;
  if (col?.children?.length) {
    const isOpen =
      Boolean(col?.openByDefault) ||
      col.children.some((/** @type {any} */ child) => child?.extra?.defaultColumnGroupExpand);
    const isCollapsible = col.children.some((/** @type {any} */ child) => {
      const show = child?.columnGroupShow || child?.extra?.columnGroupShow;
      return show === "open" || show === "closed";
    });
    const visibleChildren = col.children.filter((/** @type {any} */ child) => {
      if (isColumnHidden(child)) return false;
      const show = child?.columnGroupShow || child?.extra?.columnGroupShow;
      if (show === "open") return isOpen;
      if (show === "closed") return !isOpen;
      return true;
    });
    return {
      colId,
      headerName: col?.headerName || col?.Header,
      collapsible: isCollapsible,
      children: visibleChildren.map((/** @type {any} */ child, /** @type {number} */ childIndex) =>
        buildColumnNode(child, childIndex, widthByColId)
      ),
    };
  }
  return {
    colId,
    headerName: col?.headerName || col?.Header,
    width: widthByColId[colId],
    type: col?.type,
    headerClass: col?.headerClass,
    cellClass: col?.cellClass,
    extra: col?.extra,
  };
};

/**
 * @param {any[]} nodes
 * @returns {any[]}
 */
const flattenLeaves = (nodes) =>
  nodes.reduce((/** @type {any[]} */ acc, /** @type {any} */ node) => {
    if (node.children?.length) return acc.concat(flattenLeaves(node.children));
    acc.push(node);
    return acc;
  }, /** @type {any[]} */([]));

/**
 * @param {Object} props
 * @param {import("react").MutableRefObject<any>} [props.agGridInstance] The AG Grid ref itself (e.g. `DeliveryLeadTableGridInstance`, not `.current`) - used to mirror real column widths/names once the grid mounts behind this overlay.
 * @param {any[]} [props.columnDefs] Column config (e.g. the same array passed as `AgGridComponent`'s `columns` prop) used to show real header names/groups before the grid has mounted.
 * @param {number} props.rows
 * @param {number} props.columns Fallback column count used only when neither `agGridInstance` nor `columnDefs` have produced any columns yet.
 * @param {string} [props.title] Same text as the AgGridComponent's `tableHeader` prop.
 * @param {boolean} [props.showSelectAllColumn] Pass the same value as `AgGridComponent`'s `selectAllHeaderComponent` prop to render the left-pinned checkbox column.
 */
const SkeletonTable = ({ rows, columns, agGridInstance, columnDefs, title, showSelectAllColumn }) => {
  const classes = useStyles();

  const [gridInstance, setGridInstance] = useState(() => {
    const resolved = resolveGridInstance(agGridInstance);
    return resolved?.api ? resolved : null;
  });

  useEffect(() => {
    if (gridInstance) return undefined;
    const interval = setInterval(() => {
      const resolved = resolveGridInstance(agGridInstance);
      if (resolved?.api) {
        setGridInstance(resolved);
        clearInterval(interval);
      }
    }, 150);
    return () => clearInterval(interval);
  }, [agGridInstance, gridInstance]);

  const api = gridInstance?.api;
  const columnApi = gridInstance?.columnApi;

  const getColumnWidths = useCallback(() => {
    const allColumns = columnApi?.getAllDisplayedColumns?.() || [];
    return allColumns.map((/** @type {any} */ col) => ({
      colId: col.getColId(),
      width: col.getActualWidth(),
      headerName: col.getColDef?.()?.headerName,
      type: col.getColDef?.()?.type,
      headerClass: col.getColDef?.()?.headerClass,
      cellClass: col.getColDef?.()?.cellClass,
    }));
  }, [columnApi]);

  const [columnWidths, setColumnWidths] = useState(getColumnWidths);

  useEffect(() => {
    setColumnWidths(getColumnWidths());
  }, [getColumnWidths]);

  useEffect(() => {
    if (!api) return undefined;
    const onColumnsChanged = () => setColumnWidths(getColumnWidths());
    api.addEventListener("columnResized", onColumnsChanged);
    api.addEventListener("displayedColumnsChanged", onColumnsChanged);
    return () => {
      api.removeEventListener("columnResized", onColumnsChanged);
      api.removeEventListener("displayedColumnsChanged", onColumnsChanged);
    };
  }, [api, getColumnWidths]);

  const widthByColId = useMemo(() => {
    /** @type {Record<string, number>} */
    const map = {};
    columnWidths?.forEach((/** @type {any} */ col) => {
      map[col.colId] = col.width;
    });
    return map;
  }, [columnWidths]);

  const columnTree = useMemo(() => {
    if (columnDefs?.length) {
      return columnDefs
        .filter((/** @type {any} */ col) => !isColumnHidden(col))
        .map((/** @type {any} */ col, /** @type {number} */ index) => buildColumnNode(col, index, widthByColId));
    }
    if (columnWidths?.length) {
      return columnWidths.map((/** @type {any} */ col) => ({
        colId: col.colId,
        headerName: col.headerName,
        width: col.width,
        type: col.type,
        headerClass: col.headerClass,
        cellClass: col.cellClass,
      }));
    }
    return Array.from({ length: columns || 0 }, (_, index) => ({ colId: `sk-col-${index}` }));
  }, [columnDefs, columnWidths, columns, widthByColId]);

  const leafColumns = useMemo(() => flattenLeaves(columnTree), [columnTree]);
  const hasGroups = columnTree.some((/** @type {any} */ node) => node.children?.length);

  const renderHeaderCellContent = (/** @type {any} */ col) =>
    col?.headerName ? (
      <span className={classes.headerCellText}>{col.headerName}</span>
    ) : (
      <Skeleton width={col?.width || "60%"} height={SKELETON_LOADER_HEIGHT} animation="pulse" />
    );

  return (
    <>
      {title && <div className={classes.toolbarRow}>{title}</div>}
      <div className={classes.headerRow} style={{ height: hasGroups ? HEADER_ROW_HEIGHT * 2 : HEADER_ROW_HEIGHT }}>
        {showSelectAllColumn && (
          <div
            className={classes.checkboxCell}
            style={{ width: CHECKBOX_COLUMN_WIDTH, minWidth: CHECKBOX_COLUMN_WIDTH, height: "100%" }}
          >
            <Skeleton variant="rectangular" width={16} height={16} />
          </div>
        )}
        {columnTree.map((/** @type {any} */ col, /** @type {number} */ index) => {
          const hasChildren = col.children?.length > 0;
          const allChildWidthsKnown = hasChildren && col.children.every((/** @type {any} */ c) => c.width);
          const groupWidth = hasChildren ? (allChildWidthsKnown ? col.children.reduce((/** @type {number} */ s, /** @type {any} */ c) => s + c.width, 0) : undefined) : col.width;
          const isLast = index === columnTree.length - 1;
          return (
            <div
              key={`sk-header-col-${col.colId}-${index}`}
              className={classes.headerGroupCell}
              style={{
                width: groupWidth,
                minWidth: groupWidth,
                flex: groupWidth ? undefined : 1,
                height: "100%",
                borderRight: isLast ? "none" : undefined,
              }}
            >
              {hasChildren ? (
                <>
                  <div className={classes.skeletonHeaderCell} style={{
                    height: HEADER_ROW_HEIGHT,
                    borderBottom: `2px solid ${getGroupHeaderStripColor(index)}`
                  }}>
                    {renderHeaderCellContent(col)}
                    {col.collapsible && <ChevronRightIcon className={classes.groupChevron} />}
                  </div>
                  <div className={classes.headerChildrenRow}>
                    {col.children.map((/** @type {any} */ child, /** @type {number} */ childIndex) => (
                      <div
                        key={`sk-header-child-${child.colId}-${childIndex}`}
                        className={classes.skeletonHeaderCell}
                        style={{
                          width: child.width,
                          minWidth: child.width,
                          flex: child.width ? undefined : 1,
                          height: "100%",
                          borderRight: childIndex === col.children.length - 1 ? "none" : `1px solid ${HEADER_BORDER_COLOR}`,
                          justifyContent: getHeaderJustifyContent(child),
                        }}
                      >
                        {renderHeaderCellContent(child)}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div
                  className={classes.skeletonHeaderCell}
                  style={{ height: "100%", justifyContent: getHeaderJustifyContent(col) }}
                >
                  {renderHeaderCellContent(col)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className={classes.rowsList}>
        {Array.from({ length: rows || 0 }).map((_, rowIndex) => (
          <div key={`sk-row-${rowIndex}`} className={classes.skeletonRow}>
            {showSelectAllColumn && (
              <div className={classes.checkboxCell} style={{ width: CHECKBOX_COLUMN_WIDTH, minWidth: CHECKBOX_COLUMN_WIDTH }}>
                <Skeleton variant="rectangular" width={16} height={16} />
              </div>
            )}
            {leafColumns.map((/** @type {any} */ col, /** @type {number} */ index) => (
              <div
                key={`sk-cell-${rowIndex}-${col.colId}-${index}`}
                className={classes.skeletonCell}
                style={{ width: col?.width, minWidth: col?.width, flex: col?.width ? undefined : 1 }}
              >
                <Skeleton width={col?.width || "85%"} height={SKELETON_LOADER_HEIGHT} animation="pulse" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className={classes.footerRow}>
        <Skeleton width={120} height={SKELETON_LOADER_HEIGHT} animation="pulse" />
        <Skeleton width={160} height={SKELETON_LOADER_HEIGHT} animation="pulse" />
      </div>
    </>
  );
};

/**
 * @param {Object} props
 * @param {boolean} props.loading
 * @param {import("react").ReactNode} props.children
 * @param {number|string} [props.minHeight]
 * @param {number|string} [props.height]
 * @param {number} [props.rows]
 * @param {number} [props.columns]
 * @param {import("react").MutableRefObject<any>} [props.agGridInstance] Pass the AG Grid ref itself (e.g. `DeliveryLeadTableGridInstance`), not `.current`.
 * @param {any[]} [props.columnDefs] Same array passed as AgGridComponent's `columns` prop, used to show real header names/groups before the grid has mounted.
 * @param {string} [props.title] Pass the same text used for AgGridComponent's `tableHeader` prop so it doesn't disappear while loading.
 * @param {boolean} [props.showSelectAllColumn] Pass the same value as AgGridComponent's `selectAllHeaderComponent` prop so the left-pinned checkbox column doesn't disappear while loading.
 */
const TableSkeletonOverlay = ({
  loading,
  children,
  minHeight = 260,
  height,
  rows = 30,
  columns = 7,
  agGridInstance,
  columnDefs,
  title,
  showSelectAllColumn,
}) => {
  const classes = useStyles();

  return (
    <div
      className={classes.wrapper}
      style={loading ? { minHeight, height } : undefined}
    >
      {children}
      {loading && (
        <div className={classes.overlay}>
          <SkeletonTable
            rows={rows}
            columns={columns}
            agGridInstance={agGridInstance}
            columnDefs={columnDefs}
            title={title}
            showSelectAllColumn={showSelectAllColumn}
          />
        </div>
      )}
    </div>
  );
};

export default TableSkeletonOverlay;
