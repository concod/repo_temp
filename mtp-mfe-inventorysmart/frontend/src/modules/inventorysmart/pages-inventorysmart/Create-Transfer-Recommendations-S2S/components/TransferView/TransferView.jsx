import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { useLocation } from "react-router";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import Loader from "core/Utils/Loader/loader";
import { isEmpty } from "lodash";
import { getStoreTransferView } from "../../../../services-inventorysmart/Create-Transfer-Recommendations-S2S/create-transfer-recommendations-service";
import { makeStyles } from "@mui/styles";
import { getRowStyleForGrandTotal } from "modules/inventorysmart/utils-inventorysmart/clientSideRowGrouping";
import { loadTableData } from "modules/inventorysmart/utils-inventorysmart/tableDataUtils";
import colours from "core/Styles/colours";
import DrillDownDetailsDrawer from "../DrillDownDetailsDrawer";
import { commonTableContainerStyle } from "../commonStyles";
import {
  getReviewStatusCellRenderer,
  greenRedColorNumberRenderer,
  progressBarCellRenderer,
  mergeFiltersWithIntersection,
} from "../transferUnitsUtils";
import { useTranslation } from "impact-ui-v3";
import { REDIRECT_FROM_VIEW_PAST_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

const useStyles = makeStyles(() => ({
  tableContainer: {
    "& .table-grouping-with-link-plus-icon": {
      display: "flex",
      justifyContent: "space-between",
      width: "100%",
    },
  },
  headerContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    "& span": {
      fontFamily: "Manrope",
      fontSize: "14px",
      fontWeight: 700,
      lineHeight: "21px",
    },
    "& .header-title": {
      color: colours.lightNeutrals,
    },
  },
  linkContainer: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    height: "100%",
    "& .inv-btn-link": {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "2px",
      cursor: "pointer",
      color: colours.brightRoyalBlue,
      fontFamily: "Manrope",
      fontSize: "14px",
      fontWeight: 500,
      lineHeight: "20px",
      border: "none",
      background: "transparent",
      padding: 0,
    },
  },
}));

const colorColumns = ["outbound_units", "inbound_units", "transfer_units"];

const TransferView = (props) => {
  const classes = useStyles();
  const commonStyles = commonTableContainerStyle();

  const { t } = useTranslation();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectFromQuery = searchParams.get("rd");
  const allocationCodeFromQuery = searchParams.get("allocation_code");

  const [drilldownData, setDrilldownData] = useState([]);
  const [drilldownColumns, setDrilldownColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDrillDownDrawer, setShowDrillDownDrawer] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [grandTotalRow, setGrandTotalRow] = useState({});

  const addCellRenderer = (columns, actionMap) => {
    return columns.map((column) => {
      if (column.children && column.children.length > 0) {
        const nested = addCellRenderer(column.children, actionMap);
        column.children = nested;
        column.sub_headers = nested;
      }

      if (colorColumns.includes(column.column_name)) {
        return greenRedColorNumberRenderer(column);
      }
      if (column.column_name === "review_status") {
        return getReviewStatusCellRenderer(column);
      }
      return progressBarCellRenderer(column);
    });
  };

  const fetchTransferViewData = () => {
    const payload = {
      ...(props.isOrderBatching
        ? {
            screen: "order_batching",
            ...(allocationCodeFromQuery
              ? { allocation_code: allocationCodeFromQuery }
              : {}),
          }
        : {
            allocation_code: props.allocationCode,
            ...(props.planStatus === "Finalized" &&
            REDIRECT_FROM_VIEW_PAST_ALLOCATION === redirectFromQuery
              ? { plan_status: props.planStatus }
              : {}),
          }),
      filters: props.isOrderBatching
        ? props.s2sFilterDependency
        : mergeFiltersWithIntersection(
            props.createStoreTransferRecommFilterDependency,
            props.microFilterSelectedFilters
          ),
    };
    loadTableData({
      tableName: props.isOrderBatching
        ? "store_transfer_ob_transfer_view"
        : "store_transfer_transfer_view",
      key: "source_store_code",
      apiFunction: props.getStoreTransferView,
      payload,
      setColumns: setDrilldownColumns,
      setData: setDrilldownData,
      setLoading: setIsLoading,
      setGrandTotalRow: setGrandTotalRow,
      props,
      columnFormatter: (cols) => addCellRenderer(cols, {}),
    });
  };

  useEffect(() => {
    const filters = props.isOrderBatching
      ? props.s2sFilterDependency
      : props.createStoreTransferRecommFilterDependency;
    if (!isEmpty(filters)) {
      fetchTransferViewData();
    }
  }, [
    props.createStoreTransferRecommFilterDependency,
    props.microFilterSelectedFilters,
    props.s2sFilterDependency,
  ]);

  const tableColumns = useMemo(() => {
    const viewActionColumn = {
      field: "transfer_view",
      headerName: "",
      is_frozen: true,
      pinned: "right",
      width: 63,
      maxWidth: 63,
      suppressMenu: true,
      resizable: false,
      cellRenderer: (params) => {
        if (params.node.rowPinned !== "top") {
          return (
            <div className={classes.linkContainer}>
              <button
                className="inv-btn-link"
                onClick={() => {
                  setSelectedStore(params.data);
                  setShowDrillDownDrawer(true);
                }}
              >
                <span>{t("inventorysmart.view")}</span>
              </button>
            </div>
          );
        }
        return null;
      },
    };

    return [...drilldownColumns, viewActionColumn];
  }, [drilldownColumns]);

  return (
    <div
      className={`${classes.tableContainer} ${commonStyles.commonContainer}`}
    >
      <Loader loader={isLoading} minHeight="383px">
        {!isLoading && (
          <AgGridComponent
            tableHeader={t("inventorysmart.transferView")}
            columns={tableColumns}
            rowdata={drilldownData}
            pagination={false}
            getRowStyle={getRowStyleForGrandTotal}
            pinnedTopRowData={!isEmpty(grandTotalRow) ? [grandTotalRow] : []}
            uniqueRowId="key"
            height="460px"
            adjustTableHeight={true}
            showCustomNoRowOverlay={false}
            closeButton={false}
            hideChildSelection={true}
            hideMarginBottom={true}
          />
        )}
      </Loader>
      {showDrillDownDrawer && (
        <DrillDownDetailsDrawer
          open={showDrillDownDrawer}
          selectedStore={selectedStore}
          allocationCode={props.allocationCode}
          isTransferView={true}
          isOrderBatching={props.isOrderBatching}
          onClose={() => {
            setShowDrillDownDrawer(false);
            setSelectedStore(null);
          }}
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    createStoreTransferRecommFilterDependency:
      store?.inventorysmartReducer?.createStoreTransferService
        ?.createStoreTransferRecommFilterDependency,
    s2sFilterDependency:
      store?.inventorysmartReducer?.inventorySmartOrderBatchingS2SService
        ?.s2sFilterDependency,
    planStatus:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.planStatus,
    microFilterSelectedFilters:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.microFilterSelectedFilters,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getStoreTransferView: (payload) => dispatch(getStoreTransferView(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(mapStateToProps, mapDispatchToProps)(TransferView);
