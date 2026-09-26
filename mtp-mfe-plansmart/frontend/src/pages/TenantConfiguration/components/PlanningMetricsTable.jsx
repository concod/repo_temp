import React, { useEffect, useState, useRef } from "react";
import Table from "core/Utils/agGrid";
import agGridColumnFormatter from "../../../core/Utils/agGrid/column-formatter";
import cloneDeep from "lodash/cloneDeep";
import globalStyles from "Styles/globalStyles";
import { Typography } from "@mui/material";
import { Button } from "impact-ui";
import * as actions from "../slice/planningMetrics.slice";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import AgGridComponent from "core/Utils/agGrid";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import {
  customCellRenderer,
  getDependencyAsStr,
  metricDataParser
} from "../tenantConfiguration.util";

const PlanningMetricsTable = (props) => {
  const {
    seasonCode,
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
    setEditableMetricTableColDef
  } = props;

  const globalClasses = globalStyles();
  const tableRef = useRef();
  const [columnDef, setColumnDef] = useState([]);
  const [meticData, setMeticData] = useState([]);
  const [updatedRowData, setUpdatedRowData] = useState([]);

  useEffect(async () => {
    const tableDataPaylod = {
      season_code: seasonCode
    };
    fetchEditableMetricConfigData(tableDataPaylod);
    fetchEditableMetricTenantTableColDef();
    return () => {
      setEditableMetricTableData([]);
      setEditableMetricTableColDef([]);
      setTableDataLoader(false);
      setSaveDataLoader(false);
    };
  }, [seasonCode]);

  useEffect(() => {
    if (!tableColDefLoader && tableColDefData.length > 0) {
      const columnDefData = agGridColumnFormatter(cloneDeep(tableColDefData));
      setColumnDef(columnDefData);
    }
  }, [tableColDefLoader]);

  useEffect(() => {
    if (!tableDataLoader && tableData) {
      setMeticData(metricDataParser(tableData));
      setUpdatedRowData([]);
    }
  }, [tableDataLoader]);

  const onCellValueChanged = (cell) => {
    cell.data.lock_and_hold_options.forEach((value) => {
      if (
        cell.data.lock_and_hold_id !== value.id &&
        cell.newValue == value.value
      ) {
        cell.data.dependency = getDependencyAsStr(value.dependent_kpi);
        cell.data.lock_and_hold_id = value.id;
        const currentRowData = {
          kpi_id: cell.data.kpi_id,
          lock_and_hold_id: value.id
        };
        if (updatedRowData.length) {
          updatedRowData.forEach((updatedRowValue, index) => {
            if (updatedRowValue.kpi_id == cell.data.kpi_id) {
              updatedRowData.splice(index, 1);
            }
          });
        }
        setUpdatedRowData([...updatedRowData, currentRowData]);
        cell.api.refreshCells({
          force: true
        });
      }
    });
  };
  const handleUpdate = () => {
    const tableDataPaylod = {
      season_code: seasonCode
    };
    const updatePayload = {
      season_code: seasonCode,
      update_lock_and_hold: updatedRowData
    };
    saveEditableMetricConfig(updatePayload, tableDataPaylod);
  };

  return (
    <>
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
            variant="primary"
            onClick={() => handleUpdate()}
            size="medium"
            className={`${globalClasses.marginAround} customActionButton`}
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
        uniqueRowId="kpi_id"
        tableRef={tableRef}
        onCellValueChanged={onCellValueChanged}
        customCellRenderer={customCellRenderer}
        showSearchModalBtn={false}
      />
    </>
  );
};

const mapState = (state) => {
  return {
    tableData: actions.editableMetricTenantTableDataSelector(state),
    tableDataLoader: actions.editableMetricTenantTableLoader(state),
    saveLoader: actions.editableMetricTenantSaveLoader(state),
    tableColDefData: actions.editableMetricTenantTableColDefDataSelector(state),
    tableColDefLoader: actions.editableMetricTenantTableColDefLoader(state)
  };
};

const mapDispatch = (dispatch) => bindActionCreators(actions, dispatch);

export default connect(mapState, mapDispatch)(PlanningMetricsTable);
