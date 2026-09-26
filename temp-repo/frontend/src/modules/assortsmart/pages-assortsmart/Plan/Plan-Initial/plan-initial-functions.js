import { cloneDeep, groupBy, uniqBy } from "lodash";
import { parseValue } from "../../../utils-assortsmart/utilityFunctions";
import { groupByCustom } from "core/Utils/formatter";

const calculateRetailColumns = (row) => {
  row.total_receipts_cost_ty = row.receipts_quantity_ty * row.air_ty;
  row.retail_budget_diff = row.rcpt_retail_ty - row.total_receipts_cost_ly;
  row.retail_penetration_diff = row.total_receipts_cost_ly
    ? row.retail_budget_diff / row.total_receipts_cost_ly
    : 0;
};

export const onChangeUnits = (row, value, tableData, screenConfiguration) => {
  let new_l2_drop_budget_ty = 0;
  tableData.map((row) => {
    if (row.l3_name !== "Total") {
      new_l2_drop_budget_ty = new_l2_drop_budget_ty + row.budget_ty;
    }
  });
  tableData.map((row) => {
    row[
      [`l2_${[screenConfiguration?.common?.drop_key || "drop"]}_budget_ty`]
    ] = new_l2_drop_budget_ty;
  });
  row[
    [`l2_${[screenConfiguration?.common?.drop_key || "drop"]}_budget_ty`]
  ] = new_l2_drop_budget_ty;
  row["receipts_quantity_ty"] = value;
  row.penetration_ty =
    Math.round(row.aur_ty * value * 100) / Math.round(new_l2_drop_budget_ty);
  row.original_penetration_ty =
    Math.round(row.aur_ty * value * 100) /
    Math.round(new_l2_drop_budget_ty) /
    100;
  row.budget_diff = row.budget_ty - row.budget_ly;
  row.penetration_diff = row.budget_ly ? row.budget_diff / row.budget_ly : 0;
  row.penetration_ty = row.penetration_ty.toFixed(2);
  row.cogs_ty = row.receipts_quantity_ty * row.air_ty;
  calculateRetailColumns(row);
  return row;
};

const onBlurTotalInput = (
  rowId,
  value,
  columnId,
  oldFooterValue,
  tempData,
  filteredTableData,
  screenConfiguration
) => {
  let nonLinearData = tempData;
  let selectedRowData = filteredTableData;
  switch (columnId) {
    case "budget_ty":
      const newReceiptValue =
        parseFloat(value?.toString()?.replaceAll(",", "")) || 0;
      return handleUpdatedValue(
        selectedRowData,
        newReceiptValue,
        nonLinearData,
        screenConfiguration
      );
      break;
    case "receipts_quantity_ty":
      //use entered new total units
      const newReceiptUnits =
        parseFloat(value?.toString()?.replaceAll(",", "")) || 0;
      //total footer row
      const oldFooterRow = tempData.filter(
        (data) =>
          data.l3_name === "Total" &&
          data.l2_name === rowId.l2_name &&
          data.l1_name === rowId.l1_name &&
          data[screenConfiguration?.common?.drop_key || "drop"] ===
            rowId[screenConfiguration?.common?.drop_key || "drop"]
      );
      let totalAur =
        oldFooterRow?.[0]?.budget_ty /
        oldFooterRow?.[0]?.original_receipts_quantity_ty;
      let receiptValueUpdated = newReceiptUnits * totalAur;
      receiptValueUpdated =
        parseFloat(receiptValueUpdated?.toString()?.replaceAll(",", "")) || 0;
      return handleUpdatedValue(
        selectedRowData,
        receiptValueUpdated,
        nonLinearData,
        screenConfiguration
      );
      break;
    default:
      break;
  }
};

const handleUpdatedValue = (
  selectedRowData,
  updatedReceiptValue,
  nonLinearData,
  screenConfiguration
) => {
  let tableData = selectedRowData?.length ? selectedRowData : nonLinearData;
  // Calculating row value on footer change
  tableData.map((row, index) => {
    row[
      `l2_${[screenConfiguration?.common?.drop_key || "drop"]}_budget_ty`
    ] = updatedReceiptValue;
    row["budget_ty"] =
      (updatedReceiptValue * (row["original_penetration_ty"] * 100)) / 100;
    row["receipts_quantity_ty"] = row["aur_ty"]
      ? Math.round(row["budget_ty"] / row["aur_ty"])
      : 0;
    row["budget_diff"] =
      parseFloat(row["budget_ty"]?.toString()?.replaceAll(",", "")) ||
      0 - parseFloat(row["budget_ly"]?.toString()?.replaceAll(",", "")) ||
      0;
    row["penetration_diff"] =
      parseFloat(row["budget_diff"]?.toString()?.replaceAll(",", "")) ||
      0 / parseFloat(row["budget_ly"]?.toString()?.replaceAll(",", "")) ||
      0;
    row["cogs_ty"] = row.air_ty * row.receipts_quantity_ty;
    return row;
  });
  if (selectedRowData?.length) {
    let finalArray = nonLinearData.filter(
      (nonLinear) =>
        !tableData.some(
          (dropData) => nonLinear.plan_bud_opt_id === dropData.plan_bud_opt_id
        )
    );
    tableData = tableData.concat(finalArray);
  }
  return tableData;
};

