import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { isEmpty, filter } from "lodash";
import { Card, Typography, Button, Grid } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import SwapStoreModal from "./swap-store-modal-component";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { getChannelBasedStoreGroups } from "../../../../assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import {
  getClusterBreakdownData,
  setClusterBreakdownData,
  getAttributeGraphData,
  setAttributeGraphData,
  setPerformanceGraphData,
  getPerformanceGraphData,
  set1_2_Loader,
} from "../../../../assortsmart/services-assortsmart/Clustering/Finalize-Cluster/finalize-cluster-service";
import { setClusterBreakDownLoader } from "modules/clusterSmart/services-clustersmart/ClusterPlan/cluster-plan-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { getColumnsAg } from "../../../../../core/actions/tableColumnActions";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import GlobalStyles from "core/Styles/globalStyles";
import {
  getPlanPayload,
  isWholesalePlan,
  prepareAttrGraphPayload,
} from "../../../../assortsmart/utils-assortsmart/utilityFunctions";
import AgGridTable from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  addAttributeValueBasedOnKey,
  getExcelDataForClusterRollup,
  getExcelHeaderForClusterRollup,
} from "modules/assortsmart/pages-assortsmart/Plan-Dashboard/components/common-plan-functions";
import { addSnack } from "core/actions/snackbarActions";
import TableChartIcon from "@mui/icons-material/TableChart";
import BarChartIcon from "@mui/icons-material/BarChart";
import { Plan } from "modules/assortsmart/constants-assortsmart/stringContants";
import MapView from "./map-view-component";

