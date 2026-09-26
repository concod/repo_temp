import { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { useLocation } from "react-router";
import { BottomSheet, useTranslation } from "impact-ui-v3";
import { isEmpty } from "lodash";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import Loader from "core/Utils/Loader/loader";
import colours from "core/Styles/colours";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { getStoreViewDrilldownProducts } from "../../../services-inventorysmart/Create-Transfer-Recommendations-S2S/create-transfer-recommendations-service";
import { displaySnackMessages } from "../../inventorysmart-utility";
import { loadTableData } from "modules/inventorysmart/utils-inventorysmart/tableDataUtils";
import {
  getRowStyleForGrandTotal,
  getTreeDataPath,
  transformToTreeData,
} from "modules/inventorysmart/utils-inventorysmart/clientSideRowGrouping";
import { commonTableContainerStyle } from "./commonStyles";
import {
  applyDrawerCellRenderer,
  isRowEditLocked,
  isRowSelectionRestricted,
  mergeFiltersWithIntersection,
} from "./transferUnitsUtils";
import EditableTableWrapper from "./EditableTableWrapper";
import { REDIRECT_FROM_VIEW_PAST_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { useNavigate } from "react-router-dom-v5-compat";

const StoreDrilldownProductsDrawer = (props) => {
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

      const parentStoreCode = props.selectedStore?.store_code;
      const clickedStoreCode = props.selectedDrilldownStore?.store_code;
      const isSourceMode = props.mode === "Source";

      const payload = {
        allocation_code:
          props.allocationCode || props.selectedStore?.allocation_code,
        ...(props.isOrderBatching
          ? { screen: "order_batching" }
          : props.planStatus === "Finalized" &&
            REDIRECT_FROM_VIEW_PAST_ALLOCATION === redirectFromQuery
          ? { plan_status: props.planStatus }
          : {}),
        source_store_code: isSourceMode ? parentStoreCode : clickedStoreCode,
        destination_store_code: isSourceMode
          ? clickedStoreCode
          : parentStoreCode,
        filters: props.isOrderBatching
          ? props.s2sFilterDependency
          : mergeFiltersWithIntersection(
              props.createStoreTransferRecommFilterDependency,
              props.microFilterSelectedFilters
            ),
      };

      await loadTableData({
        tableName: props.isOrderBatching
          ? "store_transfer_ob_store_view_drilldown_pro"
          : "store_transfer_review_store_view_drilldown_pro",
        key: "product_image_link",
        apiFunction: props.getStoreViewDrilldownProducts,
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
    if (props.selectedDrilldownStore && props.open) {
      setIsModalOpen(true);
      lastRefreshKeyRef.current = props.refreshKey || 0;
      fetchDetailData();
    } else if (!props.open) {
      setIsModalOpen(false);
    }
  }, [
    props.selectedDrilldownStore,
    props.open,
    props.editMode,
    props.lockedAllocationCodes,
  ]);

  useEffect(() => {
    if (
      props.refreshKey > 0 &&
      props.refreshKey !== lastRefreshKeyRef.current &&
      props.selectedDrilldownStore &&
      props.open
    ) {
      lastRefreshKeyRef.current = props.refreshKey;
      fetchDetailData();
    }
  }, [props.refreshKey]);

  const parentStoreCode = props.selectedStore?.store_code || "";
  const clickedStoreCode = props.selectedDrilldownStore?.store_code || "";
  const clickedStoreName = props.selectedDrilldownStore?.store_name || "";
  const isSourceMode = props.mode === "Source";

  const sourceStoreCode = isSourceMode ? parentStoreCode : clickedStoreCode;
  const destinationStoreCode = isSourceMode
    ? clickedStoreCode
    : parentStoreCode;

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
            cssPropertyName="--product-store-drawer-width"
            onCancel={fetchDetailData}
            otherData={{
              sourceStoreCode,
              destinationStoreCode,
            }}
          >
            {(editProps) => (
              <div className={`${commonStyles.commonContainer}`}>
                <AgGridComponent
                  tableHeader={
                    <span>
                      {sourceStoreCode}
                      {isSourceMode
                        ? ""
                        : ` (${replaceSpecialCharacter(clickedStoreName)})`}
                      <span style={{ color: colours.neutrals }}>{" -> "}</span>
                      {destinationStoreCode}
                      {isSourceMode
                        ? ` (${replaceSpecialCharacter(clickedStoreName)})`
                        : ""}
                    </span>
                  }
                  columns={detailColumns}
                  rowdata={detailData}
                  pagination={false}
                  getRowStyle={getRowStyleForGrandTotal}
                  pinnedTopRowData={
                    !isEmpty(grandTotalRow) ? [grandTotalRow] : []
                  }
                  height="460px"
                  adjustTableHeight={true}
                  showCustomNoRowOverlay={false}
                  treeData={true}
                  uniqueRowId="index"
                  cardContainer={false}
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
  getStoreViewDrilldownProducts: (payload) =>
    dispatch(getStoreViewDrilldownProducts(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreDrilldownProductsDrawer);
