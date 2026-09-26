import { useEffect, useRef, useState } from "react";
import { Button, Typography } from "@mui/material";
import AddCircleOutlinedIcon from "@mui/icons-material/AddCircleOutlined";
import AgGridComponent from "core/Utils/agGrid";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import LoadingOverlay from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import {
  conForColDefLoaderSelector,
  conForColDefSelector,
  conForMetricListLoaderSelector,
  conForSavedDataLoaderSelector,
  conForSavedDataSelector,
  conForMetricListSelector,
} from "core/reducers/tenantConfigService/conditionalFormatting";
import * as actions from "core/reducers/tenantConfigService/conditionalFormatting";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { get } from "lodash";
import { updateTenantAttributeConfig } from "core/actions/tenantConfigActions";

const customCellRenderer = (cellProps, generateDropDown) => {
  return (
    <CellRenderers
      cellData={cellProps}
      column={{
        ...cellProps.colDef,
        options: generateDropDown(cellProps),
      }}
    ></CellRenderers>
  );
};

function ConditionalFormatting(props) {
  const {
    fetchConForColDef,
    fetchConForSavedData,
    colDef,
    fetchColForMetricList,
    resetColFor,
    metricList,
  } = props;
  const globalClasses = globalStyles();
  const [rowData, setRowData] = useState([]);
  const tableRef = useRef(null);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  useEffect(() => {
    const getConditionalFormattingColumnDef = async () => {
      fetchConForColDef();
      const list = fetchConForSavedData();
      list.then((data) => setRowData(data));
      fetchColForMetricList();
    };
    getConditionalFormattingColumnDef();

    // Cleanup function
    return () => {
      resetColFor();
    };
  }, []);

  const generateDropDown = (cellProps, list) => {
    const newRowData = get(cellProps, "api.rowModel.rowsToDisplay", []).map(
      (data) => data.data
    );
    const selectedKeys = newRowData.map((data) => data.metric);
    const updatedList = metricList.filter(
      (metricData) =>
        metricData.value === cellProps?.data?.metric ||
        selectedKeys.indexOf(metricData.value) == -1
    );
    return updatedList;
  };

  const callDeleteApi = (cellProps) => {
    try {
      const cellUniqueId = cellProps?.data?.metric;
      const newRowData = get(cellProps, "api.rowModel.rowsToDisplay", []).map(
        (data) => data.data
      );
      const updatedData = newRowData.filter(
        (data) => data.metric !== cellUniqueId
      );
      setRowData(updatedData);
    } catch (error) {
      displaySnackMessages("Something went wrong", "error");
    }
  };

  const addMetric = () => {
    const selectedMetrics = rowData.map((data) => data.metric);
    const obj = {
      metric: "",
      min_val: 0,
      max_val: 0,
      max_color: "#008000",
      min_color: "#FF0000",
    };
    for (let index = 0; index < metricList.length; index++) {
      const metricData = metricList[index];
      if (selectedMetrics.indexOf(metricData.value) === -1) {
        obj.metric = metricData.value;
        obj.label = metricData.label;
        break;
      }
    }
    tableRef.current.api.redrawRows([...rowData, obj]);
    setRowData([obj, ...rowData]);
  };

  const updateConditionalFormatting = async () => {
    const conditionalFormattingObj = {};
    rowData.forEach((metric) => {
      if (!conditionalFormattingObj[metric.label]) {
        conditionalFormattingObj[metric.label] = {
          value: metric.metric,
          min_val: metric.min_val,
          max_val: metric.max_val,
          min_color: metric.min_color,
          max_color: metric.max_color,
        };
      }
    });
    let applicationLevelTenantConfigResponse = await props.updateTenantAttributeConfig(
      "application",
      {
        config_level: "application",
        application_code: 4,
        config_value: [
          {
            attribute_name: "plan_smart_cond_frmt",
            attribute_value: { value: conditionalFormattingObj },
          },
        ],
      }
    );
  };

  return (
    <LoadingOverlay>
      <div className={`${globalClasses.evenPaddingAround}`}>
        <Typography variant="h3">Conditional Formatting</Typography>
        <div>Enter Range for Metrics</div>
        <div
          className={`${globalClasses.marginTop} ${globalClasses.halfWidth}`}
        >
          {metricList?.length > 0 && rowData?.length > 0 && (
            <AgGridComponent
              columns={colDef}
              rowdata={rowData}
              sideBar={false}
              uniqueRowId="metric"
              tableRef={tableRef}
              customCellRenderer={(cellProps) =>
                customCellRenderer(cellProps, (cellData) =>
                  generateDropDown(cellData, rowData)
                )
              }
              callDeleteApi={callDeleteApi}
            />
          )}
        </div>
        <Button
          className={globalClasses.marginTop}
          startIcon={<AddCircleOutlinedIcon />}
          onClick={addMetric}
          disabled={rowData?.length === metricList?.length}
        >
          Add Metrics
        </Button>
      </div>
      <Button
        className={`${globalClasses.evenPaddingAround}`}
        onClick={updateConditionalFormatting}
      >
        Apply
      </Button>
    </LoadingOverlay>
  );
}

const mapState = (state) => {
  return {
    colDefLoader: conForColDefLoaderSelector(state),
    savedDataLoader: conForSavedDataLoaderSelector(state),
    metricListLoader: conForMetricListLoaderSelector(state),
    colDef: conForColDefSelector(state),
    savedData: conForSavedDataSelector(state),
    metricList: conForMetricListSelector(state),
  };
};

const mapDispatch = (dispatch) =>
  bindActionCreators(
    { ...actions, addSnack, updateTenantAttributeConfig },
    dispatch
  );

export default connect(mapState, mapDispatch)(ConditionalFormatting);
