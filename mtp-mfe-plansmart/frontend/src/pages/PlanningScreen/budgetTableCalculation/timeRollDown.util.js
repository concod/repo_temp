import executeFormulaUtil from "./common/executeFormula.util";
import updateRowData from "./common/updateRowData.util";
import { findIndex } from "lodash";
import rollUp from "./rollUp.util";
import { TIME_HIERARCHY_KEY } from "./budgetTableCalculation.constant";
import isCellLockedUtil from "./common/isCellLocked.util";
import { ZERO_HANDLING } from "../apis/budgetTable.data";
import numberValidationUtil from "./common/numberValidation.util";
import saveChangedRowInxColId from "./saveChangedRowInxColId.until";
import isTimelineLockedUtil, {
  isSomethingLockedOnTimeLineUtil
} from "./common/isTimelineLocked.util";
import isChannelEligibleUtil from "./common/isChannelEligible.util";

function timeRollDown({ timeRollDownQueue, kpiFlow, excludedCell }) {
  timeRollDownQueue.forEach((timeRollDownQueueKey) => {
    if (this.timeRollDownMapping[timeRollDownQueueKey.colId]) {
      timeRollDownQueue.shift();

      this.timeRollDownMapping[timeRollDownQueueKey.colId].forEach(
        (timeRollDownKey) => {
          this.currentHierarchy = TIME_HIERARCHY_KEY;

          const isSomethingLockedOnTimeLine = isSomethingLockedOnTimeLineUtil.call(
            this,
            { accessor: timeRollDownKey }
          );

          if (isSomethingLockedOnTimeLine) {
            if (!this.lockedCells[timeRollDownKey]) {
              this.lockedCells[timeRollDownKey] = [];
            }
            this.lockedCells[timeRollDownKey].push(timeRollDownQueueKey.rowInx);
          }

          const isCellLocked = isTimelineLockedUtil.call(this, {
            accessor: timeRollDownKey,
            rowInx: timeRollDownQueueKey.rowInx
          });

          this.changedColumnDef = this.columnsMap[timeRollDownKey];
          this.currentRow = this.rowData[timeRollDownQueueKey.rowInx];

          const isCellExcluded =
            excludedCell !== null &&
            excludedCell?.colId === timeRollDownKey &&
            excludedCell?.rowInx === timeRollDownQueueKey.rowInx;

          const isChannelEligible = isChannelEligibleUtil.call(this, {
            kpi: kpiFlow.kpi
          });

          if (!(isCellLocked || isCellExcluded)) {
            let value = 0;

            if (
              Number(
                timeRollDownQueueKey.changedCellData.before_user_entered_value
              ) === 0
            ) {
              if (kpiFlow.zeroHandling === ZERO_HANDLING.PROPORTIONAL) {
                const childLength = this.timeRollDownMapping[
                  timeRollDownQueueKey.colId
                ].length;

                value = numberValidationUtil(
                  timeRollDownQueueKey.changedCellData.user_entered_value /
                    childLength
                );
              } else if (kpiFlow.zeroHandling === ZERO_HANDLING.EQUAL) {
                value = numberValidationUtil(
                  timeRollDownQueueKey.changedCellData.user_entered_value
                );
              }
              if (JSON.parse(this.logCalculations)) {
                console.log("timeRollDown-zeroHandled", value);
              }
            } else {
              value = executeFormulaUtil.call(
                this,
                kpiFlow.rollDownTimeline,
                {
                  ...timeRollDownQueueKey.changedCellData,
                  focused_value: this.rowData[timeRollDownQueueKey.rowInx][
                    timeRollDownKey
                  ]
                },
                "time-rollDown",
                {
                  colId: timeRollDownKey,
                  rowInx: timeRollDownQueueKey.rowInx
                }
              );
            }

            const duplicateQueueKeyIndex = findIndex(timeRollDownQueue, {
              rowInx: timeRollDownQueueKey.rowInx,
              colId: timeRollDownKey
            });

            if (duplicateQueueKeyIndex === -1) {
              timeRollDownQueue.push({
                rowInx: timeRollDownQueueKey.rowInx,
                colId: timeRollDownKey,
                changedCellData: {
                  before_user_entered_value: this.rowData[
                    timeRollDownQueueKey.rowInx
                  ][timeRollDownKey],
                  user_entered_value: value
                },
                isChannelEligible
              });
            }

            if (isChannelEligible) {
              updateRowData.call(this, {
                rowInx: timeRollDownQueueKey.rowInx,
                key: timeRollDownKey,
                value: value
              });
              saveChangedRowInxColId.call(this, {
                columnId: timeRollDownKey,
                rowInx: timeRollDownQueueKey.rowInx
              });
            }
          }
        }
      );

      timeRollDown.call(this, {
        timeRollDownQueue,
        kpiFlow
      });
    }
  });
}

export default timeRollDown;