const ClusterBreakdownComponent = (props) => {
  const [clusterBreakDownColumns, setClusterBreakDownColumns] = useState([]);
  const [clusterBreakdownTableData, setClusterBreakdownTableData] = useState(
    []
  );
  const [
    selectedClusterForSwapStore,
    setSelectedClusterForSwapStore,
  ] = useState([]);
  const [showSwapStoreModal, setShowSwapStoreModal] = useState(false);
  const classes = useStyles();
  const globalClasses = GlobalStyles();
  const [poSheetData, setPoSheetData] = useState([]);
  const [poSheetHeaders, setPoSheetHeaders] = useState([]);
  const [storeNote, setStoreNote] = useState("");
  const [currentClusterChannel, setCurrentClusterChannel] = useState("");
  let poSheetRefLink = useRef(null);
  const AGInstance = useRef({});

  const onDownloadPOSheetData = () => {
    poSheetRefLink.current.link.click();
  };

  useEffect(() => {
    if (!isEmpty(props.planDetails)) {
      const fetchData = async () => {
        let gradeBreakDownResponseCols = await getColumnsAg(
          props.fromPlanBudgetScreen
            ? "table_name=assort_cluster_grade_view"
            : "table_name=assort_cluster_grade"
        )();
        if (gradeBreakDownResponseCols?.length) {
          if (isWholesalePlan(props.planDetails?.data)) {
            gradeBreakDownResponseCols.forEach((item) => {
              if (item.column_name === "lost_sales") {
                item.is_hidden = true;
              }
            });
          }
          let cols = agGridColumnFormatter(gradeBreakDownResponseCols);
          cols.forEach((eachCol) => {
            if (eachCol.type === "link" && eachCol.is_aggregated) {
              eachCol.cellRenderer = (instance) => {
                eachCol.onClick = onStoreNameClick;
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
            if (eachCol.column_name === "store_code") {
              eachCol.cellRenderer = (instance) => {
                if (typeof instance.value === "number") {
                  return `${instance.value || 0} Stores`;
                } else {
                  return instance.value || "";
                }
              };
            }
            if (
              eachCol.accessor === "g_cluster" &&
              !isWholesalePlan(props.planDetails?.data)
            ) {
              eachCol.rowGroup = true;
              eachCol.hide = true;
            }
            if (eachCol.accessor === "g_cluster") {
              eachCol.is_hidden = true;
            }
          });
          setClusterBreakDownColumns(cols);
          let excelHeader = getExcelHeaderForClusterRollup(cols);
          setPoSheetHeaders(excelHeader);
        }
        if (props.attributeClusterBucket && props.performanceClusterBucket) {
          callBreakdownTableData();
        }
      };
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.planDetails]);
  useEffect(() => {
    props.setClusterBreakDownLoader(true);
    if (props.attributeClusterBucket && props.performanceClusterBucket) {
      callBreakdownTableData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.attributeClusterBucket, props.performanceClusterBucket]);

  const onStoreNameClick = (ins) => {
    // // Either can be used but with the second approach we can open popup modal for sub rows
    let aggregatedChildren =
      ins.cellData.node.childrenAfterAggFilter[0].data.cluster_code;
    if (props.planDetails?.data?.channel?.length > 0) {
      props.planDetails?.data?.channel.forEach((chan) => {
        if (aggregatedChildren?.includes(chan)) {
          setCurrentClusterChannel(chan);
        }
      });
    }
    aggregatedChildren && setSelectedClusterForSwapStore(aggregatedChildren);
    setShowSwapStoreModal(true);
  };

  useEffect(() => {
    let excelHeader = getExcelHeaderForClusterRollup(
      clusterBreakDownColumns,
      clusterBreakdownTableData
    );
    setPoSheetHeaders(excelHeader);
  }, [clusterBreakdownTableData]);

  const callBreakdownTableData = () => {
    setClusterBreakdownTableData([]);
    const fetchData = async () => {
      try {
        let planData = props.planDetails?.data;
        let filterData = getPlanPayload(
          planData,
          props.planLevels,
          false,
          true
        );
        filterData = filterData.filters.filter(
          (obj) => obj.attribute_name !== "plan_code"
        );
        filterData.push({
          attribute_name: "date",
          value: planData.selling_period?.length
            ? [
                planData?.selling_period?.[0]?.start_date,
                planData?.selling_period?.[0]?.end_date,
              ]
            : [planData.selling_period_sdate, planData.selling_period_edate],
          operator: "between",
        });
        filterData.push({
          attribute_name: "channel",
          operator: "in",
          value: props.channelSelected
            ? [props.channelSelected]
            : [planData.channel?.[0]],
        });
        let payload = {
          cluster_plan_code: props.planDetails?.data?.cluster_plan_code,
          performance_bucket_id: props.channelSelected
            ? parseInt(
                props.performanceBucketId[props.channelSelected] ||
                  props.performanceClusterBucket
              )
            : parseInt(props.performanceClusterBucket),
          attribute_bucket_id: parseInt(props.attributeClusterBucket),
          channel: props.channelSelected ? props.channelSelected : "",
          filters: filterData,
        };
        let response = await props.getClusterBreakdownData(payload);
        payload.channel = "";
        let channel = props.channelSelected
          ? [props.channelSelected]
          : props.planDetails?.data?.channel;
        const storeGrpResp = await props.getChannelBasedStoreGroups(
          channel,
          props.planDetails?.data?.sub_channel
        );
        let selectedGroup = filter(storeGrpResp?.data?.data, {
          sg_code: props.planDetails?.data?.store_group_id || 0,
        });

        let tableData =
          response?.data?.data?.length &&
          response?.data?.data?.map((table, index) => {
            let attribute_name = table.attribute_cluster_name;
            let performance_name = table.performance_cluster_name;
            props.planDetails?.data?.channel.forEach((chan) => {
              if (table.attribute_cluster_name.includes(chan)) {
                attribute_name = table.attribute_cluster_name.split(`${chan} `);
                attribute_name.unshift(chan);
              }
              if (table.performance_cluster_name.includes(chan)) {
                performance_name = table.performance_cluster_name.split(
                  `${chan} `
                );
                performance_name.unshift(chan);
              }
            });
            if (attribute_name?.length > 1) {
              table.cluster_code =
                attribute_name[0] +
                " " +
                attribute_name[2] +
                performance_name[2];
              table.g_cluster =
                table.cluster_display_name ||
                attribute_name[0] +
                  " " +
                  attribute_name[2] +
                  performance_name[2];
              table.g_cluster =
                table.g_cluster !== "null" && table.g_cluster
                  ? table.g_cluster
                  : "Unclustered Stores";
            } else {
              table.cluster_code =
                table.attribute_cluster_name + table.performance_cluster_name;
              table.g_cluster =
                table.cluster_display_name ||
                table.attribute_cluster_name + table.performance_cluster_name;
              table.g_cluster =
                table?.g_cluster !== "null" && table?.g_cluster
                  ? table?.g_cluster
                  : "Unclustered Stores";
            }
            if (table?.attribute_value) {
              table = addAttributeValueBasedOnKey(table);
            }
            table.uniqueID = table.g_cluster + index;
            return table;
          });
        let UnclusteredData = tableData.filter(
          (obj) => obj.g_cluster === "Unclustered Stores"
        );
        setStoreNote(
          `Cluster data is present for ${
            tableData?.length - UnclusteredData?.length
          } stores; Total store count - ${selectedGroup[0].store_count} stores`
        );
        let excelBodyData = getExcelDataForClusterRollup(tableData);
        setPoSheetData(excelBodyData);
        props.setClusterBreakdownData(tableData || []);
        let rowData = formatTableDataGrouping(tableData);
        setClusterBreakdownTableData(rowData);
        props.setClusterBreakDownLoader(false);
      } catch (error) {
        console.log("error:", error);
        props.setClusterBreakDownLoader(false);
        props.addSnack({
          message: "Fetching clster breakdown data failed",
          options: {
            variant: "error",
          },
        });
      }
    };
    fetchData();
  };

  const saveSwapStoreAlert = () => {
    setClusterBreakdownTableData([]);
    callBreakdownTableData();
    const renderGraphDataWithModifiedChanges = async () => {
      try {
        props.setClusterBreakDownLoader(true);
        let performanceGraphBody = {
          cluster_plan_code: props.planDetails?.data?.cluster_plan_code,
          bucket_id: parseInt(props.performanceClusterBucket),
          channel: props.channelSelected ? props.channelSelected : "",
        };
        let planData = props.planDetails?.data;
        let formData = {
          attributeBucketId: props.attributeClusterBucket,
          attribute: props.selectedProductAttribute,
        };
        if (props.channelSelected) {
          formData.channel = props.channelSelected;
          performanceGraphBody.channel = props.channelSelected;
        }
        let reqBodyAttrGraph = prepareAttrGraphPayload(
          planData,
          formData,
          props
        );
        let attributeGraphResponse = await props.getAttributeGraphData(
          reqBodyAttrGraph
        );
        props.setAttributeGraphData(attributeGraphResponse.data);
        let performanceGraphResponse = await props.getPerformanceGraphData(
          performanceGraphBody
        );
        props.setPerformanceGraphData(performanceGraphResponse.data);
        props.setClusterBreakDownLoader(false);
      } catch (err) {
        props.setClusterBreakDownLoader(false);
        props.addSnack({
          message: "Something went wrong",
          options: {
            variant: "error",
          },
        });
      }
    };
    renderGraphDataWithModifiedChanges();
  };

  const closeSwapStoreModal = () => {
    setShowSwapStoreModal(false);
    setCurrentClusterChannel("");
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

  const loadTableInstance = (params) => {
    AGInstance.current = params;
  };

  const autoGroupColumnDef = {
    headerName: clusterBreakDownColumns[0]?.label,
    cellStyle: (params) => {
      let heighlightedData = clusterBreakdownTableData.filter((data) => {
        let clusterName = data.cluster_display_name || data.g_cluster;
        return (
          data.is_highlight &&
          data.is_highlight !== "null" &&
          params.value === clusterName
        );
      });
      if (heighlightedData?.length) {
        return {
          backgroundColor: "#F0CBA3",
        };
      }
      return {
        backgroundColor: "white",
      };
    },
  };

  return (
    <>
      <Card className={`${globalClasses.paper} ${globalClasses.scroll}`}>
        <Grid container justifyContent="space-between">
          <Grid item>
            <Typography className={classes.heading} variant="h4">
              {props.viewState === "chart"
                ? "Map View"
                : "Cluster Breakdown Component"}
            </Typography>
          </Grid>
          <Grid item>
            {!props.hideMapView && props.mapViewOptions && (
              <>
                <Button
                  variant={
                    props.viewState === "table" ? "contained" : "outlined"
                  }
                  color="primary"
                  id={`cluster-breakdown-table`}
                  onClick={() => {
                    props.setViewState("table");
                  }}
                  title={Plan.__Table_View}
                >
                  <TableChartIcon />
                </Button>
                <Button
                  variant={
                    props.viewState === "chart" ? "contained" : "outlined"
                  }
                  color="primary"
                  id={`cluster-breakdown-chart`}
                  onClick={() => {
                    props.setViewState("chart");
                  }}
                  title={Plan.__Chart_View}
                >
                  <BarChartIcon />
                </Button>
              </>
            )}
            {props.viewState === "table" && (
              <Button
                variant="contained"
                color="primary"
                title={"Download View Cluster Grade"}
                className={classes.scaleUpDownBtn}
                onClick={() => {
                  onDownloadPOSheetData();
                }}
              >
                {<DownloadIcon />}
              </Button>
            )}
            {downloadExcelLink(
              poSheetData,
              `${props.planDetails?.data?.name}_Cluster_Grade_Summary`,
              poSheetRefLink,
              poSheetHeaders,
              "",
              ""
            )}
          </Grid>
        </Grid>
        {props.viewState === "table" && (
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
        )}
        {!props.hideMapView &&
          props.mapViewOptions &&
          props.viewState === "chart" && (
            <MapView
              attributeId={props.attributeClusterBucket}
              performanceId={props.performanceClusterBucket}
              mapviewOptions={props.mapViewOptions}
              getClusterMapViewDetails={props.getClusterMapViewDetails}
              mapViewFilterConfig={props.mapViewFilterConfig}
            />
          )}
        {storeNote && <p className={classes.clusterNotes}>*{storeNote}</p>}
        {showSwapStoreModal && (
          <SwapStoreModal
            showSwapStoreModal={showSwapStoreModal}
            selectedClusterForSwapStore={selectedClusterForSwapStore}
            performanceClusterBucket={parseInt(props.performanceClusterBucket)}
            attributeClusterBucket={parseInt(props.attributeClusterBucket)}
            saveSwapStoreAlert={saveSwapStoreAlert}
            closeSwapStoreModal={closeSwapStoreModal}
            currentClusterChannel={currentClusterChannel}
            perfAttrCharLabel={props.perfAttrCharLabel}
          />
        )}
      </Card>
    </>
  );
};
const mapStateToProps = (store) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(store),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(store),
  };
};

const mapActionsToProps = {
  getClusterBreakdownData,
  setClusterBreakdownData,
  set1_2_Loader,
  getAttributeGraphData,
  setAttributeGraphData,
  getPerformanceGraphData,
  setPerformanceGraphData,
  getChannelBasedStoreGroups,
  setClusterBreakDownLoader,
  getColumnsAg,
  addSnack,
};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(withRouter(ClusterBreakdownComponent));
