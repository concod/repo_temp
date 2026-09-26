import React, { useState, useEffect } from "react";

import { Typography, Card, Grid } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { isEmpty, uniqBy } from "lodash";
import { connect } from "react-redux";
import { withRouter } from "react-router";
import Charts from "core/Utils/charts";
import Form from "core/Utils/form";
import {
  attributeFormatter,
  isDropPlan,
} from "../../../utils-assortsmart/utilityFunctions";
import {
  DEPTH_CLUSTER_FORM,
  CHOICE_CLUSTER_FORM,
} from "../../../constants-assortsmart/stringContants";
import { useStyles as sharedStyles } from "core/Utils/styles/assortSmartUsestyles";
import globalStyles from "core/Styles/globalStyles";
import {
  buildMultiLineGraphForDepthAndChoice,
  setDepthChoiceFormOptions,
} from "./depth-choice-functions";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import { groupByCustom } from "core/Utils/formatter";

const useStyles = makeStyles(() => ({
  chartComponent: {
    display: "flex",
    flexWrap: "wrap",
    gap: "2rem",
  },
}));

const DepthChoiceGraphComponent = (props) => {
  const [depthGraphDataAvailability, setDepthGraphDataAvailability] = useState(
    false
  );
  const [
    choiceGraphDataAvailability,
    setChoiceGraphDataAvailability,
  ] = useState(false);
  const [depthFormData, setDepthFormData] = useState({});
  const [choiceFormData, setChoiceFormData] = useState({});

  const sharedClasses = sharedStyles();
  const classes = useStyles();
  const globalClasses = globalStyles();

  // useEffect(() => {
  //   DEPTH_CLUSTER_FORM?.[1]?.accessor = props.screenConfiguration?.common?.drop_key || "drop"
  // },[props.screenConfiguration])

  const configureFormData = (depthOrChoice) => {
    let CLUSTER_FORM =
      depthOrChoice === "depth" ? DEPTH_CLUSTER_FORM : CHOICE_CLUSTER_FORM;
    let formOptions = [],
      depthFormData = {};
    const tableData =
      depthOrChoice === "depth"
        ? props.depthChoiceGraphData.data.depth_data
        : props.depthChoiceGraphData.data.choice_data;
    // Getting level3 filter drop down options based on selected level1 and level2 filter
    const groupByProperties = ["l1_name", "l2_name", "l3_name"];
    const groupResult = groupByCustom({
      Group: tableData,
      By: groupByProperties,
    });
    groupResult.forEach((item) => {
      let filter = item.filter(
        (itm) =>
          (itm.l1_name === props.formData?.l1_name ||
            (!props.formData?.l1_name && itm.l1_name)) &&
          (itm.l2_name === props.formData?.l2_name ||
            (!props.formData?.l2_name && itm.l2_name))
      );
      if (filter?.length) {
        formOptions.push({
          label: filter[0]?.l3_name,
          value: filter[0]?.l3_name,
          id: filter[0]?.l3_name,
        });
      }
    });
    let uniqData = uniqBy(
      props.depthChoiceGraphData.data.depth_data,
      "carryover_flag"
    );
    uniqData = uniqData.filter((item) => item.carryover_flag !== "Total");
    let carryoverOptions = setDepthChoiceFormOptions(
      uniqData,
      "carryover_flag"
    );
    if (
      props.screenConfiguration["2.1"]?.budget_optimization_level?.includes(
        "carryover"
      ) &&
      !props.screenConfiguration["2.2"]?.graph_hide_carryover
    ) {
      CLUSTER_FORM[2].options = carryoverOptions;
      depthFormData["carryover_flag"] = carryoverOptions[0]?.value;
    } else {
      if (props.screenConfiguration["2.2"]?.graph_hide_carryover) {
        let options = carryoverOptions.filter(
          (opt) => opt.value !== "Carryover"
        );
        depthFormData["carryover_flag"] = options[0]?.value;
      }
      delete CLUSTER_FORM[2];
    }
    if (
      isDropPlan(
        props.planDetails?.data,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      )
    ) {
      let uniqueDropOptions = uniqBy(
        props.depthChoiceGraphData.data.depth_data,
        props.screenConfiguration?.common?.drop_key || "drop"
      );
      // get depth graph form options for drop field
      let dropFormOptions = setDepthChoiceFormOptions(
        uniqueDropOptions,
        props.screenConfiguration?.common?.drop_key || "drop"
      );
      CLUSTER_FORM[1].accessor =
        props.screenConfiguration?.common?.drop_key || "drop";
      CLUSTER_FORM[1].label = attributeFormatter(
        props.screenConfiguration?.common?.drop_key || "drop"
      );
      CLUSTER_FORM[1].options = dropFormOptions;
      depthFormData[props.screenConfiguration?.common?.drop_key || "drop"] =
        dropFormOptions[0].value;
    } else {
      // Removing drop filter incase of drops less than 1.
      delete CLUSTER_FORM[1];
    }
    CLUSTER_FORM[0].options = formOptions;
    CLUSTER_FORM[0].label = props.levelsJson["l3_name"];
    const accessor =
      depthOrChoice === "depth" ? "depth_cluster" : "choice_cluster";
    depthFormData[accessor] = formOptions?.[0]?.value;
    return depthFormData;
  };

  useEffect(() => {
    if (!isEmpty(props.depthChoiceGraphData)) {
      if (!isEmpty(props.depthChoiceGraphData.data.depth_data)) {
        setDepthFormData({});
        setChoiceFormData({});
        const formData = configureFormData("depth");
        if (!isEmpty(formData)) {
          setDepthFormData(formData);
        }
        setDepthGraphDataAvailability(true);
      }
      if (!isEmpty(props.depthChoiceGraphData.data.choice_data)) {
        const formData = configureFormData("choice");
        if (!isEmpty(formData)) {
          setChoiceFormData(formData);
        }
        setChoiceGraphDataAvailability(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.depthChoiceGraphData, props.formData]);

  const handleChangeDepthChoiceForm = (updatedFormData, id, name) => {
    if (name === "Depth") {
      setDepthFormData(updatedFormData);
      buildGraphData("depth");
    } else {
      setChoiceFormData(updatedFormData);
      buildGraphData("choice");
    }
  };

  useEffect(() => {
    if (depthGraphDataAvailability) {
      buildGraphData("depth");
    }
    if (choiceGraphDataAvailability) {
      buildGraphData("choice");
    }
  }, [depthFormData, choiceFormData, props.formData]);

  const buildGraphData = (name) => {
    const tableData =
      name === "depth"
        ? props.depthChoiceGraphData.data.depth_data
        : props.depthChoiceGraphData.data.choice_data;
    return buildMultiLineGraphForDepthAndChoice(
      depthFormData,
      choiceFormData,
      tableData,
      name,
      props
    );
  };

  return (
    <Card
      className={`${sharedClasses.graphCard} ${globalClasses.paper}`}
      id="depth-graph"
    >
      <Typography className={sharedClasses.heading} variant="h6" gutterBottom>
        {props.depthOrChoice === "Depth"
          ? "Depth"
          : props.screenConfiguration?.common.plan_step_names_assort?.[
              "2.2"
            ] === "Depth & Style"
          ? "Style"
          : "Choice"}{" "}
        graph
      </Typography>
      <Grid item xs={6}>
        <Form
          layout={"vertical"}
          maxFieldsInRow={2}
          handleChange={(updatedFormData, id) =>
            handleChangeDepthChoiceForm(
              updatedFormData,
              id,
              props.depthOrChoice
            )
          }
          fields={
            props.depthOrChoice === "Depth"
              ? DEPTH_CLUSTER_FORM
              : CHOICE_CLUSTER_FORM
          }
          updateDefaultValue={false}
          defaultValues={
            props.depthOrChoice === "Depth" ? depthFormData : choiceFormData
          }
          handleDropdownClose={true}
        ></Form>
      </Grid>
      {props.depthOrChoice === "Depth"
        ? depthGraphDataAvailability && (
            <Charts options={buildGraphData("depth")} />
          )
        : choiceGraphDataAvailability && (
            <Charts options={buildGraphData("choice")} />
          )}
    </Card>
  );
};

const mapStateToProps = (state) => {
  return {
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      state
    ),
  };
};

export default connect(
  mapStateToProps,
  {}
)(withRouter(DepthChoiceGraphComponent));
