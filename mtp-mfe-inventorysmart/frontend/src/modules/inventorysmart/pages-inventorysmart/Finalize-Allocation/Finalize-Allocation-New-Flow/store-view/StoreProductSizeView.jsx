import React, { useContext, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { Checkbox } from "impact-ui-v3";
import { cloneDeep } from "lodash";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getIgnoreAllocationCode } from "../../../Create-Allocation/helperFunctions";
import { applyAbsentKeyHyphen, applyBadgeColumns } from "../../utils/columnUtils";
import useScrollIntoViewOnOpen from "../../utils/useScrollIntoViewOnOpen";
import { finalizeAllocationContext } from "../../index";
import { getPackCountRowStyle } from "../product-view/constants";
import {
  getViewPackConfiguration,
  setPackConfigForArticle,
} from "modules/inventorysmart/services-inventorysmart/Finalize/new-flow-store-view-services";
import {
  ALLOC_QTY_GROUP,
  CAPPED_WARNING_MSG,
  EDIT_VIEW_STORE_PRODUCT_SIZE,
  REMAINING_DC_ATA_GROUP,
} from "../constants/allocationEditConstants";
import {
  applyAllocNullHyphen,
  capValueAtAvailable,
  makeEditGate,
  matchDcOption,
} from "../utils/allocationEditUtils";
import { attachDetailAllocRenderers } from "../utils/allocRenderers";
import { collectDetailEditableLeaves } from "../utils/storeEditUtils";
import { injectPackHelperText, toPackConfigMap } from "../utils/packHelperUtils";
import useSnack from "../utils/useSnack";
import useEditTracker from "../utils/useEditTracker";
import { EDIT_BY_SIZE } from "./constants";

const UNIQUE_ROW_ID = "size";
const EDIT_SCHEMA_VIEW = EDIT_VIEW_STORE_PRODUCT_SIZE;
const EDIT_BY_TARGET = EDIT_BY_SIZE;

/** Edit gate for size renderers: true when editing by size (not by product). */
const detailEditOn = makeEditGate(EDIT_BY_TARGET);