export const scaleUpDown = (
  tempData,
  changedRowData,
  getTotalFooterRow,
  setLevel3TableData,
  instance,
  props,
  filteredTableData
) => {
  let lockPercentage = 0,
    unlockPercentage = 0,
    maxLockPercentage = 0,
    isCarryOverFlow = false,
    remaingPercentage = 0;
  let filteredRowIds = [];
  let tableData = [];
  filteredTableData.map((row, index) => {
    if (row.carryover_flag === "Carryover") {
      isCarryOverFlow = true;
      maxLockPercentage =
        maxLockPercentage + Math.round(row.penetration_ty * 100) / 100;
    }
    filteredRowIds.push(row);
    if (
      row.plan_bud_opt_id === changedRowData.plan_bud_opt_id &&
      ((row.carryover_flag && row.carrover_flag === "New") ||
        !row.carryover_flag)
    ) {
      lockPercentage =
        lockPercentage + Math.round(row.penetration_ty * 100) / 100;
    } else {
      if (
        (row.carryover_flag && row.carryover_flag === "New") ||
        !row.carryover_flag
      ) {
        unlockPercentage =
          unlockPercentage + Math.round(row.penetration_ty * 100) / 100;
      }
    }
  });
  let newTotalPen = 100 - maxLockPercentage;
  if (isCarryOverFlow) {
    remaingPercentage = newTotalPen - lockPercentage;
  } else {
    remaingPercentage = 100 - lockPercentage;
  }
  if (tempData[0]?.carryover_flag) {
    let groupedData = [];
    if (
      props.planDetails.data?.l1_name.length > 1 &&
      props.planDetails?.data?.l2_name?.length > 1
    ) {
      groupedData = groupByCustom({
        Group: tempData,
        By: ["l3_name", "l2_name", "l1_name"],
      });
    } else if (props.planDetails?.data?.l2_name.length > 1) {
      groupedData = groupByCustom({
        Group: tempData,
        By: ["l3_name", "l2_name"],
      });
    } else {
      groupedData = groupBy(tempData, "l3_name");
    }

    for (let level3 in groupedData) {
      const rowdata = groupedData[level3];
      let row = groupedData[level3]?.[rowdata.length - 1];
      if (row.carryover_flag && row.carryover_flag === "New") {
        //Change pen% for rows which are not selected
        let value =
          (parseFloat(Math.round(row.penetration_ty * 100) / 100) /
            unlockPercentage) *
          Math.abs(remaingPercentage);
        row.penetration_ty = Math.round(value * 100) / 100;
        row.original_penetration_ty = row.penetration_ty / 100;
        groupedData[level3][0].penetration_ty =
          row.penetration_ty +
          (groupedData[level3][1].carryover_flag === "Carryover"
            ? groupedData[level3][1]?.penetration_ty
            : 0);
        groupedData[level3][0].original_penetration_ty =
          row.penetration_ty / 100 +
          (groupedData[level3][1].carryover_flag === "Carryover"
            ? groupedData[level3][1]?.penetration_ty / 100
            : 0);
      }
      tableData.push(...groupedData[level3]);
    }
  } else {
    tableData = tempData.map((row, index) => {
      if (filteredRowIds.indexOf(row) > -1) {
        if (row.plan_bud_opt_id !== changedRowData.plan_bud_opt_id) {
          let value =
            (parseFloat(Math.round(row.penetration_ty * 100) / 100) /
              unlockPercentage) *
            Math.abs(remaingPercentage);
          row.penetration_ty = Math.round(value * 100) / 100;
          row.original_penetration_ty = value / 100;
        } else {
          row.original_penetration_ty = row.penetration_ty / 100;
        }
      }
      return row;
    });
  }
  // Rescale pen
  // Calculate budget and units based on pen%
  tableData = tableData.map((row, index) => {
    if (filteredRowIds.indexOf(row) > -1) {
      let dependentValue =
        row[
          `l2_${[
            props.screenConfiguration?.common?.drop_key || "drop",
          ]}_budget_ty`
        ] * row.original_penetration_ty;
      dependentValue = dependentValue > 0 ? dependentValue : 0;
      let rcptsUnit = row.aur_ty ? Math.round(dependentValue / row.aur_ty) : 0;
      row.budget_ty = dependentValue;
      row.receipts_quantity_ty = rcptsUnit;
      let receipt$ = row.budget_ty - row.budget_ly;
      let receiptPercentage = row.budget_ly ? receipt$ / row.budget_ly : 0;
      row.receipts_quantity_ty = rcptsUnit;
      row.budget_diff = receipt$;
      row.penetration_diff = receiptPercentage;
      calculateRetailColumns(row);
    }
    return row;
  });
  // get total of all rows
  getTotalFooterRow(tableData, props);
  setLevel3TableData(tableData);
  instance.current.api.refreshCells({
    force: true,
    suppressFlash: false,
  });
};

