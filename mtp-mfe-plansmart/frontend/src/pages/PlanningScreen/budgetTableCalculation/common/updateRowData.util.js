import numberValidation from "./numberValidation.util";
import trackRefreshCells from "./trackRefreshCells.util";

export default function ({ rowInx, key, value }) {
  this.rowData[rowInx] = {
    ...this.rowData[rowInx],
    [key]: numberValidation.call(this, value)
  };

  let parentIndex = null;
  const childrenIndex = this.rowData[rowInx]?.children_indexes;
  if (childrenIndex && childrenIndex.length > 0) {
    parentIndex = rowInx;
  }

  trackRefreshCells.call(this, {
    uniqueId: this.rowData[rowInx].order,
    columnId: key,
    parentIndex: parentIndex
  });
}
