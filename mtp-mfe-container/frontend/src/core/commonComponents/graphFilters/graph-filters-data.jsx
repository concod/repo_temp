// import { useEffect, useState } from "react";
// import { connect } from "react-redux";
// import { Typography } from "@mui/material";
// import { isEmpty } from "lodash";
// import {
//   getFilterDependency,
//   getFiltersOptions,
// } from "modules/assortsmart/pages-assortsmart/Plan-Dashboard/components/common-plan-functions";
// import Form from "core/Utils/form";
// import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
// import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
// import { makeStyles } from "@mui/styles";

// const GraphFiltersData = (props) => {
//   const styles = makeStyles(()=>({
//     graphContentSetting: {
//       marginBottom: "5rem",
//       paddingBottom: "10rem",
//       "& .dropdown-height": {
//         "& .ScrollCheck": {
//           maxHeight: "20rem",
//         },
//       }
//     }
//   }))
//   const [graphFiltersConfig, setGraphFiltersConfig] = useState({});
//   const [selectedFilters, setSelectedFilters] = useState({});
//   const [graphLoading, setGraphLoading] = useState(false);
//   const [defaultValues, setDefaultValues] = useState({});
//   const classes = useStyles();
//   const sharedClass = styles();


//   const handleLevelsChange = async (filtersConfig, id, dependency) => {
//     const levelsInfo = props.levels?.concat([
//       {
//         label: "Subdepartment",
//         column_name: "l3_name",
//         level: 3,
//       },
//     ]);
//     const selectedDeptLvlIndex = levelsInfo.findIndex((filter) => {
//       return filter.column_name === id;
//     });
//     if (selectedDeptLvlIndex !== -1) {
//       props.levels?.forEach((filter, idx) => {
//         if (idx > selectedDeptLvlIndex) {
//           if (!dependency[filter.column_name] && dependency[id]) {
//             delete dependency[filter.column_name];
//           }
//         }
//       });
//     }
//     const Idx = filtersConfig.findIndex((filter) => {
//       return filter.accessor === id;
//     });
//     let newdependency = getFilterDependency(dependency, filtersConfig, Idx);
//     filtersConfig = await getFiltersOptions(
//       newdependency,
//       filtersConfig,
//       setGraphLoading,
//       Idx
//     );
//   };

//   const handleChange = (data, id) => {
//     if (["l0_name", "l1_name", "l2_name"]?.includes(id)) {
//       handleLevelsChange(props.filtersConfig["Heirarchy Filters"], id, data);
//     }
//     if (id === "graph_levels") {
//       const options = props.treemapFiltersData[
//         "tile_with_component_combination"
//       ][data[id]]?.map((item) => {
//         return {
//           label:
//             props.levelsJson[item] ||
//             props.treemapFiltersData["filter_keys_with_display_name"][item],
//           value: item,
//           id: item,
//         };
//       });
//       props.filtersConfig?.["Graph Filters"]?.forEach((item) => {
//         if (item.accessor === "view_tiles") {
//           item.isMulti = false;
//           item.options = options;
//         }
//       });
//     }
//     if(id === "bubble_points"){
//       const options = props.treemapFiltersData?.["bubble_point_to_bubble_color_mapping"]?.[data[id]]?.map((item)=>{
//         return {
//           label:
//             props.levelsJson[item] ||
//             props.treemapFiltersData["filter_keys_with_display_name"][item],
//           value: item,
//           id: item,
//         }
//       });
//       props.filtersConfig?.["Graph Filters"]?.forEach((item) => {
//         if (item.accessor === "bubble_color_grp") {
//           item.options = options;
//         }
//       });
//     }
//     setSelectedFilters(data);
//     props.setSelectedFilters && props.setSelectedFilters(data);
//   };

//   return (
//     <>
//       {props.filtersConfig &&
//         Object.keys(props.filtersConfig)?.map((config) => {
//           return (
//             <div
//               className={`${classes.graphContent} ${
//                 config?.includes("Heirarchy")
//                   ? classes.graphContentHierarchy
//                   : ""
//               }`}
//             >
//               <Typography variant="subtitle1" gutterBottom>
//                 {config}
//               </Typography>
//               <Form
//                 layout={"vertical"}
//                 maxFieldsInRow={2}
//                 handleChange={handleChange}
//                 fields={props.filtersConfig[config]}
//                 updateDefaultValue={false}
//                 defaultValues={props.defaultValues || {}}
//                 handleDropdownClose={true}
//               />
//             </div>
//           );
//         })}
//     </>
//   );
// };

// const mapStateToProps = (state) => {
//   return {
//     levels: state.assortsmartReducer.planDashboardReducer.planLevels,
//     levelsJson: state.assortsmartReducer.planDashboardReducer.levelsJson,
//     treemapFiltersData: HindsightServiceActions.setHindsightTreemapFiltersSelector(
//       state
//     ),
//   };
// };

// const mapActionsToProps = {};

// export default connect(mapStateToProps, mapActionsToProps)(GraphFiltersData);
