import { findIndex } from "lodash";
import { PRODUCT_HIERARCHY_KEY } from "./budgetTableCalculation.constant";
import executeFormulaUtil from "./common/executeFormula.util";
import isCellLockedUtil from "./common/isCellLocked.util";
import updateRowData from "./common/updateRowData.util";
import saveChangedRowInxColId from "./saveChangedRowInxColId.until";
import isChannelEligibleUtil from "./common/isChannelEligible.util";
import removeLockUtil from "./common/removeLock.util";
import rollDown from "./rollDown.util";
function rollUpProduct({
  productRollUpQueue,
  rollUpQueue,
  kpiFlow,
  isSingleRollUp,
  finalRollDownQueue,
  tempRollUpQueue
}) {
  productRollUpQueue.forEach((productRollUpQueueKey) => {
    productRollUpQueue.shift();

    if (this.rowData[productRollUpQueueKey.rowInx].parent_index >= 0) {
      this.currentRow = this.rowData[
        this.rowData[productRollUpQueueKey.rowInx].parent_index
      ];

      this.changedColumnDef = this.columnsMap[productRollUpQueueKey.colId];
      this.currentHierarchy = PRODUCT_HIERARCHY_KEY;

      const duplicateQueueKeyIndex = findIndex(productRollUpQueue, {
        rowInx: this.rowData[productRollUpQueueKey.rowInx].parent_index,
        colId: productRollUpQueueKey.colId
      });

      const isCellLocked = isCellLockedUtil.call(this, {
        accessor: productRollUpQueueKey.colId,
        rowInx: this.rowData[productRollUpQueueKey.rowInx].parent_index
      });

      const isChannelEligible = isChannelEligibleUtil.call(this, {
        kpi: kpiFlow.kpi,
        column: productRollUpQueueKey.colId,
        row: this.rowData[productRollUpQueueKey.rowInx]
      });

      if (!isCellLocked) {
        if (duplicateQueueKeyIndex === -1) {
          const value = executeFormulaUtil.call(
            this,
            kpiFlow.rollUpProductHierarchy,
            {
              ...productRollUpQueueKey.changedCellData,
              focused_value: this.rowData[
                this.rowData[productRollUpQueueKey.rowInx].parent_index
              ][productRollUpQueueKey.colId]
            },
            "product-product",
            {
              colId: productRollUpQueueKey.colId,
              rowInx: this.rowData[productRollUpQueueKey.rowInx].parent_index
            }
          );

          if (duplicateQueueKeyIndex === -1) {
            productRollUpQueue.push({
              rowInx: this.rowData[productRollUpQueueKey.rowInx].parent_index,
              colId: productRollUpQueueKey.colId,
              changedCellData: {
                before_user_entered_value: this.rowData[
                  this.rowData[productRollUpQueueKey.rowInx].parent_index
                ][productRollUpQueueKey.colId],
                user_entered_value: value
              },
              isChannelEligible
            });
            tempRollUpQueue.push({
              rowInx: this.rowData[productRollUpQueueKey.rowInx].parent_index,
              colId: productRollUpQueueKey.colId,
              changedCellData: {
                before_user_entered_value: this.rowData[
                  this.rowData[productRollUpQueueKey.rowInx].parent_index
                ][productRollUpQueueKey.colId],
                user_entered_value: value
              },
              isChannelEligible
            });
          }

          updateRowData.call(this, {
            rowInx: this.rowData[productRollUpQueueKey.rowInx].parent_index,
            key: productRollUpQueueKey.colId,
            value: value
          });
          saveChangedRowInxColId.call(this, {
            columnId: productRollUpQueueKey.colId,
            rowInx: this.rowData[productRollUpQueueKey.rowInx].parent_index
          });
        }
      } else {
        const lockedRollDownQueue = [
          {
            colId: productRollUpQueueKey.colId,
            rowInx: this.rowData[productRollUpQueueKey.rowInx].parent_index,
            changedCellData: { ...productRollUpQueueKey.changedCellData }
          }
        ];

        const excludedCell = {
          colId: productRollUpQueueKey.colId,
          rowInx: productRollUpQueueKey.rowInx
        };

        rollDown.call(this, {
          rollDownQueue: lockedRollDownQueue,
          kpiFlow,
          excludedCell: excludedCell,
          rollDownPriority: ["product", "channel"]
        });

        lockedRollDownQueue.forEach((lockedRollDownQueueKey) => {
          const rollUpProductQueueIndex = findIndex(rollUpQueue, {
            colId: lockedRollDownQueue.colId,
            rowInx: lockedRollDownQueue.rowInx
          });

          if (rollUpProductQueueIndex !== -1) {
            rollUpQueue[rollUpProductQueueIndex] = {
              ...lockedRollDownQueueKey
            };
          } else {
            rollUpQueue.push(lockedRollDownQueueKey);
          }

          const rolDownFinalQueueIndex = findIndex(finalRollDownQueue, {
            colId: lockedRollDownQueue.colId,
            rowInx: lockedRollDownQueue.rowInx
          });

          if (rolDownFinalQueueIndex !== -1) {
            finalRollDownQueue[rolDownFinalQueueIndex] = {
              ...lockedRollDownQueueKey
            };
          } else {
            finalRollDownQueue.push(lockedRollDownQueueKey);
          }
        });

        removeLockUtil.call(this, {
          accessor: productRollUpQueueKey.colId,
          rowInx: this.rowData[productRollUpQueueKey.rowInx].parent_index
        });
      }
    }
    if (!isSingleRollUp) {
      rollUpProduct.call(this, {
        productRollUpQueue,
        rollUpQueue,
        kpiFlow,
        isSingleRollUp,
        finalRollDownQueue,
        tempRollUpQueue
      });
    }
  });
}

export default rollUpProduct;
