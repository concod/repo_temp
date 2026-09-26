import React, { useEffect, useRef, useState, useCallback } from "react";
import globalStyles from "core/Styles/globalStyles";
import AgGrid from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { useSelector, useDispatch } from "react-redux";
import { Box, Paper, CircularProgress } from "@mui/material";
import { updateReducerState } from "core/actions/jsonParserActions";
import { cloneDeep, debounce } from "lodash";

const TableWrapper = (props) => {
  const globalClasses = globalStyles();
  const dispatch = useDispatch();
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
    tableProps = {}, // tableProps will contain additional props to pass to AgGrid component (e.g., tableHeader, cardContainer, etc.)
    onTableDataChange, // Callback function to notify parent component when table data changes
    loadTableInstance, // Optional callback to expose the Ag Grid instance to the parent (e.g. for add/delete buttons)
    onSelectionChanged: onSelectionChangedCallback, // Optional callback to notify parent of row selection changes
    renderWhenEmpty, // Optional: keep the grid (and its toolbar) rendered even when there are no rows
  } = props;
  const columnDetails = useSelector(
    (state) => state.jsonParserReducer?.[columnKey]
  );
  const rowDetails = useSelector((state) => state.jsonParserReducer?.[rowKey]);

  /**
   * Helper function to get all row data from table instance
   */
  const getAllRowData = useCallback(() => {
    if (!tableInstance.current) {
      return [];
    }
    const updatedRowData = [];
    tableInstance.current.api.forEachNode((node) => {
      if (node.data) {
        // Remove the table-wrapper-id that we added for unique row identification
        const rowData = { ...node.data };
        delete rowData["table-wrapper-id"];
        updatedRowData.push(rowData);
      }
    });
    return updatedRowData;
  }, []);

  /**
   * Function to update Redux and notify form with latest table data
   * Store in ref so debounced function always has access to latest version
   */
  const updateReduxAndFormRef = useRef(null);
  const updateReduxAndForm = useCallback((updatedRowData) => {
    if (!rowKey) {
      return;
    }

    const cleanedData = cloneDeep(updatedRowData);

    // Update Redux state
    dispatch(updateReducerState(rowKey, cleanedData));

    // Notify the parent form
    if (onTableDataChange && typeof onTableDataChange === 'function') {
      onTableDataChange(cleanedData);
    }
  }, [rowKey, dispatch, onTableDataChange]);

  // Keep ref in sync with latest function
  useEffect(() => {
    updateReduxAndFormRef.current = updateReduxAndForm;
  }, [updateReduxAndForm]);

  /**
   * Debounced function to update Redux after user stops typing
   * This prevents re-renders during typing while ensuring state is updated
   * Uses ref to always call the latest updateReduxAndForm function
   */
  const debouncedUpdateRedux = useRef(
    debounce((updatedRowData) => {
      if (updateReduxAndFormRef.current) {
        updateReduxAndFormRef.current(updatedRowData);
      }
    }, 500) // 500ms delay - update Redux 500ms after user stops typing
  ).current;

  /**
   * @function onCellValueChanged
   * @description Handles a committed cell value change.
   * AG Grid fires this once per committed edit (on Enter/Tab/blur), not per keystroke,
   * so we update Redux/form immediately. Updating immediately ensures the store is in sync
   * before an external action (e.g. the Save button) reads it.
   * @param {Object} params - AG Grid cell value change event params
   */
  const onCellValueChanged = (params) => {
    try {
      if (!rowKey || !tableInstance.current) {
        return;
      }

      // Cancel any pending debounced update and update immediately
      debouncedUpdateRedux.cancel();
      updateReduxAndForm(getAllRowData());
    } catch (error) {
      console.error("onCellValueChanged error:", error);
    }
  };

  /**
   * @function onCellEditingStopped
   * @description Handles when cell editing stops (on blur or Enter key)
   * Immediately updates Redux and form (cancels any pending debounced update)
   * @param {Object} params - AG Grid cell editing stopped event params
   */
  const onCellEditingStopped = (params) => {
    try {
      if (!rowKey || !tableInstance.current) {
        return;
      }

      // Cancel any pending debounced update since we're updating immediately
      debouncedUpdateRedux.cancel();

      // Get the latest data and update immediately
      const updatedRowData = getAllRowData();
      updateReduxAndForm(updatedRowData);
    } catch (error) {
      console.error("onCellEditingStopped error:", error);
    }
  };

  const onSelectionChanged = (event) => {
    if (typeof onSelectionChangedCallback === "function") {
      onSelectionChangedCallback(event);
    }
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
       * If Redux state exists (from initialization), use that instead of static data
       */
      if (columnDetails && isColumnDataFromApi) {
        columns = agGridColumnFormatter(columnDetails);
      } else if (columnDetails && !isColumnDataFromApi) {
        // Use Redux state if available (for static data that has been initialized)
        columns = agGridColumnFormatter(columnDetails);
      } else {
        columns = agGridColumnFormatter(staticColumnData || []);
      }

      /**
       * If row data is coming from api then
       * rows variable will contain the api data
       * or else if the data is directly passed
       * from json then it will contain that
       * If Redux state exists (from previous edits), use that instead of static data
       */
      if (rowDetails && isRowDataFromApi) {
        rows = rowDetails;
        rows.forEach((item, i) => (item["table-wrapper-id"] = i));
      } else if (rowDetails && !isRowDataFromApi) {
        // Use Redux state if available (for static data that has been edited)
        rows = rowDetails;
        rows.forEach((item, i) => (item["table-wrapper-id"] = i));
      } else {
        rows = staticRowData || [];
      }
      setColumnsData(columns);
      setRowsData(rows);
    } catch (error) {
      console.error("prepareTableData error", error);
    }
  };

  /**
   * Initialize static data in Redux if using static data
   * This ensures the reducer state exists for updates
   * Makes static data flow consistent with API data flow
   */
  useEffect(() => {
    // Initialize static column data in Redux if not already present
    if (!isColumnDataFromApi && staticColumnData && columnKey && !columnDetails) {
      dispatch(updateReducerState(columnKey, cloneDeep(staticColumnData)));
    }
    
    // Initialize static row data in Redux if not already present
    if (!isRowDataFromApi && staticRowData && rowKey && !rowDetails) {
      dispatch(updateReducerState(rowKey, cloneDeep(staticRowData)));
    }
  }, [
    isColumnDataFromApi,
    isRowDataFromApi,
    staticColumnData,
    staticRowData,
    columnKey,
    rowKey,
    columnDetails,
    rowDetails,
    dispatch,
  ]);

  /**
   * Initially prepareTableData()
   * will be called to prepare the
   * data needed to be passed to the
   * agGrid Component
   */
  useEffect(() => {
    prepareTableData();
  }, [columnDetails, rowDetails, staticColumnData, staticRowData]);

  /**
   * Cleanup: Cancel any pending debounced updates on unmount
   */
  useEffect(() => {
    return () => {
      debouncedUpdateRedux.cancel();
    };
  }, [debouncedUpdateRedux]);

  return (
    <div style={{ width: "100%" }}>
      {columnsData?.length && (rowsData?.length || renderWhenEmpty) ? (
        <AgGrid
          rowdata={rowsData}
          columns={columnsData}
          uniqueRowId={"table-wrapper-id"}
          tableId={"table-wrapper-comp"}
          rowSelection={"multiple"}
          selectAllHeaderComponent={true}
          autoSizeColumnsFlag
          sizeColumnToFitFlag
          {...tableProps}
          loadTableInstance={(instance) => {
            tableInstance.current = instance;
            if (typeof loadTableInstance === "function") loadTableInstance(instance);
          }}
          onSelectionChanged={(event) => onSelectionChanged(event)}
          onCellValueChanged={(params) => onCellValueChanged(params)}
          onCellEditingStopped={(params) => onCellEditingStopped(params)}
        />
      ) : (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <CircularProgress sx={{ margin: 2 }} />
        </Box>
      )}
    </div>
  );
};

export default TableWrapper;
