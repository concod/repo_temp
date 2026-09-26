import React, { useState, useEffect } from "react";
import { Typography, Card } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { isEmpty, uniqBy } from "lodash";
import Charts from "core/Utils/charts";
import Form from "core/Utils/form";
import { isDropPlan } from "../../../utils-assortsmart/utilityFunctions";
import { useStyles as sharedStyles } from "core/Utils/styles/assortSmartUsestyles";
import globalStyles from "core/Styles/globalStyles";
import {
  BUDGET_ATTRIBUTE_SPLIT_FORM,
  BUDGET_CLUSTER_SPLIT_FORM,
} from "../../../constants-assortsmart/stringContants";
import {
  buildAttributeSplitGraphData,
  buildClusterSplitGraphData,
  generateDropDownValues,
} from "./budget-cluster-functions";

const useStyles = makeStyles(() => ({
  chartComponent: {
    display: "flex",
    flexWrap: "wrap",
  },
}));

const BudgetClusterChartComponent = (props) => {
  const [
    budgetSplitAttributeFormData,
    setBudgetSplitAttributeFormData,
  ] = useState({});
  const [budgetSplitClusterFormData, setBudgetSplitClusterFormData] = useState(
    {}
  );
  const [
    clusterGraphDataAvailability,
    setClusterGraphDataAvailability,
  ] = useState(false);

  const [level3AllData, setLevel3AllData] = useState([]);

  const classes = useStyles();
  const sharedClasses = sharedStyles();
  const globalClasses = globalStyles();

  useEffect(() => {
    if (!isEmpty(props.budgetSplitGraphDetails)) {
      let uniqueClusterCodes = uniqBy(
        props.budgetSplitGraphDetails?.data,
        "cluster_code"
      );
      let uniqueAttributeName = uniqBy(
        props.budgetSplitGraphDetails?.data,
        "attribute_name"
      );
      let uniqueL3Name = uniqBy(props.budgetSplitGraphDetails?.data, "l3_name");
      let clusterCodeDropDownValues = generateDropDownValues(
        uniqueClusterCodes,
        "cluster"
      );
      clusterCodeDropDownValues.unshift({
        value: "All",
        label: "All ",
        id: "All",
      });
      let attributeNameDropDownValues = generateDropDownValues(
        uniqueAttributeName,
        "attribute"
      );
      let l3DropDownValues = generateDropDownValues(uniqueL3Name, "l3");
      l3DropDownValues.unshift({
        value: "All",
        label: "All",
        id: "All",
      });
      if (
        isDropPlan(
          props.planDetails?.data,
          `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
        ) &&
        !props.optimizationLevels.includes("carryover")
      ) {
        let uniqueDropName = uniqBy(
          props.budgetSplitGraphDetails?.data,
          props.screenConfiguration?.common?.drop_key || "drop"
        );
        let dropsDropDownValue = generateDropDownValues(
          uniqueDropName,
          props.screenConfiguration?.common?.drop_key || "drop"
        );
        BUDGET_ATTRIBUTE_SPLIT_FORM[3].options = dropsDropDownValue;
        BUDGET_CLUSTER_SPLIT_FORM[1].options = dropsDropDownValue;
        budgetSplitClusterFormData[
          props.screenConfiguration?.common?.drop_key || "drop"
        ] = dropsDropDownValue[0]?.value;
        budgetSplitAttributeFormData[
          props.screenConfiguration?.common?.drop_key || "drop"
        ] = dropsDropDownValue[0]?.value;
      } else {
        delete BUDGET_ATTRIBUTE_SPLIT_FORM[3];
        delete BUDGET_CLUSTER_SPLIT_FORM[1];
      }
      if (
        props.screenConfiguration["2.1"]?.budget_optimization_level?.includes(
          "carryover"
        )
      ) {
        //Add Carryover tag dropdown, if data is present for New & Carryover levels
        let carryoverData = uniqBy(
          props.budgetSplitGraphDetails?.data,
          "carryover_flag"
        );
        carryoverData = carryoverData.filter(
          (item) => item.carryover_flag !== "Total"
        );
        let carryoverDropdownValues = generateDropDownValues(
          carryoverData,
          "carryover_flag"
        );
        BUDGET_ATTRIBUTE_SPLIT_FORM[4].options = carryoverDropdownValues;
        BUDGET_CLUSTER_SPLIT_FORM[2].options = carryoverDropdownValues;
        budgetSplitAttributeFormData["carryover_flag"] =
          carryoverDropdownValues[0]?.value;
        budgetSplitClusterFormData["carryover_flag"] =
          carryoverDropdownValues[0]?.value;
      } else {
        //delete Carryover tag drodown from budget cluster graph form
        delete BUDGET_ATTRIBUTE_SPLIT_FORM[4];
        delete BUDGET_CLUSTER_SPLIT_FORM[2];
      }
      //   set options for attribute chart
      BUDGET_ATTRIBUTE_SPLIT_FORM[0].options = l3DropDownValues;
      BUDGET_ATTRIBUTE_SPLIT_FORM[0].label = props.levelsJson.l3_name;
      BUDGET_ATTRIBUTE_SPLIT_FORM[1].options = clusterCodeDropDownValues;
      BUDGET_ATTRIBUTE_SPLIT_FORM[2].options = attributeNameDropDownValues;
      //   set options for cluster chart
      BUDGET_CLUSTER_SPLIT_FORM[0].options = l3DropDownValues;
      BUDGET_CLUSTER_SPLIT_FORM[0].label = props.levelsJson.l3_name;
      budgetSplitAttributeFormData["cluster_code"] =
        clusterCodeDropDownValues[0]?.value;
      budgetSplitAttributeFormData["attribute_name"] =
        attributeNameDropDownValues[0]?.value;
      budgetSplitAttributeFormData["l3_name"] = l3DropDownValues[0]?.value;
      budgetSplitClusterFormData["l3_name"] = l3DropDownValues[0]?.value;
      setBudgetSplitAttributeFormData(budgetSplitAttributeFormData);
      setBudgetSplitClusterFormData(budgetSplitClusterFormData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.budgetSplitGraphDetails]);

  useEffect(() => {
    if (!isEmpty(props.budgetSplitGraphData)) {
      setClusterGraphDataAvailability(true);
    }
  }, [props.budgetSplitGraphData]);

  useEffect(() => {
    const res = props.level3AllData.map((data) => {
      // Filter from table columns which contains total footer value only for clusters
      return data.sub_headers.filter((data1) => {
        return (
          data1.column_name !== "penetration_ty" &&
          data1.column_name !== "total_ty" &&
          data1.column_name.includes("ty")
        );
      });
    });
    setLevel3AllData(res.flat());
  }, [props.level3AllData]);

  useEffect(() => {
    if (!isEmpty(budgetSplitClusterFormData) && level3AllData?.length) {
      buildClusterSplitGraphData(
        props,
        budgetSplitClusterFormData,
        level3AllData
      );
    }
  }, [budgetSplitClusterFormData, level3AllData]);

  useEffect(() => {
    if (!isEmpty(budgetSplitAttributeFormData)) {
      buildAttributeSplitGraphData(props, budgetSplitAttributeFormData);
    }
  }, [budgetSplitAttributeFormData]);

  const handleChangeSplitByAttributeForm = (updatedFormData, _id, name) => {
    if (name === "cluster") {
      setBudgetSplitClusterFormData(updatedFormData);
    } else {
      setBudgetSplitAttributeFormData(updatedFormData);
    }
  };
  return (
    <div className={classes.chartComponent}>
      <Card className={`${sharedClasses.graphCard} ${globalClasses.paper}`}>
        <Typography className={sharedClasses.heading} variant="h6" gutterBottom>
          Budget Split By Cluster
        </Typography>
        <Form
          layout={"vertical"}
          maxFieldsInRow={3}
          handleChange={(updatedFormData, id) =>
            handleChangeSplitByAttributeForm(updatedFormData, id, "cluster")
          }
          fields={BUDGET_CLUSTER_SPLIT_FORM}
          updateDefaultValue={false}
          defaultValues={budgetSplitClusterFormData}
          handleDropdownClose={true}
        ></Form>
        {clusterGraphDataAvailability && (
          <Charts
            options={buildClusterSplitGraphData(
              props,
              budgetSplitClusterFormData,
              level3AllData
            )}
          />
        )}
      </Card>

      <Card className={`${sharedClasses.graphCard} ${globalClasses.paper}`}>
        <Typography className={sharedClasses.heading} variant="h6" gutterBottom>
          Budget Split By Attribute
        </Typography>
        <Form
          layout={"vertical"}
          maxFieldsInRow={3}
          handleChange={(updatedFormData, id) =>
            handleChangeSplitByAttributeForm(updatedFormData, id, "attribute")
          }
          fields={BUDGET_ATTRIBUTE_SPLIT_FORM}
          updateDefaultValue={false}
          defaultValues={budgetSplitAttributeFormData}
          handleDropdownClose={true}
        ></Form>
        {clusterGraphDataAvailability && (
          <Charts
            options={buildAttributeSplitGraphData(
              props,
              budgetSplitAttributeFormData
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default BudgetClusterChartComponent;
