import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { Button, Typography } from "@mui/material";
import get from "lodash/get";
import cloneDeep from "lodash/cloneDeep";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import AgGridComponent from "core/Utils/agGrid";
import LoadingOverlay from "core/Utils/Loader/loader";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import * as actions from "core/reducers/tenantConfigService/planningMetrics";
import { getOriginalFormatMetricData, metricDataParser } from "./utilities";
import globalStyles from "core/Styles/globalStyles";

const customCellRenderer = (cellProps) => {
  const checkForAddDropdown =
    cellProps.colDef.accessor === "lock"
      ? cellProps.data.editable
        ? cellProps.colDef.type
        : "str"
      : cellProps.colDef.type;
  const lockDropdownList = get(cellProps, "data.lockDropdownValues", []);
  return (
    <CellRenderers
      cellData={cellProps}
      column={{
        ...cellProps,
        type: checkForAddDropdown,
        options: lockDropdownList,
      }}
    ></CellRenderers>
  );
};

function EditableMetricTenantTable(props) {
  const {
    fetchEditableMetricConfigData,
    tableDataLoader,
    saveLoader,
    tableData,
    setEditableMetricTableData,
    setSaveDataLoader,
    setTableDataLoader,
    saveEditableMetricConfig,
    tableColDefData,
    tableColDefLoader,
    fetchEditableMetricTenantTableColDef,
    setEditableMetricTableColDef,
  } = props;
  const tableRef = useRef();
  const [columnDef, setColumnDef] = useState([]);
  const [meticData, setMeticData] = useState([]);
  const globalClasses = globalStyles();

  useEffect(() => {
    fetchEditableMetricConfigData();
    fetchEditableMetricTenantTableColDef();
    return () => {
      setEditableMetricTableData({});
      setEditableMetricTableColDef([]);
      setTableDataLoader(false);
      setSaveDataLoader(false);
    };
  }, []);

  useEffect(() => {
    if (!tableColDefLoader && tableColDefData.length > 0) {
      const columnDefData = agGridColumnFormatter(cloneDeep(tableColDefData));
      setColumnDef(columnDefData);
    }
  }, [tableColDefLoader]);

  useEffect(() => {
    if (!tableDataLoader && tableData.metrics) {
      setMeticData(metricDataParser(tableData.metrics));
    }
  }, [tableDataLoader]);

  const onCellValueChanged = (cell) => {
    if (cell.colDef.accessor === "lock") {
      cell.data.dependency = cell.data.dependent_kpi[cell.data.lock]
        .map((data) => data.label)
        .join(", ");
      cell.api.refreshCells({
        force: true,
      });
    }
  };

  const handleUpdate = () => {
    const editableMetricTableData = tableRef.current.props.rowData;
    const finalizedObj = getOriginalFormatMetricData(
      editableMetricTableData,
      tableData.metrics
    );
    saveEditableMetricConfig(finalizedObj);
  };

  return (
    <LoadingOverlay loader={tableDataLoader || tableColDefLoader}>
      <div
        className={`${globalClasses.layoutAlignSpaceBetween} ${globalClasses.verticalAlignCenter}`}
      >
        <div className={globalClasses.paddingVertical}>
          <Typography variant="h3" className={globalClasses.paddingHorizontal}>
            Planning Metrics
          </Typography>
        </div>
        <div>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleUpdate()}
            size="medium"
            className={globalClasses.marginAround}
            disabled={saveLoader}
          >
            Update
          </Button>
        </div>
      </div>
      <AgGridComponent
        columns={columnDef}
        rowdata={meticData}
        sideBar={false}
        uniqueRowId="uniqueId"
        tableRef={tableRef}
        onCellValueChanged={onCellValueChanged}
        customCellRenderer={customCellRenderer}
      />
    </LoadingOverlay>
  );
}

const mapState = (state) => {
  return {
    tableData: actions.editableMetricTenantTableDataSelector(state),
    tableDataLoader: actions.editableMetricTenantTableLoader(state),
    saveLoader: actions.editableMetricTenantSaveLoader(state),
    tableColDefData: actions.editableMetricTenantTableColDefDataSelector(state),
    tableColDefLoader: actions.editableMetricTenantTableColDefLoader(state),
  };
};

const mapDispatch = (dispatch) => bindActionCreators(actions, dispatch);

export default connect(mapState, mapDispatch)(EditableMetricTenantTable);
