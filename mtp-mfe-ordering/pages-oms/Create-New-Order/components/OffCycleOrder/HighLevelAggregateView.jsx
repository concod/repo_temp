import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { cloneDeep, isEmpty } from "lodash";
import { Button } from "impact-ui-v3";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";

import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import {
  getOffCycleHighLevelAggregateColumnConfig,
  getOffCycleHighLevelAggregateTableData,
  updateOffCycleHighLevelAggregateData,
  setHighLevelAggregateTableConfigLoader,
  setHighLevelAggregateTableDataLoader,
  setOffCycleOrderHasUnsavedChanges,
} from "modules/oms/services-oms/Create-New-Order/off-cycle-order-service";

const HighLevelAggregateView = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const { draftId } = props;

  const [
    highLevelAggregateTableColumns,
    setHighLevelAggregateTableColumns,
  ] = useState([]);
  const [
    highLevelAggregateTableData,
    setHighLevelAggregateTableData,
  ] = useState([]);
  const [render, setRender] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const aggregateTableGridInstance = useRef(null);

  const displaySnackMessages = (message, variance) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const fetchTableData = async () => {
    try {
      props.setHighLevelAggregateTableDataLoader(true);

      const appliedFilters = cloneDeep(props?.deepDiveFilters || []);
      const appliedDateFilters = [];

      // Adding the OMS Date filters to the filters
      if (!isEmpty(props?.ropDate)) {
        appliedDateFilters.push(props?.ropDate);
      }
      if (!isEmpty(props?.recommRecieptDate)) {
        appliedDateFilters.push(props?.recommRecieptDate);
      }
      // Adding the Deep Dive Date filters to the filters
      if (props?.weekRange?.attribute_name) {
        appliedDateFilters.push(props?.weekRange);
      }

      let body = {
        filters: appliedFilters,
        meta: {
          limit: { limit: 1000, page: 1 },
          sortColumns: [],
          searchColumns: {},
        },
        draft_id: draftId,
      };

      // Add date_filter if appliedDateFilters is present
      if (appliedDateFilters.length > 0) {
        body.date_filter = appliedDateFilters;
      }

      if (!draftId) {
        props.setHighLevelAggregateTableDataLoader(false);
        return;
      }

      let response = await props.getOffCycleHighLevelAggregateTableData(body);
      if (response.data.status) {
        const dataResponse = cloneDeep(response.data.data);
        setHighLevelAggregateTableData(dataResponse);
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        setHighLevelAggregateTableData([]);
      }
    } catch (err) {
      console.log("Error in Fetching High Level Aggregate Table Data", err);
      displaySnackMessages(ERROR_MESSAGE, "error");
      setHighLevelAggregateTableData([]);
    } finally {
      props.setHighLevelAggregateTableDataLoader(false);
    }
  };

  const loadTableInstance = (params) => {
    aggregateTableGridInstance.current = params;
  };

  const onCellValueChanged = (params) => {
    // Only track changes for User Adjusted ROQ row
    if (params?.data?.metrics === "User Adjusted ROQ") {
      const columnName = params.colDef.field;
      const newValue = params.newValue;

      setEditedData((prev) => ({
        ...prev,
        [columnName]: newValue,
      }));

      setHasUnsavedChanges(true);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const appliedFilters = cloneDeep(props?.deepDiveFilters || []);
      const appliedDateFilters = [];

      // Adding the OMS Date filters to the filters
      if (!isEmpty(props?.ropDate)) {
        appliedDateFilters.push(props?.ropDate);
      }
      if (!isEmpty(props?.recommRecieptDate)) {
        appliedDateFilters.push(props?.recommRecieptDate);
      }
      // Adding the Deep Dive Date filters to the filters
      if (props?.weekRange?.attribute_name) {
        appliedDateFilters.push(props?.weekRange);
      }

      const body = {
        draft_id: draftId,
        filters: appliedFilters,
        updated_data: editedData,
      };

      // Add date_filter if appliedDateFilters is present
      if (appliedDateFilters.length > 0) {
        body.date_filter = appliedDateFilters;
      }

      const response = await props.updateOffCycleHighLevelAggregateData(body);

      if (response?.data?.status) {
        displaySnackMessages("Draft saved successfully", "success");
        setEditedData({});
        setHasUnsavedChanges(false);
        // Refresh the table
        await fetchColumnConfig();
        // Notify parent to reload other components
        if (props.onSaveSuccess) {
          props.onSaveSuccess();
        }
      } else {
        displaySnackMessages(response?.data?.message || ERROR_MESSAGE, "error");
      }
    } catch (err) {
      console.log("Error saving data:", err);
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const getTopRightOptions = () => {
    let options = [];

    options.push(
      <Button
        key="save-btn"
        variant="primary"
        color="primary"
        id="aggregateSaveBtn"
        className={classes.button}
        disabled={!hasUnsavedChanges || isSaving}
        onClick={handleSave}
      >
        Save
      </Button>
    );

    return options;
  };

  const checkForEditability = (columnsData) => {
    let updatedColumnsData = cloneDeep(columnsData);

    updatedColumnsData = updatedColumnsData.map((column) => {
      column.is_lockable = false;
      // Metrics column should not be editable
      if (column.column_name === "metrics") {
        column.type = "str";
        column.is_editable = false;
      }

      return column;
    });

    return updatedColumnsData;
  };

  const getRowStyle = (params) => {
    // Only "Base ROQ" row should be editable, disable all others
    if (params?.data?.metrics !== "User Adjusted ROQ") {
      return { pointerEvents: "none" };
    } else {
      return;
    }
  };

  const fetchColumnConfig = async () => {
    try {
      const appliedFilters = cloneDeep(props?.deepDiveFilters || []);
      const appliedDateFilters = [];

      // Adding the OMS Date filters to the filters
      if (!isEmpty(props?.ropDate)) {
        appliedDateFilters.push(props?.ropDate);
      }
      if (!isEmpty(props?.recommRecieptDate)) {
        appliedDateFilters.push(props?.recommRecieptDate);
      }
      // Adding the Deep Dive Date filters to the filters
      if (props?.weekRange?.attribute_name) {
        appliedDateFilters.push(props?.weekRange);
      }

      let body = {
        draft_id: draftId,
        filters: appliedFilters,
      };

      // Add date_filter if appliedDateFilters is present
      if (appliedDateFilters.length > 0) {
        body.date_filter = appliedDateFilters;
      }

      let columns = await props.getOffCycleHighLevelAggregateColumnConfig(body);
      let columnsData = columns?.data?.data;
      columnsData = checkForEditability(columnsData);

      let formattedColumns = agGridColumnFormatter(
        columnsData,
        null,
        {},
        null,
        null,
        null,
        null,
        true
      );

      setHighLevelAggregateTableColumns(formattedColumns);

      // Fetch table data after columns are loaded
      await fetchTableData();
    } catch (err) {
      console.log("Error fetching column config:", err);
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      setRender(true);
      props.setHighLevelAggregateTableConfigLoader(false);
    }
  };

  useEffect(() => {
    if (draftId) {
      setRender(false);
      props.setHighLevelAggregateTableConfigLoader(true);

      fetchColumnConfig();
    }
  }, [draftId, props.reloadTrigger]);

  //To Check if the Save is Enabled
  useEffect(() => {
    props.setOffCycleOrderHasUnsavedChanges({
      ...props.offCycleOrderHasUnsavedChanges,
      highLevelAggregate: hasUnsavedChanges,
    });
  }, [hasUnsavedChanges]);

  return (
    <div className={globalClasses.marginVertical1rem}>
      <div className={globalClasses.marginVertical1rem}>
        <Loader
          loader={
            props.highLevelAggregateTableConfigLoader ||
            props.highLevelAggregateTableDataLoader
          }
          minHeight={"260px"}
        >
          {render && (
            <AgGridComponent
              columns={highLevelAggregateTableColumns}
              rowdata={highLevelAggregateTableData}
              loadTableInstance={loadTableInstance}
              pagination={false}
              uniqueRowId={"metrics"}
              getRowStyle={getRowStyle}
              tableHeader={"High Level Aggregate View"}
              topRightOptions={getTopRightOptions()}
              onCellValueChanged={onCellValueChanged}
              customCellRenderer={(cellProps) => {
                if (cellProps?.data?.metrics !== "User Adjusted ROQ") {
                  return (
                    <p
                      style={{
                        pointerEvents: "none",
                        border: "none",
                        background: "#FFFFFF",
                        textAlign: "right",
                      }}
                    >
                      {cellProps?.value === 0 || cellProps?.value
                        ? cellProps.value
                        : "-"}
                    </p>
                  );
                }

                const columnId = cellProps?.column?.colId;
                const cellData = cellProps?.data[columnId];
                if (cellData === "-") {
                  return (
                    <p
                      style={{
                        pointerEvents: "none",
                        border: "none",
                        background: "#FFFFFF",
                        textAlign: "right",
                        margin: "0 -16px",
                        paddingRight: "16px",
                      }}
                    >
                      {cellProps?.value || "-"}
                    </p>
                  );
                }
              }}
            />
          )}
        </Loader>
      </div>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    highLevelAggregateTableConfigLoader:
      store.omsReducer.offCycleOrderService.highLevelAggregateTableConfigLoader,
    highLevelAggregateTableDataLoader:
      store.omsReducer.offCycleOrderService.highLevelAggregateTableDataLoader,
    offCycleOrderHasUnsavedChanges:
      store.omsReducer.offCycleOrderService.offCycleOrderHasUnsavedChanges,
    recommRecieptDate:
      store.omsReducer.offCycleOrderService.offCycleOrderRecommRecieptDate,
    ropDate: store.omsReducer.offCycleOrderService.offCycleOrderRopDate,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setOffCycleOrderHasUnsavedChanges: (payload) =>
    dispatch(setOffCycleOrderHasUnsavedChanges(payload)),
  getOffCycleHighLevelAggregateColumnConfig: (payload) =>
    dispatch(getOffCycleHighLevelAggregateColumnConfig(payload)),
  getOffCycleHighLevelAggregateTableData: (payload) =>
    dispatch(getOffCycleHighLevelAggregateTableData(payload)),
  updateOffCycleHighLevelAggregateData: (payload) =>
    dispatch(updateOffCycleHighLevelAggregateData(payload)),
  setHighLevelAggregateTableConfigLoader: (payload) =>
    dispatch(setHighLevelAggregateTableConfigLoader(payload)),
  setHighLevelAggregateTableDataLoader: (payload) =>
    dispatch(setHighLevelAggregateTableDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: () => dispatch(closeSnack()),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(HighLevelAggregateView);
