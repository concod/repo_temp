import React, { useState, useEffect } from "react";
import Charts from "core/Utils/charts";
import Form from "core/Utils/form";
import { Grid } from "@mui/material";
import {
  attributeFormatter,
  isDropPlan,
  isWholesalePlan,
} from "../../../utils-assortsmart/utilityFunctions";
import { SUBCAT_LEVEL_PLAN_FORM } from "../../../constants-assortsmart/stringContants";
import { isEmpty, uniqBy } from "lodash";
import {
  buildLevelThreeGraphData,
  generateLabelWithCompYear,
} from "./budget-level-three-functions";

const BudgetLevelThreeChartComponent = (props) => {
  const [budgetLevelThreeFormData, setBudgetLevelThreeFormData] = useState({});
  const [graphDataAvailability, setGraphDataAvailability] = useState(false);

  useEffect(() => {
    if (!isEmpty(props.chartMetrics)) {
      let filteredAxis = [];
      props.chartMetrics.forEach((item) => {
        if (!isEmpty(item.sub_headers)) {
          item.sub_headers.forEach((obj) => {
            if (
              obj.column_name.includes("_ly") ||
              obj.column_name.includes("_ty")
            ) {
              filteredAxis.push(obj.column_name);
            }
          });
        }
      });
      let axisOptions = filteredAxis.map((items) => {
        return {
          value: items,
          label: generateLabelWithCompYear(props, items),
          id: items,
        };
      });
      SUBCAT_LEVEL_PLAN_FORM[0].options = axisOptions;
      budgetLevelThreeFormData.l3_optimization_constraint =
        axisOptions[0].value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.chartMetrics]);

  useEffect(() => {
    if (!isEmpty(props.budgetL3ChartData)) {
      setGraphDataAvailability(true);
      let graphData = budgetLevelThreeFormData;
      //Add carryover flag dropdown for new & carryover merchpyramids
      if (
        props.screenConfiguration["2.1"]?.budget_optimization_level?.includes(
          "carryover"
        )
      ) {
        let carryOverData = uniqBy(props.budgetL3ChartData, "carryover_flag");
        carryOverData = carryOverData.filter(
          (item) => item.carryover_flag !== "Total"
        );
        let carryOverOptions = carryOverData?.map((data) => {
          return {
            value: data["carryover_flag"],
            label: data["carryover_flag"],
            id: data["carryover_flag"],
          };
        });
        SUBCAT_LEVEL_PLAN_FORM[3].options = carryOverOptions;
        budgetLevelThreeFormData.carryover_flag = carryOverOptions[0].value;
        graphData = {
          ...graphData,
          carryover_flag: carryOverOptions[0].value,
        };
      } else {
        delete SUBCAT_LEVEL_PLAN_FORM[3];
      }
      if (
        isDropPlan(
          props.planDetails,
          `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
        ) &&
        !props.optimizationLevels.includes("carryover")
      ) {
        let uniqueDropName = uniqBy(
          props.budgetL3ChartData,
          props.screenConfiguration?.common?.drop_key || "drop"
        );
        let dropsDropDownValue = uniqueDropName.map((data) => {
          return {
            value: data[props.screenConfiguration?.common?.drop_key || "drop"],
            label:
              attributeFormatter(
                data[props.screenConfiguration?.common?.drop_key || "drop"]
              ) || "-",
            id: data[props.screenConfiguration?.common?.drop_key || "drop"],
          };
        });
        SUBCAT_LEVEL_PLAN_FORM[2].options = dropsDropDownValue;
        graphData = {
          ...graphData,
          [props.screenConfiguration?.common?.drop_key ||
          "drop"]: dropsDropDownValue[0].value,
        };
      } else {
        // Removing drop filter incase of drops less than 1.
        delete SUBCAT_LEVEL_PLAN_FORM[2];
      }
      if (isWholesalePlan(props.planDetails)) {
        // Find unique subchanel name
        let uniqueSubChannelName = uniqBy(
          props.budgetL3ChartData,
          "sub_channel"
        );
        let subChannelDropDownValue = uniqueSubChannelName.map((data) => {
          return {
            value: data["sub_channel"],
            label: data["sub_channel"],
            id: data["sub_channel"],
          };
        });
        // set dropdown values to SUBCAT_LEVEL_PLAN_FORM option
        SUBCAT_LEVEL_PLAN_FORM[1].options = subChannelDropDownValue;
        graphData = {
          ...graphData,
          sub_channel: subChannelDropDownValue[0].value,
        };
      } else {
        // Removing sub_channel filter incase of subchannel not equl to wholesale.
        delete SUBCAT_LEVEL_PLAN_FORM[1];
      }
      setBudgetLevelThreeFormData({
        ...graphData,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.budgetL3ChartData]);

  const handleChangeL3FormData = (updatedFormData) => {
    setBudgetLevelThreeFormData(updatedFormData);
    buildLevelThreeGraphData(
      props,
      budgetLevelThreeFormData,
      props.formData,
      props.currentTableLevel
    );
  };

  return (
    <>
      <Grid item xs={6}>
        <Form
          layout={"vertical"}
          maxFieldsInRow={3}
          handleChange={handleChangeL3FormData}
          fields={SUBCAT_LEVEL_PLAN_FORM}
          updateDefaultValue={false}
          defaultValues={budgetLevelThreeFormData}
          handleDropdownClose={true}
        ></Form>
      </Grid>
      {graphDataAvailability && (
        <Charts
          options={buildLevelThreeGraphData(
            props,
            budgetLevelThreeFormData,
            props.formData,
            props.currentTableLevel
          )}
        />
      )}
    </>
  );
};

export default BudgetLevelThreeChartComponent;
