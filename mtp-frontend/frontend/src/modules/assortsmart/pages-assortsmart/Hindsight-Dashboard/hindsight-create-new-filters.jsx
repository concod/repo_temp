import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { configurePlanHierarchyLevels } from "../Plan-Dashboard/components/common-plan-functions";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "../../../../core/actions/filterAction";
import { getStoreChannels } from "modules/assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import { formatStringArray } from "core/Utils/functions/utils";
import { getSeasonOptions } from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { cloneDeep, isEmpty } from "lodash";
import { setSelectedFilters } from "../../../../core/actions/filterAction";
import {
  carryoverData,
  clearanceData,
  receiptQuantityMetrics,
  sellingPeriodObj,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import { getFiltersAppliedData } from "core/Utils/functions/utils";
import {
  setHindsightParetoGraphData,
  setHindsightAttributeGraphData,
  setHindsightSTMarginGraphData,
  setHindsightGeoGraphData,
  setHindsightTimelineGraphData,
  setHindsightSTDiscountGraphData,
  setHindsightClearanceCarryoverGraphData,
  setHindsightSizeGraphData,
} from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";

const HindsightCreateViewFilters = (props) => {
  const classes = useStyles();
  const history = useHistory();
  const [hindsightFilterConfig, setHindsightFilterConfig] = useState([]);
  const seasonData = useRef({});
  const [filtersConfig, setFilters] = useState([]);

  const configureFilterConfig = async () => {
    const levels = await configurePlanHierarchyLevels(
      "Hindsight Create New Filters",
      history
    );
    let filters = levels;
    filters.forEach(async (item) => {
      if (item.accessor === "year") {
        const yearValues = [2022, 2023];
        const options = formatStringArray(yearValues);
        item.options = options;
        item.initialData = options;
      } else if (item.accessor === "selling_period") {
        item.column_name = "range-picker";
        item.enabledEndDays = ['Sunday'];
        item.enabledStartDays = ['Monday'];
      } else if (item.accessor === "clearance") {
        const options = clearanceData?.map((data) => {
          return {
            label: data.column_name,
            value: data.value,
            id: data.value,
            key: data.key,
          };
        });
        item.initialData = options;
        item.options = options;
      } else if (item.accessor === "carryover") {
        const options = carryoverData?.map((data) => {
          return {
            label: data.column_name,
            value: data.value,
            id: data.value,
            key: data.key,
          };
        });
        item.initialData = options;
        item.options = options;
      } else if (item.accessor === "season" && props.view_type === "edit") {
        item.options = props.seasonOptions;
        item.initialData = props.seasonOptions;
      } else if (item.accessor === "buy") {
        const options = receiptQuantityMetrics?.map((metric) => {
          return {
            label: metric.key,
            value: metric.value,
            id: metric.value,
          };
        });
        item.options = options;
        item.initialData = options;
      }
    });
    setFilters(filters);
    configureHindsightFilters(filters, true);
    setHindsightFilterConfig(filters);
    props.setHindsightPageLoader(false);
  };

  const configureHindsightFilters = (filters, initialLoad) => {
    let filterConfiguration = `assort${history.location.pathname}FilterConfiguration`;
    if (
      isEmpty(props.filterDashboardConfiguration[filterConfiguration]) ||
      !initialLoad
    ) {
      const filterConfigData = [
        {
          filterSectionHeader: "Hindsight Create View Filters",
          filterDashboardData: filters,
          isCrossDimensionFilter: true,
        },
      ];
      const filterConfig = formattedFilterConfiguration(
        filterConfiguration,
        filterConfigData,
        "Hindsight Create View"
      );
      props.setFilterConfiguration(filterConfig);
    }
  };

  useEffect(() => {
    if (
      props.view_type !== "edit" ||
      (props.view_type === "edit" && !isEmpty(props.hindsightFilterSelection))
    ) {
      configureFilterConfig();
    }
  }, [props.hindsightFilterSelection]);

  const formatTreemapPayload = (filters, selectedFilters, filterData) => {
    const graphFilters = {};
    const metrics = props.treemapFiltersData?.["metric_group"]
      ?.slice(0, 2)
      ?.map((metric) => {
        return {
          metric_name: metric,
          weightage: 50,
          value: [50],
        };
      });
    selectedFilters["metrics"] = metrics;
    graphFilters["view_level"] = "l1_name";
    graphFilters["parent_level"] = "l0_name";
    selectedFilters["graph_levels"] = "l1_name";
    selectedFilters["view_tiles"] = "l0_name";
    selectedFilters["size"] = "revenue";
    let seasonOptions = !isEmpty(seasonData.current)
      ? seasonData.current
      : props.seasonOptions;
    selectedFilters["season"] = seasonOptions?.filter((item) => {
      return item.season_code === filterData?.season?.[0];
    })?.[0]?.name;
    let filters_applied = getFiltersAppliedData(filterData);
    if (filters_applied["carryover_new_flag"]) {
      selectedFilters["carryover"] = filters_applied["carryover_new_flag"][0]
        ? "carryover"
        : undefined;
    }
    if (filters_applied["clearance"]) {
      selectedFilters["clearance"] = filters_applied["clearance"][0]
        ? "clearance"
        : "regular";
    }
    filters_applied["receipts_flag"] =
      filterData?.buy?.[0] === "Style With Buy" ? true : false;
    const treemapPayload = {
      filters: filters,
      graph_filters: graphFilters,
      size_name: "revenue",
      metrics: metrics,
      filters_applied: filters_applied,
      season: filterData?.season?.[0],
      selling_period_sdate: filterData?.["selling_period_sdate"],
      selling_period_edate: filterData?.["selling_period_edate"],
    };
    props.setTreemapFilters(selectedFilters);
    return treemapPayload;
  };

  const generateFiltersPayload = (filterData) => {
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

  const formatBubbleGraphPayload = (filters, selectedFilters, filterData) => {
    const graphFilters = {
      bubble_color_grp: "l0_name",
      bubble_points: "l1_name",
      x_axis_threshold: 50,
      y_axis_threshold: 50,
    };
    const settings = {
      x_axis: "revenue",
      y_axis: "margin",
      bubble_size: "qty",
    };
    selectedFilters = {
      ...selectedFilters,
      ...graphFilters,
      ...settings,
    };
    let seasonOptions = !isEmpty(seasonData.current)
      ? seasonData.current
      : props.seasonOptions;
    let filters_applied = getFiltersAppliedData(filterData);
    filters_applied["receipts_flag"] =
      filterData?.buy?.[0] === "Style With Buy" ? true : false;
    if (filters_applied["carryover_new_flag"]) {
      selectedFilters["carryover"] = filters_applied["carryover_new_flag"][0]
        ? "carryover"
        : undefined;
    }
    if (filters_applied["clearance"]) {
      selectedFilters["clearance"] = filters_applied["clearance"][0]
        ? "clearance"
        : "regular";
    }
    const bubbleGraphPayload = {
      filters: filters,
      graph_filters: graphFilters,
      settings: settings,
      filters_applied: filters_applied,
      season: filterData?.season?.[0],
      selling_period_sdate: filterData?.["selling_period_sdate"],
      selling_period_edate: filterData?.["selling_period_edate"],
    };
    props.setBubbleGraphFilters(selectedFilters);
    return bubbleGraphPayload;
  };

  const generateView = (filterData) => {
    const filtersPayload = generateFiltersPayload(filterData);
    const { filters, selectedFilters } = filtersPayload;
    const treemapPayload = formatTreemapPayload(
      filters,
      selectedFilters,
      filterData
    );
    props.generateTreemapData(treemapPayload);
    const bubbleGraphPayload = formatBubbleGraphPayload(
      filters,
      selectedFilters,
      filterData
    );
    props.generateBubbleGraphData(bubbleGraphPayload);
  };

  const handleFilterSelection = (dependencyData) => {
    const filterData = {};
    dependencyData.forEach((data) => {
      filterData[data.filter_id] =
        data.filter_id === "clearance" || data.filter_id === "carryover"
          ? data.values[0]
          : data.values;
    });
    let seasonOptions = !isEmpty(seasonData.current)
      ? seasonData.current
      : props.seasonOptions;
    filterData["season_name"] = seasonOptions?.filter((item) => {
      return item.season_code === filterData?.season?.[0];
    })?.[0]?.name;
    filterData["selling_period_sdate"] = filterData["range-picker"]?.[0];
    filterData["selling_period_edate"] = filterData["range-picker"]?.[1];
    props.setHindsightFilterSelection(filterData);
    props.setSelectedGraph([]);
    props.setHindsightParetoGraphData({});
    props.setHindsightAttributeGraphData({});
    props.setHindsightClearanceCarryoverGraphData({});
    props.setHindsightGeoGraphData({});
    props.setHindsightSTDiscountGraphData({});
    props.setHindsightSTMarginGraphData({});
    props.setHindsightTimelineGraphData({});
    props.setHindsightSizeGraphData({});
    const selectedGraph = {
      pareto: false,
      performance_review: false,
      st_margin_discount: false,
      clearance_carryover: false,
      size_review: false,
    };
    props.setShowSelectedGraph(selectedGraph);
    generateView(filterData);
  };

  const updateDependencyHandler = async (dependency, dimension, filters) => {
    let selectedFilterObj = cloneDeep(props.selectedFilters);
    const filtersData = cloneDeep(filtersConfig);
    //Auto populate selling period based on season selected
    let filterClassification =
      props.filterDashboardConfiguration[
        `assort${history.location.pathname}FilterConfiguration`
      ]?.filterConfig?.[0]?.filterDashboardClassification;
    let screenName = filterClassification?.filter((item) => {
      return item.dimension === "others";
    })?.[0]?.screenName;
    if (filters.filter_id === "year") {
      const year = dependency.filter((item) => {
        return item.filter_id === "year";
      });
      let seasonResponse = await props.getSeasonOptions({
        filters: [
          {
            attribute_name: "year",
            value: [year[0].values[0].value],
            operator: "=",
          },
        ],
      });
      if (seasonResponse?.data?.status) {
        props.setSeasonResponseData(seasonResponse?.data?.data);
        let seasonOptions = seasonResponse?.data?.data?.map((season) => {
          return {
            label: season?.name,
            value: season?.name,
            id: season?.name,
          };
        });
        seasonData.current = seasonResponse?.data?.data;
        filtersData?.forEach((filter) => {
          if (filter.accessor === "season") {
            filter.options = seasonOptions;
            filter.initialData = seasonOptions;
          }
        });
        const filterConfiguartion = cloneDeep(
          props.filterDashboardConfiguration
        );
        const dashboardData = cloneDeep(
          filterConfiguartion[
            `assort${history.location.pathname}FilterConfiguration`
          ]?.filterConfig?.[0]?.filterDashboardData
        );
        dashboardData?.forEach((item) => {
          if (item.accessor === "season") {
            item.options = seasonOptions;
            item.initialData = seasonOptions;
          }
        });
        filterConfiguartion[
          `assort${history.location.pathname}FilterConfiguration`
        ].filterConfig[0].filterDashboardData = dashboardData;
        props.setFilterConfiguration(filterConfiguartion);
      }
    }
    if (filters.filter_id === "season") {
      const seasonSelected = dependency?.filter((item) => {
        return item.filter_id === "season";
      })?.[0];
      const selectedDateRange = !isEmpty(seasonData.current)
        ? seasonData?.current?.filter((item) => {
            return item.name === seasonSelected?.values[0]?.label;
          })?.[0]
        : [];
      sellingPeriodObj["values"] = [
        selectedDateRange?.season_start_date,
        selectedDateRange?.season_end_date,
      ];
      let isValuePresent = false;
      //Avoiding multiple selection values addition in filterchips
      selectedFilterObj[screenName]?.forEach((item) => {
        if (item.filter_name === "Season") {
          isValuePresent = true;
          item.values = seasonSelected.values;
        }
        if (item.filter_id === "range-picker") {
          item.values = sellingPeriodObj.values;
        }
      });
      if (!isValuePresent) {
        selectedFilterObj[screenName].push(seasonSelected);
        selectedFilterObj[screenName].push(sellingPeriodObj);
      }
      props.setSelectedFilters(selectedFilterObj);
    }
  };

  const updateCombinedCustomFilterDependency = (FilterSelection) => {
    let data = cloneDeep(FilterSelection)
    data = data.filter(filter => {
      return !(filter.filter_id === "buy" && filter.values[0] === "False");
  });
    return data
  }
  return (
    <div className={classes.root}>
      <CoreComponentScreen
        showFilterDashboard={true}
        filterConfigKey={`assort${history.location.pathname}FilterConfiguration`}
        onApplyFilter={handleFilterSelection}
        updateDependencyHandler={updateDependencyHandler}
        hideSavedFilterMsg={true}
        noUAMFilterDependency={true}
        pageLabel={props.showHeader}
        showPageHeader={true}
        filterDependency={props.filterDependency}
        disableSeasonFilter={true}
        chipsDependency={props.chipsDependency}
        showChipsOnLoad={true}
        preventFilterPreselection={props.view_type === "edit" ? false : true}
        updateCombinedCustomFilterDependency={updateCombinedCustomFilterDependency}
      />
    </div>
  );
};
const mapStateToProps = (state) => {
  return {
    userAccessList:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration,
    planLevels: state.assortsmartReducer.planDashboardReducer.planLevels,
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
    selectedFilters: state.filterReducer.selectedFilters,
    levelsJson: state.assortsmartReducer.planDashboardReducer.levelsJson,
    treemapFiltersData: HindsightServiceActions.setHindsightTreemapFiltersSelector(
      state
    ),
  };
};

const mapActionsToProps = {
  setFilterConfiguration,
  getStoreChannels,
  getSeasonOptions,
  setSelectedFilters,
  setHindsightParetoGraphData,
  setHindsightAttributeGraphData,
  setHindsightClearanceCarryoverGraphData,
  setHindsightGeoGraphData,
  setHindsightSTDiscountGraphData,
  setHindsightSTMarginGraphData,
  setHindsightTimelineGraphData,
  setHindsightSizeGraphData,
};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(HindsightCreateViewFilters);
