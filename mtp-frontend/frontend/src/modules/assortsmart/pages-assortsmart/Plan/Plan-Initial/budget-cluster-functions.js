import { cloneDeep, groupBy, isEmpty, uniqBy } from "lodash";
import {
  assortAgGridCustomCellRenderer,
  attributeFormatter,
  isDropPlan,
  isWholesalePlan,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import theme from "core/Styles/theme";
import CellRenderer from "core/Utils/agGrid/cellRenderer";
import SortComponent from "core/Utils/agGrid/column-component/sortComponent";
import { groupByCustom, percentFormatter } from "core/Utils/formatter";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { scaleUpDownAttribute } from "./plan-initial-functions";

export const getFormattedCell = (item, ins) => {
  //it returns the formatter to cell based on type
  let isDecimal = 0;
  if (item.formatter === "roundOfftoTwoDecimals") {
    isDecimal = 2;
  }
  if (item.type === "percentage") {
    return percentFormatter(ins, isDecimal);
  } else {
    return ins.value === 0 || ins.value === false || ins.value
      ? //This condition will work for not undefined and not null values
        ins.value
      : "";
  }
};

export const lockCellCustomConditionFn = (instance) => {
  const condition = (instance.data?.cellLocked || {})[
    instance?.data?.uniqueID + instance?.colDef?.field
  ]
    ? true
    : false;
  return condition;
};

export const lockCellApi = (cellProps, isLocked, agTableRef) => {
  const fieldName = cellProps.cellData.colDef.field;
  const currentNodeCellLocked = cellProps.cellData.data["cellLocked"] || {};
  cellProps.cellData.node["cellLocked"] = isLocked;
  cellProps.cellData.data["cellLocked"] = {
    ...currentNodeCellLocked,
    [cellProps.cellData.data?.uniqueID + fieldName]: isLocked,
  };
  agTableRef.current.api.refreshCells({
    force: true,
  });
};

export const getFooterCols = (columns, drop, total_cluster_ly_obj) => {
  let cols = columns.map((eachCol) => {
    if (eachCol.footer === "cluster" && !eachCol.sub_headers?.length) {
      eachCol[`footer_total_`] =
        total_cluster_ly_obj[eachCol.column_name];
    }
    if (eachCol.sub_headers?.length) {
      eachCol.sub_headers = getFooterCols(
        eachCol.sub_headers,
        drop,
        total_cluster_ly_obj
      );
    }
    return eachCol;
  });
  return cols;
};

export const getColForEditTotal = (cols, props) => {
  // making total column editable and sub rows cluster columns not editable
  let columns = cols.map((item) => {
    if (!item.sub_headers?.length) {
      if (item.column_name === "total_ty") {
        //making total column editable
        item.is_editable = true;
        return {
          ...item,
          cellRenderer: (cellProps, extraProps) => {
            if (
              (cellProps?.data?.attribute_value &&
                !cellProps?.data?.carryover_flag) ||
              (cellProps?.data?.carryover_flag &&
                cellProps?.data?.carryover_flag === "New" &&
                cellProps?.data?.penetration_ty === "-")
            ) {
              //if it is a sub row then total ediatble
              let showConditionalCell = assortAgGridCustomCellRenderer
                ? assortAgGridCustomCellRenderer(cellProps, "cluster_table")
                : false;
              if (showConditionalCell) {
                return showConditionalCell;
              }
              return (
                <CellRenderer
                  cellData={cellProps}
                  column={item}
                  extraProps={extraProps}
                ></CellRenderer>
              );
            } else {
              // if it is a parent row total column is non editable
              let value = cellProps.value / 100;
              return getFormattedCell(item, { ...cellProps, value: value });
            }
          },
        };
      } else if (item.column_name === "lock") {
        return {
          ...item,
          cellRenderer: (cellProps, extraProps) => {
            if (
              (!cellProps?.data?.carryover_flag &&
                (cellProps?.data?.attribute_value ||
                  isWholesalePlan(props?.planDetails?.data))) ||
              (cellProps?.data?.carryover_flag &&
                cellProps?.data?.penetration_ty === "-" &&
                cellProps?.data?.carryover_flag === "New")
            ) {
              return (
                <CellRenderer
                  cellData={cellProps}
                  column={item}
                  extraProps={extraProps}
                ></CellRenderer>
              );
            } else {
              return " ";
            }
          },
        };
      } else if (
        item.column_name !==
        (props?.screenConfiguration?.common?.final_level || "l3_name")
      ) {
        // whether it is total editable or cluster editable l3_name column will not be affected
        return {
          ...item,
          cellRenderer: (cellProps, extraProps) => {
            if (
              (!cellProps?.data?.carryover_flag &&
                (cellProps?.data?.attribute_value ||
                  isWholesalePlan(props?.planDetails?.data))) ||
              (cellProps?.data?.carryover_flag &&
                (cellProps?.data?.penetration_ty === "-" ||
                  cellProps?.data?.carryover_flag !== "New")) ||
              cellProps?.column?.colDef?.accessor?.includes("_ly") ||
              cellProps?.column?.colDef?.accessor === "penetration_ty" ||
              cellProps?.column?.colDef?.accessor.includes("_st") ||
              cellProps?.column?.colDef?.accessor.includes("_margin")
            ) {
              let value = cellProps?.value / 100 || cellProps?.value;
              return getFormattedCell(item, { ...cellProps, value: value });
            } else {
              item.is_editable = true;
              let showConditionalCell = assortAgGridCustomCellRenderer
                ? assortAgGridCustomCellRenderer(cellProps, "cluster_table")
                : false;
              if (showConditionalCell) {
                return showConditionalCell;
              }
              return (
                <CellRenderer
                  cellData={cellProps}
                  column={{ ...item, is_lockable: true }}
                  extraProps={extraProps}
                ></CellRenderer>
              );
            }
          },
        };
      }
    }
    if (item?.children?.length > 1 || item?.sub_headers?.length > 0) {
      item.children = getColForEditTotal(item?.children);
    }
    return item;
  });
  return columns;
};

export const getColForEditCluster = (cols, props) => {
  //making cluster columns in sub row editable and total column non ediatble
  let columns = cols.map((item) => {
    if (!item.sub_headers?.length) {
      if (item.column_name === "total_ty") {
        // all total column will be non editable
        return {
          ...item,
          cellRenderer: (cellProps) => {
            let value = cellProps?.value / 100;
            return getFormattedCell(item, { ...cellProps, value: value });
          },
        };
      } else if (item.column_name === "attribute_value") {
        return {
          ...item,
          cellRenderer: (cellProps, extraProps) => {
            return getFormattedCell(item, { ...cellProps });
          },
        };
      } else if (item.column_name === "lock") {
        return {
          ...item,
          cellRenderer: (cellProps, extraProps) => {
            if (
              (!cellProps?.data?.carryover_flag &&
                (cellProps?.data?.attribute_value ||
                  isWholesalePlan(props?.planDetails?.data))) ||
              (cellProps?.data?.carryover_flag &&
                cellProps?.data?.penetration_ty === "-" &&
                cellProps?.data?.carryover_flag === "New")
            ) {
              return (
                <CellRenderer
                  cellData={cellProps}
                  column={item}
                  extraProps={extraProps}
                ></CellRenderer>
              );
            } else {
              return " ";
            }
          },
        };
      } else if (
        item.column_name !==
        (props.screenConfiguration?.common?.final_level || "l3_name")
      ) {
        // whether it is total editable or cluster editable l3_name column will not be affected
        return {
          ...item,
          cellRenderer: (cellProps, extraProps) => {
            if (
              !cellProps?.column?.colDef?.accessor?.includes("_ly") &&
              cellProps?.column?.colDef?.accessor !== "penetration_ty" &&
              ((cellProps?.data?.carryover_flag &&
                cellProps?.data?.carryover_flag === "New") ||
                !cellProps?.data?.carryover_flag) &&
              !cellProps?.column?.colDef?.accessor?.includes("_st") &&
              !cellProps?.column?.colDef?.accessor?.includes("_margin")
            ) {
              //if it is not a ly column and not penetration ty we are making that column editable
              if (
                isWholesalePlan(props?.planDetails?.data) &&
                cellProps?.row?.subRows?.length
              ) {
                let value = cellProps?.value / 100;
                return getFormattedCell(item, { ...cellProps, value: value });
              }
              item.is_editable = true;
              let showConditionalCell = assortAgGridCustomCellRenderer
                ? assortAgGridCustomCellRenderer(cellProps, "cluster_table")
                : false;
              if (showConditionalCell) {
                return showConditionalCell;
              }
              return (
                <CellRenderer
                  cellData={cellProps}
                  column={{
                    ...item,
                    is_lockable:
                      cellProps?.data?.penetration_ty === "-" ||
                      cellProps?.data?.carryover_flag !== "New"
                        ? false
                        : true,
                  }}
                  extraProps={extraProps}
                ></CellRenderer>
              );
            } else {
              let value = cellProps?.value / 100;
              return getFormattedCell(item, { ...cellProps, value: value });
            }
          },
        };
      }
    }
    if (item.children?.length > 1) {
      item.children = getColForEditCluster(item?.children, props);
    }
    return item;
  });
  return columns;
};

export const calculateSubRows = (data) => {
  let tempResult = groupBy(data, "plan_clu_opt_id");
  let finalResult = [];
  Object.keys(tempResult).forEach((k) => {
    let temp = {};
    tempResult[k].forEach((item) => {
      temp = Object.assign(item, {
        attribute_value: {
          ...temp.attribute_value,
          [item.attribute_name]: item.attribute_value,
        },
      });
      return temp;
    });
    finalResult.push(temp);
    return k;
  });
  return finalResult;
};

export const formatTableDataGrouping = (
  budgetData,
  selectedDropData,
  screenConfiguration
) => {
  let rowData = [];
  // let selectedDrop = selectedDropData
  //   ? selectedDropData
  //   : Object.keys(
  //       groupBy(budgetData, screenConfiguration?.common?.drop_key || "drop")
  //     )[0];
  budgetData.forEach((data) => {
    // if (
    //   data[screenConfiguration?.common?.drop_key || "drop"] === selectedDrop
    // ) {
    if (data.carryover_flag) {
      let flatRows = {
        ...data,
        hierarchy:
          data.carryover_flag === "Total"
            ? [
                data[screenConfiguration?.common?.final_level || "l3_name"] +
                  data.carryover_flag,
              ]
            : [
                data[screenConfiguration?.common?.final_level || "l3_name"] +
                  "Total",
                data[screenConfiguration?.common?.final_level || "l3_name"] +
                  data.carryover_flag,
              ],
      };
      rowData.push(flatRows);
      if (data.carryover_flag !== "Total") {
        data?.subRows?.length &&
          data.subRows.forEach((subRow, index) => {
            let arr = [
              data[screenConfiguration?.common?.final_level || "l3_name"] +
                "Total",
              data[screenConfiguration?.common?.final_level || "l3_name"] +
                data.carryover_flag,
              subRow.attribute_value,
            ];
            subRow["uniqueID"] =
              subRow.l3_name +
              subRow.l1_name +
              subRow.l2_name +
              subRow["drop"] +
              subRow.carryover_flag +
              index +
              data?.l3_name;
            flatRows = {
              ...subRow,
              hierarchy: arr,
            };
            rowData.push(flatRows);
          });
      }
    } else {
      let flatRows = {
        ...data,
        hierarchy: [
          data[screenConfiguration?.common?.final_level || "l3_name"] +
            data.drop,
        ],
      };
      rowData.push(flatRows);
      data?.subRows?.length &&
        data.subRows.forEach((subRow, index) => {
          let arr = [
            data[screenConfiguration?.common?.final_level || "l3_name"] +
              data.drop,
            subRow.attribute_value,
          ];
          subRow["uniqueID"] =
            subRow.l3_name +
            subRow.l1_name +
            subRow.l2_name +
            subRow["drop"] +
            subRow.carryover_flag +
            index +
            data?.l3_name;
          flatRows = {
            ...subRow,
            hierarchy: arr,
          };
          rowData.push(flatRows);
        });
    }
    // }
  });
  return rowData;
};

export const generateDropDownValues = (data, name) => {
  return data.map((items) => {
    let key = "";
    switch (name) {
      case "cluster":
        key = "cluster_code";
        break;
      case "cluster_display_name":
        key = "cluster_display_name";
        break;
      case "attribute":
        key = "attribute_name";
        break;
      case "launch":
      case "drop":
        key = name;
        break;
      case "carryover_flag":
        key = "carryover_flag";
        break;
      case "l2_name":
        key = "l2_name";
        break;
      case "l3_name":
        key = "l3_name";
        break;
    }
    return {
      value: replaceSpecialCharacter(items[key]),
      label: attributeFormatter(replaceSpecialCharacter(items[key])),
      id: replaceSpecialCharacter(items[key]),
    };
  });
};

export const buildClusterSplitGraphData = (
  props,
  budgetSplitClusterFormData,
  level3AllData
) => {
  if (
    !isEmpty(
      budgetSplitClusterFormData[
        props.screenConfiguration?.common?.final_level || "l3_name"
      ]
    )
  ) {
    let uniqueClusterData = [];
    let uniqueClusterCodes = uniqBy(
      props.budgetSplitGraphDetails?.data,
      "cluster_display_name"
    );
    props.budgetSplitGraphData.forEach((item) => {
      if (
        budgetSplitClusterFormData[
          props.screenConfiguration?.common?.drop_key || "drop"
        ]?.length &&
        budgetSplitClusterFormData.carryover_flag?.length
      ) {
        if (
          replaceSpecialCharacter(item[props.screenConfiguration?.common?.final_level || "l3_name"]) ===
            replaceSpecialCharacter(budgetSplitClusterFormData[
              props.screenConfiguration?.common?.final_level || "l3_name"
            ]) &&
          budgetSplitClusterFormData[
            props.screenConfiguration?.common?.drop_key || "drop"
          ] === item[props.screenConfiguration?.common?.drop_key || "drop"] &&
          budgetSplitClusterFormData.carryover_flag === item.carryover_flag
        ) {
          uniqueClusterData.push(item);
        }
      } else if (
        (budgetSplitClusterFormData[
          props.screenConfiguration?.common?.drop_key || "drop"
        ] &&
          budgetSplitClusterFormData[
            props.screenConfiguration?.common?.drop_key || "drop"
          ] === item[props.screenConfiguration?.common?.drop_key || "drop"]) ||
        (budgetSplitClusterFormData.carryover_flag &&
          budgetSplitClusterFormData.carryover_flag === item.carryover_flag) ||
        (!budgetSplitClusterFormData[
          props.screenConfiguration?.common?.drop_key || "drop"
        ] &&
          !budgetSplitClusterFormData.carryover_flag)
      ) {
        if (
          replaceSpecialCharacter(item[props.screenConfiguration?.common?.final_level || "l3_name"]) ===
          replaceSpecialCharacter(budgetSplitClusterFormData[
            props.screenConfiguration?.common?.final_level || "l3_name"
          ])
        ) {
          uniqueClusterData.push(item);
        }
      }
    });
    if (
      budgetSplitClusterFormData[
        props.screenConfiguration?.common?.final_level || "l3_name"
      ] === "All"
    ) {
      uniqueClusterData = level3AllData;
    }
    let clusterSplitChartData = [];
    if (isEmpty(uniqueClusterData)) {
      clusterSplitChartData = [];
      let seriesData = [
        {
          name: "Clusters",
          data: clusterSplitChartData,
          innerSize: "60%",
          showInLegend: true,
        },
      ];
      return {
        type: props.budgetSplitGraphDetails?.type?.clusterSplit,
        chartType: "donutChart",
        chartTitle: "No data to show",
        series: seriesData,
      };
    } else {
      clusterSplitChartData = [];
      budgetSplitClusterFormData[
        props.screenConfiguration?.common?.final_level || "l3_name"
      ] === "All"
        ? level3AllData.forEach((item, i) => {
            clusterSplitChartData.push({
              name: item.column_name.replace(/^((?:[^_]*_){2}).*/, '$1').slice(0, -1).toUpperCase(),
              // y: isDropPlan(
              //   props.planDetails?.data,
              //   `${
              //     props.screenConfiguration?.common?.drop_key.includes("drop")
              //       ? "drops"
              //       : props.screenConfiguration?.common?.drop_key || "drops"
              //   }_count`
              // )
              //   ? Math.round(
              //       item[
              //         `footer_total_${
              //           budgetSplitClusterFormData[
              //             props.screenConfiguration?.common?.drop_key || "drop"
              //           ] || "-"
              //         }`
              //       ] * 100
              //     ) / 100
              //   : Math.round(item[`footer_total_-`] * 100) / 100,
              y: Math.round(item[`footer_total_`] * 100) / 100,
              color: theme.palette.graphColours[i],
            });
          })
        : uniqueClusterData?.length > 0 &&
          uniqueClusterData.forEach((item) => {
            uniqueClusterCodes.forEach((cluster, i) => {
              clusterSplitChartData.push({
                name: cluster.cluster_display_name.toUpperCase(),
                y: props.isView
                  ? Math.round(
                      item[cluster.cluster_display_name.toLowerCase() + "_ty"] *
                        100
                    )
                  : Math.round(
                      item[cluster.cluster_display_name.toLowerCase() + "_ty"]
                    ),
                color: theme.palette.graphColours[i],
              });
            });
          });
      let seriesData = [
        {
          name: "Clusters",
          data: clusterSplitChartData,
          innerSize: "60%",
          showInLegend: true,
        },
      ];
      return {
        type: props.budgetSplitGraphDetails?.type?.clusterSplit,
        chartType: "donutChart",
        chartTitle: "",
        series: seriesData,
        isPercentLabel: true,
      };
    }
  }
};

export const buildAttributeSplitGraphData = (
  props,
  budgetSplitAttributeFormData
) => {
  // Not making changes to graph format based on generic assort
  // Table data doesn't contain proper format for attribute_value
  if (
    !isEmpty(budgetSplitAttributeFormData["cluster_code"]) &&
    !isEmpty(budgetSplitAttributeFormData["attribute_name"]) &&
    !isEmpty(
      budgetSplitAttributeFormData[
        props.screenConfiguration?.common?.final_level || "l3_name"
      ]
    )
  ) {
    let selectedFiltersDataset = props.budgetSplitGraphDetails?.data?.filter(
      (obj) =>
        (obj.cluster_code === budgetSplitAttributeFormData["cluster_code"] || 
        obj.cluster_display_name === budgetSplitAttributeFormData["cluster_code"]) &&
        obj.attribute_name === budgetSplitAttributeFormData["attribute_name"] &&
        replaceSpecialCharacter(obj[props.screenConfiguration?.common?.final_level || "l3_name"]) ===
          replaceSpecialCharacter(budgetSplitAttributeFormData[
            props.screenConfiguration?.common?.final_level || "l3_name"
          ]) 
          &&
        ((budgetSplitAttributeFormData[
          props.screenConfiguration?.common?.drop_key || "drop"
        ] &&
          obj[props.screenConfiguration?.common?.drop_key || "drop"] ===
            budgetSplitAttributeFormData[
              props.screenConfiguration?.common?.drop_key || "drop"
            ]) ||
          (budgetSplitAttributeFormData?.carryover_flag &&
            obj.carryover_flag ===
              budgetSplitAttributeFormData.carryover_flag) ||
          (!budgetSplitAttributeFormData[
            props.screenConfiguration?.common?.drop_key || "drop"
          ] &&
            !budgetSplitAttributeFormData.carryover_flag))
    );
    let donutChartFormat = [];
    if (
      budgetSplitAttributeFormData["cluster_code"] === "All" &&
      budgetSplitAttributeFormData[
        props.screenConfiguration?.common?.final_level || "l3_name"
      ] === "All"
    ) {
      selectedFiltersDataset = groupByAttribute(
        props,
        budgetSplitAttributeFormData
      );
    } else if (budgetSplitAttributeFormData["cluster_code"] === "All") {
      selectedFiltersDataset = props.budgetSplitGraphData
        .filter((obj) => {
          return (
            replaceSpecialCharacter(obj[props.screenConfiguration?.common?.final_level || "l3_name"]) ===
              replaceSpecialCharacter(budgetSplitAttributeFormData[
                props.screenConfiguration?.common?.final_level || "l3_name"
              ]) &&
            ((budgetSplitAttributeFormData[
              props.screenConfiguration?.common?.drop_key || "drop"
            ] &&
              obj[props.screenConfiguration?.common?.drop_key || "drop"] ===
                budgetSplitAttributeFormData[
                  props.screenConfiguration?.common?.drop_key || "drop"
                ]) ||
              (budgetSplitAttributeFormData.carryover_flag &&
                obj.carryover_flag ===
                  budgetSplitAttributeFormData.carryover_flag) ||
              (!budgetSplitAttributeFormData[
                props.screenConfiguration?.common?.drop_key || "drop"
              ] &&
                !budgetSplitAttributeFormData.carryover_flag))
          );
        })[0]
        ?.subRows?.filter((obj) => {
          return (
            obj[props.screenConfiguration?.common?.final_level || "l3_name"] ===
            budgetSplitAttributeFormData["attribute_name"]
          );
        });
    } else if (
      budgetSplitAttributeFormData[
        props.screenConfiguration?.common?.final_level || "l3_name"
      ] === "All"
    ) {
      selectedFiltersDataset = groupByClusterAndAttribute(
        props,
        budgetSplitAttributeFormData
      );
    }
    if (isEmpty(selectedFiltersDataset)) {
      donutChartFormat = [];
      let seriesData = [
        {
          name: "Attributes",
          innerSize: "60%",
          showInLegend: true,
          data: donutChartFormat,
        },
      ];
      return {
        type: props.budgetSplitGraphDetails?.type?.attributeSplit,
        chartType: "donutChart",
        chartTitle: "No data to show",
        series: seriesData,
      };
    } else {
      let attributeSplitLegends;
      budgetSplitAttributeFormData[
        props.screenConfiguration?.common?.final_level || "l3_name"
      ] === "All" && budgetSplitAttributeFormData["cluster_code"] === "All"
        ? (attributeSplitLegends = [
            ...new Set(
              selectedFiltersDataset.map((key) => key.attribute_value)
            ),
          ])
        : budgetSplitAttributeFormData["cluster_code"] === "All"
        ? (attributeSplitLegends = [
            ...new Set(
              selectedFiltersDataset.map((key) => key.attribute_value)
            ),
          ])
        : budgetSplitAttributeFormData[
            props.screenConfiguration?.common?.final_level || "l3_name"
          ] === "All"
        ? (attributeSplitLegends = [
            ...new Set(
              selectedFiltersDataset.map((key) =>
                key.attribute_value.substring(
                  0,
                  key.attribute_value.indexOf("_")
                )
              )
            ),
          ])
        : (attributeSplitLegends = [
            ...new Set(
              Object.keys(
                selectedFiltersDataset[0]?.attribute_value
              ).map((key) => key.substring(0, key.indexOf("_")))
            ),
          ]);
      attributeSplitLegends.forEach((item, i) => {
        donutChartFormat.push({
          name: item,
          y:
            budgetSplitAttributeFormData[
              props.screenConfiguration?.common?.final_level || "l3_name"
            ] === "All" &&
            budgetSplitAttributeFormData["cluster_code"] === "All"
              ? Math.round(selectedFiltersDataset[i].total_ty)
              : budgetSplitAttributeFormData["cluster_code"] === "All"
              ? Math.round(selectedFiltersDataset[i].total_ty * 100) / 100
              : budgetSplitAttributeFormData[
                  props.screenConfiguration?.common?.final_level || "l3_name"
                ] === "All"
              ? Math.round(selectedFiltersDataset[i].total_ty * 100)
              : Math.round(
                  selectedFiltersDataset[0]?.attribute_value[
                    `${item}__penetration_ty`
                  ] * 100
                ),
          color: theme.palette.graphColours[i],
        });
      });
      let seriesData = [
        {
          name: "Attributes",
          innerSize: "60%",
          showInLegend: true,
          data: donutChartFormat,
        },
      ];
      return {
        type: props.budgetSplitGraphDetails?.type?.attributeSplit,
        chartType: "donutChart",
        chartTitle: "",
        series: seriesData,
        isPercentLabel: true,
      };
    }
  }
};

export const groupByAttribute = (props, budgetSplitAttributeFormData) => {
  let filteredArr = [],
    hash = Object.create(null),
    result = [];
  props.budgetSplitGraphData.forEach((graphData) => {
    if (
      (budgetSplitAttributeFormData[
        props.screenConfiguration?.common?.drop_key || "drop"
      ] &&
        graphData[props.screenConfiguration?.common?.drop_key || "drop"] ===
          budgetSplitAttributeFormData[
            props.screenConfiguration?.common?.drop_key || "drop"
          ]) ||
      (budgetSplitAttributeFormData.carryover_flag &&
        graphData.carryover_flag ===
          budgetSplitAttributeFormData.carryover_flag) ||
      (!budgetSplitAttributeFormData[
        props.screenConfiguration?.common?.drop_key || "drop"
      ] &&
        !budgetSplitAttributeFormData.carryover_flag)
    ) {
      graphData?.subRows?.forEach((subRow) => {
        if (
          subRow[
            props.screenConfiguration?.common?.final_level || "l3_name"
          ] === budgetSplitAttributeFormData["attribute_name"]
        ) {
          filteredArr.push({
            subRow,
            penetration_ty: graphData.penetration_ty,
          });
        }
      });
    }
  });
  filteredArr.forEach(function (data) {
    if (!hash[data.subRow.attribute_value]) {
      hash[data.subRow.attribute_value] = {
        attribute_value: data.subRow.attribute_value,
        total_ty: 0,
      };
      result.push(hash[data.subRow.attribute_value]);
    }
    hash[data.subRow.attribute_value].total_ty += props.isView
      ? +data.subRow.total_ty * data.penetration_ty * 10000
      : Math.round((+data.subRow.total_ty * data.penetration_ty) / 100);
  });
  return result;
};

export const groupByClusterAndAttribute = (
  props,
  budgetSplitAttributeFormData
) => {
  let hash = Object.create(null),
    result = [];
  let filteredArr = props.budgetSplitGraphDetails?.data.filter((graphData) => {
    return (
      graphData.attribute_name ===
        budgetSplitAttributeFormData["attribute_name"] &&
      graphData.cluster_code === budgetSplitAttributeFormData["cluster_code"].replace(/_/g, ' ') &&
      ((budgetSplitAttributeFormData[
        props.screenConfiguration?.common?.drop_key || "drop"
      ] &&
        graphData[props.screenConfiguration?.common?.drop_key || "drop"] ===
          budgetSplitAttributeFormData[
            props.screenConfiguration?.common?.drop_key || "drop"
          ]) ||
        (budgetSplitAttributeFormData.carryover_flag &&
          graphData.carryover_flag ===
            budgetSplitAttributeFormData.carryover_flag) ||
        (!budgetSplitAttributeFormData[
          props.screenConfiguration?.common?.drop_key || "drop"
        ] &&
          !budgetSplitAttributeFormData.carryover_flag))
    );
  });
  filteredArr.forEach((data) => {
    let arr = Object.entries(data?.attribute_value);
    arr.forEach((arrData) => {
      if (!hash[arrData[0]] && arrData[0].includes("penetration_ty")) {
        hash[arrData[0]] = {
          attribute_value: arrData[0],
          total_ty: Math.round(arrData[1] * data.l3_penetration_ty * 100) / 100,
        };
        result.push(hash[arrData[0]]);
      } else if (hash[arrData[0]]) {
        hash[arrData[0]].total_ty +=
          Math.round(+arrData[1] * data.l3_penetration_ty * 100) / 100;
      }
    });
  });
  return result;
};

export const convertObjectToArray = (data, cluster, props) => {
  let temp = {};
  data &&
    data.map((node) => {
      let row = node.data;
      if (
        temp[
          row[props.screenConfiguration?.common?.final_level || "l3_name"]
        ] === undefined
      )
        temp[
          row[props.screenConfiguration?.common?.final_level || "l3_name"]
        ] = {};

      temp[row[props.screenConfiguration?.common?.final_level || "l3_name"]][
        row["attribute_value"] + "__penetration_ty"
      ] = parseFloat(row[`${cluster}_ty`]) / 100;
      temp[row[props.screenConfiguration?.common?.final_level || "l3_name"]][
        row["attribute_value"] + "__penetration_ly"
      ] = parseFloat(row[`${cluster}_ly`]) / 100;
      temp[row[props.screenConfiguration?.common?.final_level || "l3_name"]][
        row["attribute_value"] + "__sell_through"
      ] = row[`${cluster}_st`];
      temp[row[props.screenConfiguration?.common?.final_level || "l3_name"]][
        row["attribute_value"] + "__margin_percentage"
      ] = row[`${cluster}_margin`];
      temp[row[props.screenConfiguration?.common?.final_level || "l3_name"]][
        row["attribute_value"] + "__total_quantity"
      ] = row[`${cluster}_total_quantity`];
      return row;
    });
  return temp;
};

const getUpdatePayload = (item, uniqueClusterList, props) => {
  let temp = [];
  if (
    ((!item.carryover_flag && !item.attribute_value) ||
      (item.carryover_flag &&
        ["Total", "Carryover", "New"].includes(item.attribute_value))) &&
    item[props.screenConfiguration?.common?.final_level || "l3_name"] !==
      "Total"
  ) {
    uniqueClusterList.forEach((cluster, index) => {
      let tempJson = {
        plan_clu_opt_id: item[`plan_clu_opt_id${index + 1}`],
        plan_code: props.planDetails.data.plan_code,
        // will be uncommented while debugging payload for bugs
        // levels: {
        //   l0_name: item.l0_name,
        //   l1_name: item.l1_name,
        //   l2_name: item.l2_name,
        //   l3_name: item.l3_name,
        //   launch: item.launch,
        //   channel: item.channel,
        //   cluster_code: item[`cluster_code${index + 1}`],
        //   cluster_display_name: item[`cluster_display_name${index + 1}`],
        //   carryover_flag: item.carryover_flag,
        // },
        master_attribue_value: {
          //channel: item.channel,
          penetration_ty:
            parseFloat(
              item[
                `${item[`cluster_display_name${index + 1}`]?.toLowerCase()}_ty`
              ] || 0
            ) / 100,
          penetration_ly:
            parseFloat(
              item[
                `${item[`cluster_display_name${index + 1}`]?.toLowerCase()}_ly`
              ] || 0
            ) / 100,
          margin_percentage: parseFloat(item["margin_percentage"] || 0),
          l3_penetration_ly: parseFloat(item["penetration_ly"] || 0) / 100,
          l3_penetration_ty: parseFloat(item["penetration_ty"] || 0) / 100,
          sell_through: parseFloat(item["sell_through"] || 0),
          receipts_quantity_ty: parseFloat(item["receipts_quantity_ty"] || 0),
        },
        // attribute_value: [
        //   Object.assign(convertObjectToArray(item.subRows, cluster), {}),
        // ],
      };
      if (item.attribute_value !== "Total") {
        tempJson.attribute_value = [
          Object.assign(convertObjectToArray(item.subRows, cluster, props), {}),
        ];
      } else {
        tempJson.attribute_value = [];
      }
      temp.push(tempJson);
    });
  }
  return temp;
};

export const getClusterUpdateData = (
  props,
  ClusterAGInstance,
  uniqueClusterList
) => {
  let temp = [];
  let invalidL3list = [];
  ClusterAGInstance?.current?.api?.forEachNode((eachNode) => {
    //ClusterAGInstance?.current?.api?.rowModel.rowsToDisplay.forEach(
    //(eachNode) => {
    let item = eachNode.data || {};
    let totalCluster = 0;
    let subRowCluster = {};
    item.subRows = eachNode.childrenAfterAggFilter;
    if (
      (!item.carryover_flag && !item.attribute_value) ||
      (item.carryover_flag && item.attribute_value === "Total")
    ) {
      temp.push(...getUpdatePayload(item, uniqueClusterList, props));
    }
    if (item.attribute_value === "Total" && item.carryover_flag) {
      item.subRows.forEach((subNode) => {
        let subItem = subNode.data;
        subItem.subRows = subNode.childrenAfterAggFilter;
        temp.push(...getUpdatePayload(subItem, uniqueClusterList, props));
      });
    }
    uniqueClusterList.forEach((cluster, index) => {
      totalCluster += parseFloat(item[`${cluster}_ty`] || 0);
    });
    if (item.subRows?.length) {
      item.subRows.forEach((row) => {
        row = row.data;
        subRowCluster[
          row[props.screenConfiguration?.common?.final_level || "l3_name"]
        ] =
          parseFloat(row["total_ty"] || 0) +
          (subRowCluster[
            row[props.screenConfiguration?.common?.final_level || "l3_name"]
          ] || 0);
      });
    }
    if (
      (item.attribute_value === "New" && item.carryover_flag) ||
      props.screenConfiguration?.common?.endpoint_project_name !==
        "assort-smart"
    ) {
      if (
        (totalCluster < 99 || totalCluster > 101) &&
        !invalidL3list.includes(
          item[props.screenConfiguration?.common?.final_level || "l3_name"]
        ) &&
        item.hierarchy?.length === 1
      ) {
        invalidL3list.push(
          item[props.screenConfiguration?.common?.final_level || "l3_name"]
        );
      }
    }
    if (
      props.screenConfiguration?.common?.endpoint_project_name !==
      "assort-smart"
    ) {
      Object.keys(subRowCluster).forEach((key) => {
        if (
          !invalidL3list.includes(key) &&
          (subRowCluster[key] < 99 || subRowCluster[key] > 101)
        ) {
          invalidL3list.push(key);
        }
      });
    }
  });
  props.setInvalidL3Clusters(invalidL3list);
  return temp;
};

export const getSubRowTotal = (
  row,
  clusterList,
  displayMessage,
  screenConfiguration
) => {
  let subTotal = {};
  row.subRows &&
    row.subRows.map((sub, index) => {
      //attribute total (child row total) is calculated as sum all cluster values / no of clusters
      clusterList.forEach((cluster) => {
        subTotal[`total_ly${index + 1}`] = subTotal[`total_ly${index + 1}`]
          ? subTotal[`total_ly${index + 1}`] +
            parseFloat(row[`${cluster}_ly`] || 0) *
              parseFloat(sub[`${cluster}_ly`] / 100 || 0)
          : parseFloat(row[`${cluster}_ly`] || 0) *
            parseFloat(sub[`${cluster}_ly`] / 100 || 0);
        subTotal[`total_ty${index + 1}`] = subTotal[`total_ty${index + 1}`]
          ? subTotal[`total_ty${index + 1}`] +
            parseFloat(row[`${cluster}_ty`] || 0) *
              parseFloat(sub[`${cluster}_ty`] / 100 || 0)
          : parseFloat(row[`${cluster}_ty`] || 0) *
            parseFloat(sub[`${cluster}_ty`] / 100 || 0);

        sub["total_ly"] = subTotal[`total_ly${index + 1}`];
        sub["total_ty"] = subTotal[`total_ty${index + 1}`];
        let oldValue = cloneDeep(sub["total_ty"]);
        scaleUpDownAttribute(
          row,
          sub[screenConfiguration?.common?.final_level || "l3_name"],
          sub.uniqueID,
          "total_ty",
          1,
          displayMessage,
          screenConfiguration
        );
        let multipliFactor =
          1 + (oldValue ? (sub["total_ty"] - oldValue) / oldValue : 0);
        clusterList.forEach((cluster) => {
          let oldClusterValue = parseFloat(sub[`${cluster}_ty`] || 0);
          let newValue = oldClusterValue * multipliFactor;
          if (newValue > 100) {
            newValue = 100;
          }
          //calculatedClusterDiff is the difference between the oldCluster value and newCluster value
          let calculatedClusterDiff = oldClusterValue - newValue;
          sub[`${cluster}_ty`] = newValue;
          //scale up/down the other cluster values of other child attribute
          scaleUpDownAttribute(
            row,
            sub[screenConfiguration?.common?.final_level || "l3_name"],
            sub.uniqueID,
            `${cluster}_ty`,
            calculatedClusterDiff,
            displayMessage,
            screenConfiguration
          );
        });
      });
      return null;
    });
  return row;
};

export const getTotalFooterRow = (
  tableData,
  level3AllData,
  setLevel3AllData,
  planDetails,
  screenConfiguration,
  isView
) => {
  let footerData = [];
  const groupedDrop = groupBy(
    tableData,
    screenConfiguration["2.1"]?.show_drop_after_cluster
      ? "channel"
      : screenConfiguration?.common?.drop_key || "drop"
  );
  let total_cluster_ly_obj = {};
  let footerCols = level3AllData;
  let isCarryOverFlow = "";
  Object.keys(groupedDrop).forEach((drop) => {
    let total_penetration_ly = 0,
      total_penetration_ty = 0,
      total_ly = 0,
      total_ty = 0,
      total_qty = 0;
    Object.keys(tableData?.[0]).forEach((key) => {
      if (key.includes("cluster_display_name")) {
        let clusterValue = tableData?.[0]?.[key]?.toLowerCase();
        total_cluster_ly_obj[`${clusterValue}_ly`] = 0;
        total_cluster_ly_obj[`${clusterValue}_ty`] = 0;
        total_cluster_ly_obj[`${clusterValue}_st`] = 0;
        total_cluster_ly_obj[`${clusterValue}_margin`] = 0;
      }
    });
    groupedDrop[drop].forEach((data) => {
      if (
        !data.carryover_flag ||
        (data.carryover_flag && data.carryover_flag === "Total")
      ) {
        isCarryOverFlow = data.carryover_flag;
        total_penetration_ly = total_penetration_ly + data.penetration_ly;
        total_penetration_ty = total_penetration_ty + data.penetration_ty;
        total_ly = total_ly + data.penetration_ly * data.total_ly;
        total_ty = total_ty + data.penetration_ty * data.total_ty;
        total_qty = total_qty + data.receipts_quantity_ty;
        Object.keys(total_cluster_ly_obj).forEach((key) => {
          if (key.includes("_st") || key.includes("_margin")) {
            total_cluster_ly_obj[key] =
              total_cluster_ly_obj[key] + data.receipts_quantity_ty * data[key];
          } else if (key.includes("ty")) {
            total_cluster_ly_obj[key] =
              total_cluster_ly_obj[key] + data.penetration_ty * data[key];
          } else {
            total_cluster_ly_obj[key] =
              total_cluster_ly_obj[key] + data.penetration_ly * data[key];
          }
        });
      }
    });
    Object.keys(total_cluster_ly_obj).forEach((cluster) => {
      if (cluster.includes("_st") || cluster.includes("_margin")) {
        total_cluster_ly_obj[cluster] =
          total_cluster_ly_obj[cluster] / total_qty;
      } else if (cluster.includes("ty")) {
        total_cluster_ly_obj[cluster] =
          total_cluster_ly_obj[cluster] / (isCarryOverFlow ? 10000 : 100);
      } else {
        total_cluster_ly_obj[cluster] = total_cluster_ly_obj[cluster] / 100;
      }
    });
    if (isView) {
      Object.keys(total_cluster_ly_obj).map((key) => {
        total_cluster_ly_obj[key] = total_cluster_ly_obj[key] * 10000;
      });
    }
    footerData.push({
      penetration_ly: total_penetration_ly,
      penetration_ty: total_penetration_ty,
      total_ly: isView ? total_ly : total_ly / 100,
      total_ty: isView ? total_ty : total_ty / 100,
      ...total_cluster_ly_obj,
      [screenConfiguration?.common?.final_level || "l3_name"]: "Total",
      [screenConfiguration?.common?.drop_key || "drop"]: drop,
      uniqueID: "Total" + drop,
    });
    footerCols = getFooterCols(level3AllData, drop, total_cluster_ly_obj);
  });
  setLevel3AllData(footerCols);
  return footerData;
};

export const autoGroupColumnDef = {
  headerName: "Attribute value",
  hide: true,
  cellRendererParams: {
    suppressCount: true,
  },
  headerComponent: SortComponent,
  width: 200,
  type: "attribute",
  valueGetter: (props) =>
    props.data?.carryover_flag
      ? props?.data?.hierarchy?.length === 2
        ? props?.data?.carryover_flag
        : props?.data?.hierarchy?.length === 3
        ? props?.data?.attribute_value
        : props?.data?.carryover_flag
      : !props.data?.carryover_flag && props?.data?.hierarchy?.length > 1
      ? props?.data?.hierarchy?.[1]
      : "",
};

export const getDropFlowPayloadData = (AGInstance, props) => {
  let drop_flow_data = [];
  AGInstance.current.api.forEachNode((obj) => {
    obj = obj.data;
    let data;
    // Based on dropID get attribute values
    if (
      obj[props.screenConfiguration?.common?.final_level || "l3_name"] !==
      "Total"
    ) {
      data = {
        plan_code: props.planDetails.data?.plan_code,
        attribute_value: {
          [`${
            props.screenConfiguration?.common?.drop_key || "drop"
          }_penetration_ly`]: obj[
            `${
              props.screenConfiguration?.common?.drop_key || "drop"
            }_penetration_ly`
          ],
          [`${
            props.screenConfiguration?.common?.drop_key || "drop"
          }_penetration_ty`]:
            obj[
              `${
                props.screenConfiguration?.common?.drop_key || "drop"
              }_penetration_ty`
            ] / 100,
          receipt$_ly: obj["receipt$_ly"],
          receipt$_ty: obj["receipt$_ty"],
          drop_budget_ly: obj["receipt$_ly"],
          drop_budget_ty: obj["receipt$_ty"],
          // total_penetration_ly: obj.total_penetration_ly,
          // total_penetration_ty: obj.total_penetration_ty / 100,
          total_budget_ly: obj.total_budget_ly,
          total_budget_ty: obj.total_budget_ty,
          flow_count: obj.flow_count,
          sub_channel: obj.sub_channel,
        },
        levels: {
          carryover_flag: obj.carryover_flag,
          channel: obj.channel,
          [props.screenConfiguration?.common?.drop_key || "drop"]: obj[
            props.screenConfiguration?.common?.drop_key || "drop"
          ],
          l0_name: obj.l0_name,
          l1_name: obj.l1_name,
          l2_name: obj.l2_name,
          l3_name: obj.l3_name,
        },
      };
      if (
        props.planDetails?.data?.[
          `${
            props.screenConfiguration?.common?.drop_key.includes("drop")
              ? "drops"
              : props.screenConfiguration?.common?.drop_key || "drops"
          }_count`
        ]
      ) {
        for (
          let i = 1;
          i <=
          props.planDetails?.data?.[
            `${
              props.screenConfiguration?.common?.drop_key.includes("drop")
                ? "drops"
                : props.screenConfiguration?.common?.drop_key || "drops"
            }_count`
          ];
          i++
        ) {
          data.attribute_value[
            `${
              props.screenConfiguration?.common?.flow_key || "flow"
            }_${i}_penetration_ly`
          ] =
            obj[
              `${
                props.screenConfiguration?.common?.flow_key || "flow"
              }_${i}_penetration_ly`
            ];
          data.attribute_value[
            `${
              props.screenConfiguration?.common?.flow_key || "flow"
            }_${i}_penetration_ty`
          ] =
            obj[
              `${
                props.screenConfiguration?.common?.flow_key || "flow"
              }_${i}_penetration_ty`
            ] / 100;
          data.attribute_value[
            `${
              props.screenConfiguration?.common?.flow_key || "flow"
            }_${i}_budget_ly`
          ] =
            obj[
              `${
                props.screenConfiguration?.common?.flow_key || "flow"
              }_${i}_budget_ly`
            ];
          data.attribute_value[
            `${
              props.screenConfiguration?.common?.flow_key || "flow"
            }_${i}_budget_ty`
          ] =
            obj[
              `${
                props.screenConfiguration?.common?.flow_key || "flow"
              }_${i}_budget_ty`
            ];
        }
      }
      drop_flow_data.push(data);
    }
  });
  return drop_flow_data;
};

export const recalculateClusterTotalDrop = (tableData, props) => {
  let totalDropArray = [];
  let dropLevelData = tableData.filter((data) => data.drop !== "Total");
  let groupedDataArr = groupByCustom({
    Group: tableData,
    By: [props.screenConfiguration?.common?.final_level || "l3_name"],
  });
  groupedDataArr.forEach((groupedData) => {
    let total = { penetration_ty: 0, total_ty: 0 };
    props.uniqueClusterList.forEach((cluster) => {
      total[cluster + "_receipts_quantity_ty"] = 0;
    });
    groupedData.map((data) => {
      total = { ...data, ...total };
      if (data.drop !== "Total") {
        props.uniqueClusterList.forEach((cluster) => {
          total[cluster + "_receipts_quantity_ty"] =
            (total[cluster + "_receipts_quantity_ty"] || 0) +
            (data[cluster + "_receipts_quantity_ty"] || 0);
        });
        total["penetration_ty"] =
          (total["penetration_ty"] || 0) + (data["penetration_ty"] || 0);
        total["total_ty"] = (total["total_ty"] || 0) + (data["total_ty"] || 0);
      }
      if (data.drop === "Total") {
        data.subRows.map((subRow) => {
          subRow["hierarchy"] = [
            "Total" +
              groupedData?.[0]?.[
                props.screenConfiguration?.common?.final_level || "l3_name"
              ],
            subRow.attribute_value,
          ];
          totalDropArray.push(subRow);
        });
        total["subRows"] = data.subRows;
      }
    });
    groupedData.map((data) => {
      if (data.drop === "Total") {
        props.uniqueClusterList.forEach((cluster) => {
          total[cluster + "_ty"] = Math.round(
            (total[cluster + "_receipts_quantity_ty"] /
              total["receipts_quantity_ty"]) *
              100
          );
        });
      }
    });
    total = {
      ...total,
      drop: "Total",
      hierarchy: [
        "Total" +
          groupedData?.[0]?.[
            [props.screenConfiguration?.common?.final_level || "l3_name"]
          ],
      ],
      channel: groupedData?.[0]?.channel,
      [props.screenConfiguration?.common?.final_level ||
      "l3_name"]: groupedData?.[0]?.[
        [props.screenConfiguration?.common?.final_level || "l3_name"]
      ],
      uniqueID:
        "Total" +
        groupedData?.[0]?.channel +
        groupedData?.[0]?.[
          props.screenConfiguration?.common?.final_level || "l3_name"
        ],
    };
    totalDropArray.push(total);
  });
  let flatRows = [];
  dropLevelData.map((levelData) => {
    flatRows.push(levelData);
    if (levelData?.subRows) {
      levelData.subRows.map((subRow) => {
        flatRows.push(subRow);
      });
    }
  });
  totalDropArray.push(...flatRows);
  return totalDropArray;
};

export const recalculateClusterDropLevel = (tableData, props) => {
  let dropLevelData = tableData.filter((data) => data.drop !== "Total");
  let totalDropArray = [];
  let groupedDataArr = groupByCustom({
    Group: tableData,
    By: [props.screenConfiguration?.common?.final_level || "l3_name"],
  });
  groupedDataArr.forEach((groupedData) => {
    let total = { penetration_ty: 0, total_ty: 0 };
    props.uniqueClusterList.forEach((cluster) => {
      total[cluster + "_receipts_quantity_ty"] = 0;
    });
    groupedData.map((data) => {
      total = { ...data, ...total };
      if (data.drop !== "Total") {
        props.uniqueClusterList.forEach((cluster) => {
          total["original_" + cluster + data.drop + "_perc"] =
            data[cluster + "_receipts_quantity_ty"] /
            data["receipts_quantity_ty"];
          total[cluster + "_receipts_quantity_ty"] =
            (total[cluster + "_receipts_quantity_ty"] || 0) +
            (data[cluster + "_receipts_quantity_ty"] || 0);
        });
        total["penetration_ty"] =
          (total["penetration_ty"] || 0) + (data["penetration_ty"] || 0);
        total["total_ty"] = (total["total_ty"] || 0) + (data["total_ty"] || 0);
      }
    });
    groupedData.map((data) => {
      if (data.drop === "Total") {
        props.uniqueClusterList.forEach((cluster) => {
          total[cluster + "_ty"] = Math.round(
            (total[cluster + "_receipts_quantity_ty"] /
              total["receipts_quantity_ty"]) *
              100
          );
        });
      }
    });
    total = {
      ...total,
      drop: "Total",
      hierarchy: [
        "Total" +
          groupedData?.[0]?.[
            props.screenConfiguration?.common?.final_level || "l3_name"
          ],
      ],
      channel: groupedData?.[0]?.channel,
      [props.screenConfiguration?.common?.final_level ||
      "l3_name"]: groupedData?.[0]?.[
        props.screenConfiguration?.common?.final_level || "l3_name"
      ],
      uniqueID:
        "Total" +
        groupedData?.[0]?.channel +
        groupedData?.[0]?.[
          props.screenConfiguration?.common?.final_level || "l3_name"
        ],
    };
    totalDropArray.push(total);
  });
  let finalData = [];
  dropLevelData.forEach((levelData) => {
    if (
      levelData.drop !== "Total" &&
      levelData.drop === props.selectedDropData
    ) {
      totalDropArray.forEach((calculatedDrop) => {
        if (
          levelData[
            props.screenConfiguration?.common?.final_level || "l3_name"
          ] ===
          calculatedDrop[
            props.screenConfiguration?.common?.final_level || "l3_name"
          ]
        ) {
          props.uniqueClusterList.forEach((cluster) => {
            levelData[cluster + "_receipts_quantity_ty"] =
              (levelData[cluster + "_receipts_quantity_ty"] /
                levelData["receipts_quantity_ty"]) *
              calculatedDrop[cluster + "_receipts_quantity_ty"];
          });
        }
      });
      levelData["hierarchy"] = [
        levelData?.[
          props.screenConfiguration?.common?.final_level || "l3_name"
        ],
      ];
      finalData.push(levelData);
      if (levelData?.subRows) {
        levelData.subRows.forEach((subRow) => {
          subRow["hierarchy"] = [
            levelData?.[
              props.screenConfiguration?.common?.final_level || "l3_name"
            ],
            subRow.attribute_value,
          ];
          finalData.push(subRow);
        });
      }
    }
  });
  return finalData;
};
