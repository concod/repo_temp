import { getFiltersAppliedData } from "core/Utils/functions/utils";
import {
  clearanceData,
  carryoverData,
  attributeMetrics,
  reviewMetrics,
  comaprisonMetric,
  timelineAttributes,
  geoGraphicalAttribute,
  stMarginXAxis,
  clearanceYAxisMetrics,
  clearanceAttributeData,
  hindsightFilterMetrics,
  graphAxisMetrics,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import { generateFilterConfig } from "../Plan-Dashboard/components/common-plan-functions";
import { getChannelOptions } from "modules/clusterSmart/pages-clustersmart/Clustering/Cluster-Input/components/common-functions";
import { isEmpty } from "lodash";

export const formatParetoGraphPayload = (
  hindsightFilterSelection,
  hindsightPlanData,
  setParetoGraphFilters,
  history,
  props
) => {
  const { filters, selectedFilters } =
    props.view_type === "edit" &&
      !isEmpty(hindsightPlanData?.pareto_graph_filter)
      ? getFiltersData(
        hindsightPlanData,
        hindsightPlanData?.pareto_graph_filter,
        props
      )
      : generateFiltersPayload(hindsightFilterSelection, history, props);
  let filters_applied =
    props.view_type === "edit" && hindsightPlanData?.pareto_graph_filter
      ? getFiltersAppliedData(hindsightPlanData?.pareto_graph_filter)
      : getFiltersAppliedData(hindsightFilterSelection);
  filters_applied["receipts_flag"] =
    hindsightFilterSelection?.buy?.[0] === "Style With Buy" ? true : false;
  const graph_filters = {
    x_axis: hindsightPlanData?.pareto_graph_filter?.x_axis || "l1_name",
    // y_axis: hindsightPlanData?.pareto_graph_filter?.y_axis || "qty",
    // y_axis_secondary:
    //   hindsightPlanData?.pareto_graph_filter?.y_axis_secondary || "revenue",
    axis_threshold:
      hindsightPlanData?.pareto_graph_filter?.axis_threshold || 80,
  };
  const settings = {
    y_axis: hindsightPlanData?.pareto_graph_filter?.y_axis || "qty",
    y_axis_secondary:
      hindsightPlanData?.pareto_graph_filter?.y_axis_secondary || "revenue",
  }
  if (
    props.view_type === "edit" &&
    !isEmpty(hindsightPlanData?.pareto_graph_filter)
  ) {
    setParetoGraphFilters({
      ...hindsightPlanData?.pareto_graph_filter,
      ...settings
    });
  } else {
    setParetoGraphFilters({
      ...selectedFilters,
      ...graph_filters,
      ...settings
    });
  }
  const payload = {
    filters: filters.filter(obj => obj.value.length > 0 && obj.value[0].length > 0),
    graph_filters: graph_filters,
    filters_applied: filters_applied,
    season: hindsightPlanData?.season || hindsightFilterSelection?.season?.[0],
    selling_period_sdate:
      hindsightPlanData?.selling_period_sdate ||
      hindsightFilterSelection?.selling_period_sdate,
    selling_period_edate:
      hindsightPlanData?.selling_period_edate ||
      hindsightFilterSelection?.selling_period_edate,
  };
  return payload;
};

export const formatPerformanceReviewGraphPayload = (
  hindsightFilterSelection,
  hindsightPlanData,
  setGraphFilters,
  history,
  props,
  graphType
) => {
  const graphLevelFilters =
    graphType === "attribute"
      ? hindsightPlanData?.attribute_graph_filter
      : graphType === "week/month wise"
        ? hindsightPlanData?.week_month_wise_graph_filter
        : hindsightPlanData?.geo_graph_filter;
  const { filters, selectedFilters } =
    props.view_type === "edit" && !isEmpty(graphLevelFilters)
      ? getFiltersData(hindsightPlanData, graphLevelFilters, props)
      : generateFiltersPayload(hindsightFilterSelection, history, props);
  const graph_filters = {
    compare_year: graphLevelFilters?.compare_year || -1,
    compare_season: graphLevelFilters?.compare_season || "",
  };
  let settings = {};
  settings = {
    review_metric: graphLevelFilters?.review_metric || "revenue",
  };
  if (graphType === "attribute" || graphType === "week/month wise") {
    graph_filters["x_axis"] =
      graphType === "attribute"
        ? graphLevelFilters?.attribute || "fit"
        : graphLevelFilters?.x_axis || "week";
    if (graphType === "attribute") {
      graph_filters["attribute"] = graphLevelFilters?.attribute || "fit";
    }
  } else if (graphType === "geograph") {
    graph_filters["geographical_attribute"] =
      graphLevelFilters?.geographical_attribute || "store_code";
  }
  if (props.view_type === "edit" && !isEmpty(graphLevelFilters)) {
    setGraphFilters({
      l0_name: hindsightPlanData?.l0_name,
      ...graphLevelFilters,
      ...settings,
    });
  } else {
    setGraphFilters({
      ...selectedFilters,
      ...graph_filters,
      ...settings,
    });
  }
  graph_filters["geographical_attribute_display_name"] = "store_name";
  let filters_applied =
    props.view_type === "edit" && graphLevelFilters
      ? getFiltersAppliedData(graphLevelFilters)
      : getFiltersAppliedData(hindsightFilterSelection);
  filters_applied["receipts_flag"] =
    hindsightFilterSelection?.buy?.[0] === "Style With Buy" ? true : false;
  const payload = {
    filters: filters.filter(obj => obj.value.length > 0 && obj.value[0].length > 0),
    graph_filters: graph_filters,
    filters_applied: filters_applied,
    season: hindsightPlanData?.season || hindsightFilterSelection?.season?.[0],
    selling_period_sdate:
      hindsightPlanData?.selling_period_sdate ||
      hindsightFilterSelection?.selling_period_sdate,
    selling_period_edate:
      hindsightPlanData?.selling_period_edate ||
      hindsightFilterSelection?.selling_period_edate,
  };
  return payload;
};

export const formatSTMarginPayload = (
  hindsightFilterSelection,
  hindsightPlanData,
  setGraphFilters,
  history,
  props,
  graphType
) => {
  const graphLevelFilters =
    graphType === "st_margin"
      ? hindsightPlanData?.st_graph_filter
      : hindsightPlanData?.discount_graph_filter;
  const { filters, selectedFilters } =
    props.view_type === "edit" && !isEmpty(graphLevelFilters)
      ? getFiltersData(hindsightPlanData, graphLevelFilters, props)
      : generateFiltersPayload(hindsightFilterSelection, history, props);
  const graph_filters = {
    x_axis: hindsightPlanData?.graphLevelFilters || "l1_name",
    y_axis: "qty_sold",
    line_y: graphType === "st_margin" ? "margin_percent" : "avg_discount",
    line_y_sec: graphType === "st_margin" ? "st" : "margin_percent",
  };
  if (graphType === "st_margin") {
    graph_filters["y_axis_secondary"] = "total_inventory";
  }
  if (props.view_type === "edit" && !isEmpty(graphLevelFilters)) {
    setGraphFilters({
      l0_name: hindsightPlanData?.l0_name,
      ...graphLevelFilters,
    });
  } else {
    setGraphFilters({
      ...selectedFilters,
      ...graph_filters,
    });
  }
  let filters_applied =
    props.view_type === "edit" && !isEmpty(graphLevelFilters)
      ? getFiltersAppliedData(graphLevelFilters)
      : getFiltersAppliedData(hindsightFilterSelection);
  filters_applied["receipts_flag"] =
    hindsightFilterSelection?.buy?.[0] === "Style With Buy" ? true : false;
  const payload = {
    filters: filters.filter(obj => obj.value.length > 0 && obj.value[0].length > 0),
    graph_filters: graph_filters,
    filters_applied: filters_applied,
    season: hindsightPlanData?.season || hindsightFilterSelection?.season?.[0],
    selling_period_sdate:
      hindsightPlanData?.selling_period_sdate ||
      hindsightFilterSelection?.selling_period_sdate,
    selling_period_edate:
      hindsightPlanData?.selling_period_edate ||
      hindsightFilterSelection?.selling_period_edate,
  };
  return payload;
};

export const formatClearanceGraphPayload = (
  hindsightFilterSelection,
  hindsightPlanData,
  setGraphFilters,
  history,
  props
) => {
  const { filters, selectedFilters } =
    props.view_type === "edit" &&
      !isEmpty(hindsightPlanData?.clearance_graph_filter)
      ? getFiltersData(
        hindsightPlanData,
        hindsightPlanData?.clearance_graph_filter,
        props
      )
      : generateFiltersPayload(hindsightFilterSelection, history, props);
  let settings = {};
  settings = {
    y_axis: hindsightPlanData?.clearance_graph_filter?.y_axis || "revenue",
    cc_attribute:
      hindsightPlanData?.clearance_graph_filter?.cc_attribute || "carryover",
  };
  const graph_filters = {
    x_axis: hindsightPlanData?.clearance_graph_filter?.x_axis || "l1_name",
    y_axis_secondary:
      hindsightPlanData?.clearance_graph_filter?.y_axis_secondary || "margin_percent",
    compare_year: hindsightPlanData?.clearance_graph_filter?.compare_year || -1,
    compare_season:
      hindsightPlanData?.clearance_graph_filter?.compare_season || "",
  };
  if (
    props.view_type === "edit" &&
    !isEmpty(hindsightPlanData?.clearance_graph_filter)
  ) {
    setGraphFilters({
      l0_name: hindsightPlanData?.l0_name,
      ...hindsightPlanData?.clearance_graph_filter,
      ...settings,
    });
  } else {
    setGraphFilters({
      ...selectedFilters,
      ...graph_filters,
      ...settings,
    });
  }
  let filters_applied = {};
  filters_applied["receipts_flag"] =
    hindsightFilterSelection?.buy?.[0] === "Style With Buy" ? true : false;
  const payload = {
    filters: filters.filter(obj => obj.value.length > 0 && obj.value[0].length > 0),
    graph_filters: graph_filters,
    filters_applied: filters_applied,
    season: hindsightPlanData?.season || hindsightFilterSelection?.season?.[0],
    selling_period_sdate:
      hindsightPlanData?.selling_period_sdate ||
      hindsightFilterSelection?.selling_period_sdate,
    selling_period_edate:
      hindsightPlanData?.selling_period_edate ||
      hindsightFilterSelection?.selling_period_edate,
  };
  return payload;
};

export const formatSizeGraphPayload = (
  hindsightFilterSelection,
  hindsightPlanData,
  setGraphFilters,
  history,
  props
) => {
  const { filters, selectedFilters } =
    props.view_type === "edit" && !isEmpty(hindsightPlanData?.size_graph_filter)
      ? getFiltersData(
        hindsightPlanData,
        hindsightPlanData?.size_graph_filter,
        props
      )
      : generateFiltersPayload(hindsightFilterSelection, history, props);
  const graph_filters = {
    x_axis: "size",
    y_axis: hindsightPlanData?.size_graph_filter?.y_axis || "revenue",
    y_axis_secondary: "margin_percent",
    compare_year: hindsightPlanData?.size_graph_filter?.compare_year || -1,
    compare_season: hindsightPlanData?.size_graph_filter?.compare_season || "",
  };
  const settings = {
    y_axis: "revenue",
  };
  if (
    props.view_type === "edit" &&
    !isEmpty(hindsightPlanData?.size_graph_filter)
  ) {
    setGraphFilters({
      l0_name: hindsightPlanData?.l0_name,
      ...hindsightPlanData?.size_graph_filter,
      settings: settings,
    });
  } else {
    setGraphFilters({
      ...selectedFilters,
      ...graph_filters,
      settings: settings,
    });
  }
  let filters_applied =
    props.view_type === "edit" && hindsightPlanData?.size_graph_filter
      ? getFiltersAppliedData(hindsightPlanData?.size_graph_filter)
      : getFiltersAppliedData(hindsightFilterSelection);
  filters_applied["receipts_flag"] =
    hindsightFilterSelection?.buy?.[0] === "Style With Buy" ? true : false;
  const payload = {
    filters: filters.filter(obj => obj.value.length > 0 && obj.value[0].length > 0),
    graph_filters: graph_filters,
    filters_applied: filters_applied,
    season: hindsightPlanData?.season || hindsightFilterSelection?.season?.[0],
    selling_period_sdate:
      hindsightPlanData?.selling_period_sdate ||
      hindsightFilterSelection?.selling_period_sdate,
    selling_period_edate:
      hindsightPlanData?.selling_period_edate ||
      hindsightFilterSelection?.selling_period_edate,
    receipts_flag:
      props.view_type === "edit"
        ? hindsightPlanData?.buy === "Style With Buy"
          ? true
          : false
        : hindsightFilterSelection?.buy?.[0] === "Style With Buy"
          ? true
          : false,
  };
  return payload;
};

export const getFiltersData = (plandetails, graphFilters, props) => {
  const filters = [],
    selectedFilters = {};
  const levels = Object.keys(props.levelsJson)?.concat(["channel"]);
  const graphLevelData = graphFilters ? graphFilters : plandetails;
  for (const level of levels) {
    if (levels?.includes(level)) {
      if (
        graphLevelData[level] || level === "l0_name"
      ) {
        selectedFilters[level] = graphLevelData?.[level] ? graphLevelData?.[level] : plandetails?.[level]; 
        filters.push({
          attribute_name: level,
          value: Array.isArray(graphLevelData?.[level]) && graphLevelData?.[level]?.length
            ? graphLevelData?.[level]
            : graphLevelData?.[level]
            ? [graphLevelData?.[level]]
            : Array.isArray(plandetails?.[level]) && plandetails?.[level]?.length
            ? plandetails?.[level]
            : [plandetails?.[level]],
          operator: "in",
        });
      }
    }
  }
  return { filters, selectedFilters };
};

export const generateFiltersPayload = (filterData, history, props) => {
  const filterConfiguration =
    props.filterDashboardConfiguration[
      `assort${history.location.pathname}FilterConfiguration`
    ]?.filterConfig?.[0]?.filterDashboardData;
  const filters = [];
  const levelsData = Object.keys(props.levelsJson);
  levelsData.push("channel");
  const selectedFilters = {};
  levelsData?.forEach((level) => {
    const defaultValue = filterConfiguration
      ?.filter((item) => {
        return item.accessor === level;
      })?.[0]
      ?.initialData?.map((data) => {
        return data.value;
      });
    selectedFilters[level] =
      Array.isArray(filterData[level]) && filterData[level]?.length
        ? filterData[level]
        : filterData[level]?.length
          ? [filterData[level]]
          : Array.isArray(defaultValue)
            ? defaultValue
            : [defaultValue];
    filters.push({
      attribute_name: level,
      value:
        Array.isArray(filterData[level]) && filterData[level]?.length
          ? filterData[level]
          : filterData[level]?.length
            ? [filterData[level]]
            : Array.isArray(defaultValue)
              ? defaultValue
              : [defaultValue],
      operator: "in",
    });
  });
  return { filters: filters, selectedFilters: selectedFilters };
};

export const configureFilters = async (
  hindsightValues,
  graphFilters,
  props,
  history,
  graphType
) => {
  let filtersConfig = {};
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
            graphFilters
          );
          filterConfig?.forEach((item) => {
            if (item.accessor === "channel") {
              if (graphType === "geograph") {
                item.isMulti = false;
                item.options = channels?.filter((chan) => {
                  return chan.value !== "ECOMM";
                });
              } else {
                item.options = channels;
              }
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
          });
        }
        filtersConfig[key] = filterConfig;
      }
    }
  }
  filtersConfig["Graph Filters"]?.forEach((item) => {
    if (item.accessor === "attribute") {
      item.options = props.treemapFiltersData?.["attr_matrics_group"]?.map(
        (attr) => {
          return {
            label:
              props.treemapFiltersData?.filter_keys_with_display_name?.[attr] ||
              props.levelsJson?.[attr],
            value: attr,
            id: attr,
          };
        }
      );
    } else if (item.accessor === "review_metric") {
      item.options = props.treemapFiltersData?.[
        "attr_geo_weekly_review_group"
      ]?.map((size) => {
        return {
          label:
            props.treemapFiltersData?.filter_keys_with_display_name?.[size] ||
            props.levelsJson?.[size],
          value: size,
          id: size,
        };
      });
    } else if (item.accessor === "compare_with") {
      item.options = Object.keys(comaprisonMetric)?.map((metric) => {
        return {
          label: comaprisonMetric[metric],
          value: metric,
          id: metric,
        };
      });
    } else if (item.accessor === "x_axis") {
      if (graphType === "STMargin" || graphType == "clearance") {
        item.options = props.treemapFiltersData?.[
          "st_discount_clearance_carryover_x_axis_group"
        ]?.map((attr) => {
          return {
            label:
              props.treemapFiltersData?.filter_keys_with_display_name?.[attr] ||
              props.levelsJson?.[attr],
            value: attr,
            id: attr,
          };
        });
      } else if (graphType === "week/month wise") {
        item.options = props.treemapFiltersData?.["weekly_matrics_group"]?.map(
          (attr) => {
            return {
              label:
                props.treemapFiltersData?.filter_keys_with_display_name?.[attr],
              value: attr,
              id: attr,
            };
          }
        );
      }
    } else if (item.accessor === "geographical_attribute") {
      item.options = props.treemapFiltersData?.["geo_matrics_group"]?.map(
        (attr) => {
          return {
            label:
              props.treemapFiltersData?.filter_keys_with_display_name?.[attr],
            value: attr,
            id: attr,
          };
        }
      );
    } else if (item.accessor === "y_axis") {
      if (graphType === "clearance") {
        item.options = Object.keys(clearanceYAxisMetrics)?.map((metric) => {
          return {
            label: clearanceYAxisMetrics[metric],
            value: metric,
            id: metric,
          };
        });
      }
      if (graphType === "size_review") {
        item.options = props.treemapFiltersData["size_graph_y_axis_group"]?.map(
          (size) => {
            return {
              label:
                props.levelsJson[size] ||
                props.treemapFiltersData["filter_keys_with_display_name"]?.[
                size
                ],
              value: size,
              id: size,
            };
          }
        );
      }
    } else if (item.accessor === "cc_attribute") {
      item.options = Object.keys(clearanceAttributeData)?.map((metric) => {
        return {
          label: clearanceAttributeData[metric],
          value: metric,
          id: metric,
        };
      });
    }
  });
  return filtersConfig;
};