export const updateNLEL3RowData = (
  e,
  data,
  column,
  isChanged,
  value,
  initialValue,
  instance,
  props,
  selectedDropData,
  getTotalFooterRow,
  setLevel3TableData,
  setIspenValueChanged,
  setIsL3DataChanged
) => {
  let columnId = column.colId;
  if (setIsL3DataChanged) {
    setIsL3DataChanged(true);
  }
  let tempData = [],
    filteredTableData = [];
  instance.current.api.forEachNode((eachRow) => {
    tempData.push(eachRow.data);
  });
  instance.current.api.forEachNodeAfterFilterAndSort((eachRow) => {
    if (eachRow?.data?.l3_name !== "Total") {
      filteredTableData.push(eachRow.data);
    }
  });
  value = parseFloat(value);
  setLevel3TableData([]);
  switch (columnId) {
    case "penetration_ty":
      setIspenValueChanged(true);
      tempData.map((eachRow, index) => {
        if (eachRow.plan_bud_opt_id === data.plan_bud_opt_id) {
          eachRow[columnId] = value;
        }
        return eachRow;
      });
      if (data?.carryover_flag === "New") {
        tempData = recalculateTotal(tempData);
      }
      let totalRowData = tempData.filter((obj) => obj.l3_name === "Total");
      totalRowData = cloneDeep(totalRowData);
      tempData = tempData.filter((obj) => obj.l3_name !== "Total");
      scaleUpDown(
        tempData,
        data,
        getTotalFooterRow,
        setLevel3TableData,
        instance,
        props,
        filteredTableData
      );
      break;

    case "receipts_quantity_ty":
      setIspenValueChanged(true);
      if (data.l3_name !== "Total") {
        let tempValue = parseFloat(parseValue(value)) || 0;
        let modifiedUnitsData = [];
        // Calculate budget_ty for all rows
        tempData.map((eachRow, index) => {
          eachRow.budget_ty = eachRow.receipts_quantity_ty * eachRow.aur_ty;
          eachRow.budget_ty = eachRow.budget_ty > 0 ? eachRow.budget_ty : 0; //receipt value can't be negative
        });
        // Calculate units for all rows
        tempData.map((eachRow, index) => {
          if (eachRow.plan_bud_opt_id === data.plan_bud_opt_id) {
            let rowChangedUnits = onChangeUnits(
              eachRow,
              tempValue,
              filteredTableData,
              props.screenConfiguration
            );
            modifiedUnitsData.push(rowChangedUnits);
          } else {
            if (eachRow.carryover_flag) {
              modifiedUnitsData.push(eachRow);
            } else {
              let rowChangedUnits = onChangeUnits(
                eachRow,
                eachRow.receipts_quantity_ty,
                filteredTableData,
                props.screenConfiguration
              );
              modifiedUnitsData.push(rowChangedUnits);
            }
          }
        });
        tempData = modifiedUnitsData;
        if (data?.carryover_flag === "New") {
          tempData = recalculateTotal(tempData);
        }
        let totalRowData = tempData.filter((obj) => obj.l3_name === "Total");
        totalRowData = cloneDeep(totalRowData);
        tempData = tempData.filter((obj) => obj.l3_name !== "Total");
        getTotalFooterRow(tempData, props, totalRowData);
        setLevel3TableData(tempData);
        instance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
      } else {
        let tableData = onBlurTotalInput(
          data,
          value,
          columnId,
          initialValue,
          tempData,
          filteredTableData,
          props.screenConfiguration
        );
        if (data?.carryover_flag === "New") {
          tableData = recalculateTotal(tableData);
        }
        let totalRowData = tableData.filter((obj) => obj.l3_name === "Total");
        totalRowData = cloneDeep(totalRowData);
        tableData = tableData.filter((obj) => obj.l3_name !== "Total");
        getTotalFooterRow(tableData, props, totalRowData);
        setLevel3TableData(tableData);
        instance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
      }
      break;

    case "budget_ty":
      setIspenValueChanged(true);
      if (data.l3_name !== "Total") {
        let tempBudget = parseFloat(value) || 0;
        tempData.map((eachRow) => {
          if (
            (eachRow.plan_bud_opt_id &&
              data.plan_bud_opt_id &&
              eachRow.plan_bud_opt_id === data.plan_bud_opt_id) ||
            (data.l3_name === "Total" &&
              eachRow.l3_name === "Total" &&
              data[props.screenConfiguration?.common?.drop_key || "drop"] ===
                eachRow[
                  props.screenConfiguration?.common?.drop_key || "drop"
                ] &&
              data.sub_channel === eachRow.sub_channel)
          ) {
            eachRow[columnId] = tempBudget;
            eachRow.receipts_quantity_ty = eachRow.aur_ty
              ? tempBudget / eachRow.aur_ty
              : 0;
            eachRow.penetration_ty = eachRow[
              `l2_${[
                props.screenConfiguration?.common?.drop_key || "drop",
              ]}_budget_ty`
            ]
              ? (tempBudget * 100) /
                eachRow[
                  `l2_${[
                    props.screenConfiguration?.common?.drop_key || "drop",
                  ]}_budget_ty`
                ]
              : 0;
            eachRow.budget_diff = tempBudget - eachRow.budget_ly;
            eachRow.penetration_diff = eachRow.budget_ly
              ? eachRow.budget_diff / eachRow.budget_ly
              : 0;
            calculateRetailColumns(eachRow);
          }
          return eachRow;
        });
        if (data?.carryover_flag === "New") {
          tempData = recalculateTotal(tempData);
        }
        tempData = tempData.filter((obj) => obj.l3_name !== "Total");
        getTotalFooterRow(tempData, props);
        setLevel3TableData(tempData);
        instance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
      } else {
        let tableData = onBlurTotalInput(
          data,
          value,
          columnId,
          initialValue,
          tempData,
          filteredTableData,
          props.screenConfiguration
        );
        if (data?.carryover_flag === "New") {
          tableData = recalculateTotal(tableData);
        }
        let totalRowData = tableData.filter((obj) => obj.l3_name === "Total");
        totalRowData = cloneDeep(totalRowData);
        tableData = tableData.filter((obj) => obj.l3_name !== "Total");
        getTotalFooterRow(tableData, props, totalRowData);
        setLevel3TableData(tableData);
        instance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
      }
      break;

    case "aur_ty":
      setIspenValueChanged(true);
      tempData.map((eachRow, index) => {
        if (eachRow.plan_bud_opt_id === data.plan_bud_opt_id) {
          eachRow[columnId] = value;
          eachRow.imu_ty = eachRow.air_ty
            ? (eachRow.air_ty - value) / eachRow.air_ty
            : 0;
          eachRow.budget_diff = eachRow.budget_ty - eachRow.budget_ly;
          eachRow.penetration_diff = eachRow.budget_ly
            ? eachRow.budget_diff / eachRow.budget_ly
            : 0;
          eachRow.receipts_quantity_ty = value
            ? Math.round(eachRow.budget_ty / value || 0)
            : 0;
          eachRow.penetration_ty = eachRow[
            `l2_${[
              props.screenConfiguration?.common?.drop_key || "drop",
            ]}_budget_ty`
          ]
            ? (value * eachRow.receipts_quantity_ty * 100) /
              eachRow[
                `l2_${[
                  props.screenConfiguration?.common?.drop_key || "drop",
                ]}_budget_ty`
              ]
            : 0;
          calculateRetailColumns(eachRow);
        }
        return eachRow;
      });
      if (data?.carryover_flag === "New") {
        tempData = recalculateTotal(tempData);
      }
      tempData = tempData.filter((obj) => obj.l3_name !== "Total");
      getTotalFooterRow(tempData, props);
      setLevel3TableData(tempData);
      instance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
      });
      break;
    case "air_ty":
      tempData.map((eachRow, index) => {
        if (
          eachRow.plan_bud_opt_id === data.plan_bud_opt_id &&
          eachRow[props.screenConfiguration?.common?.drop_key || "drop"] ===
            selectedDropData
        ) {
          eachRow[columnId] = value;
          eachRow.imu_ty = !value ? 0 : (value - eachRow.aur_ty) / value || 0;
          eachRow.receipts_quantity_ty = Math.round(
            parseValue(eachRow.receipts_quantity_ty)
          );
          calculateRetailColumns(eachRow);
        }
        return eachRow;
      });
      instance.current.api.refreshCells({
        update: tempData,
      });
      break;
    case "lock":
      props.getSelectedRowIds(data.plan_bud_opt_id);
      break;
    default:
      break;
  }
};

const calculateTotalAtLevels = (eachRow, dataL3, index) => {
  eachRow.penetration_ty =
    (parseFloat(dataL3[index + 1]?.penetration_ty) || 0) +
    (parseFloat(dataL3[index + 2]?.penetration_ty) || 0);
  eachRow.budget_ty =
    (dataL3[index + 1]?.budget_ty || 0) + (dataL3[index + 2]?.budget_ty || 0);
  eachRow.receipts_quantity_ty =
    (dataL3[index + 1]?.receipts_quantity_ty || 0) +
    (dataL3[index + 2]?.receipts_quantity_ty || 0);
  eachRow.budget_diff =
    (dataL3[index + 1]?.budget_diff || 0) +
    (dataL3[index + 2]?.budget_diff || 0);
  eachRow.penetration_diff =
    (dataL3[index + 1]?.penetration_diff || 0) +
    (dataL3[index + 2]?.penetration_diff || 0);
  eachRow.total_receipts_cost_ty =
    (dataL3[index + 1]?.total_receipts_cost_ty || 0) +
    (dataL3[index + 2]?.total_receipts_cost_ty || 0);
  eachRow.retail_budget_diff =
    (dataL3[index + 1]?.retail_budget_diff || 0) +
    (dataL3[index + 2]?.retail_budget_diff || 0);
  eachRow.retail_penetration_diff =
    (dataL3[index + 1]?.retail_penetration_diff || 0) +
    (dataL3[index + 2]?.retail_penetration_diff || 0);
  eachRow.aur_ty =
    (dataL3[index + 1]?.aur_ty || 0) + (dataL3[index + 2]?.aur_ty || 0);
  eachRow.cogs_ty =
    (dataL3[index + 1]?.cogs_ty || 0) + (dataL3[index + 2]?.cogs_ty || 0);
  //calculatedData.push(eachRow);
  return eachRow;
};

