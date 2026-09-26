import React, { useMemo } from "react";
import AgGridComponent from "core/Utils/agGrid";
import "./allocationTable.css";

const AllocationTable = ({ data }) => {

  const columns = useMemo(() => {
    if (!data?.columns) return [];

    return data.columns.map((col) => ({
      headerName: col.display,
      field: col.name,
      width: 220,
    }));
  }, [data]);

  const rowdata = useMemo(() => {
    if (!data?.result_rows || !data?.columns) return [];

    return data.result_rows.map((row) => {
      const formattedRow = {};

      data.columns.forEach((col) => {
        formattedRow[col.name] = row[col.name];
      });

      return formattedRow;
    });
  }, [data]);

  return (
    <div>
      {/* 🔹 Table */}
      <AgGridComponent
        columns={columns}
        rowdata={rowdata}
        domLayout="normal"
        hideTableSetting={true}
        downloadAsExcel={true}
        tableHeader="Allocations Table"
        sizeColumnsToFitFlag={false}
        tableStyle={{ minWidth: "563px" }}
        height="550px" 
      />
    </div>
  );
};

export default AllocationTable;
