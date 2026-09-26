import { difference, get, intersection, union, cloneDeep } from "lodash";

import {
  CHANNEL_CLASS_CONTRIBUTION,
  CLASS_CONTRIBUTION,
  TOGGLE_LOCK_ACTION,
  TOTAL
} from "./cellRender.constant";

class CellLockUnlock {
  constructor(
    colDef,
    data,
    tableRowData,
    lockedCells,
    action,
    channelRollDownMapping,
    channelRollUpMapping,
    rowDataInxMapping,
    isTargetPlan,
    timeRollUpMapping,
    timeRollDownMapping
  ) {
    this.colDef = colDef;
    this.data = data;
    this.action = action;
    this.lockedCells = lockedCells;
    this.tableRowData = tableRowData;
    this.channelRollDownMapping = channelRollDownMapping;
    this.channelRollUpMapping = channelRollUpMapping;
    this.rowDataInxMapping = rowDataInxMapping;
    this.isTargetPlan = isTargetPlan;
    this.timeRollUpMapping = timeRollUpMapping;
    this.timeRollDownMapping = timeRollDownMapping;
  }

  runLockUnlock({ index, accessor }) {
    this.updateLockUnlockStatus({ index, accessor });
    this._updateRecursively({ index, accessor });
    // this.updateContributions({ index, accessor });
    this.updateDependantKpis({ index, accessor });
  }

  _updateRecursively({ index, accessor }) {
    this.executeParentChildLevel({ index, accessor });
    this.executeChannelLevel({ index, accessor });
    this.executeTimelineLevel({ index, accessor });
  }

  updateLockUnlockStatus({ index, accessor }) {
    if (this.action === TOGGLE_LOCK_ACTION.LOCK) {
      const lockedCells = this.lockedCells[accessor] || [];
      this.lockedCells = {
        ...this.lockedCells,
        [accessor]: [...lockedCells, index]
      };
    } else if (this.action === TOGGLE_LOCK_ACTION.UNLOCK) {
      const lockedCells = this.lockedCells[accessor].filter(
        (cellIndex) => cellIndex !== index
      );
      if (lockedCells && lockedCells.length) {
        this.lockedCells = {
          ...this.lockedCells,
          [accessor]: lockedCells
        };
      } else {
        delete this.lockedCells[accessor];
      }
    }
  }

  executeParentChildLevel({ accessor }) {
    const children_indexes = this.data.children_indexes;
    const parent_index = this.data.parent_index;
    const hasChild = !!(children_indexes && children_indexes.length);
    const hasParent = parent_index >= 0;

    if (hasChild) {
      const childRows = this.data.children_indexes.map(
        (rowIndex) => this.tableRowData[rowIndex]
      );
      if (this.action === TOGGLE_LOCK_ACTION.LOCK) {
        // remaining unlocked cells
        const dependantChild = childRows.filter(
          (childRow) =>
            !get(this.lockedCells, accessor, []).includes(childRow.index)
        );
        // parent is locked & all child cells are locked except 1 => lock unlocked child
        if (dependantChild.length === 1) {
          this.runLockUnlock({ index: dependantChild[0].index, accessor });
        }
      } else if (this.action === TOGGLE_LOCK_ACTION.UNLOCK) {
        // remaining locked cells
        const dependantChild = childRows.filter((childRow) =>
          get(this.lockedCells, accessor, []).includes(childRow.index)
        );
        // parent is locked & all child cells are locked => unlock locked first child
        if (dependantChild.length === childRows.length) {
          this.runLockUnlock({ index: dependantChild[0].index, accessor });
        }
      }
    }

    if (hasParent) {
      const parentRow = this.tableRowData[this.data.parent_index];
      const isParentLocked = get(this.lockedCells, accessor, []).includes(
        parentRow.index
      );
      const childRows = this.tableRowData[parentRow.index].children_indexes.map(
        (rowIndex) => this.tableRowData[rowIndex]
      );
      const lockedDependantChilds = childRows.filter((childRow) =>
        get(this.lockedCells, accessor, []).includes(childRow.index)
      );
      const unlockedDependantChilds = childRows.filter(
        (childRow) =>
          !get(this.lockedCells, accessor, []).includes(childRow.index)
      );

      if (this.action === TOGGLE_LOCK_ACTION.LOCK) {
        if (isParentLocked) {
          // parent is locked & one of child is locked => lock unlocked child
          if (unlockedDependantChilds.length === 1) {
            this.runLockUnlock({
              index: unlockedDependantChilds[0].index,
              accessor
            });
          }
        } else {
          // parent locked && all child locked => lock parent
          if (lockedDependantChilds.length === childRows.length) {
            this.runLockUnlock({ index: parentRow.index, accessor });
          }
        }
      } else if (this.action === TOGGLE_LOCK_ACTION.UNLOCK) {
        if (isParentLocked) {
          // parent locked && all child locked(-1 as child will be unlocked) => unlock parent
          if (lockedDependantChilds.length === childRows.length - 1) {
            this.runLockUnlock({ index: parentRow.index, accessor });
          }
        }
      }
    }
  }

