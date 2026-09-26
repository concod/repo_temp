import React from "react";
import { Grid, Button } from "@mui/material";
import CompareArrowsOutlinedIcon from "@mui/icons-material/CompareArrowsOutlined";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { Plan } from "modules/assortsmart/constants-assortsmart/stringContants";
import { getTotalFooterRow } from "./budget-level-two-functions";

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
            monthObj[`${monthName[0]}_budget_ty`] =
              eachRow.data[`old_${monthName[0]}_budget_ty`];
            monthObj[`new_total_${monthName[0]}_budget_ty`] = 0;
          }
        });
      }
      filteredData.push(eachRow.data);
    });

    // Add total value for the months
    filteredData.map((data) => {
      if (data.channel !== "ECOMM" && data.channel !== "Total") {
        Object.keys(monthObj).map((month) => {
          if (month.includes("new_total_")) {
            let oldkey = month.split("new_total_");
            monthObj[month] = monthObj[`${month}`] + parseInt(data[oldkey[1]]);
          }
        });
      }
    });

    filteredData.map((data) => {
      if (data.channel !== "ECOMM" && data.channel !== "Total") {
        Object.keys(monthObj).map((month) => {
          if (!month.includes("new_total_")) {
            data[month] =
              data[month] *
              (parseInt(monthObj[month]) /
                parseInt(monthObj[`new_total_${month}`]));
          }
        });
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
