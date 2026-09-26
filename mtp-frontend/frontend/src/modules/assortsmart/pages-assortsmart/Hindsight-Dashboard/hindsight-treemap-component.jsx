import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { Typography, Card, Grid, Button, Popover } from "@mui/material";
import { groupBy, isEmpty } from "lodash";
import Charts from "core/Utils/charts";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import { getAllFilters } from "core/actions/filterAction";
import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import {
  setHindsightLoader,
  getHindsightTreemapFilters,
  setHindsightTreemapFiltersOptions,
  setTreemapLoader,
  getHindsightGraphDownload,
} from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import HindsightGraphHeader from "./hindsight-graph-header-componet";
import { addSnack } from "core/actions/snackbarActions";
import { configureGraphFilters,downloadAsExcel } from "./hindsight-functions";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const HindsightTreemapComponent = (props) => {
  const classes = useStyles();
  const history = useHistory();
  const globalClasses = globalStyles();
  const [treemapOptions, setTreemapOptions] = useState({});
  const tabValues = useRef({});
  const [filtersConfig, setFiltersConfig] = useState({});
  const [graphSettingChanged, setGraphSettingChanged] = useState(false);
  const [chartRef, setChartRef] = useState(null);

  const configureFilters = async () => {
    const hindsightValues =
      props.screenConfiguration?.hindsight?.tree_graph_setting;
    //Configure tabvalues & filter configuration for hierarchy & graph filters
    tabValues.current = hindsightValues;
    const filtersConfig = await configureGraphFilters(hindsightValues, "treemap", props.treemapFilters, history, props);
    setFiltersConfig(filtersConfig);
  };

  const handleChartRef = (ref) => {
    setChartRef(ref);
  };

  useEffect(() => {
    if (!isEmpty(props.hindsightTreemapData)) {
      const mapData = props.hindsightTreemapData?.tree_rows;
      const settingsData = props.treemapFilters;
      const groupData = groupBy(mapData, "parent_level");
      const treeData = [];
      for (const pLevel in groupData) {
        const treeItemParent = {
          name: replaceSpecialCharacter(pLevel),
          id: "id_" + pLevel,
        };
        treeData.push(treeItemParent);
        for (const obj of groupData[pLevel]) {
          const selectedMetricValue = obj[settingsData["size"]];
          const viewLevel = replaceSpecialCharacter(obj["view_level"]);
          const treeItemChild = {
            name: viewLevel,
            parent: treeItemParent.id,
            value: selectedMetricValue,
            color: obj.color,
            size: settingsData["size"],
          };
          treeData.push(treeItemChild);
        }
      }
      const options = {
        chartType: "treemap",
        chartTitle: "",
        tooltip: {
          formatter: function () {
            let value =
              this.point.value > 1000000
                ? (this.point.value / 1000000).toFixed(2) + "M"
                : this.point.value > 1000
                ? (this.point.value / 1000).toFixed(2) + "K"
                : this.point.value.toFixed(2);
            let str =
              "View Tile: " +
              this.point.name +
              "<br/>" +
              "Component Tile: " +
              this.point.parent?.split("_")?.[1] +
              "<br/>" +
              props.treemapFiltersData?.["filter_keys_with_display_name"][
                this.point.size
              ] +
              ": " +
              value;
            return str;
          },
        },
        series: [
          {
            type: "treemap",
            layoutAlgorithm: "strip",
            alternateStartingDirection: true,
            allowDrillToNode: false,
            animation: false,
            levels: [
              {
                level: 1,
                dataLabels: {
                  enabled: true,
                  align: "left",
                  verticalAlign: "top",
                  style: {
                    fontSize: "15px",
                    fontWeight: "bold",
                    fontFamliy: "Poppins",
                  },
                },
              },
            ],
            borderColor: "#fff",
            borderRadius: 6,
            borderWidth: 2,
            data: treeData,
          },
        ],
      };
      props.setTreemapLoader(false);
      setTreemapOptions(options);
      if(graphSettingChanged){
        setGraphSettingChanged(false);
      }
    }
  }, [props.hindsightTreemapData, graphSettingChanged]);

  useEffect(() => {
    if (
      !isEmpty(props.screenConfiguration) &&
      !isEmpty(props.treemapFiltersData) &&
      !isEmpty(props.treemapFilters)
    ) {
      configureFilters();
    }
  }, [
    props.screenConfiguration,
    props.treemapFiltersData,
    props.treemapFilters,
  ]);

  const handleExport = (format) => {
    if (format === "jpeg") {
      chartRef.current.chart.exportChart({type: "image/jpeg", sourceWidth: 1200});
    } else if (format === "pdf") {
      chartRef.current.chart.exportChart({type: "application/pdf"});
    } else if (format === "excel") {
      downloadAsExcel(props.treemapFilters,props.hindsightFilterSelection,props.planCode,props.getHindsightGraphDownload,"treemap",props.addSnack)
    }
  };

  return (
    <Card className={`${globalClasses.paper} ${classes.hindsightGraphCard}`} id="tree-graph">
      <LoadingOverlay loader={props.treemapLoader} spinner>
        {
        filtersConfig && (
          <HindsightGraphHeader
            filtersConfig={filtersConfig}
            tabValues={tabValues.current}
            screenConfiguration={props.screenConfiguration}
            generateGraphData={(payload) => props.generateTreemapData(payload)}
            hindsightFilterSelection={props.hindsightFilterSelection}
            graphFilters={props.treemapFilters}
            setGraphFilters={props.setTreemapFilters}
            heading={"Tree Map"}
            graphType={"tree"}
            graphSettingChanged={graphSettingChanged}
            setGraphSettingChanged={setGraphSettingChanged}
            onExport={handleExport}
            />
        )
        }
        {(!isEmpty(treemapOptions) && 
        treemapOptions.series[0].data.length >0 ) ? 
          <Charts options={treemapOptions} handleChartRef={handleChartRef} screen={"hindsight-assort"}/>:<p className={classes.NoDataText}>No data Present for Selected Filters</p>}
      </LoadingOverlay>
    </Card>
  );
};

const mapStateToProps = (state) => {
  return {
    planLevels: state.assortsmartReducer.planDashboardReducer.planLevels,
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
    userAccessList:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    levelsJson: state.assortsmartReducer.planDashboardReducer.levelsJson,
    hindsightTreemapData: HindsightServiceActions.setHindsightTreemapSelector(
      state
    ),
    treemapFiltersData: HindsightServiceActions.setHindsightTreemapFiltersSelector(
      state
    ),
    treemapLoader: HindsightServiceActions.setTreemapLoaderSelector(state),
  };
};

const mapActionsToProps = {
  getAllFilters,
  addSnack,
  setHindsightLoader,
  getHindsightTreemapFilters,
  getHindsightGraphDownload,
  setHindsightTreemapFiltersOptions,
  setTreemapLoader
};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(HindsightTreemapComponent);
