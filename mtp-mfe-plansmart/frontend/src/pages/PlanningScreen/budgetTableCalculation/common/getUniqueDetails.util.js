/**
 * Retrieves unique details from a tracked list of row and column indexes.
 * @param {void}
 * @returns {Object} An object containing unique column IDs, row indexes, and tracked changes.
 * @description
 *   - Returns an accumulator object with lists and sets for unique tracking.
 *   - Filters data based on specific conditions involving channel, time, and row data mappings.
 */
function getUniqueDetails() {
  return this.trackChangedRowInxColInx.reduce(
    (acc, data) => {
      if (!acc.uniqueColIdList.includes(data.columnId)) {
        acc.uniqueColIdList.push(data.columnId);
      } else if (!acc.uniqueRowIndexList.includes(data.rowInx)) {
        acc.uniqueRowIndexList.push(data.rowInx);
      }

      if (
        !this.channelRollDownMapping[data.columnId] &&
        !this.timeRollDownMapping[data.columnId] &&
        !this.rowData[data.rowInx].children_indexes
      ) {
        const setKey = `${data.columnId}_${data.rowInx}`;
        if (!acc.identifierSet.has(setKey)) {
          acc.identifierSet.add(setKey);
          acc.uniqueTrackChangedRowInxColInx.push(data);
        }
      }

      return acc;
    },
    {
      uniqueColIdList: [],
      uniqueRowIndexList: [],
      uniqueTrackChangedRowInxColInx: [],
      identifierSet: new Set()
    }
  );
}

export default getUniqueDetails;