export const configureGraphFilters = async (
  hindsightValues,
  graphType,
  graphFilters,
  history,
  props
) => {
  const filtersConfig = {};
  filtersConfig["graphFilters"] = {};
  if (
    graphType !== "STMargin"
  ) {
    filtersConfig["settings"] = {};
  }
  const constantMetricsMaping = {
    clearance: clearanceData,
    carryover: carryoverData,
    compare_with: comaprisonMetric,
    cc_attribute: clearanceAttributeData,
  };
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
            graphFilters
          );
          filterConfig?.forEach((item) => {
            if (item.accessor === "channel") {
              if (graphType === "geograph") {
                item.isMulti = false;
                item.options = channels?.filter((chan) => {
                  return chan.value !== "ECOMM";
                });
              } else {
                item.options = channels;
              }
            }
            if (Object.keys(constantMetricsMaping)?.includes(item.accessor)) {
              if (
                item.accessor === "clearance" ||
                item.accessor === "carryover"
              ) {
                item.options = constantMetricsMaping[item.accessor]?.map(
                  (filter) => {
                    return {
                      label: filter.column_name,
                      value: filter.value,
                      id: filter.value,
                    };
                  }
                );
              }
              if (
                item.accessor === "compare_with" ||
                item.accessor === "cc_attribute"
              ) {
                const data = constantMetricsMaping[item.accessor];
                item.options = Object.keys(data)?.map((metric) => {
                  return {
                    label: data[metric],
                    value: metric,
                    id: metric,
                  };
                });
              }
            } else if (
              Object.keys(hindsightFilterMetrics)?.includes(item.accessor)
            ) {
              if (
                item.accessor === "review_metric" &&
                graphType === "timeline"
              ) {
                item.options = props.treemapFiltersData[
                  "weekly_review_graph_group"
                ]?.map((metric) => {
                  return {
                    label:
                      props.levelsJson?.[metric] ||
                      props.treemapFiltersData["filter_keys_with_display_name"][
                        metric
                      ],
                    value: metric,
                    id: metric,
                  };
                });
              } else {
                const key = item.accessor;
                item.options = props.treemapFiltersData[
                  hindsightFilterMetrics[key]
                ]?.map((metric) => {
                  return {
                    label:
                      props.levelsJson?.[metric] ||
                      props.treemapFiltersData["filter_keys_with_display_name"][
                        metric
                      ],
                    value: metric,
                    id: metric,
                  };
                });
              }
            } else if (Object.keys(graphAxisMetrics)?.includes(item.accessor)) {
              if (graphType === "clearance" && item.accessor === "y_axis") {
                item.options = Object.keys(clearanceYAxisMetrics)?.map(
                  (metric) => {
                    return {
                      label: clearanceYAxisMetrics[metric],
                      value: metric,
                      id: metric,
                    };
                  }
                );
              } else {
                const axisKey = item.accessor;
                const graphAxisMetricKey = graphAxisMetrics[axisKey][graphType];
                item.options = props.treemapFiltersData[
                  graphAxisMetricKey
                ]?.map((size) => {
                  return {
                    label:
                      props.levelsJson?.[size] ||
                      props.treemapFiltersData?.[
                      "filter_keys_with_display_name"
                      ]?.[size],
                    value: size,
                    id: size,
                  };
                });
              }
            }
          });
        }
        const accessKey = filterKey.includes("filters")
          ? "graphFilters"
          : "settings";
        filtersConfig[accessKey][key] = filterConfig;
      }
    }
  }
  return filtersConfig;
};

