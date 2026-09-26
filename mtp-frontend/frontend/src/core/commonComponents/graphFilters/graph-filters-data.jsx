import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Typography, Button } from "@mui/material";
import { isEmpty } from "lodash";
import {
  getFilterDependency,
  getFiltersOptions,
} from "modules/assortsmart/pages-assortsmart/Plan-Dashboard/components/common-plan-functions";
import Form from "core/Utils/form";
import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { makeStyles } from "@mui/styles";
import { addSnack } from "core/actions/snackbarActions";

const GraphFiltersData = (props) => {
  const styles = makeStyles(() => ({
    graphContentSetting: {
      marginBottom: "5rem",
      paddingBottom: "10rem",
      "& .dropdown-height": {
        "& .ScrollCheck": {
          maxHeight: "20rem",
        },
      },
    },
  }));
  const [graphFiltersConfig, setGraphFiltersConfig] = useState({});
  const [selectedFilters, setSelectedFilters] = useState({});
  const [graphLoading, setGraphLoading] = useState(false);
  const [defaultValues, setDefaultValues] = useState({});
  const classes = useStyles();
  const sharedClass = styles();

  const handleLevelsChange = async (filtersConfig, id, dependency) => {
    const levelsInfo = Array.isArray(props.levels)
      ? props.levels.concat([
          {
            label: "Subdepartment",
            column_name: "l3_name",
            level: 3,
          },
        ])
      : [];
    const selectedDeptLvlIndex = levelsInfo.findIndex((filter) => {
      return filter.column_name === id;
    });
    if (selectedDeptLvlIndex !== -1) {
      props.levels?.forEach((filter, idx) => {
        if (idx > selectedDeptLvlIndex) {
          if (!dependency[filter.column_name] && dependency[id]) {
            delete dependency[filter.column_name];
          }
        }
      });
    }
    const Idx = filtersConfig.findIndex((filter) => {
      return filter.accessor === id;
    });
    let newdependency = getFilterDependency(dependency, filtersConfig, Idx);
    filtersConfig = await getFiltersOptions(
      newdependency,
      filtersConfig,
      setGraphLoading,
      Idx
    );
  };

  function filterDataBasedOnHierarchyFilters(data, hierarchyFilters, id) {
    const hierarchyLevels = ["l0_name", "l1_name", "l2_name", "l3_name"];
    const hierarchySets = hierarchyLevels.reduce((sets, level) => {
      const options =
        hierarchyFilters?.find((filter) => filter.accessor === level)
          ?.options || [];
      sets[level] = new Set(options.map((option) => option.value));
      return sets;
    }, {});

    let isEmptyLevel = false;
    for (const level of hierarchyLevels) {
      if (isEmptyLevel || (data[level] && data[level].length === 0)) {
        const index = hierarchyLevels.indexOf(level);
        for (let i = index; i < hierarchyLevels.length; i++) {
          const nextLevel = hierarchyLevels[i];
          data[nextLevel] = [];
        }
        isEmptyLevel = true;
        break;
      } else if (data[level]) {
        data[level] = data[level].filter((item) =>
          hierarchySets[level].has(item)
        );
      }
    }
    function filterValues(values, options) {
      if (!options || options.length === 0) {
        return [];
      } else {
        return values.filter((value) =>
          options.find((option) => option.value === value)
        );
      }
    }
    let filterIndex = id.split("")[1];
    data = {
      ...data,
      l1_name:
        filterIndex <= 0
          ? filterValues(data.l1_name, data.l1_name_options)
          : data.l1_name,
      l2_name:
        filterIndex <= 1
          ? filterValues(data.l2_name, data.l2_name_options)
          : data.l2_name,
      l3_name:
        filterIndex <= 2
          ? filterValues(data.l3_name, data.l3_name_options)
          : data.l3_name,
    };
    return data;
  }

  const handleChange = async (data, id) => {
    if (["l0_name", "l1_name", "l2_name"]?.includes(id)) {
      handleLevelsChange(props.filtersConfig["Hierarchy Filters"], id, data);
    }
    if (id === "graph_levels") {
      const options = props.treemapFiltersData[
        "tile_with_component_combination"
      ][data[id]]?.map((item) => {
        return {
          label:
            props.levelsJson[item] ||
            props.treemapFiltersData["filter_keys_with_display_name"][item],
          value: item,
          id: item,
        };
      });
      data.view_tiles = ''
      props.filtersConfig?.["Graph Filters"]?.forEach((item) => {
        if (item.accessor === "view_tiles") {
          item.isMulti = false;
          item.options = options;
        }
      });
    }
    if (id === "bubble_points") {
      const options = props.treemapFiltersData?.[
        "bubble_point_to_bubble_color_mapping"
      ]?.[data[id]]?.map((item) => {
        return {
          label:
            props.levelsJson[item] ||
            props.treemapFiltersData["filter_keys_with_display_name"][item],
          value: item,
          id: item,
        };
      });
      data.bubble_color_grp = ''
      props.filtersConfig?.["Graph Filters"]?.forEach((item) => {
        if (item.accessor === "bubble_color_grp") {
          if(data.bubble_points === "channel"){
            item.options = [
              {
                  "label": "Channel",
                  "value": "channel",
                  "id": "channel"
              }
          ]
          }
          else if(data.bubble_points === "l0_name"){
            item.options = [
              {
                  "label": "Division",
                  "value": "l0_name",
                  "id": "l0_name"
              }
          ]
          }
          else if(data.bubble_points === "country"){
            item.options = [
              {
                  "label": "Country",
                  "value": "country",
                  "id": "country"
              }
          ]
          }
          else {
          item.options = options
          }
        }
      });
    }
    //modifying data to implement cascading
    if (
      props.tabValue === "filters" &&
      ["l0_name", "l1_name", "l2_name"]?.includes(id)
    ) {
      data = await filterDataBasedOnHierarchyFilters(
        data,
        props.filtersConfig["Hierarchy Filters"],
        id
      );
    }
    props.setDefaultValues({
      ...props.originalDefaultValues,
      [props.tabValue === "settings" ? "settings" : "graphFilters"]: data,
    });
    setSelectedFilters(data);
    props.setSelectedFilters && props.setSelectedFilters(data);
    if (props.graphType === "bubble" && props.tabValue === "settings") {
      if (
        data?.x_axis === data?.y_axis ||
        data?.x_axis === data?.bubble_size ||
        data?.y_axis === data?.bubble_size
      ) {
        props.addSnack({
          message: "Select unique value for X Axis ,Y Axis,Bubble Size",
          options: {
            variant: "error",
          },
        });
        return false;
      }
    }
    if (props.graphType === "pareto" && props.tabValue === "settings") {
      if (
        data?.y_axis === data?.y_axis_secondary ||
        data?.y_axis_secondary === data?.y_axis
      ) {
        props.addSnack({
          message: "Select unique value for Y Axis ,Y Axis Secondary",
          options: {
            variant: "error",
          },
        });
        return false;
      }
    }
    if (props.graphType === "bubble" && props.tabValue === "filters") {
      if (
        parseInt(props.selectedGraphFilters.x_axis_threshold) > 100 ||
        parseInt(props.selectedGraphFilters.y_axis_threshold) > 100
      ) {
        props.addSnack({
          message: "Max Value of Threshold can be 100",
          options: {
            variant: "error",
          },
        });
        return false;
      }
    }
  };

  const handleFiltersApply = () => {
    let callFilterApi = true;
    if (
      props.tabValue === "settings" &&
      (props.graphType === "size_review" ||
        props.graphType === "attribute" ||
        props.graphType === "geograph" ||
        props.graphType === "timeline" ||
        props.graphType === "bubble" ||
        props.graphType === "clearance" ||
        props.graphType === "pareto" ||
        props.graphType === "tree")
    ) {
      callFilterApi = false;
    }
    if (props.graphType === "bubble" && props.tabValue === "filters") {
      if (
        parseInt(props.selectedGraphFilters.x_axis_threshold) > 100 ||
        parseInt(props.selectedGraphFilters.y_axis_threshold) > 100
      ) {
        props.addSnack({
          message: "Max Value of Threshold can be 100",
          options: {
            variant: "error",
          },
        });
        return false
      }
    }
    props.filtersApply(callFilterApi);
  };

  const handleFiltersCancel = () => {
    props.filtersCancel();
  };

  return (
    <>
      {props.filtersConfig &&
        Object.keys(props.filtersConfig)?.map((config) => {
          return (
            <div
              className={`${classes.graphContent} ${
                config?.includes("Heirarchy")
                  ? classes.graphContentHierarchy
                  : ""
              } ${
                props.tabValue === "settings"
                  ? classes.graphFilterMinHeight
                  : ""
              }`}
            >
              <Typography
                variant="subtitle1"
                gutterBottom
                style={{ marginBottom: "2.5rem" }}
              >
                {config}
              </Typography>
              <div className={classes.hindsightGraphForm}>
                <Form
                  layout={"vertical"}
                  maxFieldsInRow={2}
                  handleChange={handleChange}
                  fields={props.filtersConfig[config]}
                  updateDefaultValue={false}
                  defaultValues={props.defaultValues || {}}
                  handleDropdownClose={true}
                />
              </div>
            </div>
          );
        })}
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
    levels: state.assortsmartReducer.planDashboardReducer.planLevels,
    levelsJson: state.assortsmartReducer.planDashboardReducer.levelsJson,
    treemapFiltersData: HindsightServiceActions.setHindsightTreemapFiltersSelector(
      state
    ),
  };
};

const mapActionsToProps = {
  addSnack,
};

export default connect(mapStateToProps, mapActionsToProps)(GraphFiltersData);
