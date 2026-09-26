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
import { EDIT_BY_STORE } from "./constants";
import {
  getViewPackConfiguration,
  setPackConfigurations,
} from "modules/inventorysmart/services-inventorysmart/Finalize/new-flow-store-view-services";
import {
  ALLOC_QTY_GROUP,
  REMAINING_DC_ATA_GROUP,
  CAPPED_WARNING_MSG,
  EDIT_VIEW_PRODUCT_SIZE_STORE,
} from "../constants/allocationEditConstants";
import {
  applyAllocNullHyphen,
  capValueAtAvailable,
  makeEditGate,
} from "../utils/allocationEditUtils";
import { attachDetailAllocRenderers } from "../utils/allocRenderers";
import { injectPackHelperText } from "../utils/packHelperUtils";
import { collectSizeStoreEditableLeaves } from "../utils/sizeEditUtils";
import { useProductExpansionStyles } from "./productViewStyles";

const KEY_FIELD = "size";
const UNIQUE_ROW_ID = "store_code";
const EDIT_SCHEMA_VIEW = EDIT_VIEW_PRODUCT_SIZE_STORE;
const EDIT_BY_TARGET = EDIT_BY_STORE;

// Renderers close over this gate; it reads live edit state from editStateRef.
const storeEditOn = makeEditGate(EDIT_BY_TARGET);

