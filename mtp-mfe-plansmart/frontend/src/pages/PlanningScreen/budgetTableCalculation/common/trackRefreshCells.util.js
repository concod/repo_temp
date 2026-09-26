/**
 * Assign the cells to be refreshed/highlighted.
 * @param {string} uniqueId - The unqiue id of edited row.
 * @param {string} columnId - The uniqued id of edited cell column.
 */
export default function ({ uniqueId, columnId, parentIndex }) {
  this.refreshCells = {
    rowData: Array.from(new Set([...this.refreshCells.rowData, uniqueId])),
    columnDef: Array.from(new Set([...this.refreshCells.columnDef, columnId])),
    parentRowIndex:
      parentIndex !== null
        ? Array.from(
            new Set([...this.refreshCells.parentRowIndex, parentIndex])
          )
        : this.refreshCells.parentRowIndex
  };
}
