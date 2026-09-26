import React from "react";
import { Grid, Button } from "@mui/material";
import CompareArrowsOutlinedIcon from "@mui/icons-material/CompareArrowsOutlined";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { Plan } from "modules/assortsmart/constants-assortsmart/stringContants";
import { getTotalFooterRow } from "./budget-level-two-functions";
import { cloneDeep, times } from "lodash";

const LevelTwoBudgetScaleUpDown = (props) => {
  const classes = useStyles();
  const scaleUpDown = () => {
    let filteredData = [];
    let monthObj = {};
    props.RTinstance.current.api.forEachNode((eachRow) => {
      if (eachRow.data.channel === "Total") {
        Object.keys(eachRow.data).map((key) => {
          let monthName = key.split("_budget_ty");
          if (props.monthArray.includes(monthName[0])) {
            monthObj[`${monthName[0]}_budget_ty_${eachRow.data.l2_name}`] =
              eachRow.data[`old_${monthName[0]}_budget_ty`];
            monthObj[
              `new_total_${monthName[0]}_budget_ty_${eachRow.data.l2_name}`
            ] = 0;
          }
        });
      }
      filteredData.push(eachRow.data);
    });

    // Add total value for the months
    filteredData.map((data) => {
      if (data.channel !== "ECOMM" && data.channel !== "Total") {
        Object.keys(monthObj).map((month) => {
          if (month.includes("new_total_") && month.includes(data.l2_name)) {
            let oldkey = month.split("new_total_");
            oldkey = oldkey[1].split(`_${data.l2_name}`);
            monthObj[month] =
              monthObj[`${month}`] + parseInt(data[oldkey[0]] || 0);
          }
        });
      }
    });

    filteredData.map((data) => {
      if (data.channel !== "ECOMM" && data.channel !== "Total") {
        Object.keys(monthObj).map((month) => {
          if (!month.includes("new_total_") && month.includes(data.l2_name)) {
            let key = month.split(`_${data.l2_name}`);
            data[key[0]] =
              data[key[0]] === 0 ||
              parseInt(monthObj[`new_total_${month}`]) === 0
                ? 0
                : data[key[0]] *
                  (parseInt(monthObj[month] || 0) /
                    parseInt(monthObj[`new_total_${month}`]));
          }
        });
        let whole_budget_ty = 0,
          total_budget_ty = 0,
          total_pen_ty = 0,
          total_unit_ty = 0;
        let budgetTotalType = props.screenConfiguration?.["2.1"]?.budget_total;
        let removeMonthArr = [];
        if (budgetTotalType === "first") {
          removeMonthArr = cloneDeep(props.monthArray);
          removeMonthArr.pop();
        } else {
          removeMonthArr = cloneDeep(props.monthArray);
          removeMonthArr.shift();
        }
        if (
          props.planDetails?.data?.data_pull_source === "plan" ||
          !budgetTotalType
        ) {
          removeMonthArr = cloneDeep(props.monthArray);
        }
        props.monthArray.forEach((month) => {
          whole_budget_ty += parseFloat(data[month + "_budget_ty"]);
          if (removeMonthArr.includes(month)) {
            total_budget_ty += parseFloat(data[month + "_budget_ty"]);
          }
        });
        props.monthArray.forEach((month) => {
          data[month + "_pen_ty"] =
            (data[month + "_budget_ty"] / whole_budget_ty) * 100;
          data[month + "_unit_ty"] =
            data[month + "_budget_ty"] / data[month + "_auc_ty"] || 0;
          if (removeMonthArr.includes(month)) {
            total_pen_ty += parseFloat(data[month + "_pen_ty"]);
            total_unit_ty += parseFloat(data[month + "_unit_ty"]);
          }
        });
        data.total_budget_ty = total_budget_ty;
        data.total_pen_ty = total_pen_ty / 100;
        data.total_unit_ty = total_unit_ty;
      }
    });
    props.setTableData(filteredData);
    props.RTinstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });
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

export default LevelTwoBudgetScaleUpDown;
