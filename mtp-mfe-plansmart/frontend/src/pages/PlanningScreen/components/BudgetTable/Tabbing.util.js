class Tabbing {
  constructor({
    event,
    column,
    instance,
    lockedCells,
    currentColInx,
    editableAndNonHiddenColumnDefs,
    currentRowIndex
  }) {
    this.event = event;
    this.column = column;
    this.gridApi = instance.api;
    this.currentRowIndex = currentRowIndex;
    this.editableAndNonHiddenColumnDefs = editableAndNonHiddenColumnDefs;
    this.lockedCells = lockedCells;
    this.currentColInx = currentColInx;
  }

  isLastColumn = (rowIndex) =>
    this.editableAndNonHiddenColumnDefs.length ===
    this.editableAndNonHiddenColumnDefs?.findIndex((col) => {
      return col.colId === this.editableAndNonHiddenColumnDefs[rowIndex]?.colId;
    }) +
      1;

  findNextColumnEditable = (startIndex, column, rowInx) => {
    if (
      startIndex < 0 ||
      startIndex >= this.editableAndNonHiddenColumnDefs.length
    ) {
      return [column, false];
    }

    for (
      let i = startIndex;
      i < this.editableAndNonHiddenColumnDefs.length;
      i++
    ) {
      const colDef = this.editableAndNonHiddenColumnDefs[i];

      if (this.lockedCells?.[colDef.colId]) {
        continue;
      }

      const isLast = this.isLastColumn(i);

      this.gridApi?.ensureColumnVisible(colDef.colId);
      this.gridApi.ensureNodeVisible(this.node, "middle");

      const cellHTMLElement = this.gridApi.rowModel.beans.rowRenderer.rowCtrlsByRowIndex[
        rowInx
      ]?.getCellElement(colDef);

      if (cellHTMLElement?.querySelector("input")) {
        return [colDef, false];
      } else if (isLast) {
        return [colDef, true];
      }
    }

    return [column, false];
  };

  checkIsLastColumnIndex = () =>
    this.editableAndNonHiddenColumnDefs.length ===
    this.editableAndNonHiddenColumnDefs?.findIndex((col) => {
      return col.colId === this.column?.colId && col?.colDef?.is_editable;
    }) +
      1;

  focusCell = (column, rowInx, rowNode) => {
    this.gridApi?.ensureColumnVisible(column?.colId);
    this.gridApi.ensureNodeVisible(rowNode, "middle");
    const cellHTMLElement = this.gridApi.rowModel.beans.rowRenderer.rowCtrlsByRowIndex[
      rowInx
    ]?.getCellElement(column);

    if (cellHTMLElement) {
      cellHTMLElement.querySelector("input").focus();
      cellHTMLElement.querySelector("input").select();
    }

    this.event.preventDefault();
  };

  findEditableRowNode = (columnDef, startInx, rowNode, backwards) => {
    const rowData = this.gridApi?.rowModel?.rowsToDisplay;

    if (!rowData || rowData.length === 0) {
      return [{}, -1];
    }

    let rowIndex = startInx;

    while (
      (!backwards && rowIndex < rowData.length) ||
      (backwards && rowIndex >= 0)
    ) {
      this.gridApi?.ensureColumnVisible(columnDef?.colId);
      this.gridApi.ensureNodeVisible(rowData[rowIndex], "middle");

      const cellHTMLElement = this.gridApi.rowModel.beans.rowRenderer.rowCtrlsByRowIndex[
        rowIndex
      ]?.getCellElement(columnDef);

      if (cellHTMLElement?.querySelector("input")) {
        return [rowData[rowIndex], rowIndex];
      }

      if (backwards) {
        rowIndex -= 1;
      } else {
        rowIndex += 1;
      }
    }

    return [{}, -1];
  };

  getFirstEditableColumnAndNonLocked = () => {
    return this.editableAndNonHiddenColumnDefs.find(
      (col) => col?.colDef?.is_editable || this.lockedCells?.[col?.colId]
    );
  };

  forwardTabbing = () => {
    const startIndex = this.currentColInx + 1;

    const [nextColumn, isLastColumn] = this.findNextColumnEditable(
      startIndex,
      this.column,
      this.currentRowIndex,
      this.node
    );

    const isLastColumnIndex = this.checkIsLastColumnIndex();

    if (nextColumn && !isLastColumnIndex && !isLastColumn) {
      return this.focusCell(nextColumn, this.currentRowIndex, this.node);
    }

    if ((isLastColumnIndex || isLastColumn) && nextColumn) {
      const firstColumn = this.getFirstEditableColumnAndNonLocked();
      const nextRow = this.currentRowIndex + 1;

      const [nextRowNode, nextRowInx] = this.findEditableRowNode(
        firstColumn,
        nextRow,
        this.node,
        false
      );

      if (Object.keys(nextRowNode).length > 0) {
        return this.focusCell(firstColumn, nextRowInx, nextRowNode);
      } else {
        this.event.preventDefault();
        this.event.stopPropagation();
      }
    }
  };

  isFirstColumn = (rowIndex) => {
    const currentColId = this.editableAndNonHiddenColumnDefs[rowIndex]?.colId;

    return (
      this.editableAndNonHiddenColumnDefs.length > 0 &&
      this.editableAndNonHiddenColumnDefs[0]?.colId === currentColId
    );
  };

  findPreviousColumnEditable = (startIndex, column, rowInx) => {
    if (
      startIndex < 0 ||
      startIndex >= this.editableAndNonHiddenColumnDefs.length
    ) {
      return [column, false];
    }

    for (let i = startIndex; i >= 0; i--) {
      const colDef = this.editableAndNonHiddenColumnDefs[i];

      if (this.lockedCells?.[colDef.colId]) {
        continue;
      }

      const isFirst = this.isFirstColumn(i);
      if (isFirst) {
        return [colDef, true];
      }

      this.gridApi?.ensureColumnVisible(colDef.colId);
      this.gridApi.ensureNodeVisible(this.node, "middle");

      const cellHTMLElement = this.gridApi.rowModel.beans.rowRenderer.rowCtrlsByRowIndex[
        rowInx
      ]?.getCellElement(colDef);

      if (cellHTMLElement?.querySelector("input")) {
        return [colDef, false];
      }
    }

    return [column, false];
  };

  getLastEditableNonHiddenColumnDef = () => {
    const inx = this.editableAndNonHiddenColumnDefs?.findLastIndex(
      (col) => col?.colDef?.is_editable && !this.lockedCells?.[col.colId]
    );
    return this.editableAndNonHiddenColumnDefs[inx] || {};
  };

  reverseTabbing = () => {
    const firstEditableColDef = this.getFirstEditableColumnAndNonLocked();
    const [prevColumn] = this.findPreviousColumnEditable(
      this.currentColInx - 1,
      this.column,
      this.currentRowIndex,
      this.node
    );
    const [prevRowNode, prevRowInx] = this.findEditableRowNode(
      prevColumn,
      this.currentRowIndex - 1,
      this.node,
      true
    );

    if (
      this.column?.colId === firstEditableColDef?.colId &&
      prevRowInx !== -1
    ) {
      const lastEditableColDef = this.getLastEditableNonHiddenColumnDef();
      this.gridApi?.ensureColumnVisible(lastEditableColDef?.colId);

      return this.focusCell(lastEditableColDef, prevRowInx, prevRowNode);
    } else {
      return this.focusCell(prevColumn, this.currentRowIndex, this.node);
    }
  };
}

export default Tabbing;