/** Store→Product→Size nested detail grid: shows size breakdown for one article at one store. */
const StoreProductSizeView = ({
  selectedStore,
  selectedArticle,
  allocationCode,
  originalAllocationCode,
  planStatus,
  planType,
  isV3,
  fetchFn,
  addSnack: addSnackFn,
  editStateRef,
  onSizeEditsChange,
}) => {
  const globalClasses = globalStyles();
  const dispatch = useDispatch();
  const displaySnackMessages = useSnack(addSnackFn);
  const packConfigByArticle = useSelector(
    (store) =>
      store.inventorysmartReducer?.inventorySmartNewFlowStoreViewService
        ?.packConfigByArticle
  );
  const {
    editSchema,
    selectedOption,
    editByDimension: ctxEditBy,
    productEditActive: ctxProductEditActive,
    dirtySizeSplitCount,
    sizeEditResetKey,
  } = useContext(finalizeAllocationContext) || {};
  const isEditMode = selectedOption === "edit";
  const editSchemaForView = editSchema?.[EDIT_SCHEMA_VIEW] || null;

  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [includeInApply, setIncludeInApply] = useState(true);
  const tableInstance = useRef(null);

  const originalRowsRef = useRef([]);
  const [editableLeaves, setEditableLeaves] = useState([]);
  const dcOptionsRef = useRef([]);
  const {
    updatedRowEdits,
    updateEditedRowState,
    resetEdits,
  } = useEditTracker("size", editableLeaves, originalRowsRef);
  const seenResetKeyRef = useRef(sizeEditResetKey || 0);
  const panelRef = useScrollIntoViewOnOpen(
    selectedArticle ? `${selectedStore}-${selectedArticle}` : null
  );

  /** Notify parent panel of dirty row changes for this article. */
  const notifyParent = (edits, included) => {
    if (!onSizeEditsChange) return;
    onSizeEditsChange(selectedArticle, {
      edits,
      included,
      editableLeaves,
      originalRows: originalRowsRef.current,
    });
  };

  useEffect(() => {
    notifyParent(updatedRowEdits, includeInApply);
    // Narrow deps: parent callback is stable; notify only when dirty/include change
  }, [updatedRowEdits, includeInApply]);

  /** Restore the fetch snapshot without a refetch. */
  const revertToOriginal = () => {
    if (!originalRowsRef.current?.length) return;
    const originals = cloneDeep(originalRowsRef.current);
    resetEdits();
    setIncludeInApply(true);
    setRows(originals);
    notifyParent([], true);
    const api = tableInstance.current?.api;
    if (api) {
      if (api.setRowData) {
        api.setRowData(originals);
      }
      api.refreshCells({ force: true });
    }
  };

  const onBlur = (e, data, column, isChanged) => {
    if (!isChanged) return;
    const colId = column.colId;
    if (!colId || !colId.startsWith(ALLOC_QTY_GROUP)) return;

    const numValue = Number(data[colId] ?? 0);
    const originalRow = originalRowsRef.current.find(
      (r) => r.size === data.size
    );
    const { capped, finalValue } = capValueAtAvailable({
      value: numValue,
      originalRow,
      columnId: colId,
      allocGroup: ALLOC_QTY_GROUP,
      availableGroup: REMAINING_DC_ATA_GROUP,
    });

    if (capped) {
      displaySnackMessages(CAPPED_WARNING_MSG, "warning");
    }

    data[colId] = finalValue;
    updateEditedRowState(data);

    const rowNode = tableInstance.current?.api?.getRowNode(data[UNIQUE_ROW_ID]);
    if (rowNode) {
      rowNode.setData(data);
      tableInstance.current.api.redrawRows({ rowNodes: [rowNode] });
    }
  };

  // Fetch store→product→size data when article, store, or allocationCode changes.
  useEffect(() => {
    if (!allocationCode || !selectedStore || !selectedArticle) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const payload = {
          allocation_code: allocationCode,
          article: selectedArticle,
          ignore_allocation_code: getIgnoreAllocationCode(
            originalAllocationCode
          ),
          plan_status: planStatus,
          plan_type: planType || "",
          store_code: selectedStore,
        };
        const res = await fetchFn(
          payload,
          isV3?.includes("productStoreDetails")
        );
        if (res?.data?.status) {
          const resData = res.data.data;

          // Reuse this article's cache, or fetch with a single article string.
          const articleKey = String(selectedArticle);
          const cached = packConfigByArticle?.[articleKey];
          let packConfigMap = null;
          if (cached) {
            packConfigMap = toPackConfigMap(cached);
          } else {
            try {
              const packRes = await dispatch(
                getViewPackConfiguration({
                  allocation_code: allocationCode,
                  article: selectedArticle,
                  ignore_allocation_code: getIgnoreAllocationCode(
                    originalAllocationCode
                  ),
                  plan_status: planStatus,
                  plan_type: planType || "",
                })
              );
              const configs = packRes?.data?.data?.pack_configurations || [];
              dispatch(setPackConfigForArticle({ article: articleKey, configs }));
              packConfigMap = toPackConfigMap(configs);
            } catch (_) {
              // non-fatal: render grid without tooltips
            }
          }

          dcOptionsRef.current = resData.dc_dict || [];
          const rawConfig = resData.table_config || [];
          injectPackHelperText(rawConfig, packConfigMap);
          const formatted = agGridColumnFormatter(rawConfig);
          applyAbsentKeyHyphen(formatted);
          applyBadgeColumns(formatted);

          if (editStateRef) {
            const editableLeaves = collectDetailEditableLeaves(
              formatted,
              dcOptionsRef.current,
              editSchemaForView
            );
            editableLeaves.forEach((leaf) => {
              if (leaf.dc_code) return;
              const parts = leaf.column_name.split("__");
              if (parts.length < 3) return;
              const dcLabel = parts.slice(1, -1).join("__");
              const dcOption = matchDcOption(dcOptionsRef.current, {
                label: dcLabel,
              });
              leaf.dc_code = dcOption?.value || dcOption?.dc_code;
            });
            setEditableLeaves(editableLeaves);
            applyAllocNullHyphen(formatted, ALLOC_QTY_GROUP);
            attachDetailAllocRenderers(
              formatted,
              editableLeaves,
              editStateRef,
              detailEditOn
            );
          }

          originalRowsRef.current = cloneDeep(resData.table_data || []);
          resetEdits();
          setColumns(formatted);
          setRows(resData.table_data || []);
        }
      } catch (e) {
        const errObj = e?.response?.data;
        displaySnackMessages(
          errObj?.show_message ? errObj.message : ERROR_MESSAGE,
          "error"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // Narrow deps: only refetch when the identity triple changes; other props are stable or guarded
  }, [selectedStore, allocationCode, selectedArticle]);

  useEffect(() => {
    if (columns.length === 0) return;
    tableInstance.current?.api?.refreshCells({ force: true });
    // Narrow deps: columns.length guard is inside the body, not a trigger
  }, [isEditMode, ctxEditBy, ctxProductEditActive]);

  useEffect(() => {
    if (ctxEditBy === EDIT_BY_TARGET) return;
    revertToOriginal();
    // Narrow deps: chip leaving Size, not dirty-list changes
  }, [ctxEditBy]);

  useEffect(() => {
    if (isEditMode) return;
    revertToOriginal();
  }, [isEditMode]);

  useEffect(() => {
    if (!sizeEditResetKey || sizeEditResetKey === seenResetKeyRef.current) {
      return;
    }
    seenResetKeyRef.current = sizeEditResetKey;
    revertToOriginal();
  }, [sizeEditResetKey]);

  const hasDirtyRows = updatedRowEdits.length > 0;
  // Same Include In Apply gate as product_store_size, shown only once a
  // second product-size split is dirty so a lone split is always applied.
  const showCheckbox =
    isEditMode &&
    ctxEditBy === EDIT_BY_TARGET &&
    hasDirtyRows &&
    dirtySizeSplitCount > 1;

  const sizeTopRightOptions = showCheckbox
    ? [
        <Checkbox
          key="include-in-apply"
          label="Include In Apply"
          checked={includeInApply}
          onChange={(e) => setIncludeInApply(e.target.checked)}
        />,
      ]
    : [];

  return (
    <div
      ref={panelRef}
      className={globalClasses.contentBody}
      style={{ padding: "8px 16px" }}
    >
      <Loader loader={loading} minHeight="150px">
        <AgGridComponent
          columns={columns}
          rowdata={rows}
          uniqueRowId={UNIQUE_ROW_ID}
          sizeColumnsToFitFlag
          suppressFieldDotNotation
          pagination={false}
          getRowStyle={getPackCountRowStyle}
          loadTableInstance={(params) => {
            tableInstance.current = params;
          }}
          onBlur={onBlur}
          topRightOptions={sizeTopRightOptions}
          downloadAsExcel={rows.length > 0}
          showDownloadTooltip
        />
      </Loader>
    </div>
  );
};

export default StoreProductSizeView;