const recalculateTotal = (tableData, currentTableLevel = "l3_name") => {
  //recalculating if new row changed in carryover flow
  let groupByProperties = ["l1_name", "l2_name"];
  if (currentTableLevel !== "l2_name") {
    groupByProperties.push("l3_name");
  }

  const groupedData = groupByCustom({
    Group: tableData,
    By: groupByProperties,
  });
  let calculatedData = [];
  groupedData.forEach((items, index) => {
    items.forEach((row, rowIndex) => {
      if (row.carryover_flag === "Total") {
        let dataL2 = items;
        calculatedData.push(calculateTotalAtLevels(row, dataL2, rowIndex));
      } else {
        calculatedData.push(row);
      }
    });
  });
  return calculatedData;
};

export const updateL3RowData = (
  e,
  data,
  column,
  isChanged,
  value,
  initialValue,
  instance,
  props,
  selectedDropData,
  getTotalFooterRow,
  setLevel3TableData,
  setIsL3DataChanged,
  isLevelOneDropdownRequired,
  isLevelTwoDropdownRequired,
  currentTableLevel,
  setIspenValueChanged
) => {
  let columnId = column.colId;
  if (setIsL3DataChanged) {
    setIsL3DataChanged(true);
  }
  let tempData = [],
    filteredTableData = [];
  instance.current.api.forEachNode((eachRow) => {
    tempData.push(eachRow.data);
  });
  instance.current.api.forEachNodeAfterFilterAndSort((eachRow) => {
    if (eachRow.data.l3_name !== "Total") {
      filteredTableData.push(cloneDeep(eachRow.data));
    }
  });
  value = parseFloat(value);
  switch (columnId) {
    case "penetration_ty":
      setLevel3TableData([]);
      if (props.currentTableLevel !== "l2_name") {
        setIspenValueChanged(true);
      }
      let tableData = tempData.map((eachRow, index) => {
        let newObj = { ...eachRow };
        if (eachRow.plan_bud_opt_id === data.plan_bud_opt_id) {
          newObj.budget_ty =
            (newObj[
              `l2_${[
                props.screenConfiguration?.common?.drop_key || "drop",
              ]}_budget_ty`
            ] *
              value) /
            100;
          newObj.budget_ty = newObj.budget_ty > 0 ? newObj.budget_ty : 0; //receipt value can't be negative
          let rcptsUnit = Math.round(
            newObj.aur_ty ? newObj.budget_ty / newObj.aur_ty : 0
          );
          let receipt$ = newObj.budget_ty - newObj.budget_ly;
          let receiptPercentage = newObj.budget_ly
            ? receipt$ / newObj.budget_ly
            : 0;
          newObj[columnId] = value;
          newObj.receipts_quantity_ty = rcptsUnit;
          newObj.budget_diff = receipt$;
          newObj.penetration_diff = receiptPercentage;
          newObj.cogs_ty = newObj.air_ty * newObj.receipts_quantity_ty;
          calculateRetailColumns(newObj);
        }
        return newObj;
      });

      if (data?.carryover_flag === "New") {
        tableData = recalculateTotal(tableData, currentTableLevel);
      }
      tableData = tableData.filter((obj) => obj.l3_name !== "Total");
      getTotalFooterRow(
        tableData,
        props,
        isLevelOneDropdownRequired,
        isLevelTwoDropdownRequired
      );
      setLevel3TableData(tableData);
      instance.current.api.refreshCells({
        update: tableData,
        force: true,
        suppressFlash: false,
      });
      break;

    case "receipts_quantity_ty":
      if (props.currentTableLevel !== "l2_name") {
        setIspenValueChanged(true);
      }
      if (data.l3_name !== "Total") {
        let tempValue = parseFloat(parseValue(value)) || 0;
        tempData.map((eachRow, index) => {
          if (eachRow.plan_bud_opt_id === data.plan_bud_opt_id) {
            return onChangeUnits(
              eachRow,
              tempValue,
              [],
              props.screenConfiguration
            );
          }
          return eachRow;
        });
        if (data?.carryover_flag === "New") {
          tempData = recalculateTotal(tempData, currentTableLevel);
        }
        tempData = tempData.filter((obj) => obj.l3_name !== "Total");
        getTotalFooterRow(
          tempData,
          props,
          isLevelOneDropdownRequired,
          isLevelTwoDropdownRequired
        );
        setLevel3TableData(tempData);
        instance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
      } else {
        let tableData = onBlurTotalInput(
          data,
          value,
          columnId,
          initialValue,
          tempData,
          filteredTableData,
          props.screenConfiguration
        );
        if (data?.carryover_flag === "New") {
          tableData = recalculateTotal(tableData, currentTableLevel);
        }
        tableData = tableData.filter((obj) => obj.l3_name !== "Total");
        getTotalFooterRow(
          tableData,
          props,
          isLevelOneDropdownRequired,
          isLevelTwoDropdownRequired
        );
        setLevel3TableData(tableData);
        instance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
      }
      break;

    case "budget_ty":
      if (props.currentTableLevel !== "l2_name") {
        setIspenValueChanged(true);
      }
      if (data.l3_name !== "Total") {
        let tempBudget = parseFloat(value) || 0;
        tempData.map((eachRow) => {
          if (
            (eachRow.plan_bud_opt_id &&
              data.plan_bud_opt_id &&
              eachRow.plan_bud_opt_id === data.plan_bud_opt_id) ||
            (data.l3_name === "Total" &&
              eachRow.l3_name === "Total" &&
              data[props.screenConfiguration?.common?.drop_key || "drop"] ===
                eachRow[
                  props.screenConfiguration?.common?.drop_key || "drop"
                ] &&
              data.sub_channel === eachRow.sub_channel)
          ) {
            eachRow[columnId] = tempBudget;
            eachRow.receipts_quantity_ty = eachRow.aur_ty
              ? tempBudget / eachRow.aur_ty
              : 0;
            eachRow.penetration_ty = eachRow[
              `l2_${[
                props.screenConfiguration?.common?.drop_key || "drop",
              ]}_budget_ty`
            ]
              ? (tempBudget * 100) /
                eachRow[
                  `l2_${[
                    props.screenConfiguration?.common?.drop_key || "drop",
                  ]}_budget_ty`
                ]
              : 0;
            eachRow.budget_diff = tempBudget - eachRow.budget_ly;
            eachRow.penetration_diff = eachRow.budget_ly
              ? eachRow.budget_diff / eachRow.budget_ly
              : 0;
            eachRow.cogs_ty = eachRow.air_ty * eachRow.receipts_quantity_ty;
            calculateRetailColumns(eachRow);
          }
          return eachRow;
        });
        if (data?.carryover_flag === "New") {
          tempData = recalculateTotal(tempData, currentTableLevel);
        }
        tempData = tempData.filter((obj) => obj.l3_name !== "Total");
        getTotalFooterRow(
          tempData,
          props,
          isLevelOneDropdownRequired,
          isLevelTwoDropdownRequired
        );
        setLevel3TableData(tempData);
        instance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
      } else {
        let tableData = onBlurTotalInput(
          data,
          value,
          columnId,
          initialValue,
          tempData,
          filteredTableData,
          props.screenConfiguration
        );
        if (data?.carryover_flag === "New") {
          tableData = recalculateTotal(tableData, currentTableLevel);
        }
        tableData = tableData.filter((obj) => obj.l3_name !== "Total");
        getTotalFooterRow(
          tableData,
          props,
          isLevelOneDropdownRequired,
          isLevelTwoDropdownRequired
        );
        setLevel3TableData(tableData);
        instance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
      }
      break;

    case "aur_ty":
      if (props.currentTableLevel !== "l2_name") {
        setIspenValueChanged(true);
      }
      tempData.map((eachRow, index) => {
        if (eachRow.plan_bud_opt_id === data.plan_bud_opt_id) {
          eachRow[columnId] = value;
          eachRow.imu_ty = eachRow.air_ty
            ? (eachRow.air_ty - value) / eachRow.air_ty
            : 0;
          eachRow.budget_diff = eachRow.budget_ty - eachRow.budget_ly;
          eachRow.penetration_diff = eachRow.budget_ly
            ? eachRow.budget_diff / eachRow.budget_ly
            : 0;
          eachRow.receipts_quantity_ty = value
            ? Math.round(eachRow.budget_ty / value || 0)
            : 0;
          eachRow.penetration_ty = eachRow[
            `l2_${[
              props.screenConfiguration?.common?.drop_key || "drop",
            ]}_budget_ty`
          ]
            ? (value * eachRow.receipts_quantity_ty * 100) /
              eachRow[
                `l2_${[
                  props.screenConfiguration?.common?.drop_key || "drop",
                ]}_budget_ty`
              ]
            : 0;
          eachRow.cogs_ty = eachRow.receipts_quantity_ty * eachRow.air_ty;
          eachRow.revenue_ty = value * eachRow.forecast_units_ty;
          calculateRetailColumns(eachRow);
        }
        return eachRow;
      });
      if (data?.carryover_flag === "New") {
        tempData = recalculateTotal(tempData, currentTableLevel);
      }
      tempData = tempData.filter((obj) => obj.l3_name !== "Total");
      getTotalFooterRow(
        tempData,
        props,
        isLevelOneDropdownRequired,
        isLevelTwoDropdownRequired
      );
      setLevel3TableData(tempData);
      instance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
      });
      break;
    case "air_ty":
      tempData.map((eachRow, index) => {
        if (
          eachRow.plan_bud_opt_id === data.plan_bud_opt_id &&
          eachRow[props.screenConfiguration?.common?.drop_key || "drop"] ===
            selectedDropData
        ) {
          eachRow[columnId] = value;
          eachRow.imu_ty = !value ? 0 : (value - eachRow.aur_ty) / value || 0;
          eachRow.receipts_quantity_ty = Math.round(
            parseValue(eachRow.receipts_quantity_ty)
          );
          eachRow.cogs_ty = eachRow.air_ty * eachRow.receipts_quantity_ty;
          calculateRetailColumns(eachRow);
        }
        return eachRow;
      });
      instance.current.api.refreshCells({
        update: tempData,
      });
      break;
    case "lock":
      props.getSelectedRowIds(data.plan_bud_opt_id);
      break;
    case "txn_aur_ty":
      let aurUpdateData = tempData.map((eachRow, index) => {
        let newObj = { ...eachRow };
        if (eachRow.plan_bud_opt_id === data.plan_bud_opt_id) {
          newObj[columnId] = value;
          newObj["revenue_ty"] = value ? newObj.forecast_units_ty * value : 0;
        }
        return newObj;
      });

      if (data?.carryover_flag === "New") {
        aurUpdateData = recalculateTotal(aurUpdateData, currentTableLevel);
      }
      aurUpdateData = aurUpdateData.filter((obj) => obj.l3_name !== "Total");
      getTotalFooterRow(
        aurUpdateData,
        props,
        isLevelOneDropdownRequired,
        isLevelTwoDropdownRequired
      );
      setLevel3TableData(aurUpdateData);
      instance.current.api.refreshCells({
        update: aurUpdateData,
        force: true,
        suppressFlash: false,
      });
      break;
    default:
      break;
  }
};

