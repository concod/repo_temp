import React, { useCallback, useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import makeStyles from "@mui/styles/makeStyles";
import RedWarningIcon from "assets/redWarning14.svg";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { getStoreCapacityStoreDetail } from "modules/inventorysmart/services-inventorysmart/Finalize/store-capacity-service";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getIgnoreAllocationCode } from "../../../Create-Allocation/helperFunctions";
import StoreCapacityPopup from "../StoreCapacityPopup";

const GROUP_COLUMN_NAMES = ["l0_name", "division", "l1_name"];

const L0NameInnerRenderer = ({ value, data }) => {
  const classes = useDetailStyles();
  const label = value ?? data?.l0_name ?? "";
  const showWarning = Number(data?.net_capacity) < 0;

  return (
    <div className={classes.l0NameCell}>
      <span className={classes.l0NameLabel}>{label}</span>
      {showWarning ? (
        <span className={classes.l0NameWarning}>
          <RedWarningIcon />
        </span>
      ) : null}
    </div>
  );
};

const useDetailStyles = makeStyles({
  l0NameCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 8,
  },
  l0NameLabel: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "#1f2b4d",
    fontSize: 14,
    fontWeight: 500,
    lineHeight: "20px",
    textTransform: "capitalize",
  },
  l0NameWarning: {
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
  },
  hierarchyTable: {
    "& .ag-cell-wrapper": {
      display: "flex",
      alignItems: "center",
      width: "100%",
    },
    "& .ag-group-value": {
      flex: 1,
      minWidth: 0,
      overflow: "hidden",
    },
  },
  // need to remove after v36 migration
  pinnedColsOverride: {
    "& .ia-basic-table-layout.table-v32 .ag-pinned-left-cols-container": {
      borderRight: "none !important",
      boxShadow: "none !important",
      zIndex: "0 !important",
    },
    "& .ia-basic-table-layout.table-v32 .ag-pinned-left-header": {
      borderRight: "none !important",
      boxShadow: "none !important",
    },
  },
  // need to remove after v36 migration
  articleDetailWrapper: {
    padding: "16px",
    "& .ia-basic-table-layout.table-v32 .ag-pinned-left-cols-container": {
      borderRight: "none !important",
      boxShadow: "none !important",
      zIndex: "0 !important",
    },
    "& .ia-basic-table-layout.table-v32 .ag-pinned-left-header": {
      borderRight: "none !important",
      boxShadow: "none !important",
    },
  },
});

const prepareArticleConfig = (config = []) =>
  config.map((item) => {
    if (item.column_name === "allocated_qty") {
      return { ...item, type: "link", is_editable: true };
    }
    if (item.sub_headers?.length) {
      return {
        ...item,
        sub_headers: item.sub_headers.map((sub) =>
          sub.column_name === "allocated_qty"
            ? { ...sub, type: "link", is_editable: true }
            : sub
        ),
      };
    }
    return item;
  });

const buildArticleColumns = (config, onLinkClick) => {
  const columns = agGridColumnFormatter(prepareArticleConfig(config), null) || [];
  columns.forEach((item) => {
    if (item.sub_headers?.length) {
      item.sub_headers.forEach((col) => {
        if (col.type === "link" || col.column_name === "allocated_qty") {
          col.onClick = onLinkClick;
        }
      });
    }
    if (item.type === "link" || item.column_name === "allocated_qty") {
      item.onClick = onLinkClick;
    }
  });
  return columns;
};

const formatHierarchyColumns = (config) => {
  const formatted = agGridColumnFormatter(config, null) || [];
  const groupCol =
    formatted.find((col) =>
      GROUP_COLUMN_NAMES.includes(col.column_name || col.field)
    ) || formatted[0];
  const groupColName = groupCol?.column_name || groupCol?.field;

  return formatted.map((col) => {
    const colName = col.column_name || col.field;
    if (colName === groupColName) {
      const groupCol = {
        ...col,
        cellRenderer: "agGroupCellRenderer",
        cellStyle: {
          ...(typeof col.cellStyle === "object" ? col.cellStyle : {}),
          display: "flex",
          alignItems: "center",
          overflow: "visible",
        },
      };
      if (colName === "l0_name") {
        groupCol.cellRendererParams = {
          innerRenderer: (params) => (
            <L0NameInnerRenderer
              value={params.value}
              data={params.data ?? params.node?.data}
            />
          ),
        };
      }
      return groupCol;
    }
    return col;
  });
};

