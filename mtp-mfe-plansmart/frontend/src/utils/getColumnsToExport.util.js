export const getColumnsToExport = (tableRef) => {
  const displayedColumns =
    tableRef.current?.columnApi?.getAllDisplayedColumns() || [];

  const allColumns = tableRef.current?.columnApi?.getAllColumns() || [];
  const columns = [...allColumns.slice(0, 1), ...displayedColumns];

  return columns;
};
