import { isNumber } from "lodash";
import {
  CHANNEL_HIERARCHY_KEY,
  LEAST_TIMELINE_FIRST_VALUE,
  LEAST_TIMELINE_LAST_VALUE,
  PREVIOUS_TIMELINE,
  PRODUCT_HIERARCHY_KEY,
  SELECTOR_KPI,
  SELECTOR_LOCKED_SUM,
  SELECTOR_SUM,
  TIME_HIERARCHY_KEY,
  SELECTOR_LOCKED_PARENT,
  INITIAL_VALUE,
  CHANNEL_TOTAL,
  AGGREGATE_NUMBER_OF_WEEKS_KEY
} from "../budgetTableCalculation.constant";
import findIntersection from "./findIntersection.util";
import getValue from "./getValue.util";
import getValueByColumnKey from "./getValueByColumnKey.util";
import isCellLockedUtil from "./isCellLocked.util";
import isLogicallyLocked from "../isLogicallyLocked.util";
import checkNegativeUtil from "./checkNegative.util";
import getPreviousTimeline from "./getPreviousTimeline.util";
import getValueFromLeastTimeline from "./getValueFromLeastTimeline.unitl";
import { isSomethingLockedOnTimeLineUtil } from "./isTimelineLocked.util";

const validateFormulaKey = (formulaKey) => {
  if (formulaKey.includes("[") && Array.isArray(eval(formulaKey))) {
    return eval(formulaKey);
  }
  return formulaKey;
};

