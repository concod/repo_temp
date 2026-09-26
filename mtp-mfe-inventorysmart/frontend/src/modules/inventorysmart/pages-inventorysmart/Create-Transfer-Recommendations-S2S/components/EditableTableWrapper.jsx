import { useState, useRef, useEffect } from "react";
import { Alert, Button, useTranslation } from "impact-ui-v3";
import useStoreEditFlow from "./useStoreEditFlow";
import useResizeGrandTotal from "../useResizeGrandTotal";
import SetAllPanel from "./SetAllPanel";
import SetSelectedSizesPanel from "./SetSelectedSizesPanel";
import AddTransferPanel from "./AddTransferPanel";
import storeToStoreEditStyles from "./commonStyles";
import { connect } from "react-redux";
import { transformToTreeData } from "modules/inventorysmart/utils-inventorysmart/clientSideRowGrouping";
import { isEmpty } from "lodash";
import {
  syncRemainingSourceOh,
  DEFAULT_CAP_FIELD,
  isEditEnabled,
} from "./transferUnitsUtils";

/**
 * Wrapper component that provides edit functionality (Set All, Set Selected Sizes,
 * row selection, cell editing, save) around any AG Grid table.
 *
 * Usage:
 *   <EditableTableWrapper
 *     selectedArticle={selectedArticle}
 *     allocationCode={allocationCode}
 *     setGrandTotalRow={setGrandTotalRow}
 *     cssPropertyName="--product-store-drawer-width"
 *   >
 *     {(editProps) => (
 *       <AgGridComponent
 *         onRowSelected={editProps.onRowSelected}
 *         onBlur={editProps.onBlur}
 *         loadTableInstance={editProps.loadTableInstance}
 *         topRightOptions={editProps.topRightOptions}
 *         topCenterOptions={editProps.topCenterOptions}
 *         ...
 *       />
 *     )}
 *   </EditableTableWrapper>
 *
 * editProps provided to children:
 *   - onRowSelected, onBlur, loadTableInstance
 *   - topRightOptions (Set All / Add Transfer buttons, or the built-in
 *     Cancel/Apply actions while edits are pending)
 *   - topCenterOptions (capped-units warning, or the save-success alert
 *     after Apply completes successfully)
 *
 * Pass `onCancel` (e.g. the drawer's own fetchDetailData) so the built-in
 * Cancel action can reload the drawer's data after discarding edits.
 */
