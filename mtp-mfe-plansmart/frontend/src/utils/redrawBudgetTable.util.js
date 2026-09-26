function redrawBudgetTable({ tableRef, rowData }) {
  setTimeout(() => {
    if (rowData?.length > 0) {
      const rowNodes = rowData?.map((uniqueId) =>
        tableRef?.current?.api?.getRowNode(uniqueId)
      );
      tableRef?.current?.api?.redrawRows({
        rowNodes: rowNodes
      });
    } else {
      tableRef?.current?.api?.redrawRows();
    }
  }, 0);
}
export default redrawBudgetTable;
