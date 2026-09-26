import React from "react";
import { withRouter } from "react-router-dom";
import { Grid, Button } from "@mui/material";
import CompareArrowsOutlinedIcon from "@mui/icons-material/CompareArrowsOutlined";
import { Plan } from "modules/assortsmart/constants-assortsmart/stringContants";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { groupByCustom } from "core/Utils/formatter";
import { calculateL3TotalDropRowData } from "./plan-initial-functions";

const onChangePen = (row, screenConfiguration) => {
  //calculating the dependency feilds when penetration changes
  let dependentValue =
    (row[`l2_${[screenConfiguration?.common?.drop_key || "drop"]}_budget_ty`] *
      row.penetration_ty) /
    100;
  dependentValue = dependentValue > 0 ? dependentValue : 0;
  let rcptsUnit = row.aur_ty ? Math.round(dependentValue / row.aur_ty) : 0;
  let receipt$ = dependentValue - row.budget_ly;
  let receiptPercentage = row.budget_ly ? receipt$ / row.budget_ly : 0;
  row.budget_ty = dependentValue;
  row.receipts_quantity_ty = rcptsUnit;
  row.budget_diff = receipt$;
  row.penetration_diff = receiptPercentage;
  row.total_receipts_cost_ty = row.receipts_quantity_ty * row.air_ty;
  row.retail_budget_diff =
    row.total_receipts_cost_ty - row.total_receipts_cost_ly;
  row.retail_penetration_diff = row.total_receipts_cost_ly
    ? row.retail_budget_diff / row.total_receipts_cost_ly
    : 0;
  row.cogs_ty = row.receipts_quantity_ty * row.air_ty;
  row["forecast_units_ty"] = rcptsUnit * row.st_without_filters;
  row.revenue_ty = row["forecast_units_ty"] * row.txn_aur_ty;
  row.budget_diff = row.budget_ty - row.budget_ly;
  row.penetration_diff = row.budget_ly ? row.budget_diff / row.budget_ly : 0;
  row.cogs_ty = row.receipts_quantity_ty * row.air_ty;
};

const recalculateScaleUpDown = (
  row,
  l3LockData,
  unlockPercentage,
  remaingPercentage,
  groupedLevelData,
  carryOverIndex,
  screenConfiguration
) => {
  if (
    row.carryover_flag &&
    !l3LockData.includes(
      row.l2_name +
        row[screenConfiguration?.common?.final_level || "l3_name"] +
        row[screenConfiguration?.common?.drop_key || "drop"]
    ) &&
    row.carryover_flag === "New"
  ) {
    //Change pen% for rows which are not selected
    let value = row.penetration_ty
      ? (parseFloat(Math.round(row.penetration_ty * 100) / 100) /
          unlockPercentage) *
        Math.abs(remaingPercentage)
      : 0;
    row.penetration_ty = Math.round(value * 100) / 100;
    onChangePen(row, screenConfiguration);
    groupedLevelData[0].penetration_ty =
      row.penetration_ty +
      (groupedLevelData?.[carryOverIndex]?.penetration_ty || 0);
    onChangePen(groupedLevelData[0], screenConfiguration);
    return groupedLevelData;
  }
  return groupedLevelData;
};