  executeChannelLevel({ index, accessor }) {
    const { baseUrl } = window.localStorage;
    const isArhaus = baseUrl.includes("arhaus");
    // WAREHOUSE is hidden so count is 1.
    // If none of the channels are hidden then count will be 0
    // TODO: [https://impactanalytics.atlassian.net/browse/MTP-53766] Code cleanup
    const HIDDEN_CHANNEL_COUNT = isArhaus ? 1 : 0; // Arhaus = 1; PCHI = 0;
    const hasChild = Object(this.channelRollDownMapping).hasOwnProperty(
      accessor
    );
    const hasParent = Object(this.channelRollUpMapping).hasOwnProperty(
      accessor
    );

    if (hasChild) {
      const childColumns = this.channelRollDownMapping[accessor];
      const unlockedDependantChilds = childColumns.filter(
        (childColumn) => !get(this.lockedCells, childColumn, []).includes(index)
      );
      const lockedDependantChilds = childColumns.filter((childColumn) =>
        get(this.lockedCells, childColumn, []).includes(index)
      );

      if (this.action === TOGGLE_LOCK_ACTION.LOCK) {
        // parent is locked & one of child is locked => lock unlocked child
        if (unlockedDependantChilds.length === 1 + HIDDEN_CHANNEL_COUNT) {
          this.runLockUnlock({ index, accessor: unlockedDependantChilds[0] });
        }
      } else if (this.action === TOGGLE_LOCK_ACTION.UNLOCK) {
        // parent is locked & one of child is locked => lock unlocked child
        if (
          lockedDependantChilds.length ===
          childColumns.length - HIDDEN_CHANNEL_COUNT
        ) {
          this.runLockUnlock({ index, accessor: lockedDependantChilds[0] });
        }
      }
    }

    if (hasParent) {
      const parentColumn = this.channelRollUpMapping[accessor][0];
      const childColumns = this.channelRollDownMapping[parentColumn];
      const isParentLocked = get(this.lockedCells, parentColumn, []).includes(
        index
      );
      const unlockedDependantChild = childColumns.filter(
        (childColumn) => !get(this.lockedCells, childColumn, []).includes(index)
      );
      const lockedDependantChild = childColumns.filter((childColumn) =>
        get(this.lockedCells, childColumn, []).includes(index)
      );
      if (this.action === TOGGLE_LOCK_ACTION.LOCK) {
        if (isParentLocked) {
          // parent is locked & one of child is locked => lock unlocked child
          if (unlockedDependantChild.length === 1 + HIDDEN_CHANNEL_COUNT) {
            this.runLockUnlock({ index, accessor: unlockedDependantChild[0] });
          }
        } else {
          // all child locked => lock parent
          if (
            lockedDependantChild.length ===
            childColumns.length - HIDDEN_CHANNEL_COUNT
          ) {
            this.runLockUnlock({ index, accessor: parentColumn });
          }
        }
      } else if (this.action === TOGGLE_LOCK_ACTION.UNLOCK) {
        if (isParentLocked) {
          // parent is locked & one of child is locked => lock unlocked child
          if (
            lockedDependantChild.length ===
            childColumns.length - (1 + HIDDEN_CHANNEL_COUNT)
          ) {
            this.runLockUnlock({ index, accessor: parentColumn });
          }
        }
      }
    }
  }

