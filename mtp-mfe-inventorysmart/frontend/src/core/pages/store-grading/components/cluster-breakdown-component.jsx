import { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { isEmpty } from "lodash";
import { Typography, Grid } from "@mui/material";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import {
  getPerformanceGraphData,
  setClusterBreakdownData,
} from "../../commonModulesServices/finalize-cluster-service";
import { setClusterBreakDownLoader } from "../../commonModulesServices/cluster-plan-service";
import { getColumnsAg } from "../../../actions/tableColumnActions";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import AgGridTable from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { addSnack } from "core/actions/snackbarActions";
import { addAttributeValueBasedOnKey } from "core/Utils/utils";

const ClusterBreakdownComponent = (props) => {
  const [clusterBreakDownColumns, setClusterBreakDownColumns] = useState([]);
  const [clusterBreakdownTableData, setClusterBreakdownTableData] = useState(
    []
  );
  const classes = useStyles();
  const AGInstance = useRef({});

  /**
   * @func
   * @desc Fetching column headers and updating local states
   */
  useEffect(() => {
    if (!isEmpty(props.planDetails)) {
      const fetchData = async () => {
        let gradeBreakDownResponseCols = await getColumnsAg(
          "table_name=assort_cluster_grade_view"
        )();
        if (gradeBreakDownResponseCols?.length) {
          let cols = agGridColumnFormatter(gradeBreakDownResponseCols);
          cols.forEach((eachCol) => {
            if (eachCol.type === "link" && eachCol.is_aggregated) {
              eachCol.cellRenderer = (instance) => {
                let cellData = { ...instance };
                cellData.value = `${instance.value} Stores`;
                // adding a condition here as all items under the column would be rendered as a link
                // cells are rendered as links
                if (typeof instance.value === "number") {
                  return (
                    <CellRenderers
                      cellData={cellData}
                      column={eachCol}
                    ></CellRenderers>
                  );
                } else return instance.value;
              };
            }
            if (eachCol.accessor === "g_cluster") {
              eachCol.rowGroup = true;
              eachCol.hide = true;
              eachCol.is_hidden = true;
            }
          });
          setClusterBreakDownColumns(cols);
        }
        if (props.performanceClusterBucket) {
          props.setClusterBreakDownLoader(true);
          callBreakdownTableData();
        }
      };
      fetchData();
    }
  }, [props.planDetails]);

  useEffect(() => {
    props.setClusterBreakDownLoader(true);
    if (props.channelSelected && props.performanceClusterBucket) {
      callBreakdownTableData();
    }
  }, [props.channelSelected, props.performanceClusterBucket]);


  /**
   * @func
   * @desc Fetching, updating and grouping cluster breakdown table data
   */
  const callBreakdownTableData = async () => {
    try {
      setClusterBreakdownTableData([]);
      const payload = {
        cluster_plan_code: props.planDetails.data.cluster_plan_code,
        channel: props.planDetails.data.channel[0],
      };

      const response = await props.getPerformanceGraphData(payload);
      let tableData =
        response?.data?.data?.datasets?.data?.length &&
        response?.data?.data?.datasets?.data?.map((table, index) => {
          let attribute_name = table.attribute_cluster_name;
          let performance_name = table.performance_cluster_name;
          if (attribute_name?.length > 1) {
            table.cluster_code =
              attribute_name[0] + " " + attribute_name[2] + performance_name[2];
            table.g_cluster =
              table.cluster_display_name ||
              attribute_name[0] + " " + attribute_name[2] + performance_name[2];
          } else {
            table.cluster_code =
              table.attribute_cluster_name + table.performance_cluster_name;
            table.g_cluster =
              table.cluster_display_name ||
              table.attribute_cluster_name + table.performance_cluster_name;
          }
          if (table?.attribute_value) {
            table = addAttributeValueBasedOnKey(table);
          }
          table.uniqueID = table.g_cluster + index;
          return table;
        });
      props.setClusterBreakdownData(tableData || []);
      let rowData = formatTableDataGrouping(tableData);
      setClusterBreakdownTableData(rowData);
      props.setClusterBreakDownLoader(false);
    } catch (error) {
      props.setClusterBreakDownLoader(false);
      props.addSnack({
        message: "Fetching clster breakdown data failed",
        options: {
          variant: "error",
        },
      });
    }
  };

  const formatTableDataGrouping = (budgetData) => {
    let rowData = [];
    budgetData.forEach((data) => {
      let flatRows = {
        ...data,
        hierarchy: [data.g_cluster, data.store_name],
      };
      rowData.push(flatRows);
    });
    return rowData;
  };

  /**
   * @func
   * @desc Update table ref
   * @param {Object} params
   */
  const loadTableInstance = (params) => {
    AGInstance.current = params;
  };

  const autoGroupColumnDef = {
    headerName: clusterBreakDownColumns[0]?.label,
  };

  return (
    <>
      <Grid container justifyContent="space-between">
        <Grid item>
          <Typography className={classes.heading} variant="h4">
            Cluster Breakdown Component
          </Typography>
        </Grid>
      </Grid>
      <AgGridTable
        rowdata={clusterBreakdownTableData || []}
        columns={clusterBreakDownColumns}
        loadTableInstance={loadTableInstance}
        groupDisplayType={"singleColumn"}
        suppressAggFuncInHeader={true}
        autoGroupColumnDef={autoGroupColumnDef}
        uniqueRowId="uniqueID"
        sizeColumnsToFitFlag
        sideBar={false}
        pagination={false}
        tableId={"cluster-breakdown-table"}
      />
    </>
  );
};
const mapStateToProps = (store) => {
  return {
    planDetails: store.assortsmartReducer.planDashboardReducer.planDetails,
  };
};
const mapDispatchToProps = (dispatch) => ({
  getPerformanceGraphData: (payload) =>
    dispatch(getPerformanceGraphData(payload)),
  setClusterBreakdownData: (payload) =>
    dispatch(setClusterBreakdownData(payload)),
  setClusterBreakDownLoader: (payload) =>
    dispatch(setClusterBreakDownLoader(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ClusterBreakdownComponent);
