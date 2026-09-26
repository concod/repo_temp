import executeFormulaUtil from "./executeFormula.util";
import findIntersection from "./findIntersection.util";
import getValueByColumnKeyUtil from "./getValueByColumnKey.util";
import updateRowData from "./updateRowData.util";
import saveChangedRowInxColId from "../saveChangedRowInxColId.until";
import isChannelEligibleUtil from "./isChannelEligible.util";

/**
 * Processes and updates the rollDownQueue and dependentRollDownQueue based on specified KPIs.
 * @param {Object[]} rollDownQueue - Array of queue objects to be processed.
 * @param {Object[]} dependentRollDownQueue - Array of dependent queue objects to be updated.
 * @param {Object} kpiFlow - KPI flow object containing KPI and formula information.
 * @returns {void} - Does not return a value.
 * @description
 *   - Sets the skipEditibilityFlow flag to false initially.
 *   - Iterates over rollDownQueue to calculate values using given KPI formula.
 *   - Updates rows and columns based on the calculated values and eligibility.
 *   - Updates dependentRollDownQueue with newly calculated values if applicable.
 */
export default function ({ rollDownQueue, dependentRollDownQueue, kpiFlow }) {
  this.skipEditibilityFlow = false;
  const tempDependentRollDownQueue = [];
  rollDownQueue.forEach((rollDownQueueKey) => {
    const columnValues = getValueByColumnKeyUtil(
      this.valueByColumnValueKey,
      this.rowData[rollDownQueueKey.rowInx]
    );
    if (columnValues.length > 0) {
      const dependentRowInx = findIntersection.call(
        this,
        this.rowDataInxMapping,
        [kpiFlow.kpi, ...columnValues]
      )[0];
      if (dependentRowInx !== undefined) {
        this.currentRow = this.rowData[dependentRowInx];
        this.currentColumnDef = this.columnsMap[
          rollDownQueueKey.colId
        ].column_name;
        this.changedColumnDef = this.columnsMap[rollDownQueueKey.colId];
        const value = executeFormulaUtil.call(
          this,
          kpiFlow.formula,
          {
            ...rollDownQueueKey.changedCellData,
            focused_value: this.rowData[dependentRowInx][rollDownQueueKey.colId]
          },
          `dependent ${kpiFlow.kpi}`,
          {
            colId: rollDownQueueKey.colId,
            rowInx: rollDownQueueKey.rowInx
          }
        );

        const isChannelEligible = isChannelEligibleUtil.call(this, {
          kpi: kpiFlow.kpi,
          column: rollDownQueueKey.colId,
          row: this.rowData[rollDownQueueKey.rowInx]
        });
        const newKey = {
          ...rollDownQueueKey,
          changedCellData: {
            user_entered_value: value,
            before_user_entered_value: this.rowData[dependentRowInx][
              rollDownQueueKey.colId
            ]
          },
          rowInx: dependentRowInx,
          isChannelEligible
        };

        if (isChannelEligible) {
          updateRowData.call(this, {
            rowInx: dependentRowInx,
            key: rollDownQueueKey.colId,
            value: value
          });
          saveChangedRowInxColId.call(this, {
            columnId: rollDownQueueKey.colId,
            rowInx: dependentRowInx
          });
        }
        tempDependentRollDownQueue.push(newKey);
      }
    }
  });

  if (tempDependentRollDownQueue.length > 0) {
    dependentRollDownQueue.length = 0;
    dependentRollDownQueue.push(...tempDependentRollDownQueue);
  } else {
    this.skipEditibilityFlow = true;
  }
}