const generateAttributeValue = (item) => {
  //columns which need to be converted to float are defined here
  let floatKeys = [
    "penetration_ly",
    "penetration_ty",
    "budget_ly",
    "budget_ty",
    "penetration_diff",
    "budget_diff",
    "aur_ly",
    "aur_ty",
    "receipts_quantity_ly",
    "air_ty",
    "air_ly",
  ];
  //columns which do not need any kind of text/value formatting are defined here
  let noFormatingKeys = [
    "l2_drop_budget_ty",
    "l2_launch_budget_ty",
    "existing",
    "cogs_ty",
    "revenue_ly",
    "margin_ly",
    "total_available_units_ly",
    "msrp_ly",
    "st",
    "cost_ty",
    "imu_ty",
    "imu_ly",
    "total_receipts_cost_ly",
    "total_receipts_cost_ty",
    "retail_budget_diff",
    "retail_penetration_diff",
  ];
  let attribute_value = {};
  Object.keys(item).forEach((key) => {
    if (floatKeys.indexOf(key) !== -1) {
      attribute_value[key] = parseValue(item[key]);
    }
    if (noFormatingKeys.indexOf(key) !== -1) {
      attribute_value[key] = item[key];
    }
  });
  return attribute_value;
};

export const getFiltersForPayload = (data, levelsJson) => {
  let filters = {};
  Object.keys(levelsJson).forEach((level) => {
    if (data[level]) {
      filters[level] = data[level] || "";
    }
  });
  return filters;
};

export const getL3Optimization = (
  data,
  deleteData,
  levelsJson,
  isNLE,
  originalData = [],
  screenConfiguration
) => {
  return data?.map((item) => {
    let originalDataIndex = originalData.findIndex(
      (row) => row.plan_bud_opt_id === item.plan_bud_opt_id
    );
    let eachPayload = {
      plan_bud_opt_id: item.plan_bud_opt_id,
      plan_code: item.plan_code,
      filters: {
        ...getFiltersForPayload(item, levelsJson),
        sub_channel: item.sub_channel,
        [screenConfiguration?.common?.drop_key || "drop"]: item[
          screenConfiguration?.common?.drop_key || "drop"
        ]
          .trim()
          .replace(" ", "_")
          .toLowerCase(),
      },
      attribute_value: {
        ...generateAttributeValue(item),
        penetration_ty: parseValue(item.penetration_ty) / 100,
        receipts_quantity_ty: isNaN(
          Math.round(parseValue(item.receipts_quantity_ty))
        )
          ? 0
          : Math.round(parseValue(item.receipts_quantity_ty)),
        op_calculation: Math.round(item?.op_calculation),
        aur_ratio:
          originalDataIndex !== -1
            ? item.aur_ty / originalData[originalDataIndex]?.aur_ty
            : 1,
      },
      is_active:
        deleteData && deleteData.plan_bud_opt_id === item.plan_bud_opt_id
          ? "NO"
          : "YES",
    };
    if (item.carryover_flag) {
      eachPayload.filters.carryover_flag = item.carryover_flag;
    }
    if (isNLE) {
      eachPayload.attribute_value.penetration_old_ty = item.penetration_old_ty;
      eachPayload.attribute_value.air_old_ty = item.air_old_ty;
      eachPayload.attribute_value.aur_old_ty = item.aur_old_ty;
      eachPayload.attribute_value.budget_old_ty = item.budget_old_ty;
      eachPayload.attribute_value.receipts_quantity_old_ty =
        item.receipts_quantity_old_ty;
    }
    return eachPayload;
  });
};

