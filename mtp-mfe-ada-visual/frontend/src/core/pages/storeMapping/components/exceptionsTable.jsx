import { useEffect } from "react";
import AgGridTable from "core/Utils/agGrid";

const AddExceptionsTable = ({
  addExceptionsTableColumns,
  exceptionsTableData,
  setFlagEdit,
  setExceptionsTableData,
}) => {
  /**
   *
   * @param {table params} params
   * returns void
   * Make the setFlagEdit as true
   */
  const onCellValueChanged = (params) => {
    setFlagEdit(true);
  };

  /**
   *
   * @param {table callback} event
   * returns void
   */
  const onDeleteException = (event) => {
    let tableData = [];
    event.api.forEachNode((rowNode, index) => {
      tableData.push(rowNode.data);
    });

    //Filter out the row which is deleted
    let updatedExceptionsTableData = tableData.filter(
      (data) => data.id !== event.data.id
    );

    //Update the id after removing the row
    updatedExceptionsTableData = updatedExceptionsTableData.map((data, idx) => {
      return {
        ...data,
        id: "row" + (idx + 1),
      };
    });
    setExceptionsTableData(updatedExceptionsTableData);
  };
  return (
    <>
      {addExceptionsTableColumns.length > 0 && (
        <AgGridTable
          columns={addExceptionsTableColumns}
          rowdata={exceptionsTableData}
          sizeColumnsToFitFlag
          onCellValueChanged={onCellValueChanged}
          callDeleteApi={onDeleteException}
          uniqueRowId={"id"}
          disableTableUam
        />
      )}
    </>
  );
};

export default AddExceptionsTable;