const StoreCapacityDetailTable = ({
  storeCode,
  allocationCode,
  articles,
  originalAllocationCode,
  planType,
  getStoreCapacityStoreDetail: fetchStoreDetail,
  addSnack,
  onClose,
}) => {
  const detailClasses = useDetailStyles();
  const [loader, setLoader] = useState(true);
  const [hierarchyColumns, setHierarchyColumns] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [showSizeLevelPopup, setShowSizeLevelPopup] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState(null);
  const articleColumnsRef = useRef([]);
  const tableDataRef = useRef([]);

  const handleAllocatedQtyClick = useCallback(
    (params) => {
      const row = params?.cellData?.data;
      setSelectedRowData({
        ...row,
        store_code: row?.store_code || storeCode,
      });
      setShowSizeLevelPopup(true);
    },
    [storeCode]
  );

  const getRowArticles = useCallback((params) => {
    const row = params?.data ?? params?.node?.data;
    if (Array.isArray(row?.articles)) return row.articles;
    return (
      tableDataRef.current.find((item) => item.index === row?.index)?.articles ||
      []
    );
  }, []);

  const fetchDetail = useCallback(async () => {
    if (!storeCode || !allocationCode || !planType) return;
    setLoader(true);
    try {
      const response = await fetchStoreDetail(
        {
          allocation_code: allocationCode,
          article: articles,
          ignore_allocation_code: getIgnoreAllocationCode(
            originalAllocationCode,
            allocationCode
          ),
          plan_type: planType,
          store_code: storeCode,
        },
        true
      );
      if (!response?.data?.status) {
        setHierarchyColumns([]);
        articleColumnsRef.current = [];
        setTableData([]);
        tableDataRef.current = [];
        return;
      }
      const { table_config: config, table_data: data } =
        response?.data?.data || {};
      const rows = (data || []).map((row, index) => ({ ...row, index }));

      articleColumnsRef.current = buildArticleColumns(
        config?.article,
        handleAllocatedQtyClick
      );
      tableDataRef.current = rows;
      setHierarchyColumns(formatHierarchyColumns(config?.hierarchy || []));
      setTableData(rows);
    } catch (e) {
      const errObj = e?.response?.data;
      addSnack({
        message: errObj?.show_message ? errObj.message : ERROR_MESSAGE,
        options: { variant: "error" },
      });
    } finally {
      setLoader(false);
    }
  }, [
    storeCode,
    allocationCode,
    articles,
    originalAllocationCode,
    planType,
    fetchStoreDetail,
    handleAllocatedQtyClick,
    addSnack,
  ]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const ArticleDetailTable = useCallback(
    (params) => (
      <div className={detailClasses.articleDetailWrapper}>
        <AgGridComponent
          tableHeader="Size Breakdown"
          columns={articleColumnsRef.current}
          rowdata={getRowArticles(params).map((row, index) => ({
            ...row,
            index,
          }))}
          downloadAsExcel={!!getRowArticles(params)?.length}
          selectAllHeaderComponent={false}
          suppressFieldDotNotation
          uniqueRowId="index"
          pagination={false}
          cardContainer={false}
          sizeColumnsToFitFlag={true}
          hideMarginBottom
        />
      </div>
    ),
    [detailClasses.articleDetailWrapper, getRowArticles]
  );

  return (
    <>
      {showSizeLevelPopup && (
        <StoreCapacityPopup
          selectedRowData={selectedRowData}
          allocationCode={allocationCode}
          originalAllocationCode={originalAllocationCode}
          planType={planType}
          store={storeCode}
          showNewStoreCapacityFlowHeader
          onCancel={() => setShowSizeLevelPopup(false)}
        />
      )}
      <Loader loader={loader} minHeight={200}>
        <div className={detailClasses.pinnedColsOverride}>
          <AgGridComponent
            customClass={detailClasses.hierarchyTable}
            tableHeader="Details"
            columns={hierarchyColumns}
            rowdata={tableData}
            selectAllHeaderComponent={false}
            suppressFieldDotNotation
            uniqueRowId="index"
            pagination={false}
            masterDetail
            detailRowAutoHeight
            keepDetailRows
            isRowMaster={(data) =>
              Array.isArray(data?.articles) && data.articles.length > 0
            }
            detailCellRenderer={ArticleDetailTable}
            closeButton
            sizeColumnsToFitFlag
            handleCloseButtonClick={onClose}
            downloadAsExcel={!!tableData?.length}
            showDownloadTooltip
            hideMarginBottom
          />
        </div>
      </Loader>
    </>
  );
};

const mapDispatchToProps = (dispatch) => ({
  getStoreCapacityStoreDetail: (payload, isV3) =>
    dispatch(getStoreCapacityStoreDetail(payload, isV3)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(null, mapDispatchToProps)(StoreCapacityDetailTable);