export const getPayloadForL3 = (
  ins,
  levelsJson,
  isNLE = false,
  originalData = [],
  screenConfiguration
) => {
  let data = ins?.data;
  let deleteData = ins?.row?.original;
  return {
    l3_optimization_data: getL3Optimization(
      data,
      deleteData,
      levelsJson,
      isNLE,
      originalData,
      screenConfiguration
    ),
  };
};

const scaleUpDownAttribute = (
  row,
  selectedL3,
  lockId,
  colId,
  colDiff,
  displayMessage
) => {
  //selectedL3 edited attriute name
  //lockId edit row id
  //colId is columnName
  //colDiff is difference between old value and new value
  let unlockPercenatge = 0,
    lockPercentage = 0;
  //sub of non edited attribute values of colId is unlockPercentage
  row.subRows &&
    row.subRows.map((subNode, index) => {
      let sub = subNode.data;
      if (
        ((!sub.lock && colId === "total_ty") || colId !== "total_ty") &&
        sub.l3_name === selectedL3
      ) {
        unlockPercenatge += parseFloat(sub[colId] || 0);
      }
      if (sub.lock && sub.l3_name === selectedL3 && colId === "total_ty") {
        lockPercentage += parseFloat(sub[colId] || 0);
      }
      return null;
    });
  if (lockPercentage > 99) {
    displayMessage("Locked percentage should be less than 100", "error");
  } else {
    //calculativeFactor = 100  / (sum of all unlocked attribute col value))
    //let calculativeFactor = unlockPercenatge ? 100 / unlockPercenatge : 1;
    let calculativeFactor = unlockPercenatge
      ? (100 - lockPercentage) / unlockPercenatge
      : 1;
    row.subRows &&
      row.subRows.map((subNode, index) => {
        let sub = subNode.data;
        if (
          ((!sub.lock && colId === "total_ty") || colId !== "total_ty") &&
          sub.l3_name === selectedL3
        ) {
          //new value is old value * calculativeFactor
          sub[colId] = parseFloat(sub[colId] || 0) * calculativeFactor;
        }
        return null;
      });
  }
};

export const getRoundedTotal = (total) => {
  return total > 99.97 && total < 100.03 ? 100.0 : total;
};

