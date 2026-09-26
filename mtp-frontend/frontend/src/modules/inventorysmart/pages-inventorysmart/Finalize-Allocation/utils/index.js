import {
  CASE_PACK_ERROR_MESSAGE,
  DC_AVAILABILITY_BREACH_ERR_MSG,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";

export const checkIfAllocationIsInMultiples = (
  columns,
  editedRows,
  packDetails,
  casePackFactors
) => {
  for (const column of columns) {
    if (column.field === "allocated_header") {
      const subHeaders = column.children;

      for (const editedRow of editedRows) {
        const size = editedRow.size;
        const sizePackInfo = packDetails[size];

        if (sizePackInfo) {
          continue;
        }

        for (const subHeader of subHeaders) {
          const dcName = subHeader.headerName;
          const dcCode = subHeader.field;
          const allocatedAmount = editedRow[dcCode];
          const expectedInMultiples = casePackFactors[size];
          const isAllocationInMultiples =
            allocatedAmount % expectedInMultiples === 0;

          if (!isAllocationInMultiples) {
            return CASE_PACK_ERROR_MESSAGE;
            // return `Allocation for size "${size}" in DC "${dcName}" is expected to be in multiples of ${expectedInMultiples}`;
          }
        }
      }
    }
  }
};

export const checkIfAllocationIsWithinDCAvailability = (
  columns,
  editedRows,
  tableData
) => {
  for (const editedRow of editedRows) {
    const originalRowData = tableData.find(row => row.size === editedRow.size);

    for (const column of columns) {
      if (column.field === "allocated_header") {
        const subHeaders = column.children;
        const netDCAvlSubHeaders = columns.find(column => column.field === 'net_dc_available').children;

        for (let index = 0; index < subHeaders.length; index++) {
          const subHeader = subHeaders[index];
          const colField = subHeader.field;
          const netAvlDCColField = netDCAvlSubHeaders[index].field;

          if (editedRow[colField] > (editedRow[netAvlDCColField] + originalRowData[colField])) {
            return DC_AVAILABILITY_BREACH_ERR_MSG;
          }
        }
      }
    }
  }
};
