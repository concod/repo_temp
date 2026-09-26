import { useState, useEffect, useRef } from "react";
import { Typography, Button } from "@mui/material";
import { connect } from "react-redux";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import PlanGraphTabViewComponent from "modules/assortsmart/pages-assortsmart/Plan/plan-drop-tab-view-component";
import GraphFiltersData from "./graph-filters-data";
import MetricsFilters from "./metrics-filter-data";
import { cloneDeep, isArray, isEmpty } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import "./graphStyles.css";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { metricsColumnsData } from "./metrics-data";
import { getFiltersAppliedData } from "core/Utils/functions/utils";

const GraphFilters = (props) => {
  const classes = useStyles();
  const [selectedTab, setSelectedTab] = useState(null);
  const [graphFiltersConfig, setGraphFiltersConfig] = useState([]);
  const [selectedGraphFilters, setSelectedGraphFilters] = useState({});
  const [selectedMetricsData, setSelectedMetricsData] = useState([]);
  const [selectedSettingsData, setSelectedSettingsData] = useState({});
  const [metricsOptions, setMetricsOptions] = useState([]);
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [metricsColumns, setMetricsColumns] = useState([]);
  const [defaultValues, setDefaultValues] = useState({
    graphFilters: {},
    settings: {},
  });
  const metricsTableData = useRef({});

  const handleFiltersCancel = () => {
    props.closePopover();
  };

  useEffect(() => {
    const metricOptions = props.treemapFiltersData?.["metric_group"]?.map(
      (item) => {
        return {
          label:
            props.treemapFiltersData["filter_keys_with_display_name"]?.[item],
          value: item,
          id: item,
        };
      }
    );
    setMetricsOptions(metricOptions);
    const selectedMetrics = props.treemapFilters?.metrics
      ? props.treemapFilters?.metrics?.map((item) => {
          return {
            label:
              props.treemapFiltersData["filter_keys_with_display_name"]?.[
                item.metric_name
              ],
            value: item.metric_name,
            id: item.metric_name,
          };
        })
      : props.graphFilters?.metrics?.map((item) => {
          return {
            label:
              props.treemapFiltersData["filter_keys_with_display_name"]?.[
                item.metric_name
              ],
            value: item.metric_name,
            id: item.metric_name,
          };
        });
    setSelectedMetrics(selectedMetrics);
    const tableData = selectedMetrics?.map((metric) => {
      const metricsData = props.treemapFilters?.metrics
        ? props.treemapFilters?.metrics
        : props.graphFilters?.metrics;
      const weightage = metricsData?.filter((item) => {
        return item.metric_name === metric.value;
      })?.[0]?.weightage;
      return {
        metric: metric.label,
        metric_name: metric.value,
        weightage: weightage || 50,
        value: [weightage || "50"],
      };
    });
    console.log("table:", tableData);
    metricsTableData.current = tableData;
    setSelectedMetricsData(tableData);
    const columns = agGridColumnFormatter(cloneDeep(metricsColumnsData));
    setMetricsColumns(columns);
  }, []);

  useEffect(() => {
    if (!isEmpty(props.filtersConfig)) {
      const hierarchyDefaultValues = {
        graphFilters: {},
        settings: {},
      };
      for (const config in props.filtersConfig) {
        for (const level in props.filtersConfig[config]) {
          props.filtersConfig[config][level]?.forEach((item) => {
            const defaultValue = props.graphFilters[item.accessor];
            hierarchyDefaultValues[config][item.accessor] = defaultValue;
            if (item.accessor === "channel" && props.graphType === "geograph") {
              hierarchyDefaultValues[config][item.accessor] =
                isArray(props?.graphFilters?.channel) &&
                props.graphFilters?.channel?.includes("US")
                  ? "US"
                  : props.graphFilters?.channel;
            }
            if (item.accessor === "view_tiles") {
              item.options = props.treemapFiltersData[
                "tile_with_component_combination"
              ]?.[hierarchyDefaultValues[config]["graph_levels"]]?.map(
                (level) => {
                  return {
                    label:
                      props.levelsJson[level] ||
                      props.treemapFiltersData["filter_keys_with_display_name"][
                        level
                      ],
                    value: level,
                    id: level,
                  };
                }
              );
            }
            if (item.accessor === "bubble_color_grp") {
              item.options = props.treemapFiltersData[
                "bubble_point_to_bubble_color_mapping"
              ]?.[hierarchyDefaultValues[config]["bubble_points"]]?.map(
                (bubble_point) => {
                  return {
                    label:
                      props.levelsJson?.[bubble_point] ||
                      props.treemapFiltersData?.[
                        "filter_keys_with_display_name"
                      ]?.[bubble_point],
                    value: bubble_point,
                    id: bubble_point,
                  };
                }
              );
            }
            if (item.accessor === "compare_with") {
              hierarchyDefaultValues[config][item.accessor] = props
                .graphFilters["compare_with"]
                ? props.graphFilters["compare_with"]
                : props.graphFilters["compare_year"]
                ? "LY"
                : props.graphFilters["compare_season"];
            }
          });
        }
      }
      setDefaultValues(hierarchyDefaultValues);
      setSelectedGraphFilters(hierarchyDefaultValues["graphFilters"]);
      if (props.graphType !== "STMargin" && props.graphType !== "STDiscount") {
        setSelectedSettingsData(hierarchyDefaultValues["settings"]);
      }
    }
  }, [props.filtersConfig]);

  const validateGraphFilters = () => {
    let graphFiltersError = false,
      totalWeightage = 0;
    for (const filters in props.filtersConfig["graphFilters"]) {
      const filterGroup = props.filtersConfig["graphFilters"]?.[filters];
      [...filterGroup]?.forEach((item) => {
        if (item.required && !selectedGraphFilters[item.accessor]) {
          graphFiltersError = true;
        }
      });
    }
    if (graphFiltersError) {
      props.addSnack({
        message: "Select all the filter values",
        options: {
          variant: "error",
        },
      });
      return false;
    }
    if (props.graphType === "tree") {
      if (selectedMetricsData?.length < 2) {
        props.addSnack({
          message: "Select atleast two metrics",
          options: {
            variant: "error",
          },
        });
        return false;
      }
      selectedMetricsData?.forEach((item) => {
        totalWeightage += parseInt(item.weightage);
      });
      if (totalWeightage !== 100) {
        props.addSnack({
          message: "Total metrics weightage should be 100%",
          options: {
            variant: "error",
          },
        });
        return false;
      }
    }
    if (props.graphType === "bubble" && !isEmpty(selectedSettingsData)) {
      if (
        selectedSettingsData["x_axis"] === selectedSettingsData["y_axis"] ||
        selectedSettingsData["x_axis"] ===
          selectedSettingsData["bubble_size"] ||
        selectedSettingsData["y_axis"] === selectedSettingsData["bubble_size"]
      ) {
        props.addSnack({
          message: "Select unique value for X Axis, Y Axis, Bubble Size",
          options: {
            variant: "error",
          },
        });
        return false;
      }
    }
    if (props.graphType === "pareto") {
      if (
        selectedSettingsData["y_axis"] ===
          selectedSettingsData["y_axis_secondary"] ||
        selectedSettingsData["y_axis_secondary"] ===
          selectedSettingsData["y_axis"]
      ) {
        props.addSnack({
          message: "Select unique value for Y Axis, Y Axis Secondary",
          options: {
            variant: "error",
          },
        });
        return false;
      }
    }
    if (
      props.graphType !== "STMargin" &&
      props.graphType !== "STDiscount" &&
      isEmpty(selectedSettingsData)
    ) {
      props.addSnack({
        message: "Select settings values",
        options: {
          variant: "error",
        },
      });
      return false;
    }
    return true;
  };

  function filterDataByHierarchyValues(data, hierarchyFilters) {
    const hierarchyLevels = ["l0_name", "l1_name", "l2_name", "l3_name"];

    for (const level of hierarchyLevels) {
      const hierarchyFilter = hierarchyFilters.find(
        (filter) => filter.accessor === level
      );
      if (hierarchyFilter) {
        const options = hierarchyFilter.options.map((option) => option.value);
        data.forEach((item) => {
          if (item.attribute_name === level) {
            item.value = item.value.filter((val) => options.includes(val));
          }
        });
      }
    }
    data = data.filter((item) => item.value.length > 0);
    return data;
  }

  const handleFiltersApply = (callFilterApi) => {
    const isValid = validateGraphFilters();
    if (isValid) {
      props.setGraphFilters({});
      if (callFilterApi) {
        props.setGraphOptions && props.setGraphOptions({});
        props.setGraphDataReducer && props.setGraphDataReducer({});
        let filters = [],
          graphFilters = {};
        const filterLevels = Object.keys(props.levelsJson).concat(["channel"]);
        filterLevels.forEach((level) => {
          //if no filter is selected we will pass default filters for l0_name
          if (level === "l0_name" && selectedGraphFilters[level].length === 0) {
            filters.push({
              attribute_name: level,
              value: [...defaultValues["graphFilters"][level]],
              operator: "in",
            });
          } else if (
            (level === "l0_name" &&
              (props.hindsightFilterSelection[level] ||
                defaultValues["graphFilters"][level])) ||
            (level !== "l0_name" && selectedGraphFilters[level]?.length)
          ) {
            filters.push({
              attribute_name: level,
              value: Array.isArray(selectedGraphFilters[level])
                ? selectedGraphFilters[level]
                : selectedGraphFilters[level]
                ? [selectedGraphFilters[level]]
                : props.hindsightFilterSelection[level]
                ? props.hindsightFilterSelection[level]
                : defaultValues["graphFilters"][level],
              operator: "in",
            });
          }
        });
        if (selectedGraphFilters["l0_name"].length !== 0) {
          filters = filterDataByHierarchyValues(
            filters,
            props.filtersConfig.graphFilters["Hierarchy Filters"]
          );
        }
        if (props.graphType === "tree") {
          graphFilters = {};
          graphFilters["view_level"] = selectedGraphFilters?.["graph_levels"];
          graphFilters["parent_level"] = selectedGraphFilters?.["view_tiles"];
        } else if (props.graphType === "bubble") {
          graphFilters = {};
          graphFilters = {
            bubble_points: selectedGraphFilters?.["bubble_points"],
            bubble_color_grp: selectedGraphFilters?.["bubble_color_grp"],
            x_axis_threshold: selectedGraphFilters?.["x_axis_threshold"],
            y_axis_threshold: selectedGraphFilters?.["y_axis_threshold"],
          };
        } else if (props.graphType === "pareto") {
          graphFilters = {};
          graphFilters = {
            x_axis: selectedGraphFilters?.x_axis,
            axis_threshold: selectedGraphFilters?.axis_threshold,
          };
        } else if (
          props.graphType === "timeline" ||
          props.graphType === "geograph" ||
          props.graphType === "attribute"
        ) {
          graphFilters = {};
          graphFilters = {
            compare_year:
              selectedGraphFilters?.compare_with === "season" ? 0 : -1,
            compare_season:
              selectedGraphFilters?.compare_with === "season" ? "season" : "",
          };
          if (props.graphType === "timeline") {
            graphFilters["x_axis"] = selectedGraphFilters?.x_axis;
          } else if (props.graphType === "attribute") {
            graphFilters["x_axis"] = selectedGraphFilters?.attribute;
          } else {
            graphFilters["geographical_attribute"] =
              selectedGraphFilters?.geographical_attribute;
          }
        } else if (
          props.graphType === "STMargin" ||
          props.graphType === "STDiscount"
        ) {
          graphFilters = {};
          graphFilters = {
            x_axis: selectedGraphFilters["x_axis"],
            y_axis: "qty_sold",
            line_y:
              props.graphType === "STMargin"
                ? "margin_percent"
                : "avg_discount",
            line_y_sec:
              props.graphType === "STMargin" ? "st" : "margin_percent",
          };
          if (props.graphType === "STMargin") {
            graphFilters["y_axis_secondary"] = "total_inventory";
          }
        } else if (props.graphType === "clearance") {
          graphFilters = {};
          graphFilters = {
            x_axis: selectedGraphFilters?.x_axis,
            y_axis: selectedGraphFilters?.y_axis,
            y_axis_secondary:
              selectedGraphFilters?.y_axis_secondary || "margin",
            compare_year:
              selectedGraphFilters?.compare_with === "season" ? 0 : -1,
            compare_season:
              selectedGraphFilters?.compare_with === "season" ? "season" : "",
            cc_attribute: selectedGraphFilters?.cc_attribute,
          };
        } else if (props.graphType === "size_review") {
          console.log("selected:", selectedGraphFilters)
          graphFilters = {};
          graphFilters = {
            x_axis: "size",
            y_axis: selectedSettingsData?.y_axis,
            y_axis_secondary: "margin",
            compare_year:
              selectedGraphFilters?.compare_with === "season" ? 0 : -1,
            compare_season:
              selectedGraphFilters?.compare_with === "season" ? "season" : "",
          };
        }
        let filters_applied = getFiltersAppliedData(selectedGraphFilters);
        filters_applied["receipts_flag"] =
          props.hindsightFilterSelection?.buy?.[0] === "Style With Buy"
            ? true
            : false;
        const reqBody = {
          filters: filters,
          graph_filters: graphFilters,
          filters_applied: filters_applied,
          season:
            props.hindsightPlanDetails?.season ||
            props.hindsightFilterSelection["season"]?.[0],
          selling_period_sdate:
            props.hindsightFilterSelection["range-picker"]?.[0],
          selling_period_edate:
            props.hindsightFilterSelection["range-picker"]?.[1],
        };
        if (props.graphType === "tree") {
          reqBody["metrics"] = selectedMetricsData;
          reqBody["size_name"] = selectedSettingsData?.size;
        } else if (props.graphType === "bubble") {
          reqBody["settings"] = selectedSettingsData;
        }
        if (props.graphType === "tree") {
          props.setGraphFilters({
            l0_name:
              selectedGraphFilters["l0_name"] ||
              props.hindsightFilterSelection["l0_name"],
            ...selectedGraphFilters,
            ...selectedSettingsData,
            metrics: selectedMetricsData,
          });
        } else if (
          props.graphType === "bubble" ||
          props.graphType === "size_review" ||
          props.graphType === "clearance" ||
          props.graphType === "attribute" ||
          props.graphType === "geograph" ||
          props.graphType === "timeline" ||
          props.graphType === "pareto"
        ) {
          props.setGraphFilters({
            ...selectedGraphFilters,
            ...selectedSettingsData,
          });
        } else if (
          props.graphType === "STMargin" ||
          props.graphType === "STDiscount"
        ) {
          props.setGraphFilters({
            ...selectedGraphFilters,
          });
        }
        props.generateGraphData(reqBody);
      } else {
        props.setGraphOptions && props.setGraphOptions({});
        if (props.graphType === "tree") {
          props.setGraphFilters({
            l0_name:
              selectedGraphFilters["l0_name"] ||
              props.hindsightFilterSelection["l0_name"],
            ...selectedGraphFilters,
            ...selectedSettingsData,
            metrics: selectedMetricsData,
          });
        } else {
          props.setGraphFilters({
            l0_name:
              selectedGraphFilters["l0_name"] ||
              props.hindsightFilterSelection["l0_name"],
            ...selectedGraphFilters,
            ...selectedSettingsData,
          });
        }
        props.setGraphSettingChanged && props.setGraphSettingChanged(true);
      }
      props.closePopover();
    }
  };

  return (
    <div>
      <Typography
        variant="h5"
        style={{ padding: "20px 20px 20px 27px" }}
        gutterBottom
      >
        Graph Settings
      </Typography>
      {props.tabValues && (
        <div>
          <PlanGraphTabViewComponent
            groupedDrops={props.tabValues}
            onChangeTab={setSelectedTab}
          />
        </div>
      )}
      {(selectedTab === "filters" || selectedTab === "settings") && (
        <GraphFiltersData
          filtersConfig={
            selectedTab === "filters"
              ? props.filtersConfig["graphFilters"]
              : props.filtersConfig["settings"]
          }
          selectedGraphFilters={selectedGraphFilters}
          selectedSettingsData={selectedSettingsData}
          setSelectedFilters={
            selectedTab === "filters"
              ? setSelectedGraphFilters
              : setSelectedSettingsData
          }
          tabValue={selectedTab}
          levels={props.levels}
          hindsightFilterSelection={props.hindsightFilterSelection}
          graphFilters={props.graphFilters}
          graphType={props.graphType}
          defaultValues={
            selectedTab === "filters"
              ? defaultValues["graphFilters"]
              : defaultValues["settings"]
          }
          filtersApply={handleFiltersApply}
          filtersCancel={handleFiltersCancel}
          setGraphSettingChanged={props.setGraphSettingChanged}
          setGraphFilters={props.setGraphFilters}
          closePopover={props.closePopover}
          setDefaultValues={setDefaultValues}
          originalDefaultValues={defaultValues}
        />
      )}
      {selectedTab === "metrics" && (
        <MetricsFilters
          filtersConfig={props.filtersConfig}
          setSelectedMetrics={setSelectedMetrics}
          selectedMetrics={selectedMetrics}
          selectedMetricsData={selectedMetricsData}
          setSelectedMetricsData={setSelectedMetricsData}
          hindsightFilterSelection={props.hindsightFilterSelection}
          graphFilters={props.graphFilters}
          metricsColumns={metricsColumns}
          metricsOptions={metricsOptions}
          metricsTableData={metricsTableData.current}
          filtersApply={handleFiltersApply}
          filtersCancel={handleFiltersCancel}
          setGraphSettingChanged={props.setGraphSettingChanged}
        />
      )}
    </div>
  );
};

const mapStateToProps = (state) => {
  return {};
};

const mapActionsToProps = {
  addSnack,
};

export default connect(mapStateToProps, mapActionsToProps)(GraphFilters);
