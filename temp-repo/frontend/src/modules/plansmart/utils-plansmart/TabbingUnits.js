import { customCellRenderer } from "../pages-plansmart/plansmart-budget-table/budget-table-functions";

class TabbingUntil {
  constructor(event, column, instance, metrics_with_formatter, planDetails) {
    this.event = event;
    this.column = column;
    this.metrics_with_formatter = metrics_with_formatter;
    this.planDetails = planDetails;
    this.columnApi = instance?.columnApi;
    this.gridApi = instance.api;
    this.node = instance?.node;
    this.currentRowNode = instance?.node || {};
    this.currentRowIndex = this.node?.rowIndex;
    this.editableAndNonHiddenColumnDefs = instance?.columnApi
      ?.getAllColumns()
      ?.filter((col) => col?.colDef?.is_editable && !col?.colDef?.is_hidden);
    this.lockedCells =
      this.gridApi?.rowModel?.rootNode?.allLeafChildren?.[1]?.data
        ?.cellLocked || {};
  }

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

  findEditableRowNode = (columnDef, startInx, backwards) => {
    const rowData = this.gridApi?.rowModel?.rowsToDisplay;
    for (
      let i = startInx;
      (!backwards && i < rowData?.length) || (backwards && i >= 0);
      backwards ? i-- : i++
    ) {
      const is_editable = customCellRenderer(
        this.metrics_with_formatter,
        {
          column: columnDef,
          data: rowData[i].data,
        },
        this.planDetails
      );
      if (is_editable?.type) {
        return [rowData[i], i];
      }
    }
    return [{}, -1];
  };

  findColumnIndex = (columnId) =>
    this.editableAndNonHiddenColumnDefs?.findIndex((col) => {
      return col.colId === columnId;
    });

  findNextColumnEditable = (startIndex) => {
    for (
      let i = startIndex;
      i < this.editableAndNonHiddenColumnDefs?.length;
      i++
    ) {
      if (
        !this.lockedCells?.[this.editableAndNonHiddenColumnDefs[i]?.colId] &&
        this.editableAndNonHiddenColumnDefs[i]?.colDef?.is_editable
      ) {
        return this.editableAndNonHiddenColumnDefs[i];
      }
    }
    return this.column;
  };

  getFirstEditableColumnAndNonLocked = () => {
    return this.editableAndNonHiddenColumnDefs.filter(
      (col) => col?.colDef?.is_editable && !this.lockedCells?.[col?.colId]
    )[0];
  };

  findFirstColumnEditableAndNonLockedInx = () =>
    this.editableAndNonHiddenColumnDefs?.findIndex((col) => {
      return (
        col.colId && col?.colDef?.is_editable && !this.lockedCells?.[col.colId]
      );
    });

  checkIsLastColumnIndex = () =>
    this.editableAndNonHiddenColumnDefs.length ===
    this.editableAndNonHiddenColumnDefs?.findIndex((col) => {
      return col.colId === this.column?.colId && col?.colDef?.is_editable;
    }) +
      1;

  forwardTabbing = () => {
    let startIndex = this.findColumnIndex(this.column?.colId) + 1;
    let nextColumn = this.findNextColumnEditable(startIndex);
    let isLastColumnIndex = this.checkIsLastColumnIndex();
    if (nextColumn && !isLastColumnIndex) {
      return this.focusCell(nextColumn, this.currentRowIndex, this.node);
    }
    if (isLastColumnIndex && nextColumn) {
      const firstColumn = this.getFirstEditableColumnAndNonLocked();
      this.gridApi?.ensureColumnVisible(firstColumn?.colId);
      const nextRow = this.currentRowIndex + 1;
      const [nextRowNode, nextRowInx] = this.findEditableRowNode(
        firstColumn,
        nextRow,
        false
      );
      if (Object.keys(nextRowNode).length > 0)
        return this.focusCell(firstColumn, nextRowInx, nextRowNode);
      else {
        // move to starting editable row
        let [newRowNode, newRowInx] = this.findEditableRowNode(
          firstColumn,
          0,
          false
        );
        return this.focusCell(firstColumn, newRowInx, newRowNode);
      }
    }
  };

  findPreviousColumnEditable = (startInx) => {
    for (let i = startInx; i >= 0; i--) {
      if (
        !this.lockedCells?.[this.editableAndNonHiddenColumnDefs[i]?.colId] &&
        this.editableAndNonHiddenColumnDefs[i]?.colDef?.is_editable
      ) {
        return this.editableAndNonHiddenColumnDefs[i];
      }
    }
    return this.column;
  };

  getLastEditableNonHiddenColumnDef = () => {
    const inx = this.editableAndNonHiddenColumnDefs?.findLastIndex(
      (col) => !this.lockedCells?.[col.colId] && col?.colDef?.is_editable
    );
    return this.editableAndNonHiddenColumnDefs[inx] || {};
  };

  reverseTabbing = () => {
    const firstEditableColDef = this.getFirstEditableColumnAndNonLocked();
    const currentColInx = this.findColumnIndex(this.column?.colId); // current column index
    const prevColumn = this.findPreviousColumnEditable(currentColInx - 1);
    const rowData = this.gridApi?.rowModel?.rowsToDisplay;

    if (this.column?.colId === firstEditableColDef?.colId) {
      const lastEditableColDef = this.getLastEditableNonHiddenColumnDef();
      this.gridApi?.ensureColumnVisible(lastEditableColDef?.colId);
      const [prevRowNode, prevRowInx] = this.findEditableRowNode(
        prevColumn,
        this.currentRowIndex - 1,
        true
      );
      if (prevRowInx === -1) {
        const [lastRowNode, lastRowInx] = this.findEditableRowNode(
          lastEditableColDef,
          rowData.length - 1,
          true
        );
        return this.focusCell(lastEditableColDef, lastRowInx, lastRowNode);
      } else {
        return this.focusCell(lastEditableColDef, prevRowInx, prevRowNode);
      }
    } else {
      return this.focusCell(prevColumn, this.currentRowIndex, this.node);
    }
  };
}

export default TabbingUntil;