const EditableTableWrapper = (props) => {
  const {
    children,
    selectedArticle,
    allocationCode,
    isOrderBatching,
    setGrandTotalRow,
    cssPropertyName = "--product-store-drawer-width",
    otherData,
    selectedStore,
    onDirtyChange,
    onCancel,
  } = props;
  const editClasses = storeToStoreEditStyles();
  const { t } = useTranslation();

  const [openSetAll, setOpenSetAll] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [showSaveSuccessAlert, setShowSaveSuccessAlert] = useState(false);
  const [openAddTransfer, setOpenAddTransfer] = useState(false);

  const tableInstance = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAlert(false);
    }, 3000);
    return () => {
      clearTimeout(timer);
    };
  }, [showAlert]);

  // Auto-dismiss the "All Changes Applied Successfully" banner shown after
  // a successful Apply, same timing as the capped-units warning above.
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSaveSuccessAlert(false);
    }, 3000);
    return () => {
      clearTimeout(timer);
    };
  }, [showSaveSuccessAlert]);

  const handleSetShowAlert = (val) => {
    setShowAlert(val);
  };

  const {
    handleSave,
    onRowSelected,
    handleSetAllApply,
    selectedChildRows,
    selectedParentRows,
    onCellValueChanged,
    handleSetSelectedSizesApply,
    editedRowsRef,
    hasPendingEdits,
    syncPendingEditsFlag,
    resetEdits,
  } = useStoreEditFlow({
    setOpenSetAll,
    openSetAll,
    tableInstance,
    setGrandTotalRow,
    setShowAlert: handleSetShowAlert,
    selectedArticle,
    allocationCode,
    isOrderBatching,
    s2sFilterDependency: props.s2sFilterDependency,
    otherData,
    lockedAllocationCodes: props.lockedAllocationCodes,
    onSaveSuccess: () => setShowSaveSuccessAlert(true),
  });

  const {
    containerRef,
    loadTableInstance: loadTableInstanceFromResize,
  } = useResizeGrandTotal({
    cssPropertyName,
  });

  const loadTableInstance = (instance) => {
    tableInstance.current = instance;
    loadTableInstanceFromResize(instance);
  };

  const onBlur = (
    _e,
    data,
    column,
    _isChanged,
    _pre,
    oldValue,
    cellData,
    newVal,
    previousValue
  ) => {
    onCellValueChanged({
      data,
      cellData,
      column,
      newValue: newVal,
      oldValue,
    });
  };

  // True once an edit has actually been committed — drives the Cancel/Apply
  // actions (rendered here) and hides Set All/Add Transfer while they're
  // showing.
  const showEditActions = hasPendingEdits;

  // Discards unsaved cell edits (Cancel action) and reloads the drawer's
  // data so cells visually revert to the last saved values.
  const handleCancelEdits = () => {
    resetEdits();
    onCancel?.();
  };

  const topRightOptions = (
    <>
      {showEditActions && (
        <>
          <Button variant="secondary" onClick={handleCancelEdits}>
            {t("inventorysmart.cancel")}
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {t("inventorysmart.apply")}
          </Button>
        </>
      )}
      {!showEditActions &&
        (selectedParentRows.length > 0 || selectedChildRows.length > 0) &&
        props.editMode === "edit" &&
        (isEditEnabled(selectedArticle, isOrderBatching) ||
          isEmpty(selectedArticle)) && (
          <Button disabled={openSetAll} onClick={() => setOpenSetAll(true)}>
            {t("inventorysmart.s2sSetAll")}
          </Button>
        )}
      {!showEditActions &&
        props.editMode === "edit" &&
        !isOrderBatching &&
        (isEditEnabled(selectedArticle, isOrderBatching) ||
          isEmpty(selectedArticle)) && (
          <Button
            disabled={openAddTransfer}
            variant="secondary"
            onClick={() => setOpenAddTransfer(true)}
          >
            {t("inventorysmart.s2sAddTransfer")}
          </Button>
        )}
    </>
  );

  const topCenterOptions = showSaveSuccessAlert ? (
    <Alert
      severity="success"
      title={t("inventorysmart.allChangesAppliedSuccessfully")}
      onClose={() => setShowSaveSuccessAlert(false)}
    />
  ) : (
    showAlert && (
      <Alert
        severity="warning"
        title={t("inventorysmart.matchSourceInvTooltip")}
        onClose={() => setShowAlert(false)}
      />
    )
  );

  const handleAddTransferApply = (newRow) => {
    if (!tableInstance.current?.api) return;
    const api = tableInstance.current.api;

    let startIndex = 0;
    api.forEachNode(() => {
      startIndex++;
    });
    const uniqueKey = `new_${Date.now()}_${startIndex}`;
    const rowWithKey = { ...newRow, key: uniqueKey };
    const transformedRows = transformToTreeData(
      [rowWithKey],
      "child",
      "key",
      startIndex
    );

    // Add child rows to editedRowsRef for save payload
    const childRows = newRow.child || [];
    childRows.forEach((child) => {
      const editKey = `${selectedArticle?.article}_${child.sizes}_${newRow.source_store_code}_${newRow.destination_store_code}`;
      editedRowsRef.current.set(editKey, {
        article: selectedArticle?.article || newRow.article || "",
        size: child.sizes,
        source_store: newRow.source_store_code,
        destination_store: newRow.destination_store_code,
        transfer_units: child.transfer_units || 0,
      });
    });
    syncPendingEditsFlag();

    api.applyTransaction({ add: transformedRows, addIndex: 0 });

    // Propagate remaining_source_oh to all rows with same source_store_code
    const sourceStoreCode = newRow.source_store_code || "";
    const propagationMap = new Map();
    childRows.forEach((child) => {
      const size = child.sizes || "";
      if (sourceStoreCode && size) {
        propagationMap.set(
          `${sourceStoreCode}_${size}`,
          Number(child[DEFAULT_CAP_FIELD]) || 0
        );
      }
    });

    // Update grand total with new row's transfer_units and re-aggregate remaining_source_oh
    const totalDelta = Number(newRow.transfer_units) || 0;
    syncRemainingSourceOh({
      api,
      propagationMap,
      setGrandTotalRow,
      totalDelta,
    });
  };

  // Lets the hosting drawer react to pending-edit state if it needs to
  // (e.g. disable other actions) — Cancel/Apply themselves are now rendered
  // internally above.
  useEffect(() => {
    onDirtyChange?.(showEditActions);
  }, [showEditActions, onDirtyChange]);

  const editProps = {
    onRowSelected,
    onBlur,
    loadTableInstance,
    topRightOptions,
    topCenterOptions,
  };

  const uniqueParentsInvolved = new Set([
    ...selectedParentRows.map((r) => r.path?.[0]),
    ...selectedChildRows.map((r) => r.path?.[0]),
  ]).size;

  return (
    <div ref={containerRef} className={`${editClasses.tableEditWrapperStyles}`}>
      {typeof children === "function" ? children(editProps) : children}
      {openSetAll &&
        props.editMode === "edit" &&
        uniqueParentsInvolved <= 1 && (
          <SetAllPanel
            onClose={() => setOpenSetAll(false)}
            onApply={handleSetAllApply}
          />
        )}
      {openSetAll && props.editMode === "edit" && uniqueParentsInvolved > 1 && (
        <SetSelectedSizesPanel
          onClose={() => setOpenSetAll(false)}
          onApply={handleSetSelectedSizesApply}
        />
      )}
      {openAddTransfer && (
        <AddTransferPanel
          onClose={() => setOpenAddTransfer(false)}
          article={selectedArticle?.article}
          allocationCode={allocationCode}
          focusStoreData={selectedStore}
          onApply={handleAddTransferApply}
          mode={!isEmpty(otherData) ? "article" : ""}
          otherData={otherData}
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    editMode:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.editMode,
    lockedAllocationCodes:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.lockedAllocationCodes,
    s2sFilterDependency:
      store?.inventorysmartReducer?.inventorySmartOrderBatchingS2SService
        ?.s2sFilterDependency,
  };
};

const mapDispatchToProps = () => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(EditableTableWrapper);
