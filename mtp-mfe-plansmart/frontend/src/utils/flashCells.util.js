const flashEditedCells = ({ tableRef, newRefreshCells }) => {
  const { columnDef, rowData } = newRefreshCells;
  const rowNodes = rowData?.map((uniqueId) =>
    tableRef?.current?.api?.getRowNode(uniqueId)
  );
  tableRef?.current?.api?.flashCells({
    rowNodes,
    columns: columnDef
  });
  tableRef?.current?.api?.refreshCells({
    force: true
  });
};

export default flashEditedCells;
