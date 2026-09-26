import { useCallback, useEffect, useRef, useState } from "react";
import { cloneDeep } from "lodash";
import moment from "moment";

/**
 * Shared dirty-tracking for allocation edit grids.
 *
 * Tracks which rows have been edited relative to `originalRowsRef`, using the
 * `rowKey` field to identify each row. Numeric alloc columns are compared by
 * value; optional `otherColumns` are compared as formatted dates.
 *
 * `editableLeaves` / `otherColumns` are read from refs. ag-Grid 27 keeps the
 * first `onBlur` it saw on `gridOptionsWrapper.gridOptions`, so a closure over
 * the mount-time `[]` leaves would never mark a row dirty.
 *
 * @param {string}               rowKey           - row identity field (e.g. "store_code", "article", "size")
 * @param {Array}                editableLeaves   - list of { column_name } objects for numeric comparison
 * @param {React.MutableRefObject} originalRowsRef - ref holding the original row data snapshot
 * @param {string[]}             [otherColumns]   - optional date column names for moment-based comparison
 *
 * @returns {{ updatedRowEdits, updatedRowEditsRef, updateEditedRowState, resetEdits }}
 */
const useEditTracker = (rowKey, editableLeaves, originalRowsRef, otherColumns) => {
  const [updatedRowEdits, setUpdatedRowEdits] = useState([]);
  const updatedRowEditsRef = useRef([]);
  const editableLeavesRef = useRef(editableLeaves);
  const otherColumnsRef = useRef(otherColumns);
  editableLeavesRef.current = editableLeaves;
  otherColumnsRef.current = otherColumns;

  useEffect(() => {
    updatedRowEditsRef.current = cloneDeep(updatedRowEdits);
  }, [updatedRowEdits]);

  const rowHasChanges = useCallback(
    (rowData) => {
      const originalRow = (originalRowsRef.current || []).find(
        (r) => r[rowKey] === rowData[rowKey]
      );
      if (!originalRow) return false;

      for (const { column_name } of editableLeavesRef.current || []) {
        const newVal = Number(rowData[column_name] ?? 0);
        const oldVal = Number(originalRow[column_name] ?? 0);
        if (newVal !== oldVal) return true;
      }

      const extraColumns = otherColumnsRef.current;
      if (extraColumns) {
        for (const colName of extraColumns) {
          const newFormatted = rowData[colName]
            ? moment(rowData[colName]).format("YYYY-MM-DD")
            : null;
          const oldFormatted = originalRow[colName]
            ? moment(originalRow[colName]).format("YYYY-MM-DD")
            : null;
          if (newFormatted !== oldFormatted) return true;
        }
      }

      return false;
    },
    [rowKey, originalRowsRef]
  );

  const updateEditedRowState = useCallback(
    (rowData) => {
      const clonedRow = cloneDeep(rowData);
      const hasChanges = rowHasChanges(clonedRow);
      setUpdatedRowEdits((prev) => {
        const idx = prev.findIndex((r) => r[rowKey] === clonedRow[rowKey]);
        if (hasChanges) {
          return idx !== -1
            ? prev.map((r, i) => (i === idx ? clonedRow : r))
            : [...prev, clonedRow];
        }
        return idx !== -1 ? prev.filter((_, i) => i !== idx) : prev;
      });
    },
    [rowKey, rowHasChanges]
  );

  const resetEdits = useCallback(() => {
    setUpdatedRowEdits([]);
    updatedRowEditsRef.current = [];
  }, []);

  return { updatedRowEdits, updatedRowEditsRef, updateEditedRowState, resetEdits };
};

export default useEditTracker;