export const getClusterTotalRow = (instance, screenConfiguration) => {
  let total_cluster_ly_obj = {};
  let total_penetration_ly = 0,
    total_penetration_ty = 0,
    total_ly = 0,
    total_ty = 0,
    isCarryOverFlow = false;
  let footerData = [];
  let rowData = instance?.current?.api?.rowModel.rowsToDisplay?.[0]?.data;
  Object.keys(rowData).forEach((key) => {
    if (key.includes("cluster_display_name")) {
      let clusterValue = rowData?.[key]?.toLowerCase();
      total_cluster_ly_obj[`${clusterValue}_ly`] = 0;
      total_cluster_ly_obj[`${clusterValue}_ty`] = 0;
    }
  });
  instance?.current?.api?.rowModel.rowsToDisplay.forEach((eachNode) => {
    let data = eachNode.data;
    if (
      !data.carryover_flag ||
      (data.carryover_flag && data.carryover_flag === "Total")
    ) {
      isCarryOverFlow = data.carryover_flag;
      total_penetration_ly = total_penetration_ly + data.penetration_ly;
      total_penetration_ty = total_penetration_ty + data.penetration_ty;
      total_ly = total_ly + data.penetration_ly * data.total_ly;
      total_ty = total_ty + data.penetration_ty * data.total_ty;
      Object.keys(total_cluster_ly_obj).forEach((key) => {
        if (key.includes("ty")) {
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
    if (cluster.includes("ty")) {
      total_cluster_ly_obj[cluster] =
        total_cluster_ly_obj[cluster] / (isCarryOverFlow ? 10000 : 100);
    } else {
      total_cluster_ly_obj[cluster] = total_cluster_ly_obj[cluster] / 100;
    }
  });
  footerData.push({
    penetration_ly: total_penetration_ly,
    penetration_ty: total_penetration_ty,
    total_ly: total_ly / 100,
    total_ty: total_ty / 100,
    ...total_cluster_ly_obj,
    l3_name: "Total",
    drop: rowData[screenConfiguration?.common?.drop_key || "drop"],
    uniqueID:
      "Total" + rowData[screenConfiguration?.common?.drop_key || "drop"],
  });
  return footerData;
};

export const onBlurAgGridCluster = (
  rowData,
  column,
  isChanged,
  value,
  initialValue,
  instance,
  uniqueClusterList,
  handleClusterNext,
  validateError,
  setShowError,
  displayMessage,
  screenConfiguration,
  setFilteredFooter,
  setIsClusterChanged
) => {
  let columnID = column.colId;
  let updatedData = [];
  let isCarryOverFlow = rowData.carryover_flag;
  setIsClusterChanged(true);
  if (columnID === "lock") {
    instance?.current?.api?.rowModel.rowsToDisplay.forEach((eachNode) => {
      let eachRow = eachNode.data;
      if (eachRow.uniqueID === rowData.uniqueID) {
        eachRow[columnID] = value;
      }
    });
  } else if (columnID !== "total_ty" && isChanged) {
    if (
      (!rowData.carryover_flag && !rowData.attribute_value) ||
      (rowData.carryover_flag &&
        rowData.carryover_flag === "New" &&
        rowData.attribute_value === "New")
    ) {
      let totalCurrentCluster = 0,
        total_ty = 0,
        length = 0;
      instance?.current?.api?.rowModel.rowsToDisplay.forEach((eachNode) => {
        let eachRow = eachNode.data;
        eachRow.subRows = eachNode.childrenAfterAggFilter;
        if (
          (!eachRow.carryover_flag && !eachRow.attribute_value) ||
          (eachRow.carryover_flag && eachRow.carryover_flag === "New")
        ) {
          length++;
          if (eachRow.uniqueID === rowData.uniqueID) {
            if (!initialValue && eachRow.subRows?.length > 0 && validateError) {
              let allAtrributesZero = true;
              eachRow.subRows.forEach((sub) => {
                if (sub.data[columnID]) {
                  allAtrributesZero = false;
                }
              });
              if (allAtrributesZero) {
                eachRow[columnID] = 0;
                setShowError(true);
              }
            } else {
              eachRow[columnID] = value;
              uniqueClusterList.forEach((clust) => {
                let key = `${clust}_ty`;
                total_ty += parseFloat(eachRow[key]);
              });
              eachRow.total_ty = Math.round(total_ty * 100) / 100;
              updatedData.push(eachRow);
              updatedData.push(
                ...getSubRowNodeTotal(eachRow, uniqueClusterList)
              );
            }
          }
        }
        if (
          !isCarryOverFlow &&
          !eachRow.attribute_value &&
          eachRow.l3_name !== "Total"
        ) {
          totalCurrentCluster =
            totalCurrentCluster + eachRow.penetration_ty * eachRow[columnID];
        } else if (eachRow.l3_name === "Total" && !isCarryOverFlow) {
          eachRow[columnID] = totalCurrentCluster / 100;
        }
      });
    } else {
      instance?.current?.api?.rowModel.rowsToDisplay.forEach((eachNode) => {
        let eachRow = eachNode.data;
        eachRow.subRows = eachNode.childrenAfterAggFilter;
        if (
          ((!eachRow.carryover_flag && !eachRow.attribute_value) ||
            (eachRow.carryover_flag && eachRow.carryover_flag === "New")) &&
          eachRow.hierarchy[eachRow.carryover_flag ? 1 : 0] ===
            rowData.hierarchy[eachRow.carryover_flag ? 1 : 0] &&
          eachRow.subRows?.length > 0
        ) {
          updatedData.push(eachRow);
          eachRow.subRows.forEach((subNode) => {
            let sub = subNode.data;
            if (sub.uniqueID === rowData.uniqueID) {
              // when we change any attribute cluster value
              let tempValue = value;
              uniqueClusterList.forEach((cluster) => {
                let newValue = tempValue;
                let calculatedDiff = 0;
                //if it is not the edited cluster then calculating newCluster value
                if (columnID !== `${cluster}_ty`) {
                  newValue = parseFloat(sub[`${cluster}_ty`] || 0);

                  //calculatedDiff is the difference between the oldCluster value and newCluster value
                  calculatedDiff = (sub[`${cluster}_ty`] || 0) - newValue;
                } else {
                  calculatedDiff = initialValue - newValue;
                }
                sub[`${cluster}_ty`] = newValue;
                //scale up/down the other cluster values of other child attribute
                scaleUpDownAttribute(
                  eachRow,
                  sub.l3_name,
                  rowData.uniqueID,
                  `${cluster}_ty`,
                  calculatedDiff,
                  displayMessage
                );
                //sub[`${cluster}_ty`] = newValue;
              });
              updatedData.push(
                ...getSubRowNodeTotal(eachRow, uniqueClusterList)
              );
            }
          });
        }
      });
    }
  } else {
    instance?.current?.api?.rowModel.rowsToDisplay.forEach((eachNode) => {
      let eachRow = eachNode.data;
      eachRow.subRows = eachNode.childrenAfterAggFilter;
      if (
        ((!eachRow.carryover_flag && !eachRow.attribute_value) ||
          (eachRow.carryover_flag && eachRow.carryover_flag === "New")) &&
        eachRow.hierarchy[0] === rowData.hierarchy[0]
      ) {
        updatedData.push(eachRow);
        eachRow.subRows.forEach((subNode) => {
          let sub = subNode.data;
          if (sub.uniqueID === rowData.uniqueID) {
            let oldValue = initialValue;

            oldValue = parseFloat(oldValue);
            let multipliFactor =
              1 + (oldValue ? (value - oldValue) / oldValue : 0);
            //multiplicativeFactor = 1 + (newValue - oldValue) / oldValue
            let calculatedDiff = oldValue - value;
            //scale up/ down the total column of child attributes
            sub[columnID] = value;
            scaleUpDownAttribute(
              eachRow,
              sub.l3_name,
              sub.uniqueID,
              "total_ty",
              calculatedDiff,
              displayMessage
            );

            //sub[columnID] = value;

            uniqueClusterList.forEach((cluster) => {
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
                eachRow,
                sub.l3_name,
                sub.uniqueID,
                `${cluster}_ty`,
                calculatedClusterDiff,
                displayMessage
              );
              //sub[`${cluster}_ty`] = newValue;
            });
          }
        });
      }
    });
  }
  if (isCarryOverFlow) {
    let totalCurrentCluster = 0;
    instance?.current?.api?.rowModel.rowsToDisplay.forEach((eachNode) => {
      let eachRow = eachNode.data;
      eachRow.subRows = eachNode.childrenAfterAggFilter;
      if (eachRow.carryover_flag === "Total") {
        uniqueClusterList.forEach((clust, index) => {
          let clustTotal = 0;
          let totalQty = 0;
          eachRow.subRows.forEach((subNode) => {
            let subRow = subNode.data;
            if (index === 0) {
              totalQty = totalQty + subRow.penetration_ty * subRow[`total_ty`];
            }
            clustTotal =
              clustTotal + subRow.penetration_ty * subRow[`${clust}_ty`];
          });
          eachRow[`${clust}_ty`] = eachRow.penetration_ty
            ? clustTotal / eachRow.penetration_ty
            : 0;
          if (index === 0) {
            eachRow[`total_ty`] = eachRow.penetration_ty
              ? totalQty / eachRow.penetration_ty
              : 0;
          }
        });
        totalCurrentCluster =
          totalCurrentCluster + eachRow.penetration_ty * eachRow[columnID];
      }
      if (eachRow.l3_name === "Total") {
        totalCurrentCluster =
          totalCurrentCluster / (columnID === "total_ty" ? 100 : 10000);
        eachRow[columnID] = totalCurrentCluster;
      }
    });
  }
  setIsClusterChanged(true);
  // instance.current.api.applyTransaction({
  //   update: updatedData,
  // });
  instance.current.api.refreshCells({
    force: true,
  });
  let footerData = getClusterTotalRow(instance, rowData, screenConfiguration);
  setFilteredFooter(footerData);
  handleClusterNext();
};

export const getSubRowNodeTotal = (row, clusterList) => {
  let subTotal = {},
    finalSubRows = [];
  row.subRows &&
    row.subRows.map((subNode, index) => {
      let sub = subNode.data;
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

        sub["total_ly"] =
          (subTotal[`total_ly${index + 1}`] / row[`total_ly`]) * 100;
        sub["total_ty"] =
          (subTotal[`total_ty${index + 1}`] / row[`total_ty`]) * 100;
      });
      finalSubRows.push(sub);
      return null;
    });
  return finalSubRows;
};

export const getFooterRowForDropsTable = (
  tableData,
  reviewDrops = false,
  props
) => {
  //Gorup drops table data based on selected level3 value
  const groupBy_properties = ["l3_name"];
  if (props.planDetails?.data?.l1_name?.length > 1) {
    groupBy_properties.push("l1_name");
  }
  if (props.planDetails?.data?.l2_name?.length > 1) {
    groupBy_properties.push("l2_name");
  }
  const groupedDataArray = groupByCustom({
    Group: tableData,
    By: groupBy_properties,
  });
  groupedDataArray?.length &&
    groupedDataArray.forEach((groupedData) => {
      let newDropTotalLy = 0,
        newDropTotalTy = 0,
        carryoverDropTotalLy = 0,
        carryoverDropTotalTy = 0;
      groupedData.forEach((data) => {
        if (
          data["carryover_flag"] === "new" ||
          data["carryover_flag"] === "New"
        ) {
          //Calculate total for tag "New" for review drops table
          if (reviewDrops) {
            newDropTotalLy += data.drop_receipt_ly;
            newDropTotalTy += data.drop_receipt_ty;
          } else {
            newDropTotalLy += data.drop_penetration_ly;
            newDropTotalTy += data.drop_penetration_ty;
          }
        } else {
          if (reviewDrops) {
            carryoverDropTotalLy += data.drop_receipt_ly;
            carryoverDropTotalTy += data.drop_receipt_ty;
          } else {
            carryoverDropTotalLy += data.drop_penetration_ly;
            carryoverDropTotalTy += data.drop_penetration_ty;
          }
        }
      });
      if (carryoverDropTotalTy > 0) {
        //Push total row for CarryOver tag
        tableData.push({
          l3_name: "Total",
          l3_name_key: groupedData[0]?.l3_name,
          l2_name: groupedData[0]?.l2_name,
          l1_name: groupedData[0]?.l1_name,
          carryover_flag: "Carryover",
          drop_penetration_ly: carryoverDropTotalLy,
          drop_penetration_ty: carryoverDropTotalTy,
          drop_receipt_ly: carryoverDropTotalLy,
          drop_receipt_ty: carryoverDropTotalTy,
          uniqueID:
            "TotalCarryOver" +
            groupedData[0]?.l3_name +
            groupedData[0].l1_name +
            groupedData[0]?.l2_name +
            groupedData[0]?.[
              props.screenConfiguration?.common?.drop_key || "drop"
            ],
        });
      }
      //Push total row for New tag
      tableData.push({
        l3_name: "Total",
        l3_name_key: groupedData[0]?.l3_name,
        l2_name: groupedData[0]?.l2_name,
        l1_name: groupedData[0]?.l1_name,
        carryover_flag: "New",
        drop_penetration_ly: newDropTotalLy,
        drop_penetration_ty: newDropTotalTy,
        drop_receipt_ly: newDropTotalLy,
        drop_receipt_ty: newDropTotalTy,
        uniqueID:
          "TotalNew" +
          groupedData[0]?.l3_name +
          groupedData[0].l1_name +
          groupedData[0]?.l2_name +
          groupedData[0]?.[
            props.screenConfiguration?.common?.drop_key || "drop"
          ],
      });
    });
};

export const handlePlanLevelsChange = (
  option,
  key,
  tableData,
  levelSelected,
  formData,
  levelsOptions,
  setLevelThreeOptions,
  setLevel3value,
  setLevelsOptions,
  setLevelSelected
) => {
  const selectedValue = levelSelected;
  let formOption = cloneDeep(formData.current);
  selectedValue[key.filter_id] = option;
  formOption[key.filter_id] = option?.label;
  let l3ValuesData = [];
  if (key.filter_id === "l1_name") {
    let l2ValuesOpt = [];
    const groupByProperties = ["l1_name", "l2_name"];
    const groupResult = groupByCustom({
      Group: tableData,
      By: groupByProperties,
    });
    groupResult.forEach((item) => {
      let filter = item.filter((itm) => itm.l1_name === option?.label);
      if (filter?.length) {
        l2ValuesOpt.push({
          label: filter[0]?.l2_name,
          value: filter[0]?.l2_name,
          id: filter[0]?.l2_name,
        });
      }
    });
    levelsOptions.l2_name = l2ValuesOpt;
    formOption.l2_name = l2ValuesOpt[0]?.label;
    selectedValue.l2_name = l2ValuesOpt[0];
    l3ValuesData = tableData?.filter((item) => {
      return (
        item.l1_name === option?.label &&
        item.l2_name === selectedValue.l2_name?.label
      );
    });
    l3ValuesData = uniqBy(l3ValuesData, "l3_name");
    l3ValuesData = l3ValuesData?.map((item) => {
      return {
        label: item?.l3_name,
        value: item?.l3_name,
        id: item?.l3_name,
      };
    });
  } else if (key.filter_id === "l2_name") {
    l3ValuesData = tableData?.filter((item) => {
      return (
        item.l2_name === option?.label &&
        ((formOption?.l1_name && formOption.l1_name === item.l1_name) ||
          !formOption.l1_name)
      );
    });
    l3ValuesData = uniqBy(l3ValuesData, "l3_name");
    l3ValuesData = l3ValuesData?.map((data) => {
      return {
        label: data?.l3_name,
        value: data?.l3_name,
        id: data?.l3_name,
      };
    });
  }
  setLevelThreeOptions(l3ValuesData);
  setLevel3value(l3ValuesData[0]);
  setLevelsOptions(levelsOptions);
  setLevelSelected(levelSelected);
  formData.current = formOption;
};

export const configureL3level = (levelsData, tableData, l3Options) => {
  let l3Values = [];
  if (levelsData.options?.l2_name?.length) {
    l3Values = tableData?.filter((item) => {
      return item.l2_name === levelsData?.selectedValue?.l2_name?.label;
    });
    l3Values = uniqBy(l3Values, "l3_name");
    l3Values = l3Values?.map((item) => {
      return {
        label: item.l3_name,
        value: item.l3_name,
        id: item.l3_name,
      };
    });
  } else {
    l3Values = l3Options;
  }
  return l3Values;
};

export const getDropFlowLevelPayloadData = (AGInstance, props) => {
  let plan_budget_drop_data = [];
  AGInstance.current.api.forEachNode((obj) => {
    obj = obj.data;
    let data;
    Object.keys(obj).forEach((key) => {
      // Based on dropID get attribute values
      let dropID = key !== "plan_budget_drop_id" && key.split("pen%_drop ")[1];
      if (dropID) {
        let attribute = obj[`attribute_value_${dropID}`];
        data = {
          plan_code: obj.plan_code,
          plan_budget_drop_id: attribute.plan_budget_drop_id,
          attribute_value: {
            [props.screenConfiguration?.common?.drop_key || "drop"]: `${
              props.screenConfiguration?.common?.drop_key || "drops"
            }_${dropID}`,
            pen_ly: attribute[`pen_ly`],
            pen_ty: obj[`pen%_drop ${dropID}`] / 100,
            receipt$_ly: attribute[`receipt$_ly`],
            receipt$_ty: obj[`receipt$_drop ${dropID}`],
            l2_budget_ly: attribute.l2_budget_ly,
            total_l2_budget_ty: obj.total_l2_budget_ty,
            total_l2_budget_ly: obj.total_l2_budget_ly,
          },
        };
        plan_budget_drop_data.push(data);
      }
    });
  });
  return plan_budget_drop_data;
};
