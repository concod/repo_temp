import { useState, useRef } from "react";
import {
  applyDeltaToParent,
  bulkUpdateChildColumnValues,
  bulkZeroParentColumnValues,
  DEFAULT_CAP_FIELD,
  DEFAULT_COL_FIELD,
  isRowEditLocked,
  isRowSelectionRestricted,
  refreshColumnCells,
  resolveSourceStoreCode,
  syncRemainingSourceOh,
  updateChildColumnValue,
} from "./transferUnitsUtils";
import { useDispatch } from "react-redux";
import {
  getStoreTransferEdit,
  triggerRefresh,
} from "modules/inventorysmart/services-inventorysmart/Create-Transfer-Recommendations-S2S/create-transfer-recommendations-service";
import { handleErrorMessage } from "../../inventorysmart-utility";
import { addSnack } from "core/actions/snackbarActions";
import { isEmpty } from "lodash";

const useStoreEditFlow = ({
  setOpenSetAll,
  openSetAll,
  tableInstance,
  setGrandTotalRow,
  setShowAlert,
  selectedArticle,
  allocationCode,
  isOrderBatching,
  s2sFilterDependency,
  otherData,
  lockedAllocationCodes,
  onSaveSuccess,
}) => {
  const [selectedParentRows, setSelectedParentRows] = useState([]);
  const [selectedChildRows, setSelectedChildRows] = useState([]);
  // Drives the Save button's enabled state
  const [hasPendingEdits, setHasPendingEdits] = useState(false);

  const programmaticRef = useRef(false);
  const openSetAllRef = useRef(openSetAll);
  openSetAllRef.current = openSetAll;
  const dispatch = useDispatch();

  // Tracks child-level edits for "units" payload (keyed by article+size+source+dest)
  const editedRowsRef = useRef(new Map());
  // Tracks zero-out edits for "zero" payload (keyed by source+dest or article)
  const zeroedRowsRef = useRef(new Map());

  // Must be called after every mutation of editedRowsRef / zeroedRowsRef
  const syncPendingEditsFlag = () => {
    setHasPendingEdits(
      editedRowsRef.current.size > 0 || zeroedRowsRef.current.size > 0
    );
  };

  // Discards all tracked-but-unsaved edits (used by the Cancel action).
  // Callers are still responsible for reloading grid data so the cells
  // visually revert to the last saved values.
  const resetEdits = () => {
    editedRowsRef.current = new Map();
    zeroedRowsRef.current = new Map();
    syncPendingEditsFlag();
  };

  // Resolves the lane (article + source + destination) a row belongs to
  const getLaneIdentity = (data, parentData) => {
    return {
      article:
        data?.article || parentData?.article || selectedArticle?.article || "",
      source_store:
        parentData?.source_store_code ||
        data?.source_store_code ||
        otherData?.sourceStoreCode ||
        "",
      destination_store:
        parentData?.destination_store_code ||
        data?.destination_store_code ||
        otherData?.destinationStoreCode ||
        "",
    };
  };

  // Two rows belong to the same lane when every identifier they both carry
  // matches (article in article-view, source+destination in lane-view)
  const isSameLane = (a, b) => {
    let compared = false;
    if (a.article && b.article) {
      if (a.article !== b.article) return false;
      compared = true;
    }
    if (a.source_store && b.source_store) {
      if (a.source_store !== b.source_store) return false;
      compared = true;
    }
    if (a.destination_store && b.destination_store) {
      if (a.destination_store !== b.destination_store) return false;
      compared = true;
    }
    return compared;
  };

  const getEditRowKey = (data, parentData) => {
    const lane = getLaneIdentity(data, parentData);
    return `${lane.article}_${data.sizes}_${lane.source_store}_${lane.destination_store}`;
  };

  // Last action wins per lane: zeroing a lane discards its earlier unit edits
  const dropEditsForLane = (lane) => {
    editedRowsRef.current.forEach((row, key) => {
      if (isSameLane(lane, row)) editedRowsRef.current.delete(key);
    });
  };

  // ...and editing units in a lane discards its earlier zero-out
  const dropZeroForLane = (lane) => {
    zeroedRowsRef.current.forEach((row, key) => {
      if (
        isSameLane(lane, {
          article: row.article,
          source_store: row.source_store_code,
          destination_store: row.destination_store_code,
        })
      ) {
        zeroedRowsRef.current.delete(key);
      }
    });
  };

  const trackEdit = (node) => {
    const parentData = node.parent?.data || {};
    const lane = getLaneIdentity(node.data, parentData);
    dropZeroForLane(lane);
    editedRowsRef.current.set(getEditRowKey(node.data, parentData), {
      article: lane.article,
      size: node.data.sizes,
      source_store: resolveSourceStoreCode(node, otherData),
      destination_store: lane.destination_store,
      transfer_units: node.data[DEFAULT_COL_FIELD],
    });
    syncPendingEditsFlag();
  };

  const getEditsPayload = () => {
    const payload = {
      allocation_code: allocationCode || selectedArticle?.allocation_code,
      ...(isOrderBatching
        ? { screen: "order_batching", filters: s2sFilterDependency }
        : {}),
    };
    if (zeroedRowsRef.current.size > 0) {
      const zeroedEntries = Array.from(zeroedRowsRef.current.values());
      const hasLaneInfo =
        zeroedEntries[0].source_store_code &&
        zeroedEntries[0].destination_store_code;

      if (hasLaneInfo) {
        payload.lanes = zeroedEntries.map((row) => ({
          source_store: row.source_store_code,
          destination_store: row.destination_store_code,
        }));
      } else {
        payload.articles = zeroedEntries.map((row) => row.article);
      }
    }

    if (editedRowsRef.current.size > 0) {
      payload.edits = Array.from(editedRowsRef.current.values());
    }

    return payload;
  };

  const isParentNode = (n) => n.data?.path?.length === 1;

  // A row can only be edited when we hold the lock for its allocation code
  const isNodeEditable = (node) =>
    isRowEditLocked({ data: node.data, node }, lockedAllocationCodes);

  const getEditableSelectedNodes = (api) =>
    api.getSelectedNodes().filter(isNodeEditable);

  const syncSelectionState = (api) => {
    const parents = [];
    const children = [];
    api.forEachNode((n) => {
      if (n.isSelected()) {
        if (isParentNode(n)) {
          parents.push(n.data);
        } else {
          children.push(n.data);
        }
      }
    });

    setSelectedParentRows(parents);
    setSelectedChildRows(children);

    if (parents.length === 0 && children.length === 0) {
      setOpenSetAll(false);
    }
  };

  const runProgrammatic = (fn) => {
    programmaticRef.current = true;
    try {
      fn();
    } finally {
      // Defer reset so any AG Grid deferred/async events from setSelected
      // are still caught by the programmaticRef guard
      setTimeout(() => {
        programmaticRef.current = false;
      }, 0);
    }
  };

  // Single-pass traversal to collect all selection state
  const getSelectionSnapshot = (api, excludeNode) => {
    const selectedParentIds = new Set();
    const selectedChildParentIds = new Set();
    // Map parentPathId → { total, selected, children[] }
    const parentChildMap = new Map();

    api.forEachNode((n) => {
      if (!n.data?.path) return;
      const isParent = n.data.path.length === 1;
      const parentId = n.data.path[0];

      if (isParent) {
        if (
          n.isSelected() &&
          !isRowSelectionRestricted(n.data) &&
          isNodeEditable(n)
        ) {
          selectedParentIds.add(parentId);
        }
      } else if (
        !isEmpty(n.data?.info) ||
        isRowSelectionRestricted(n.data) ||
        !isNodeEditable(n)
      ) {
        // skip info rows, rows locked by review status, and rows whose
        // allocation code we do not hold an edit lock for
      } else {
        // Valid child row
        if (!parentChildMap.has(parentId)) {
          parentChildMap.set(parentId, { total: 0, selected: 0, children: [] });
        }
        const entry = parentChildMap.get(parentId);
        entry.total++;
        entry.children.push(n);
        if (n.isSelected() && n !== excludeNode) {
          entry.selected++;
          selectedChildParentIds.add(parentId);
        } else if (n.isSelected() && n === excludeNode) {
          entry.selected++;
          selectedChildParentIds.add(parentId);
        }
      }
    });

    return { selectedParentIds, selectedChildParentIds, parentChildMap };
  };

  const onRowSelected = (params) => {
    const { node, api } = params;

    // Skip programmatic selection events to prevent loops
    if (programmaticRef.current) return;

    // Block info rows from being selected
    if (!isEmpty(node.data?.info)) {
      runProgrammatic(() => node.setSelected(false));
      return;
    }

    // Block rows already progressed beyond "Created"
    // (Approved / Move to Order Batching) from being selected
    if (isRowSelectionRestricted(node.data)) {
      runProgrammatic(() => node.setSelected(false));
      return;
    }

    // Block rows whose plan we do not hold an edit lock for
    if (!isNodeEditable(node)) {
      runProgrammatic(() => node.setSelected(false));
      return;
    }

    // Block ALL selection changes while Set All panel is open
    if (openSetAllRef.current) {
      runProgrammatic(() => node.setSelected(!node.isSelected()));
      return;
    }

    // Collect all state in a single traversal
    const {
      selectedParentIds,
      selectedChildParentIds,
      parentChildMap,
    } = getSelectionSnapshot(api, node);

    // --- PARENT ROW logic ---
    if (isParentNode(node)) {
      const nodeParentId = node.data.path[0];

      if (node.isSelected()) {
        // Block if another parent has partially-selected children
        // (children selected but their parent is NOT explicitly selected)
        let hasPartialChildSelection = false;
        for (const id of selectedChildParentIds) {
          if (id !== nodeParentId && !selectedParentIds.has(id)) {
            hasPartialChildSelection = true;
            break;
          }
        }

        if (hasPartialChildSelection) {
          runProgrammatic(() => node.setSelected(false));
          setTimeout(() => syncSelectionState(api), 0);
          return;
        }

        // Parent selected → auto-select all its children
        const entry = parentChildMap.get(nodeParentId);
        if (entry) {
          runProgrammatic(() => {
            entry.children.forEach((n) => {
              if (!n.isSelected()) n.setSelected(true);
            });
          });
        }
      } else {
        // Parent deselected → auto-deselect all its children
        const entry = parentChildMap.get(nodeParentId);
        if (entry) {
          runProgrammatic(() => {
            entry.children.forEach((n) => {
              if (n.isSelected()) n.setSelected(false);
            });
          });
        }
      }

      setTimeout(() => syncSelectionState(api), 0);
      return;
    }

    // --- CHILD ROW logic ---
    const childParentId = node.data?.path?.[0];

    if (node.isSelected()) {
      // If multiple parents are selected → block child selection
      if (selectedParentIds.size > 1) {
        runProgrammatic(() => node.setSelected(false));
        setTimeout(() => syncSelectionState(api), 0);
        return;
      }

      // Only allow children from one parent at a time
      // Check if other parents have selected children (without being explicitly selected)
      for (const id of selectedChildParentIds) {
        if (id !== childParentId && !selectedParentIds.has(id)) {
          runProgrammatic(() => node.setSelected(false));
          setTimeout(() => syncSelectionState(api), 0);
          return;
        }
      }

      // After selecting child, check if all children of this parent are now selected
      // → auto-select the parent
      const entry = parentChildMap.get(childParentId);
      if (entry && entry.selected >= entry.total) {
        runProgrammatic(() => {
          api.forEachNode((n) => {
            if (
              isParentNode(n) &&
              n.data.path[0] === childParentId &&
              !n.isSelected()
            ) {
              n.setSelected(true);
            }
          });
        });
      }

      setTimeout(() => syncSelectionState(api), 0);
      return;
    } else {
      // Child being deselected
      // If multiple parents are selected → block child deselection
      if (selectedParentIds.size > 1) {
        runProgrammatic(() => node.setSelected(true));
        setTimeout(() => syncSelectionState(api), 0);
        return;
      }

      // Single parent: allow child deselection, also deselect parent if it was selected
      if (selectedParentIds.has(childParentId)) {
        runProgrammatic(() => {
          api.forEachNode((n) => {
            if (
              isParentNode(n) &&
              n.data.path[0] === childParentId &&
              n.isSelected()
            ) {
              n.setSelected(false);
            }
          });
        });
      }
    }

    setTimeout(() => syncSelectionState(api), 0);
  };
  const onCellValueChanged = (params) => {
    const { column, newValue, cellData, oldValue } = params;
    if (column.colId !== DEFAULT_COL_FIELD) return;

    const api = tableInstance.current?.api;
    const node = cellData.node;
    if (!isNodeEditable(node)) return;
    const { delta, wasCapped, newRemainingOh } = updateChildColumnValue(
      node,
      newValue,
      { oldValue }
    );

    if (wasCapped) {
      setShowAlert(true);
    }

    const parentNode = node.parent;
    if (!parentNode?.data) return;

    // Track edited child row (deduped by composite key).
    // A blur that leaves the value unchanged is not an edit.
    if (delta !== 0) trackEdit(node);

    applyDeltaToParent(parentNode, delta);
    refreshColumnCells(
      api,
      [parentNode],
      [DEFAULT_COL_FIELD, DEFAULT_CAP_FIELD]
    );

    // Propagate remaining_source_oh + update grand total
    const srcCode = resolveSourceStoreCode(node, otherData);
    const size = node.data.sizes || "";
    const propagationMap = new Map();
    if (srcCode && size) {
      propagationMap.set(`${srcCode}_${size}`, newRemainingOh);
    }

    syncRemainingSourceOh({
      api,
      propagationMap,
      setGrandTotalRow,
      totalDelta: delta,
    });
  };

  const resetAfterApply = () => {
    const api = tableInstance.current?.api;
    if (api) api.deselectAll();
    setSelectedParentRows([]);
    setSelectedChildRows([]);
    setOpenSetAll(false);
  };

  const handleSetAllApply = ({ type, enterUnits, matchSourceInv }) => {
    const api = tableInstance.current?.api;
    if (!api) return;

    const editableNodes = getEditableSelectedNodes(api);

    if (type === "enter_units") {
      bulkUpdateChildColumnValues({
        api,
        getNewValue: () => enterUnits,
        setGrandTotalRow,
        nodes: editableNodes,
        otherData,
      });
    } else if (type === "match_source") {
      if (!matchSourceInv) return;
      bulkUpdateChildColumnValues({
        api,
        getNewValue: (data) =>
          (Number(data[DEFAULT_COL_FIELD]) || 0) +
          (Number(data[DEFAULT_CAP_FIELD]) || 0),
        setGrandTotalRow,
        nodes: editableNodes,
        otherData,
      });
    }

    // Track all selected child nodes (deduped by composite key)
    editableNodes.forEach((node) => {
      if (isParentNode(node)) return;
      trackEdit(node);
    });

    resetAfterApply();
  };

  const handleSetSelectedSizesApply = ({ type, setToZero }) => {
    if (!setToZero) return;

    const api = tableInstance.current?.api;
    if (!api) return;

    const editableNodes = getEditableSelectedNodes(api);

    bulkZeroParentColumnValues({
      api,
      setGrandTotalRow,
      nodes: editableNodes,
      otherData,
    });

    // Track selected parent rows in zeroedRowsRef for lanes/articles payload
    editableNodes.forEach((node) => {
      if (!isParentNode(node)) return;
      const data = node.data;
      const lane = getLaneIdentity(data);
      // Zeroing supersedes any earlier unit edits on the same lane
      dropEditsForLane(lane);
      const key =
        data.source_store_code && data.destination_store_code
          ? `${data.source_store_code}_${data.destination_store_code}`
          : data.article || "";
      zeroedRowsRef.current.set(key, {
        source_store_code: data.source_store_code || "",
        destination_store_code: data.destination_store_code || "",
        article: data.article || selectedArticle?.article || "",
      });
    });
    syncPendingEditsFlag();

    resetAfterApply();
  };

  const handleSave = async () => {
    try {
      const res = await dispatch(getStoreTransferEdit(getEditsPayload()));
      if (res?.data?.status) {
        editedRowsRef.current = new Map();
        zeroedRowsRef.current = new Map();
        syncPendingEditsFlag();
        dispatch(
          addSnack({
            message: res.data.message,
            options: { variant: "success" },
          })
        );
        onSaveSuccess?.();
        dispatch(triggerRefresh());
        window.dispatchEvent(new CustomEvent("lock-save-completed"));
      }
    } catch (err) {
      dispatch(
        addSnack({
          message: err?.message || "Failed to save changes",
          options: { variant: "error" },
        })
      );
    }
  };

  return {
    onRowSelected,
    handleSetAllApply,
    selectedChildRows,
    selectedParentRows,
    onCellValueChanged,
    handleSetSelectedSizesApply,
    handleSave,
    editedRowsRef,
    hasPendingEdits,
    syncPendingEditsFlag,
    resetEdits,
  };
};

export default useStoreEditFlow;