const downloadExcel = async (downloadChart, reqObj,addSnack) => {
  try {
    addSnack({
      message: "Excel Download will be Ready",
      options: {
        variant: "info",
      },
    });
    const response = await downloadChart(reqObj, "assort-smart");
    const url = response.data.data.data.url;
    window.location.href = url;
  } catch (error) {
    console.error("Error downloading Excel:", error);
    addSnack({
      message: "Error downloading Excel",
      options: {
        variant: "error",
      },
    });
  }
};

export const downloadAsExcel = (
  graphFilters,
  hindsightFilters,
  planCode,
  downloadChart,
  graphType,
  addSnack
) => {
  let graph_filters = {};
  let settings = {};
  if (graphType === "treemap") {
    //here
    graph_filters = {
      view_level: graphFilters.graph_levels,
      parent_level: graphFilters.view_tiles,
    };
    settings = undefined;
  } else if (graphType === "bubble_graph") {
    graph_filters = {
      bubble_points: graphFilters?.bubble_points,
      bubble_color_grp: graphFilters?.bubble_color_grp,
      x_axis_threshold: graphFilters?.x_axis_threshold,
      y_axis_threshold: graphFilters?.y_axis_threshold
    }
    settings = {
      x_axis: graphFilters.x_axis,
      y_axis: graphFilters.y_axis,
      bubble_size: graphFilters.bubble_size
    }
  }
  else if(graphType === "parito_graph"){
    graph_filters = {
      x_axis: graphFilters?.x_axis,
      axis_threshold: graphFilters?.axis_threshold,
    };
    settings = undefined;
  }
  else if(graphType === "st_margin_graph") {
   graph_filters = {
    x_axis: graphFilters?.x_axis,
    y_axis : graphFilters?.y_axis,
    line_y : graphFilters?.line_y,
    line_y_sec : graphFilters?.line_y_sec,
    y_axis_secondary : graphFilters?.y_axis_secondary
  }
}
else if(graphType === "discount_margin_graph"){
  graph_filters = {
    x_axis : graphFilters?.x_axis,
    y_axis : graphFilters?.y_axis,
    line_y : graphFilters?.line_y,
    line_y_sec : graphFilters?.line_y_sec
  }
}

  let reqObj = {
    graph_name: graphType,
    graph_data: {
      hindsight_plan_code: planCode,
      filters: [
        {
          attribute_name: "l0_name",
          value: [...graphFilters.l0_name],
          operator: "in",
        },
        {
          attribute_name: "l1_name",
          value: [...graphFilters.l1_name],
          operator: "in",
        },
        {
          attribute_name: "l2_name",
          value: [...graphFilters.l2_name],
          operator: "in",
        },
        {
          attribute_name: "l3_name",
          value: [...graphFilters.l3_name],
          operator: "in",
        },
        {
          attribute_name: "channel",
          value: [...graphFilters.channel],
          operator: "in",
        },
      ],
      graph_filters: graph_filters,
      metrics: graphType === "treemap" ?[...graphFilters.metrics] : undefined,
      settings: settings,
      filters_applied: {
        receipts_flag: false,
      },
      size_name: graphFilters.size,
      season: hindsightFilters.season_name,
      selling_period_sdate: hindsightFilters["range-picker"][0],
      selling_period_edate: hindsightFilters["range-picker"][1],
    },
  };
  downloadExcel(downloadChart, reqObj,addSnack);
};