const BudgetScaleUpDown = (props) => {
  const classes = useStyles();
  const scaleUpDown = () => {
    props.setTableData([]);
    props.setIsL3DataChanged(true);
    if (props.hideClusterTable) {
      props.hideClusterTable();
    }
    let maxLockPercentage = 0;
    let isCarryOverFlow = false;
    let filteredRows = [],
      tempData = [],
      totalRowData = {},
      l3LockData = [];
    props.RTinstance.current.api.forEachNodeAfterFilterAndSort((eachRow) => {
      // Removing footer total row
      if (
        eachRow.data[
          props.screenConfiguration?.common?.final_level || "l3_name"
        ] !== "Total"
      ) {
        if (eachRow.data.carryover_flag === "Carryover") {
          maxLockPercentage =
            maxLockPercentage +
            Math.round(eachRow.data.penetration_ty * 100) / 100;
        }
        if (eachRow.data.carryover_flag) {
          isCarryOverFlow = true;
        }
        if (eachRow.data.lock) {
          //Add L3 values for locked rows
          l3LockData.push(
            eachRow.data.l2_name +
              eachRow.data[
                props.screenConfiguration?.common?.final_level || "l3_name"
              ] +
              eachRow.data[
                props.screenConfiguration?.common?.drop_key || "drop"
              ]
          );
        }
        filteredRows.push(eachRow.data);
      }
    });
    let newTotalPen = 100 - maxLockPercentage;
    maxLockPercentage = 100 - maxLockPercentage;
    props.RTinstance.current.api.forEachNode((eachRow) => {
      // Removing footer total row
      if (
        eachRow.data[
          props.screenConfiguration?.common?.final_level || "l3_name"
        ] !== "Total"
      ) {
        tempData.push(eachRow.data);
      }
    });
    let filteredRowIds = [];
    let lockPercentage = 0; //sum of all locked ty penetration
    let unlockPercentage = 0; //sum of all unLocked ty penetration
    let newLockPercentage = 0;
    let newUnlockPercentage = 0;

    if (!isCarryOverFlow) {
      maxLockPercentage = 100;
    }
    let selectedRows = [];

    filteredRows.map((row, index) => {
      if (props.selectedDropData === "Total") {
        totalRowData[
          row[props.screenConfiguration?.common?.final_level || "l3_name"]
        ] = row;
      }
      filteredRowIds.push(row);
      if (row.lock) {
        selectedRows.push(row.plan_bud_opt_id);
      }
      if (
        selectedRows.indexOf(row.plan_bud_opt_id) !== -1 &&
        ((row.carryover_flag && row.carryover_flag === "Total") ||
          !row.carryover_flag)
      ) {
        lockPercentage =
          lockPercentage + Math.round(row.penetration_ty * 100) / 100;
      } else if (
        (row.carryover_flag && row.carryover_flag === "Total") ||
        !row.carryover_flag
      ) {
        unlockPercentage =
          unlockPercentage + Math.round(row.penetration_ty * 100) / 100;
      } else if (
        row.carryover_flag &&
        l3LockData.includes(
          row.l2_name +
            row[props.screenConfiguration?.common?.final_level || "l3_name"] +
            row[props.screenConfiguration?.common?.drop_key || "drop"]
        ) &&
        row.carryover_flag === "New"
      ) {
        //Calculate locked percentage for rows with "New" carryover flag
        newLockPercentage =
          newLockPercentage + Math.round(row.penetration_ty * 100) / 100;
      } else if (row.carryover_flag && row.carryover_flag === "New") {
        //Calculate unlocked percentage for rows with "New" carryover flag
        newUnlockPercentage =
          newUnlockPercentage + Math.round(row.penetration_ty * 100) / 100;
      }
      return row;
    });
    if (
      (isCarryOverFlow && newLockPercentage < newTotalPen) ||
      (!isCarryOverFlow && lockPercentage < maxLockPercentage)
    ) {
      if (filteredRowIds.length !== selectedRows.length) {
        let remaingPercentage = 0;
        if (isCarryOverFlow) {
          remaingPercentage = newTotalPen - newLockPercentage;
          unlockPercentage = newUnlockPercentage;
        } else {
          remaingPercentage = 100 - lockPercentage;
        }
        if (unlockPercentage > 0) {
          /* sample example
          if we have 5 rows with penetration_ty
          row1  = 1.2
          row2  = 0.1
          row3  = 50.3
          row4  = 40.4
          row5  = 8
          total = 100
  
          if we change row5 to 30 and we are going to lock row3 and row5
          row1  = 1.2
          row2  = 0.1
          row3  = 50.3 Locked
          row4  = 40.4
          row5  = 30   Locked
          total = 122
  
          Scale Up/Down calculation
          lockPercentage = row3 + row5 = 50.3 + 50 = 80.3
          unlockPercentage = row1 + row2+ row3 = 1.2 + 0.1 + 40.4 = 41.7
          remaingPercentage = 100 - lockPercentage = 100 - 80.3 = 19.7
  
          Main Calculation
          row1 = (row1/unlockPercenatge) * remaingPercentage = (1.2/41.7) * 19.7 = 0.567
          this calculation should repeat for other unlocked rows.
          */

          if (tempData?.[0]?.carryover_flag) {
            let groupByProperties = ["l1_name", "l2_name"];
            if (props.currentTableLevel !== "l2_name") {
              groupByProperties.push("l3_name");
            }

            const groupedData = groupByCustom({
              Group: tempData,
              By: groupByProperties,
            });
            tempData = [];
            groupedData.forEach((level3, index) => {
              let newIndex = level3?.[1]?.carryover_flag === "New" ? 1 : 2;
              let carryOverIndex =
                level3?.[1]?.carryover_flag === "New" ? 2 : 1;
              let row = level3?.[newIndex];
              let currentLevel = level3?.[0]?.l1_name;
              let filterLevel = filteredRows?.[0]?.l1_name;
              if (props.currentTableLevel !== "l2_name") {
                currentLevel = currentLevel + level3?.[0]?.l2_name;
                filterLevel = filterLevel + filteredRows?.[0]?.l2_name;
              }
              if (currentLevel === filterLevel || !filteredRows?.length) {
                tempData.push(
                  ...recalculateScaleUpDown(
                    row,
                    l3LockData,
                    unlockPercentage,
                    remaingPercentage,
                    level3,
                    carryOverIndex,
                    props.screenConfiguration
                  )
                );
              } else {
                tempData.push(...level3);
              }
            });
          } else {
            tempData.map((row, index) => {
              if (
                selectedRows.indexOf(row.plan_bud_opt_id) === -1 &&
                filteredRowIds.indexOf(row) > -1
              ) {
                let value = row.penetration_ty
                  ? (parseFloat(Math.round(row.penetration_ty * 100) / 100) /
                      unlockPercentage) *
                    Math.abs(remaingPercentage)
                  : 0;
                row.penetration_ty = Math.round(value * 100) / 100;
                onChangePen(row, props.screenConfiguration);
              }
              return row;
            });
          }
          let updatedData = props.isTotalDrop
            ? calculateL3TotalDropRowData(tempData, props, totalRowData)
            : tempData;
          props.setTableData(updatedData);
          props.RTinstance.current.api.refreshCells({
            force: true,
            suppressFlash: false,
          });
        } else {
          props.addSnack({
            message: "Total Non-Locked penetration should not be 0",
            options: {
              variant: "error",
            },
          });
          let updatedData = props.isTotalDrop
            ? calculateL3TotalDropRowData(tempData, props, totalRowData)
            : tempData;
          props.setTableData(updatedData);
          props.RTinstance.current.api.refreshCells({
            force: true,
            suppressFlash: false,
          });
        }
      } else {
        // if all rows are locked it will show error
        props.addSnack({
          message: "Can't Lock all the rows",
          options: {
            variant: "error",
          },
        });
        let updatedData = props.isTotalDrop
          ? calculateL3TotalDropRowData(tempData, props, totalRowData)
          : tempData;
        props.setTableData(updatedData);
        props.RTinstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
      }
    } else {
      // if lock percentage is more than 100 it will show error
      props.addSnack({
        message: `Locked percentage cannot be more than ${parseInt(
          isCarryOverFlow ? newTotalPen : maxLockPercentage
        )}`,
        options: {
          variant: "error",
        },
      });
      let updatedData = props.isTotalDrop
        ? calculateL3TotalDropRowData(tempData, props, totalRowData)
        : tempData;
      props.setTableData(updatedData);
      props.RTinstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
      });
    }
  };
  return (
    <Grid Item className={classes.btnGroup}>
      <Button
        variant="outlined"
        color="primary"
        className={classes.scaleUpDownBtn}
        onClick={scaleUpDown}
        title={Plan.__Scale_Up_Down}
        id="budget-scale-up-down"
      >
        <CompareArrowsOutlinedIcon />
      </Button>
    </Grid>
  );
};

export default withRouter(BudgetScaleUpDown);
