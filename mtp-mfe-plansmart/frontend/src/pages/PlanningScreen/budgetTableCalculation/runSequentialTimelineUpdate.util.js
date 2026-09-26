import runDependentFlow from "./common/runDependentFlow.util";

export default function runSequentialTimelineUpdate({ kpiFlow }) {
  const { uniqColIds, uniqueRows } = this.rollDownQueue.reduce(
    (acc, rollDownData) => {
      if (!acc.uniqueRows.includes(rollDownData.rowInx)) {
        acc.uniqueRows = [...acc.uniqueRows, rollDownData.rowInx];
      }
      if (!acc.uniqColIds.includes(rollDownData.colId)) {
        acc.uniqColIds = [...acc.uniqColIds, rollDownData.colId];
      }
      return acc;
    },
    {
      uniqColIds: [],
      uniqueRows: []
    }
  );

  for (let uniqColIdInx = 0; uniqColIdInx < uniqColIds.length; uniqColIdInx++) {
    const uniqColId = uniqColIds[uniqColIdInx];

    for (
      let uniqueRowInx = 0;
      uniqueRowInx < uniqueRows.length;
      uniqueRowInx++
    ) {
      let nextTimelineColId = this.futureTimelineMapping[uniqColId];
      this.changedColumnDef = this.columnsMap[nextTimelineColId];
      const rowIndex = uniqueRows[uniqueRowInx];
      this.changedRow = this.rowData[rowIndex];
      this.changedRowInx = rowIndex;
      let sequenceTimelineCount = 0;
      while (nextTimelineColId) {
        sequenceTimelineCount++;
        const queue = [
          {
            rowInx: rowIndex,
            colId: nextTimelineColId,
            changedCellData: this.changedCellData
          }
        ];

        this.rollDownQueue = queue;

        runDependentFlow.call(this, {
          dependentFlow: kpiFlow,
          initialRollDownQueue: queue,
          sequenceDependentFlow: true,
          sequenceTimelineCount: sequenceTimelineCount
        });
        nextTimelineColId = this.futureTimelineMapping[nextTimelineColId];
        this.changedColumnDef = this.columnsMap[nextTimelineColId];
      }
    }
  }
}