  executeTimelineLevel({ index, accessor }) {
    const flattenedTimeRollDownMapping = this.timeRollDownMapping.reduce(
      (acc, mapping) => {
        acc = { ...acc, ...mapping };
        return acc;
      },
      {}
    );

    const flattenedTimeRollUpMapping = (() => {
      let flattenedMap = {};
      this.timeRollUpMapping.reduce((acc, mapping) => {
        acc = { ...acc, ...mapping };
        return acc;
      }, flattenedMap);
      for (let key in flattenedTimeRollDownMapping) {
        let mapList = {};
        for (let map of flattenedTimeRollDownMapping[key]) {
          if (!Object(this.timeRollUpMapping).hasOwnProperty(map)) {
            mapList[map] = [key];
          }
        }
        flattenedMap = { ...flattenedMap, ...mapList };
      }
      return flattenedMap;
    })();

    const hasChild = Object(flattenedTimeRollDownMapping).hasOwnProperty(
      accessor
    );
    const hasParent = Object(flattenedTimeRollUpMapping).hasOwnProperty(
      accessor
    );

    if (hasChild) {
      const childColumns = flattenedTimeRollDownMapping[accessor];
      const unlockedDependantChilds = childColumns.filter(
        (childColumn) => !get(this.lockedCells, childColumn, []).includes(index)
      );
      const lockedDependantChilds = childColumns.filter((childColumn) =>
        get(this.lockedCells, childColumn, []).includes(index)
      );
      if (this.action === TOGGLE_LOCK_ACTION.LOCK) {
        // parent is locked & one of child is locked => lock unlocked child
        if (unlockedDependantChilds.length === 1) {
          this.runLockUnlock({ index, accessor: unlockedDependantChilds[0] });
        }
      } else if (this.action === TOGGLE_LOCK_ACTION.UNLOCK) {
        // parent is unlocked & all child cells are locked => unlock locked first child
        if (lockedDependantChilds.length === childColumns.length) {
          this.runLockUnlock({ index, accessor: lockedDependantChilds[0] });
        }
      }
    }

    if (hasParent) {
      const parentColumn = flattenedTimeRollUpMapping[accessor][0];
      const childColumns = flattenedTimeRollDownMapping[parentColumn];
      const isParentLocked = get(this.lockedCells, parentColumn, []).includes(
        index
      );
      const lockedDependantChilds = childColumns.filter((childColumn) =>
        get(this.lockedCells, childColumn, []).includes(index)
      );
      const unlockedDependantChilds = childColumns.filter(
        (childColumn) => !get(this.lockedCells, childColumn, []).includes(index)
      );
      if (this.action === TOGGLE_LOCK_ACTION.LOCK) {
        if (isParentLocked) {
          // parent is locked & one of child is locked => lock unlocked child
          if (unlockedDependantChilds.length === 1) {
            this.runLockUnlock({ index, accessor: unlockedDependantChilds[0] });
          }
        } else {
          // all child locked => lock parent
          if (lockedDependantChilds.length === childColumns.length) {
            this.runLockUnlock({ index, accessor: parentColumn });
          }
        }
      } else if (this.action === TOGGLE_LOCK_ACTION.UNLOCK) {
        if (isParentLocked) {
          // parent locked && all child locked(-1 as child will be unlocked) => unlock parent
          if (lockedDependantChilds.length === childColumns.length - 1) {
            this.runLockUnlock({ index, accessor: parentColumn });
          }
        }
      }
    }
  }

