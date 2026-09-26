import { getFiltersAppliedData } from "core/Utils/functions/utils";

export const formatParetoGraphPayload = (
hindsightFilterSelection,
  hindsightPlanData,
  setParetoGraphFilters,
  history,
  props
) => {

  const { filters, selectedFilters } =
    props.view_type === "edit" && hindsightPlanData?.pareto_graph_filter
      ? getFiltersData(hindsightPlanData, hindsightPlanData?.pareto_graph_filter, props)
      : generateFiltersPayload(hindsightFilterSelection, history, props);
  const graph_filters = {
    x_axis: hindsightPlanData?.pareto_graph_filter?.x_axis || "l1_name",
    y_axis: hindsightPlanData?.pareto_graph_filter?.y_axis || "qty",
    y_axis_secondary:
      hindsightPlanData?.pareto_graph_filter?.y_axis_secondary || "revenue",
    axis_threshold:
      hindsightPlanData?.pareto_graph_filter?.axis_threshold || 80,
  };
  if (props.view_type === "edit" && hindsightPlanData?.pareto_graph_filter) {
    setParetoGraphFilters({
      l0_name: hindsightPlanData?.l0_name,
      ...hindsightPlanData?.pareto_graph_filter,
    });
  } else {
    setParetoGraphFilters({
      ...selectedFilters,
      ...graph_filters,
    });
  }
  let filters_applied =
    props.view_type === "edit" && hindsightPlanData?.pareto_graph_filter
      ? hindsightPlanData?.pareto_graph_filter?.filters_applied
      : getFiltersAppliedData(hindsightPlanData);
  const payload = {
    filters: filters,
    graph_filters: graph_filters,
    filters_applied: filters_applied,
    season: hindsightPlanData?.season || hindsightFilterSelection?.season_name,
    selling_period_sdate: hindsightPlanData?.selling_period_sdate || hindsightFilterSelection?.selling_period_sdate,
    selling_period_edate: hindsightPlanData?.selling_period_edate || hindsightFilterSelection?.selling_period_edate,
  };
  return payload;
};

export const getFiltersData = (plandetails, graphFilters, props) => {
  const filters = [], selectedFilters = {}
  const levels = Object.keys(props.levelsJson)?.concat(["channel"]);
  const graphLevelData = graphFilters ? graphFilters : plandetails;
  console.log("data:", graphLevelData, props.levelsJson);
  for (const level in graphLevelData) {
    if (levels?.includes(level)) {
        if(graphLevelData[level]){
            selectedFilters[level] = graphLevelData?.[level]
            filters.push({
              attribute_name: level,
              value: graphLevelData?.[level],
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
    selectedFilters[level] = filterData[level]
      ? filterData[level]
      : defaultValue;
    filters.push({
      attribute_name: level,
      value: filterData[level] ? filterData[level] : defaultValue,
      operator: "in",
    });
  });
  return { filters: filters, selectedFilters: selectedFilters };
};
