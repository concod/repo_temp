import { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { useLocation } from "react-router";
import { isEmpty } from "lodash";
import { BottomSheet, useTranslation } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import Loader from "core/Utils/Loader/loader";
import {
  getStoreTransferViewProducts,
  getProductViewDrilldownProducts,
} from "../../../services-inventorysmart/Create-Transfer-Recommendations-S2S/create-transfer-recommendations-service";
import { displaySnackMessages } from "../../inventorysmart-utility";
import { loadTableData } from "modules/inventorysmart/utils-inventorysmart/tableDataUtils";
import {
  getRowStyleForGrandTotal,
  getTreeDataPath,
  transformToTreeData,
} from "modules/inventorysmart/utils-inventorysmart/clientSideRowGrouping";
import colours from "core/Styles/colours";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import {
  applyDrawerCellRenderer,
  isRowEditLocked,
  isRowSelectionRestricted,
  mergeFiltersWithIntersection,
} from "./transferUnitsUtils";
import { commonTableContainerStyle } from "./commonStyles";
import EditableTableWrapper from "./EditableTableWrapper";
import { REDIRECT_FROM_VIEW_PAST_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { useNavigate } from "react-router-dom-v5-compat";

const DrillDownDetailsDrawer = (props) => {
  const commonStyles = commonTableContainerStyle();
  const location = useLocation();
  const redirectFromQuery = new URLSearchParams(location.search).get("rd");

  const { t } = useTranslation();
  const navigate = useNavigate();

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

  const redirectToPlan = (data) => {
    navigate(
      `/inventory-smart/create-store-transfer?step=1&allocation_code=${data.plan_name}`
    );
  };

  const actionMap = {
    plan_name: redirectToPlan,
  };

  const fetchDetailData = async () => {
    try {
      setIsLoading(true);

      const payload = {
        filters: props.isOrderBatching
          ? props.s2sFilterDependency
          : mergeFiltersWithIntersection(
              props.createStoreTransferRecommFilterDependency,
              props.microFilterSelectedFilters
            ),
        allocation_code:
          props.allocationCode || props.selectedArticle?.allocation_code,
        ...(props.isOrderBatching
          ? { screen: "order_batching" }
          : props.planStatus === "Finalized" &&
            REDIRECT_FROM_VIEW_PAST_ALLOCATION === redirectFromQuery
          ? { plan_status: props.planStatus }
          : {}),
        source_store_code: props.selectedStore?.source_store_code,
        destination_store_code: props.selectedStore?.destination_store_code,
      };
      if (!props.isTransferView) {
        payload.article = props.selectedArticle?.article;
      }

      await loadTableData({
        tableName: props.isTransferView
          ? props.isOrderBatching
            ? "store_transfer_ob_transfer_view_products"
            : "store_transfer_transfer_view_products"
          : props.isOrderBatching
          ? "store_transfer_ob_drilldown_products"
          : "store_transfer_review_drilldown_products",
        key: "product_image_link",
        apiFunction: props.isTransferView
          ? props.getStoreTransferViewProducts
          : props.getProductViewDrilldownProducts,
        payload,
        setColumns: setDetailColumns,
        setData: setDetailData,
        setLoading: setIsLoading,
        setGrandTotalRow,
        props,
        dataTransformer: (tableData) =>
          transformToTreeData(tableData, "child", "article"),
        columnFormatter: (columns) =>
          applyDrawerCellRenderer(columns, {
            selectedArticle: props.selectedArticle,
            editMode: props.editMode,
            isOrderBatching: props.isOrderBatching,
            lockedAllocationCodes: props.lockedAllocationCodes,
            actionMap,
          }),
      });
    } catch (error) {
      handleErrorMessage(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const updatedColumns = applyDrawerCellRenderer(detailColumns, {
      selectedArticle: props.selectedArticle,
      editMode: props.editMode,
      isOrderBatching: props.isOrderBatching,
      lockedAllocationCodes: props.lockedAllocationCodes,
      actionMap,
    });
    setDetailColumns(updatedColumns);
  }, [props.editMode]);

  const handleClose = () => {
    setIsModalOpen(false);
    props.onClose();
    setDetailData([]);
    setDetailColumns([]);
  };

  useEffect(() => {
    if (props.selectedStore && props.open) {
      setIsModalOpen(true);
      lastRefreshKeyRef.current = props.refreshKey || 0;
      fetchDetailData();
    } else if (!props.open) {
      setIsModalOpen(false);
    }
  }, [
    props.selectedStore,
    props.open,
    props.editMode,
    props.lockedAllocationCodes,
  ]);

  useEffect(() => {
    if (
      props.refreshKey > 0 &&
      props.refreshKey !== lastRefreshKeyRef.current &&
      props.selectedStore &&
      props.open
    ) {
      lastRefreshKeyRef.current = props.refreshKey;
      fetchDetailData();
    }
  }, [props.refreshKey]);

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
            selectedArticle={{}} // already getting this info in the rows directly
            allocationCode={props.allocationCode}
            isOrderBatching={props.isOrderBatching}
            setGrandTotalRow={setGrandTotalRow}
            cssPropertyName="--product-store-view-width"
            onCancel={fetchDetailData}
            otherData={{
              sourceStoreCode: props.selectedStore.source_store_code,
              destinationStoreCode: props.selectedStore?.destination_store_code,
            }}
            selectedStore={props.selectedStore}
          >
            {(editProps) => (
              <div className={`${commonStyles.commonContainer}`}>
                <AgGridComponent
                  tableHeader={
                    <span>
                      {props.selectedStore.source_store_code} (
                      {replaceSpecialCharacter(
                        props.selectedStore.source_store_name
                      )}
                      )<span style={{ color: colours.neutrals }}>{" -> "}</span>
                      {props.selectedStore?.destination_store_code}(
                      {replaceSpecialCharacter(
                        props.selectedStore?.destination_store_name
                      )}
                      )
                    </span>
                  }
                  columns={detailColumns}
                  rowdata={detailData}
                  pagination={false}
                  getRowStyle={getRowStyleForGrandTotal}
                  pinnedTopRowData={
                    !isEmpty(grandTotalRow) ? [grandTotalRow] : []
                  }
                  treeData={true}
                  uniqueRowId="index"
                  height="460px"
                  adjustTableHeight={true}
                  showCustomNoRowOverlay={false}
                  cardContainer={false}
                  getDataPath={getTreeDataPath}
                  groupDisplayType="custom"
                  selectAllHeaderComponent={
                    !(
                      props.planStatus === "Finalized" &&
                      REDIRECT_FROM_VIEW_PAST_ALLOCATION === redirectFromQuery
                    )
                  }
                  topCenterOptions={editProps.topCenterOptions}
                  rowClassRules={{
                    "row-disabled": (params) => !isEmpty(params.data?.info),
                    "selection-disabled": (params) =>
                      isRowSelectionRestricted(params.data) ||
                      !isRowEditLocked(params, props.lockedAllocationCodes),
                  }}
                  onBlur={editProps.onBlur}
                  onRowSelected={editProps.onRowSelected}
                  loadTableInstance={editProps.loadTableInstance}
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
  getStoreTransferViewProducts: (payload) =>
    dispatch(getStoreTransferViewProducts(payload)),
  getProductViewDrilldownProducts: (payload) =>
    dispatch(getProductViewDrilldownProducts(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DrillDownDetailsDrawer);