export default function (formulaStr, parsedFormulaArr, valueObj, from) {
  let updatedFormula = formulaStr;

  parsedFormulaArr.forEach((key) => {
    if (isNaN(Number(key))) {
      const validatedKey = validateFormulaKey.call(this, key);
      const hierarchyLevel = this.currentHierarchy;
      const row = this.currentRow;

      if (validatedKey === key && !isNaN(Number(valueObj[key]))) {
        updatedFormula = updatedFormula.replaceAll(
          new RegExp("\\b" + key + "\\b", "g"),
          checkNegativeUtil(valueObj[key])
        );
      } else if (key === SELECTOR_LOCKED_SUM) {
        let sumOfLockedValues = 0;

        if (hierarchyLevel === PRODUCT_HIERARCHY_KEY) {
          if (row.parent_index >= 0) {
            const parent = this.rowData[row.parent_index];

            parent.children_indexes.forEach((childIndex) => {
              if (
                isCellLockedUtil.call(this, {
                  accessor: this.changedColumnDef.column_name,
                  rowInx: childIndex
                })
              ) {
                const lockedCellValue = this.rowData[childIndex][
                  this.changedColumnDef.column_name
                ];

                sumOfLockedValues += lockedCellValue;
              } else if (
                Boolean(
                  isLogicallyLocked.call(this, {
                    accessor: this.changedColumnDef.column_name,
                    rowInx: childIndex
                  })
                )
              ) {
                const logicallyLockedCellValue = this.rowData[childIndex][
                  this.changedColumnDef.column_name
                ];

                sumOfLockedValues += logicallyLockedCellValue;
              }
            });
          }
          updatedFormula = updatedFormula.replaceAll(
            key,
            checkNegativeUtil(sumOfLockedValues)
          );
        } else if (hierarchyLevel === CHANNEL_HIERARCHY_KEY) {
          if (this.channelRollUpMapping[this.changedColumnDef.column_name]) {
            const parentRollUpColumn = this.channelRollUpMapping[
              this.changedColumnDef.column_name
            ];

            this.channelRollDownMapping[parentRollUpColumn].forEach(
              (rollDownColumn) => {
                if (
                  isCellLockedUtil.call(this, {
                    accessor: rollDownColumn,
                    rowInx: row.index
                  })
                ) {
                  const rollDownLockedValue = this.rowData[row.index][
                    rollDownColumn
                  ];

                  sumOfLockedValues += rollDownLockedValue;
                } else if (
                  !!isLogicallyLocked.call(this, {
                    accessor: rollDownColumn,
                    rowInx: row.index
                  })
                ) {
                  const rollDownLogicallyLockedValue = this.rowData[row.index][
                    rollDownColumn
                  ];
                  sumOfLockedValues += rollDownLogicallyLockedValue;
                }
              }
            );
          }
          updatedFormula = updatedFormula.replaceAll(
            key,
            checkNegativeUtil(sumOfLockedValues)
          );
        } else if (hierarchyLevel === TIME_HIERARCHY_KEY) {
          const hasTimeRollUpMapping = this.timeRollUpMapping.some(
            (timeRollUpGroup) =>
              Object.keys(timeRollUpGroup).includes(
                this.changedColumnDef.column_name
              )
          );

          if (hasTimeRollUpMapping) {
            const parentTimeColumnGroup = this.timeRollUpMapping.find(
              (timeRollUpGroup) =>
                timeRollUpGroup[this.changedColumnDef.column_name]
            );

            const parentTimeColumn =
              parentTimeColumnGroup[this.changedColumnDef.column_name];

            this.timeRollDownMapping[parentTimeColumn].forEach(
              (rollDownTimeColumn) => {
                if (
                  isSomethingLockedOnTimeLineUtil.call(this, {
                    accessor: rollDownTimeColumn,
                    rowInx: row.index
                  })
                ) {
                  const rollDownTimeLockedValue = this.rowData[row.index][
                    rollDownTimeColumn
                  ];

                  sumOfLockedValues += rollDownTimeLockedValue;
                } else if (
                  !!isLogicallyLocked.call(this, {
                    accessor: rollDownTimeColumn,
                    rowInx: row.index
                  })
                ) {
                  const rollDownTimeLogicallyLockedValue = this.rowData[
                    row.index
                  ][rollDownTimeColumn];
                  sumOfLockedValues += rollDownTimeLogicallyLockedValue;
                }
              }
            );
          }
          updatedFormula = updatedFormula.replaceAll(
            key,
            checkNegativeUtil(sumOfLockedValues)
          );
        }
      } else if (key === SELECTOR_LOCKED_PARENT) {
        let parentLockedValue = 0;

        if (hierarchyLevel === CHANNEL_HIERARCHY_KEY) {
          if (this.channelRollUpMapping[this.changedColumnDef.column_name]) {
            const parentRollUpColumn = this.channelRollUpMapping[
              this.changedColumnDef.column_name
            ];

            if (
              isCellLockedUtil.call(this, {
                accessor: parentRollUpColumn,
                rowInx: row.index
              })
            ) {
              parentLockedValue = this.rowData[row.index][parentRollUpColumn];
            }
          }
        } else if (hierarchyLevel === PRODUCT_HIERARCHY_KEY) {
          if (row.parent_index >= 0) {
            const parentRowIndex = row.parent_index;

            if (
              isCellLockedUtil.call(this, {
                accessor: this.changedColumnDef.column_name,
                rowInx: parentRowIndex
              })
            ) {
              parentLockedValue = this.rowData[parentRowIndex][
                this.changedColumnDef.column_name
              ];
            }
          }
        } else if (hierarchyLevel === TIME_HIERARCHY_KEY) {
          const hasTimeRollUpMapping = this.timeRollUpMapping.some(
            (timeRollUpGroup) =>
              Object.keys(timeRollUpGroup).includes(
                this.changedColumnDef.column_name
              )
          );

          if (hasTimeRollUpMapping) {
            const parentTimeColumnGroup = this.timeRollUpMapping.find(
              (timeRollUpGroup) =>
                timeRollUpGroup[this.changedColumnDef.column_name]
            );

            const parentTimeColumn =
              parentTimeColumnGroup[this.changedColumnDef.column_name];

            if (
              isSomethingLockedOnTimeLineUtil.call(this, {
                accessor: parentTimeColumn,
                rowInx: row.index
              })
            ) {
              parentLockedValue = this.rowData[row.index][parentTimeColumn];
            }
          }
        }

        if (parentLockedValue === 0) {
          updatedFormula = updatedFormula.replaceAll(`${key}-`, "");
        } else {
          updatedFormula = updatedFormula.replaceAll(
            key,
            checkNegativeUtil(parentLockedValue)
          );
        }
      } else if (key === AGGREGATE_NUMBER_OF_WEEKS_KEY) {
        updatedFormula = updatedFormula.replaceAll(
          key,
          this.changedColumnDef.extra.noOfWeeks
        );
      } else if (Array.isArray(validatedKey)) {
        const actionType = validatedKey[0];

        if (actionType === SELECTOR_SUM) {
          if (hierarchyLevel === PRODUCT_HIERARCHY_KEY) {
            const kpiKey = validatedKey[1][1];

            const columnValues = getValueByColumnKey.call(
              this,
              this.valueByColumnValueKey,
              row
            );

            const rowIndex = findIntersection.call(
              this,
              this.rowDataInxMapping,
              [kpiKey, ...columnValues]
            );

            const productSumValue = this.rowData[
              rowIndex
            ].children_indexes.reduce((sum, childIndex) => {
              return (
                sum +
                this.rowData[childIndex][this.changedColumnDef.column_name]
              );
            }, 0);

            updatedFormula = updatedFormula.replaceAll(
              key,
              checkNegativeUtil(productSumValue)
            );
          } else if (hierarchyLevel === CHANNEL_HIERARCHY_KEY) {
            const kpiKey = validatedKey[1][1];

            const columnValues = getValueByColumnKey.call(
              this,
              this.valueByColumnValueKey,
              row
            );

            const rowIndex = findIntersection.call(
              this,
              this.rowDataInxMapping,
              [kpiKey, ...columnValues]
            );

            const childColumnMapping = this.channelRollDownMapping[
              this.changedColumnDef.column_name
            ];

            const channelSumValue = childColumnMapping.reduce(
              (sum, childColumn) => {
                return sum + this.rowData[rowIndex][childColumn];
              },
              0
            );

            updatedFormula = updatedFormula.replaceAll(
              key,
              checkNegativeUtil(channelSumValue)
            );
          } else if (hierarchyLevel === TIME_HIERARCHY_KEY) {
            const kpiKey = validatedKey[1][1];

            const columnValues = getValueByColumnKey.call(
              this,
              this.valueByColumnValueKey,
              row
            );

            const rowIndex = findIntersection.call(
              this,
              this.rowDataInxMapping,
              [kpiKey, ...columnValues]
            );

            const childTimeColumnMapping = this.timeRollDownMapping[
              this.changedColumnDef.column_name
            ];

            const timeSumValue = childTimeColumnMapping.reduce(
              (sum, childTimeColumn) => {
                return sum + this.rowData[rowIndex][childTimeColumn];
              },
              0
            );

            updatedFormula = updatedFormula.replaceAll(
              key,
              checkNegativeUtil(timeSumValue)
            );
          }
        } else if (actionType === SELECTOR_KPI) {
          const kpiKey = validatedKey[1];
          const fetchFrom = validatedKey[2];
          let column = this.changedColumnDef.column_name;

          if (fetchFrom === PREVIOUS_TIMELINE) {
            column = getPreviousTimeline.call(this, {
              columnId: this.changedColumnDef.column_name
            });
          } else if (
            fetchFrom === LEAST_TIMELINE_FIRST_VALUE ||
            fetchFrom === LEAST_TIMELINE_LAST_VALUE
          ) {
            column = getValueFromLeastTimeline.call(this, {
              valuePosition: fetchFrom,
              columnId: this.changedColumnDef.column_name
            });
          } else if (fetchFrom === CHANNEL_TOTAL) {
            column = this.channelRollUpMapping[
              this.changedColumnDef.column_name
            ];
          }

          if (typeof kpiKey === "string") {
            const columnValues = getValueByColumnKey.call(
              this,
              this.valueByColumnValueKey,
              row
            );
            const rowIndex = findIntersection.call(
              this,
              this.rowDataInxMapping,
              [kpiKey, ...columnValues]
            );

            updatedFormula = updatedFormula.replaceAll(
              key,
              checkNegativeUtil(
                getValue.call(
                  this,
                  rowIndex[0],
                  column,
                  fetchFrom === INITIAL_VALUE
                )
              )
            );
          } else {
            throw new Error(`UI_BC_ERROR/${kpiKey} is not a valid KPI`);
          }
        }
      } else {
        throw new Error(`UI_BC_ERROR/value for ${key} is not preset`);
      }
    }
  });

  return updatedFormula;
}
