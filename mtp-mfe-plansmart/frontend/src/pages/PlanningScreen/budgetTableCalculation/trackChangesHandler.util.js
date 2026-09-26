import trackChanges from "./trackChanges.util";

function trackChangesHandler({ uniqueTrackChangedRowInxColInx }) {
  uniqueTrackChangedRowInxColInx.forEach((changedData) => {
    const rowInx = changedData.rowInx;
    const colId = changedData.columnId;
    trackChanges.call(this, {
      rowIndex: rowInx,
      oldValue: this.initialRowData[rowInx][colId],
      newValue: this.rowData[rowInx][colId],
      columnId: colId
    });
  });
}

export default trackChangesHandler;
