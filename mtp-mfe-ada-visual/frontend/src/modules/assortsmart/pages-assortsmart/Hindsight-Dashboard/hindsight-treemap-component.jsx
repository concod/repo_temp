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
import { generateFilterConfig } from "../Plan-Dashboard/components/common-plan-functions";
import { getChannelOptions } from "modules/clusterSmart/pages-clustersmart/Clustering/Cluster-Input/components/common-functions";
import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import {
  setHindsightLoader,
  getHindsightTreemapFilters,
  setHindsightTreemapFiltersOptions,
} from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import {
  clearanceData,
  carryoverData,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import HindsightGraphHeader from "./hindsight-graph-header-componet";

const HindsightTreemapComponent = (props) => {
  const classes = useStyles();
  const history = useHistory();
  const globalClasses = globalStyles();
  const [treemapOptions, setTreemapOptions] = useState({});
  const tabValues = useRef({});
  const filtersConfig = useRef({});

  const configureFilters = async () => {
    const hindsightValues =
      props.screenConfiguration?.hindsight?.tree_graph_setting;
    //Configure tabvalues & filter configuration for hierarchy & graph filters
    tabValues.current = hindsightValues;
    filtersConfig.current["graphFilters"] = {};
    filtersConfig.current["settings"] = {};
    const channels = await getChannelOptions("", props.screenConfiguration);
    for (const filterKey in hindsightValues) {
      if (!filterKey.includes("metrics")) {
        for (const key in hindsightValues[filterKey]) {
          const param = hindsightValues[filterKey][key];
          const filterResp = await props.getAllFilters(param);
          let filterConfig = [];
          if (filterResp?.data?.status) {
            filterConfig = await generateFilterConfig(
              filterResp?.data?.data,
              "graph_filters",
              props.userAccessList,
              false,
              history.location.pathname,
              "",
              "",
              props.treemapFilters
            );
            filterConfig?.forEach((item) => {
              if (item.accessor === "channel") {
                item.options = channels;
              }
              if (item.accessor === "graph_levels") {
                item.options = props.treemapFiltersData["tile_group"]?.map(
                  (metric) => {
                    return {
                      label:
                        props.levelsJson?.[metric] ||
                        props.treemapFiltersData[
                          "filter_keys_with_display_name"
                        ][metric],
                      value: metric,
                      id: metric,
                    };
                  }
                );
              }
              if (item.accessor === "clearance") {
                item.options = clearanceData?.map((filter) => {
                  return {
                    label: filter.column_name,
                    value: filter.value,
                    id: filter.value,
                  };
                });
              }
              if (item.accessor === "carryover") {
                item.options = carryoverData?.map((filter) => {
                  return {
                    label: filter.column_name,
                    value: filter.value,
                    id: filter.value,
                  };
                });
              }
              if (item.accessor === "size") {
                item.options = props.treemapFiltersData["size_group"]?.map(
                  (size) => {
                    return {
                      label:
                        props.treemapFiltersData[
                          "filter_keys_with_display_name"
                        ][size],
                      value: size,
                      id: size,
                    };
                  }
                );
              }
            });
          }
          const accessKey = filterKey.includes("filters")
            ? "graphFilters"
            : "settings";
          filtersConfig.current[accessKey][key] = filterConfig;
        }
      }
    }
  };

  useEffect(() => {
    if (!isEmpty(props.hindsightTreemapData)) {
      const mapData = props.hindsightTreemapData?.tree_rows;
      const groupData = groupBy(mapData, "parent_level");
      const treeData = [];
      for (const pLevel in groupData) {
        const treeItemParent = {
          name: pLevel,
          id: "id_" + pLevel,
        };
        treeData.push(treeItemParent);
        for (const obj of groupData[pLevel]) {
          const selectedMetricValue = obj[props.treemapFilters["size"]];
          const treeItemChild = {
            name: obj["view_level"],
            parent: treeItemParent.id,
            value: selectedMetricValue,
            color: obj.color,
            size: props.treemapFilters["size"],
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
                : this.point.value > 100000
                ? (this.point.value / 100000).toFixed(2) + "K"
                : this.point.value.toFixed(2);
            let str =
              "View Tile: " +
              this.point.name +
              "<br/>" +
              "Component Tile: " +
              this.point.parent?.split("_")?.[1] +
              "<br/>" +
              this.point.size +
              ": " +
              value;
            return str;
          },
        },
        series: [
          {
            type: "treemap",
            layoutAlgorithm: "stripes",
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
      props.setHindsightLoader(false);
      setTreemapOptions(options);
    }
  }, [props.hindsightTreemapData]);

  useEffect(() => {
    if (
      !isEmpty(props.screenConfiguration) &&
      !isEmpty(props.treemapFiltersData)
    ) {
      configureFilters();
    }
  }, [props.screenConfiguration, props.treemapFiltersData]);

  return (
    <Card className={globalClasses.paper} id="tree-graph">
      <LoadingOverlay loader={props.treemapLoader} spinner>
        <HindsightGraphHeader
          filtersConfig={filtersConfig.current}
          tabValues={tabValues.current}
          screenConfiguration={props.screenConfiguration}
          generateGraphData={(payload) => props.generateTreemapData(payload)}
          hindsightFilterSelection={props.hindsightFilterSelection}
          graphFilters={props.treemapFilters}
          setGraphFilters={props.setTreemapFilters}
          heading={"Treemap"}
          graphType={"tree"}
        />
        {!isEmpty(treemapOptions) && <Charts options={treemapOptions} />}
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
    treemapLoader: HindsightServiceActions.setHindsightLoaderSelector(state),
  };
};

const mapActionsToProps = {
  getAllFilters,
  setHindsightLoader,
  getHindsightTreemapFilters,
  setHindsightTreemapFiltersOptions,
};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(HindsightTreemapComponent);
