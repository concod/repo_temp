import { get, includes, isArray } from "lodash";
import findLeafCells from "./getLeafCells.util";
import isCellActualizedUtil from "./isCellActualized.util";

export function isSomethingLockedOnTimeLineUtil({ accessor }) {
  let column = accessor;
  let isLocked = false;

  if (this.channelRollUpMapping[accessor]) {
    column = this.channelRollUpMapping[accessor];
  }

  if (this.channelRollDownMapping[column]) {
    [...column, ...this.channelRollDownMapping[column]].some(
      (rollDownMappingKey) => {
        if (
          isArray(this.lockedCells[rollDownMappingKey]) ||
          isCellActualizedUtil.call(this, { accessor: rollDownMappingKey })
        ) {
          isLocked = true;
        }
      }
    );
  }

  return isLocked;
}

export default function ({ accessor, rowInx }) {
  const isActualized = isCellActualizedUtil.call(this, { accessor });

  if (isActualized) return true;

  if (get(this.lockedCells, accessor, 0)) {
    return includes(this.lockedCells[accessor], rowInx);
  }
}
