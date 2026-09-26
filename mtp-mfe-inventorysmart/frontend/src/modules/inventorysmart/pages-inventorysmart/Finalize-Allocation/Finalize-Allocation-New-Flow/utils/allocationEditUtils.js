/**
 * Grain-agnostic helpers for allocation edit / apply.
 *
 * These are pure and hold no React. Every builder that assembles an apply
 * payload or caps an edited cell shares them, so the arithmetic and the
 * envelope shape live in exactly one place. Per-view rules (which column
 * group, which `row_filters`) stay in the caller.
 */
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { CAPPED_WARNING_MSG } from "../constants/allocationEditConstants";

/**
 * Derive a sibling column key by swapping its group prefix.
 * e.g. allocated_quantity__East DC__eaches → remaining_dc_ata__East DC__eaches
 */
export const replaceColumnGroup = (columnId, fromGroup, toGroup) =>
  columnId.replace(fromGroup, toGroup);

/**
 * Cap an edited allocation value at `original_allocated + available` for the
 * same row, where `available` is read from the sibling column derived by
 * swapping `allocGroup` → `availableGroup`.
 *
 * @returns {{ capped: boolean, finalValue: number }}
 */
export const capValueAtAvailable = ({
  value,
  originalRow,
  columnId,
  allocGroup,
  availableGroup,
}) => {
  const originalAlloc = Number(originalRow?.[columnId] ?? 0);
  const availableKey = replaceColumnGroup(columnId, allocGroup, availableGroup);
  const available = Number(originalRow?.[availableKey] ?? 0);
  const maxAllowed = originalAlloc + available;

  if (value > maxAllowed) {
    return { capped: true, finalValue: maxAllowed };
  }
  return { capped: false, finalValue: value };
};

/**
 * Apply response shape: { data: { capped, warning } }.
 * Shows the capped warning XOR the success message — never both.
 */
export const notifyApplyResult = (res, displaySnack, fallbackSuccess) => {
  if (typeof displaySnack !== "function") return;
  const body = res?.data;
  const applyData = body?.data;
  const capped = applyData?.capped ?? body?.capped;
  if (capped) {
    displaySnack(
      applyData?.warning || body?.warning || CAPPED_WARNING_MSG,
      "warning"
    );
    return;
  }
  displaySnack(body?.message || fallbackSuccess, "success");
};

/**
 * True when a row is missing the key entirely, or holds null / undefined for
 * it. Used to render a "-" placeholder instead of an empty editable cell.
 */
export const isMissingOrNull = (data, colName) => {
  if (!data || !Object.prototype.hasOwnProperty.call(data, colName)) return true;
  return data[colName] === null || data[colName] === undefined;
};

/**
 * Wrap every alloc-leaf valueGetter so a missing / null cell shows "-" while
 * preserving whatever the formatter's original getter returned otherwise.
 * Mutates the passed column tree in place.
 */
export const applyAllocNullHyphen = (columns, allocGroupName) => {
  const allocGroup = columns.find((c) => c.column_name === allocGroupName);
  if (!allocGroup?.sub_headers) return;
  allocGroup.sub_headers.forEach((dcHeader) => {
    (dcHeader.sub_headers || []).forEach((leaf) => {
      const colName = leaf.column_name;
      const orig = leaf.valueGetter;
      leaf.valueGetter = (params) => {
        if (isMissingOrNull(params.data, colName)) return "-";
        return orig ? orig(params) : params.data?.[colName];
      };
    });
  });
};

/**
 * Normalised column-name accessor shared by Set All mapping builders and
 * anywhere else that reads formatted column trees.
 */
export const getColumnName = (column) => column?.column_name || column?.field;

/**
 * Find the dc_dict entry matching a DC header label, trying plain and
 * special-character-replaced variants.
 */
export const matchDcOption = (dcDict, dcHeader) =>
  (dcDict || []).find(
    (dc) =>
      dc.label === dcHeader.label ||
      replaceSpecialCharacter(dc.label) === dcHeader.label ||
      replaceSpecialCharacter(dc.label) ===
        replaceSpecialCharacter(dcHeader.label)
  );

/**
 * Build a gate that tells a cell renderer whether editing is live for a given
 * dimension. Renderers close over `editStateRef` (updated every render) so a
 * chip switch needs only a refreshCells — no columnDef rebuild / remount.
 */
export const makeEditGate = (targetDimension) => (editStateRef) =>
  Boolean(
    editStateRef?.current?.isEditMode &&
      !editStateRef.current.productEditActive &&
      editStateRef.current.editByDimension === targetDimension
  );

/**
 * Assemble the common apply envelope shared by every grain. Field order is
 * kept identical to the hand-written builders it replaces.
 */
export const buildApplyEnvelope = ({
  allocationCode,
  originalAllocationCode,
  sessionId,
  view,
  article = null,
  store = null,
  size = null,
  allocationUpdates = [],
  otherUpdates = [],
}) => ({
  allocation_code: allocationCode,
  original_allocation_code: originalAllocationCode || allocationCode,
  session_id: sessionId,
  view,
  article,
  store,
  size,
  allocation_updates: allocationUpdates,
  other_updates: otherUpdates,
});
