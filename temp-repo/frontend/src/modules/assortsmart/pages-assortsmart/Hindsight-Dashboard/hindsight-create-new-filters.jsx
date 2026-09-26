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
  sellingPeriodObj,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import { getFiltersAppliedData } from "core/Utils/functions/utils";

const HindsightCreateViewFilters = (props) => {
  const classes = useStyles();
  const history = useHistory();
  const [hindsightFilterConfig, setHindsightFilterConfig] = useState([]);
  const seasonData = useRef({});
  const [filtersConfig, setFilters] = useState([]);

  const configureFilterConfig = async () => {
    const levels = await configurePlanHierarchyLevels(
      "Hindsight Create New Filters"
    );
    const channels = await props.getStoreChannels();
    let filters = levels;
    filters.forEach(async (item) => {
      if (item.accessor === "channel") {
        item.options = formatStringArray(channels.data.data.channels);
        item.initialData = formatStringArray(channels.data.data.channels);
      } else if (item.accessor === "year") {
        const currYear = new Date().getFullYear();
        const prevYear = currYear - 1;
        const options = formatStringArray(
         [currYear, prevYear]
        );
        item.options = options;
        item.initialData = options;
      } else if (item.accessor === "selling_period") {
        item.column_name = "range-picker";
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
      }else if(item.accessor === "carryover_new_flag"){
        const options = carryoverData?.map((data)=>{
        return {
          label: data.column_name,
          value: data.value,
          id: data.value,
          key: data.key,
        };
      });
      item.initialData = options;
      item.options = options;
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
    configureFilterConfig();
  }, []);

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
    selectedFilters["season"] = seasonData.current?.filter((item) => {
      return item.season_code === filterData?.season?.[0];
    })?.[0]?.name;
    let filters_applied = getFiltersAppliedData(filterData);
    const treemapPayload = {
      filters: filters,
      graph_filters: graphFilters,
      size_name: "revenue",
      metrics: metrics,
      filters_applied: filters_applied,
      season: seasonData.current?.filter((item) => {
        return item.season_code === filterData?.season?.[0];
      })?.[0]?.name,
      selling_period_sdate: filterData?.["selling_period_sdate"],
      selling_period_edate: filterData?.["selling_period_edate"],
    };
    props.setTreemapFilters(selectedFilters);
    return treemapPayload;
  }

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
    return { filters: filters, selectedFilters: selectedFilters};
  }

  const formatBubbleGraphPayload = (filters, selectedFilters, filterData) => {
    const graphFilters = {
      "bubble_color_grp": "l0_name",
      "bubble_points" : "l1_name",
      "x_axis_threshold": 50,
      "y_axis_threshold": 50
    };
    const settings = {
      "x_axis": "revenue",
      "y_axis": "margin",
      "bubble_size": "sold_qty"
    };
    selectedFilters = {
      ...selectedFilters,
      ...graphFilters,
      ...settings
    }
    const bubbleGraphPayload = {
      filters: filters,
      graph_filters: graphFilters,
      settings: settings,
      season: seasonData.current?.filter((item) => {
        return item.season_code === filterData?.season?.[0];
      })?.[0]?.name,
      selling_period_sdate: filterData?.["selling_period_sdate"],
      selling_period_edate: filterData?.["selling_period_edate"]
    }
    props.setBubbleGraphFilters(selectedFilters);
    return bubbleGraphPayload;
  }

  const generateView = (filterData) => {
    const filtersPayload = generateFiltersPayload(filterData);
    const { filters, selectedFilters } = filtersPayload;
    const treemapPayload = formatTreemapPayload(filters, selectedFilters, filterData);
    props.generateTreemapData(treemapPayload);
    const bubbleGraphPayload = formatBubbleGraphPayload(filters, selectedFilters, filterData);
    props.generateBubbleGraphData(bubbleGraphPayload);
  };

  const handleFilterSelection = (dependencyData) => {
    const filterData = {};
    dependencyData.forEach((data) => {
      filterData[data.filter_id] = data.values;
    });
    filterData["season_name"] =  seasonData.current?.filter((item) => {
      return item.season_code === filterData?.season?.[0];
    })?.[0]?.name;
    filterData["selling_period_sdate"] = filterData["range-picker"]?.[0];
    filterData["selling_period_edate"] = filterData["range-picker"]?.[1];
    props.setHindsightFilterSelection(filterData);
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
      return item.dimension === "custom";
    })?.[0]?.screenName;
    if (filters.filter_id === "year") {
      let seasonResponse = await props.getSeasonOptions({
        filters: [
          {
            attribute_name: "year",
            value: [dependency[0]?.values[0]?.value],
            operator: "=",
          },
        ],
      });
      if (seasonResponse?.data?.status) {
        let seasonOptions = seasonResponse?.data?.data?.map((season) => {
          return {
            label: season?.name,
            value: season?.season_code,
            id: season?.season_code,
          };
        });
        seasonData.current = seasonResponse?.data?.data;
        filtersData?.forEach((filter) => {
          if (filter.accessor === "season") {
            filter.options = seasonOptions;
            filter.initialData = seasonOptions;
          }
        });
        configureHindsightFilters(filtersData, false);
      }
    }
    if (filters.filter_id === "season") {
      const seasonSelected = dependency?.filter((item) => {
        return item.filter_id === "season";
      })?.[0];
      const selectedDateRange = seasonData.current?.filter((item) => {
        return item.name === seasonSelected?.values[0]?.label;
      })?.[0];
      sellingPeriodObj["values"] = [
        selectedDateRange?.season_start_date,
        selectedDateRange?.season_end_date,
      ];
      selectedFilterObj[screenName].push(seasonSelected);
      selectedFilterObj[screenName].push(sellingPeriodObj);
      props.setSelectedFilters(selectedFilterObj);
    }
  };

  return (
    <div className={classes.root}>
      <CoreComponentScreen
        showFilterDashboard={true}
        filterConfigKey={`assort${history.location.pathname}FilterConfiguration`}
        onApplyFilter={handleFilterSelection}
        updateDependencyHandler={updateDependencyHandler}
        hideSavedFilterMsg={true}
        resetFilterChips={true}
        noUAMFilterDependency={true}
        pageLabel={props.showHeader}
        showPageHeader={true}
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
};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(HindsightCreateViewFilters);
