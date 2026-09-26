import { cloneDeep, get } from "lodash";
import calculateDependentKpiUtil from "./calculateDependentKpi.util";
import runEdibilityFlowUtil from "./runEditibilityFlow.util";
import updateRowData from "./updateRowData.util";
import getEligibleChannelColumnsUtil from "./getEligibleChannelColumns.util";
import isChannelEligibleUtil from "./isChannelEligible.util";

export default function ({
  dependentFlow,
  initialRollDownQueue,
  sequenceTimelineCount,
  sequenceDependentFlow
}) {
  console.time("dependentFlow");

  dependentFlow.forEach((kpiFlow, index) => {
    if (
      sequenceDependentFlow &&
      !kpiFlow.allSequenceTimelineUpdate &&
      kpiFlow.sequenceTimelineCount > sequenceTimelineCount
    ) {
      return;
    }

    if (index === 0 && !kpiFlow.sequenceflow) {
      if (kpiFlow.kpi !== this.changedKpi) {
        initialRollDownQueue.forEach((rollDownQueueKey) => {
          updateRowData.call(this, {
            rowInx: rollDownQueueKey.rowInx,
            key: rollDownQueueKey.colId,
            value: rollDownQueueKey.changedCellData.user_entered_value
          });
        });

        calculateDependentKpiUtil.call(this, {
          rollDownQueue: initialRollDownQueue,
          dependentRollDownQueue: this.rollDownQueue,
          kpiFlow
        });
      } else {
        this.rollDownQueue = initialRollDownQueue;
      }

      runEdibilityFlowUtil.call(this, {
        rollDownQueue: this.rollDownQueue,
        kpiFlow,
        isSelf: true
      });
    } else {
      if (kpiFlow.sequenceflow) {
        if (!get(this.kpiConfigV2, kpiFlow.kpi)) {
          return;
        }
        this.rollDownQueue = this.rollDownQueue.map((rollDownQueueKey) => {
          const isChannelEligible = isChannelEligibleUtil.call(this, {
            kpi: kpiFlow.kpi,
            row: this.rowData[rollDownQueueKey.rowInx],
            column: rollDownQueueKey.colId
          });
          if (!isChannelEligible) {
            const eligibleColumns = getEligibleChannelColumnsUtil.call(this, {
              kpi: kpiFlow.kpi,
              row: this.rowData[rollDownQueueKey.rowInx],
              column: this.channelRollUpMapping[rollDownQueueKey.colId]
            });

            return {
              ...rollDownQueueKey,
              colId: eligibleColumns[0] // right now we have only one eligible channel for so taking 0th element
            };
          }
          return rollDownQueueKey;
        });
      }

      calculateDependentKpiUtil.call(this, {
        rollDownQueue: cloneDeep(this.rollDownQueue),
        dependentRollDownQueue: this.rollDownQueue,
        kpiFlow
      });

      if (!this.skipEditibilityFlow) {
        runEdibilityFlowUtil.call(this, {
          rollDownQueue: this.rollDownQueue,
          kpiFlow
        });
      }
    }
  });
  console.timeEnd("dependentFlow");
}