const ProductSizeStoreView = ({
  selectedKey,
  allocationCode,
  originalAllocationCode,
  planStatus,
  planType,
  isV3,
  selectedArticle,
  displayArticle,
  fetchFn,
  addSnack: addSnackFn,
  editStateRef,
  onSizeEditsChange,
}) => {
  const globalClasses = globalStyles();
  const expansionClasses = useProductExpansionStyles();
  const dispatch = useDispatch();
  const packConfigurations = useSelector(
    (store) =>
      store.inventorysmartReducer?.inventorySmartNewFlowStoreViewService
        ?.packConfigurations
  );
  const excelDownloadMetaData = useSelector(
    (store) =>
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.excelDownloadMetaData
  );
  const {
    editSchema,
    selectedOption,
    editByDimension: ctxEditBy,
    productEditActive: ctxProductEditActive,
  } = useContext(finalizeAllocationContext) || {};
  const isEditMode = selectedOption === "edit";
  const editSchemaForView = editSchema?.[EDIT_SCHEMA_VIEW] || null;

  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [includeInApply, setIncludeInApply] = useState(true);
  const tableInstance = useRef(null);

  const originalRowsRef = useRef([]);
  const dcOptionsRef = useRef([]);
  const editableLeavesRef = useRef([]);
  const [updatedRowEdits, setUpdatedRowEdits] = useState([]);
  const panelRef = useScrollIntoViewOnOpen(selectedKey);

  const notifyParent = (edits, included) => {
    if (!onSizeEditsChange) return;
    onSizeEditsChange(selectedKey, {
      edits,
      included,
      editableLeaves: editableLeavesRef.current,
      originalRows: originalRowsRef.current,
    });
  };

  useEffect(() => {
    notifyParent(updatedRowEdits, includeInApply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updatedRowEdits, includeInApply]);

  const rowHasChanges = (rowData) => {
    const originalRow = originalRowsRef.current.find(
      (r) => r.store_code === rowData.store_code
    );
    if (!originalRow) return false;
    for (const { column_name } of editableLeavesRef.current) {
      const newVal = Number(rowData[column_name] ?? 0);
      const oldVal = Number(originalRow[column_name] ?? 0);
      if (newVal !== oldVal) return true;
    }
    return false;
  };

  const updateEditedRowState = (rowData) => {
    const clonedRow = cloneDeep(rowData);
    setUpdatedRowEdits((prev) => {
      const cloned = cloneDeep(prev);
      const idx = cloned.findIndex((r) => r.store_code === clonedRow.store_code);
      if (rowHasChanges(clonedRow)) {
        if (idx !== -1) {
          cloned[idx] = clonedRow;
        } else {
          cloned.push(clonedRow);
        }
      } else {
        if (idx !== -1) {
          cloned.splice(idx, 1);
        }
      }
      return cloned;
    });
  };

  const onBlur = (e, data, column, isChanged, value) => {
    if (!isChanged) return;
    const colId = column.colId;
    const isAllocationColumn = colId.startsWith(ALLOC_QTY_GROUP);
    if (!isAllocationColumn) return;

    // data[colId] is already updated by handleInputChange before onBlur fires.
    const numValue = Number(data[colId] ?? 0);
    const originalRow = originalRowsRef.current.find(
      (r) => r.store_code === data.store_code
    );
    const { capped, finalValue } = capValueAtAvailable({
      value: numValue,
      originalRow,
      columnId: colId,
      allocGroup: ALLOC_QTY_GROUP,
      availableGroup: REMAINING_DC_ATA_GROUP,
    });

    if (capped) {
      addSnackFn({
        message: CAPPED_WARNING_MSG,
        options: { variant: "warning", disableOnClose: true },
      });
    }

    data[colId] = finalValue;
    updateEditedRowState(data);

    const rowNode = tableInstance.current?.api?.getRowNode(data[UNIQUE_ROW_ID]);
    if (rowNode) {
      rowNode.setData(data);
      tableInstance.current.api.redrawRows({ rowNodes: [rowNode] });
    }
  };

  useEffect(() => {
    if (!allocationCode || !selectedArticle || !selectedKey) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const payload = {
          allocation_code: allocationCode,
          article: selectedArticle || displayArticle,
          ignore_allocation_code: getIgnoreAllocationCode(originalAllocationCode),
          plan_status: planStatus,
          plan_type: planType || "",
          [KEY_FIELD]: selectedKey,
        };
        const res = await fetchFn(payload, isV3?.includes("productStoreDetails"));
        if (res?.data?.status) {
          const resData = res.data.data;
          dcOptionsRef.current = resData.dc_dict || [];

          // Ensure pack configurations are loaded, then inject helperText before formatting
          let packConfigMap = null;
          if (packConfigurations !== null) {
            packConfigMap = Object.fromEntries(
              packConfigurations.map((c) => [c.pack_type_id, c])
            );
          } else {
            try {
              const packPayload = {
                allocation_code: allocationCode,
                article: selectedArticle || displayArticle,
                ignore_allocation_code: getIgnoreAllocationCode(
                  originalAllocationCode
                ),
                plan_status: planStatus,
                plan_type: planType || "",
              };
              const packRes = await dispatch(getViewPackConfiguration(packPayload));
              const configs = packRes?.data?.data?.pack_configurations || [];
              dispatch(setPackConfigurations(configs));
              packConfigMap = Object.fromEntries(
                configs.map((c) => [c.pack_type_id, c])
              );
            } catch (_) {
              // non-fatal: render grid without tooltips
            }
          }

          const rawConfig = resData.table_config || [];
          injectPackHelperText(rawConfig, packConfigMap);
          const formatted = agGridColumnFormatter(rawConfig);
          applyAbsentKeyHyphen(formatted);
          applyBadgeColumns(formatted);

          if (editStateRef) {
            const editableLeaves = collectSizeStoreEditableLeaves(
              formatted,
              dcOptionsRef.current,
              editSchemaForView
            );
            editableLeavesRef.current = editableLeaves;
            applyAllocNullHyphen(formatted, ALLOC_QTY_GROUP);
            // Eaches are uniformly editable on every store row. Pack-type-id
            // is not collected, so the per-row rule is always-true.
            attachDetailAllocRenderers(
              formatted,
              editableLeaves,
              editStateRef,
              storeEditOn,
              () => true
            );
          }

          originalRowsRef.current = cloneDeep(resData.table_data || []);
          setColumns(formatted);
          setRows(resData.table_data || []);
        }
      } catch (e) {
        const errObj = e?.response?.data;
        addSnackFn({
          message: errObj?.show_message ? errObj.message : ERROR_MESSAGE,
          options: { variant: "error", disableOnClose: true },
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, allocationCode, selectedArticle]);

  useEffect(() => {
    if (columns.length === 0) return;
    tableInstance.current?.api?.refreshCells({ force: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, ctxEditBy, ctxProductEditActive]);

  // Reset edits when chip switches away from Store
  useEffect(() => {
    if (ctxEditBy !== EDIT_BY_TARGET && updatedRowEdits.length > 0) {
      setUpdatedRowEdits([]);
      setIncludeInApply(true);
      setRows(cloneDeep(originalRowsRef.current));
      tableInstance.current?.api?.refreshCells({ force: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxEditBy]);

  // Reset includeInApply when edit mode is turned off. The detail panel can
  // survive across view↔edit toggles (keepDetailRows + skipRemount), so an
  // unchecked checkbox from a previous edit session must not leak forward.
  useEffect(() => {
    if (!isEditMode) {
      setIncludeInApply(true);
    }
  }, [isEditMode]);

  const hasDirtyRows = updatedRowEdits.length > 0;
  const showCheckbox = isEditMode && ctxEditBy === EDIT_BY_TARGET && hasDirtyRows;

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
      className={`${globalClasses.contentBody} ${expansionClasses.nestedDetail}`}
    >
      <Loader loader={loading} minHeight={loading ? "150px" : "auto"}>
        <AgGridComponent
          columns={columns}
          rowdata={rows}
          uniqueRowId={UNIQUE_ROW_ID}
          sizeColumnsToFitFlag
          suppressFieldDotNotation
          pagination={false}
          loadTableInstance={(p) => {
            tableInstance.current = p;
          }}
          onBlur={onBlur}
          topRightOptions={sizeTopRightOptions}
          tableHeader={"Stores"}
          downloadAsExcel={rows.length > 0}
          showDownloadTooltip
          toPrependContent={excelDownloadMetaData}
        />
      </Loader>
    </div>
  );
};

export default ProductSizeStoreView;
