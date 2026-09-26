import React, { useEffect, useRef, useState } from "react";
import globalStyles from "core/Styles/globalStyles";
import AgGrid from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { useSelector } from "react-redux";
import { Box, Paper, CircularProgress } from "@mui/material";

const TableWrapper = (props) => {
  const globalClasses = globalStyles();
  const [rowsData, setRowsData] = useState([]);
  const [columnsData, setColumnsData] = useState([]);
  const tableInstance = useRef(null);
  const {
    columnKey, // columnKey will be the reducerKey where the column data will be stored
    rowKey, // rowKey will be the reducerKey where the row data will be stored
    isColumnDataFromApi, // isColumnDataFromApi is a boolean key to understand whether the column data is coming from api or not
    isRowDataFromApi, // isRowDataFromApi is a boolean key to understand whether the row data is coming from api or not
    staticColumnData, // staticColumnData will contain the column data if we decide to pass the data directly from json
    staticRowData, // staticRowData will contain the row data if we decide to pass the data directly from json
  } = props;
  const columnDetails = useSelector(
    (state) => state.jsonParserReducer?.[columnKey]
  );
  const rowDetails = useSelector((state) => state.jsonParserReducer?.[rowKey]);

  const onCellValueChanged = (params) => {};

  const onSelectionChanged = (event) => {
    const selectedRows = event.api.getSelectedRows();
  };

  /**
   * prepareTableData function will
   * format the column/row data and set
   * it to the respective state
   */
  const prepareTableData = () => {
    try {
      let columns = [];
      let rows = [];
      /**
       * If column data is coming from api then
       * columns variable will contain the api data
       * or else if the data is directly passed
       * from json then it will contain that
       */
      if (columnDetails && isColumnDataFromApi) {
        columns = agGridColumnFormatter(columnDetails);
      } else {
        columns = agGridColumnFormatter(staticColumnData);
      }

      /**
       * If row data is coming from api then
       * rows variable will contain the api data
       * or else if the data is directly passed
       * from json then it will contain that
       */
      if (rowDetails && isRowDataFromApi) {
        rows = rowDetails;
        rows.forEach((item, i) => (item["table-wrapper-id"] = i));
      } else {
        rows = staticRowData;
      }
      setColumnsData(columns);
      setRowsData(rows);
    } catch (error) {
      console.error("prepareTableData error", error);
    }
  };

  /**
   * Initially prepareTableData()
   * will be called to prepare the
   * data needed to be passed to the
   * agGrid Component
   */
  useEffect(() => {
    prepareTableData();
  }, [columnDetails, rowDetails, staticColumnData, staticRowData]);

  return (
    <Paper className={globalClasses.tableWrapper}>
      {rowsData?.length && columnsData?.length ? (
        <AgGrid
          rowdata={rowsData}
          columns={columnsData}
          uniqueRowId={"table-wrapper-id"}
          tableId={"table-wrapper-comp"}
          rowSelection={"multiple"}
          selectAllHeaderComponent={true}
          autoSizeColumnsFlag
          sizeColumnToFitFlag
          loadTableInstance={(instance) => (tableInstance.current = instance)}
          onSelectionChanged={(event) => onSelectionChanged(event)}
          onCellValueChanged={(params) => onCellValueChanged(params)}
        />
      ) : (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <CircularProgress sx={{ margin: 2 }} />
        </Box>
      )}
    </Paper>
  );
};

export default TableWrapper;
