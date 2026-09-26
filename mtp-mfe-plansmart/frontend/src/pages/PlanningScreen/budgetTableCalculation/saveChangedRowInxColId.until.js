function saveChangedRowInxColId({ columnId, rowInx }) {
  this.trackChangedRowInxColInx.push({
    columnId,
    rowInx
  });
}

export default saveChangedRowInxColId;