  updateContributions() {
    const getPrimaryColAccessor = (colAccessor) => {
      let primaryAccessor = colAccessor;
      if (colAccessor.endsWith(CHANNEL_CLASS_CONTRIBUTION)) {
        primaryAccessor = colAccessor.slice(
          0,
          colAccessor.indexOf(CHANNEL_CLASS_CONTRIBUTION)
        );
      } else if (colAccessor.endsWith(CLASS_CONTRIBUTION)) {
        primaryAccessor = colAccessor.slice(
          0,
          colAccessor.indexOf(CLASS_CONTRIBUTION)
        );
      }
      return primaryAccessor;
    };

    let updatedLockedCells = cloneDeep(this.lockedCells);

    for (const colAccessor in updatedLockedCells) {
      const rowIndexes = updatedLockedCells[colAccessor];
      updatedLockedCells = { ...updatedLockedCells, [colAccessor]: rowIndexes };
      const primaryColAccessor = getPrimaryColAccessor(colAccessor);

      if (colAccessor.includes("Total")) {
        // add contribution for total column
        if (colAccessor.endsWith(CLASS_CONTRIBUTION)) {
          updatedLockedCells[primaryColAccessor] = rowIndexes;
        } else {
          updatedLockedCells[
            `${colAccessor}${CLASS_CONTRIBUTION}`
          ] = rowIndexes;
        }
      } else {
        // add contribution for non-total column
        if (colAccessor.endsWith(CHANNEL_CLASS_CONTRIBUTION)) {
          updatedLockedCells[primaryColAccessor] = rowIndexes;
          updatedLockedCells[
            `${primaryColAccessor}${CLASS_CONTRIBUTION}`
          ] = rowIndexes;
        } else if (colAccessor.endsWith(CLASS_CONTRIBUTION)) {
          updatedLockedCells[primaryColAccessor] = rowIndexes;
          updatedLockedCells[
            `${primaryColAccessor}${CHANNEL_CLASS_CONTRIBUTION}`
          ] = rowIndexes;
        } else {
          updatedLockedCells[
            `${colAccessor}${CLASS_CONTRIBUTION}`
          ] = rowIndexes;
          updatedLockedCells[
            `${colAccessor}${CHANNEL_CLASS_CONTRIBUTION}`
          ] = rowIndexes;
        }
      }
    }

    this.lockedCells = updatedLockedCells;
  }

  updateDependantKpis({ accessor, index }) {
    let updatedLockedCells = cloneDeep(this.lockedCells);
    const rowData = this.tableRowData[index];

    const getRowsList = ({ lockedRows, rowDataInxMapping }) => {
      // Below hardcoded code should to be improved
      // created tech debt ticket https://impactanalytics.atlassian.net/browse/MTP-54780
      let KPIRows;

      // check if its target plan
      if (this.isTargetPlan) {
        const l1Name = `${rowData.l1_name}_l1_name`;
        const l2Name = `${rowData.l2_name}_l2_name`;

        const l1Array = rowDataInxMapping[l1Name] || [];
        const l2Array = rowDataInxMapping[l2Name] || [];
        const selectedRows = intersection(l1Array, l2Array);

        if (rowData.l1_name === TOTAL && rowData.l2_name === TOTAL) {
          KPIRows = intersection(l1Array);
        } else if (rowData.l2_name === TOTAL) {
          KPIRows = intersection(selectedRows, l2Array);
        } else {
          KPIRows = intersection(l1Array, l2Array);
        }
      } else {
        KPIRows = intersection(
          rowDataInxMapping[
            (`${rowData.l2_name}_l2_name`, `${rowData.l3_name}_l3_name`)
          ]
        );
      }
      if (this.action === TOGGLE_LOCK_ACTION.LOCK) {
        return union([...lockedRows, index], KPIRows);
      }
      return difference(lockedRows, [...KPIRows, index]);
    };

    const lockedRows = get(updatedLockedCells, accessor, []);
    const lockedCells = getRowsList({
      lockedRows,
      rowDataInxMapping: this.rowDataInxMapping
    });
    if (lockedCells && lockedCells.length) {
      updatedLockedCells[accessor] = lockedCells;
    } else {
      delete updatedLockedCells[accessor];
    }

    this.lockedCells = updatedLockedCells;
  }
}

export function main({
  colDef,
  data,
  tableRowData,
  lockedCells,
  setLockedCells,
  action,
  channelRollDownMapping,
  channelRollUpMapping,
  rowDataInxMapping,
  isTargetPlan,
  timeRollUpMapping,
  timeRollDownMapping
}) {
  const cellLockUnlock = new CellLockUnlock(
    colDef,
    data,
    tableRowData,
    lockedCells,
    action,
    channelRollDownMapping,
    channelRollUpMapping,
    rowDataInxMapping,
    isTargetPlan,
    timeRollUpMapping,
    timeRollDownMapping
  );
  const index = data?.index;
  const accessor = colDef?.accessor;
  cellLockUnlock.runLockUnlock({ index, accessor });
  setLockedCells(cellLockUnlock.lockedCells);
}
