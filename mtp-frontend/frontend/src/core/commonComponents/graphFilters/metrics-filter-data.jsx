import { Button, Typography } from "@mui/material";
import AgGrid from "core/Utils/agGrid";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { cloneDeep, isEmpty } from "lodash";
import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import { filterView } from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";

const MetricsFilters = (props) => {
  const classes = useStyles();
  const [metricsColumns, setMetricsColumns] = useState([]);
  const [totalVal, setTotalVal] = useState();
  const metricsTableData = useRef({});
  const agInstance = useRef({});

  useEffect(() => {
    if (!isEmpty(props.metricsTableData)) {
      metricsTableData.current = props.metricsTableData;

      let totalVal = 0;
      props.metricsTableData.map((row, index) => {
        if (row && row.weightage) {
          totalVal += parseInt(row.weightage);
        }
      });
      setTotalVal(totalVal);
    }
  }, [props.metricsTableData]);

  const handleRangeChange = (value, celldata) => {
    //Update the weightage value for changed metric & update the table data
    const metric = celldata?.data?.metric;
    const tableData = cloneDeep(metricsTableData.current);
    tableData?.forEach((item) => {
      if (item.metric === metric) {
        item.weightage = value;
        item.value = [value];
      }
    });
    metricsTableData.current = tableData;
    props.setSelectedMetricsData(tableData);
    if (tableData.length) {
      let totalVal = 0;
      tableData.map((row, index) => {
        if (row && row.weightage) {
          totalVal = parseInt(totalVal) + parseInt(row.weightage);
        }
      });
      setTotalVal(totalVal);
    }
  };

  const handleMetricsChange = (dependency) => {
    //Update metrics data based on selected metrics
    props.setSelectedMetricsData([]);
    const tableData = [];
    dependency?.forEach((item) => {
      const weightage = props.selectedMetricsData?.filter((metric) => {
        return metric.metric === item.label;
      })?.[0]?.weightage;
      tableData.push({
        metric: item.label,
        weightage: weightage || 10,
        value: [weightage || "10"],
        metric_name: item.value,
      });
    });
    metricsTableData.current = tableData;
    props.setSelectedMetricsData(tableData);
    props.setSelectedMetrics(dependency);
  };

  const loadTableInstance = (params) => {
    agInstance.current = params;
  };

  const handleCellChange = (params) => {
    const { column, newValue, rowIndex } = params;
    const tableData = [];
    agInstance?.current?.api?.forEachNode((row, index) => {
      if (index === rowIndex) {
        row.data[column.colId] = newValue;
        row.data["value"] = [newValue];
      }
      tableData.push(row.data);
    });
    agInstance?.current?.api?.refreshCells({
      update: tableData,
    });
    metricsTableData.current = tableData;
    // Need to update total here only to avoid the latency issue with the useEffect
    let totalVal = 0;
      tableData.map((row, index) => {
        if (row && row.weightage) {
          totalVal += parseInt(row.weightage);
        }
      });
      setTotalVal(totalVal);
    props.setSelectedMetricsData(tableData);
  };

  const handleFiltersApply = () => {
    props.filtersApply(true);
  };

  const handleFiltersCancel = () => {
    props.filtersCancel();
  };

  return (
    <>
      <div className={classes.graphContent}>
        <Typography variant="subtitle1" gutterBottom>
          Metrics:
        </Typography>
        {filterView(
          "Select Metrics",
          "selected_metrics",
          props.metricsOptions,
          handleMetricsChange,
          props.selectedMetrics,
          classes.metricsContainer,
          classes.inputLabel,
          true
        )}
        <AgGrid
          columns={props.metricsColumns}
          rowdata={props.selectedMetricsData || []}
          onRangeSliderChange={(value, tableInfo) =>
            handleRangeChange(value, tableInfo)
          }
          uniqueRowId={"metric"}
          skipAutoSizeColumn
          sizeColumnsToFitFlag
          sideBar={false}
          pagination={false}
          loadTableInstance={loadTableInstance}
          onCellValueChanged={handleCellChange}
          tableId={"metrics-filters"}
        />
        <div>
          <p className={classes.totalValueLabel}>Total : {totalVal} </p>
        </div>
      </div>
      <div className={classes.dashboardFiltersBtnsDiv}>
        <Button
          color="primary"
          variant="outlined"
          className={classes.secondaryButtonStyle}
          onClick={() => handleFiltersCancel()}
        >
          Cancel
        </Button>
        <Button
          color="primary"
          variant="contained"
          className={classes.primaryButtonStyle}
          onClick={() => handleFiltersApply()}
        >
          Apply
        </Button>
      </div>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    treemapFiltersData: HindsightServiceActions.setHindsightTreemapFiltersSelector(
      state
    ),
  };
};

const mapActionsToProps = {};
export default connect(mapStateToProps, mapActionsToProps)(MetricsFilters);
