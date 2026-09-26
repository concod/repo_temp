import {
  CHANNEL_HIERARCHY_KEY,
  PRODUCT_HIERARCHY_KEY
} from "./budgetTableCalculation.constant";
import isCellLockedUtil from "./common/isCellLocked.util";

function isLogicallyLocked({ accessor, rowInx }) {
  const currentHierarchy = this.currentHierarchy;

  if (currentHierarchy === CHANNEL_HIERARCHY_KEY) {
    if (this.rowData[rowInx].parent_index >= 0) {
      if (
        isCellLockedUtil.call(this, {
          accessor,
          rowInx: this.rowData[rowInx].parent_index
        })
      ) {
        return true;
      }
      // Recursively check the parent's parent
      return isLogicallyLocked.call(this, {
        accessor,
        rowInx: this.rowData[rowInx].parent_index
      });
    }
  } else if (currentHierarchy === PRODUCT_HIERARCHY_KEY) {
    if (this.channelRollUpMapping[accessor]) {
      if (
        isCellLockedUtil.call(this, {
          accessor: this.channelRollUpMapping[accessor],
          rowInx: rowInx
        })
      ) {
        return true;
      }
      // Recursively check with the mapped accessor
      return isLogicallyLocked.call(this, {
        accessor: this.channelRollUpMapping[accessor],
        rowInx: rowInx
      });
    }
  }

  // If no condition matches, return false
  return false;
}

export default isLogicallyLocked;
