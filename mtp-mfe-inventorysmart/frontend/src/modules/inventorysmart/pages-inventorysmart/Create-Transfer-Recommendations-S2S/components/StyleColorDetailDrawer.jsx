import { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { useLocation } from "react-router";
import { BottomSheet, useTranslation } from "impact-ui-v3";
import { isEmpty } from "lodash";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import Loader from "core/Utils/Loader/loader";
import { makeStyles } from "@mui/styles";
import { getStoreViewDetailTransferView } from "../../../services-inventorysmart/Create-Transfer-Recommendations-S2S/create-transfer-recommendations-service";
import { displaySnackMessages } from "../../inventorysmart-utility";
import { loadTableData } from "modules/inventorysmart/utils-inventorysmart/tableDataUtils";
import {
  getRowStyleForGrandTotal,
  getTreeDataPath,
  transformToTreeData,
} from "modules/inventorysmart/utils-inventorysmart/clientSideRowGrouping";
import {
  applyDrawerCellRenderer,
  isRowEditLocked,
  getEditModeBasedOnReviewStatus,
  isRowSelectionRestricted,
  mergeFiltersWithIntersection,
} from "./transferUnitsUtils";
import { commonTableContainerStyle } from "./commonStyles";
import EditableTableWrapper from "./EditableTableWrapper";
import { REDIRECT_FROM_VIEW_PAST_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

const useStyles = makeStyles(() => ({
  tableHeader: {
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
      color: "#1F2B4D",
    },
    "& .header-subtitle": {
      color: "#31416E",
    },
    "& .header-subheader": {
      color: "#60697D",
    },
    "& .header-separator": {
      height: "12px",
      width: "1px",
      backgroundColor: "#D9DDE7",
    },
  },
}));

const StyleColorDetailDrawer = (props) => {
  const classes = useStyles();
  const commonStyles = commonTableContainerStyle();
  const location = useLocation();
  const redirectFromQuery = new URLSearchParams(location.search).get("rd");

  const { t } = useTranslation();

  const [detailData, setDetailData] = useState([]);
  const [detailColumns, setDetailColumns] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [grandTotalRow, setGrandTotalRow] = useState({});

  const lastRefreshKeyRef = useRef(props.refreshKey || 0);

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) {
      displaySnackMessages(errObj?.message, "error", props);
    } else {
      displaySnackMessages(
        "An error occurred. Please try again.",
        "error",
        props
      );
    }
  };

  const fetchDetailData = async () => {
    try {
      setIsLoading(true);

      const payload = {
        allocation_code:
          props.allocationCode ||
          props.selectedStore?.allocation_code ||
          props.selectedArticle?.allocation_code,
        ...(props.isOrderBatching
          ? { screen: "order_batching" }
          : props.planStatus === "Finalized" &&
            REDIRECT_FROM_VIEW_PAST_ALLOCATION === redirectFromQuery
          ? { plan_status: props.planStatus }
          : {}),
        article: props.selectedArticle?.article,
        store_code: props.selectedStore?.store_code,
        filters: props.isOrderBatching
          ? props.s2sFilterDependency
          : mergeFiltersWithIntersection(
              props.createStoreTransferRecommFilterDependency,
              props.microFilterSelectedFilters
            ),
      };

      await loadTableData({
        tableName: props.isOrderBatching
          ? "store_transfer_ob_store_view_detail_transfer"
          : "store_transfer_review_store_view_detail_transfer",
        key: "source_store_code",
        apiFunction: props.getStoreViewDetailTransferView,
        payload,
        setColumns: setDetailColumns,
        setData: setDetailData,
        setLoading: setIsLoading,
        setGrandTotalRow,
        props,
        dataTransformer: (tableData) =>
          transformToTreeData(tableData, "child", "key"),
        columnFormatter: (columns) =>
          applyDrawerCellRenderer(columns, {
            selectedArticle: props.selectedArticle,
            editMode: getEditModeBasedOnReviewStatus(
              props.selectedArticle,
              props.editMode,
              props.isOrderBatching
            ),
            isOrderBatching: props.isOrderBatching,
            lockedAllocationCodes: props.lockedAllocationCodes,
          }),
      });
    } catch (error) {
      handleErrorMessage(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    props.onClose();
    setDetailData([]);
    setDetailColumns([]);
  };

  useEffect(() => {
    if (props.selectedArticle && props.open) {
      setIsModalOpen(true);
      lastRefreshKeyRef.current = props.refreshKey || 0;
      fetchDetailData();
    } else if (!props.open) {
      setIsModalOpen(false);
    }
  }, [
    props.selectedArticle,
    props.open,
    props.editMode,
    props.lockedAllocationCodes,
  ]);

  useEffect(() => {
    if (
      props.refreshKey > 0 &&
      props.refreshKey !== lastRefreshKeyRef.current &&
      props.selectedArticle &&
      props.open
    ) {
      lastRefreshKeyRef.current = props.refreshKey;
      fetchDetailData();
    }
  }, [props.refreshKey]);

  const storeCode = props.selectedStore?.store_code || "";
  const articleId = props.selectedArticle?.article || "";

  return (
    <div>
      <BottomSheet
        title={t("inventorysmart.details")}
        open={isModalOpen}
        onClose={handleClose}
        footerOptions={null}
      >
        <Loader loader={isLoading} minHeight="351px">
          <EditableTableWrapper
            selectedArticle={props.selectedArticle}
            allocationCode={props.allocationCode}
            isOrderBatching={props.isOrderBatching}
            setGrandTotalRow={setGrandTotalRow}
            cssPropertyName="--product-store-drawer-width"
            onCancel={fetchDetailData}
            selectedStore={props.selectedStore}
          >
            {(editProps) => (
              <div className={`${commonStyles.commonContainer}`}>
                <AgGridComponent
                  tableHeader={
                    <span className={classes.tableHeader}>
                      <span className="header-title">
                        {t("inventorysmart.styleDetails")}
                      </span>
                      <span className="header-separator" />
                      <span className="header-subheader">
                        {t("inventorysmart.styleColorId")}:
                        <span className="header-subtitle">{articleId}</span>
                      </span>
                      <span className="header-separator" />
                      <span className="header-subheader">
                        {t("inventorysmart.store")}:
                        <span className="header-subtitle">{storeCode}</span>
                      </span>
                    </span>
                  }
                  columns={detailColumns}
                  rowdata={detailData}
                  cardContainer={false}
                  getRowStyle={getRowStyleForGrandTotal}
                  pinnedTopRowData={
                    !isEmpty(grandTotalRow) ? [grandTotalRow] : []
                  }
                  pagination={false}
                  treeData={true}
                  uniqueRowId="index"
                  height="460px"
                  adjustTableHeight={true}
                  showCustomNoRowOverlay={false}
                  getDataPath={getTreeDataPath}
                  groupDisplayType="custom"
                  topCenterOptions={editProps.topCenterOptions}
                  onBlur={editProps.onBlur}
                  selectAllHeaderComponent={
                    !(
                      props.planStatus === "Finalized" &&
                      REDIRECT_FROM_VIEW_PAST_ALLOCATION === redirectFromQuery
                    )
                  }
                  rowClassRules={{
                    "row-disabled": (params) => !isEmpty(params.data?.info),
                    "selection-disabled": (params) =>
                      isRowSelectionRestricted(params.data) ||
                      !isRowEditLocked(params, props.lockedAllocationCodes),
                  }}
                  loadTableInstance={editProps.loadTableInstance}
                  onRowSelected={editProps.onRowSelected}
                  topRightOptions={editProps.topRightOptions}
                  hideMarginBottom={true}
                />
              </div>
            )}
          </EditableTableWrapper>
        </Loader>
      </BottomSheet>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    createStoreTransferRecommFilterDependency:
      store?.inventorysmartReducer?.createStoreTransferService
        ?.createStoreTransferRecommFilterDependency,
    refreshKey:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.refreshKey,
    editMode:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.editMode,
    lockedAllocationCodes:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.lockedAllocationCodes,
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
  getStoreViewDetailTransferView: (payload) =>
    dispatch(getStoreViewDetailTransferView(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StyleColorDetailDrawer);
