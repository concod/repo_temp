import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import Divider from "@mui/material/Divider";
import { Grid, Tooltip } from "@mui/material";
import withStyles from "@mui/styles/withStyles";
import { useHistory } from "react-router";
import { formattedDate } from "core/Utils/formatter";
import {
  getDateFormat,
  updateLyColumnHeading,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { getPlanDetails } from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import "./plan.scss";

const LightTooltip = withStyles((theme) => ({
  tooltip: {
    backgroundColor: theme.palette.common.white,
    color: "rgba(0, 0, 0, 0.87)",
    boxShadow: theme.shadows[1],
    fontSize: 14,
    padding: "10px",
    cursor: "pointer",
  },
}))(Tooltip);

const PlanDataComponent = (props) => {
  const [details, setDetails] = useState([]);
  const history = useHistory();

  const location = history.location.pathname;

  const getLevelRender = (planData) => {
    return props.planLevels?.data?.level_info.map((level) => {
      return {
        label: props.levelsJson[level.column_name],
        value: replaceSpecialCharacter(
          planData[level.column_name].join(",") || ""
        ),
      };
    });
  };
  const updatePlanFilterDetails = async () => {
    let data = [],
      bop_tag_plan_code = null,
      planData = props.planDetails?.data,
      clusterData = props.clusterPlanDetails?.data;
    if (planData?.bop_tag_plan_code || props.currentBopPlan) {
      bop_tag_plan_code = await getBopTagPlanCode(
        props.currentBopPlan || planData.bop_tag_plan_code
      );
    }
    if (planData) {
      data.push(
        {
          label: "Plan Name",
          value: planData.name,
        },
        ...getLevelRender(planData),
        {
          label: "Season",
          value:
            // planData.selling_period?.length > 1 ? "-" :
             planData.season || "",
        },
        {
          label: "Year",
          value: planData.year?.length ? planData.year : "",
        },
        {
          label:
            history.location.pathname.includes("cluster-smart") ||
            history.location.pathname.includes("cluster-dashboard")
              ? "Reference Period"
              : "Selling Period",
          value: planData.selling_period?.length
            ? formattedDate(
                planData.selling_period?.[0].start_date,
                getDateFormat()
              ) +
              " - " +
              formattedDate(
                planData.selling_period?.[0]?.end_date,
                getDateFormat()
              )
            : formattedDate(planData?.selling_period_sdate, getDateFormat()) +
              " - " +
              formattedDate(planData?.selling_period_edate, getDateFormat()),
          sellingPeriod: planData.selling_period,
        },
        {
          label: "Created On",
          value: formattedDate(planData.created_at, getDateFormat()),
        }
      );
      if (!location.includes("omni")) {
        let channel = "";
        let subChannel = "";
        if (planData.channel?.length) {
          planData.channel.forEach((value, index) => {
            channel = `${channel}${
              index < planData.channel.length && index !== 0 ? ", " : " "
            }${value}`;
          });
        }
        if (planData.sub_channel?.length) {
          planData.sub_channel.forEach((value, index) => {
            subChannel = `${subChannel}${
              index < planData.sub_channel.length && index !== 0 ? ", " : " "
            }${value}`;
          });
        }
        if (
          !location.includes("cluster-smart") &&
          !location?.includes("cluster-dashboard")
        ) {
          if (planData?.compare_season) {
            data.push({
              label: "Compare Season",
              value: planData.compare_season,
            });
          } else {
            data.push({
              label: "Compare Year",
              value: updateLyColumnHeading(planData.compare_year),
            });
          }
          data.push(
            {
              label: "Channel",
              value: channel,
            },
            {
              label: "BOP tagged Plan",
              //Check if bop plan code is not null & not undefined
              value:
                bop_tag_plan_code && bop_tag_plan_code !== null
                  ? bop_tag_plan_code
                  : "-",
            }
          );
          if (planData?.cluster_plan_name || clusterData?.name) {
            data.push({
              label: "Cluster Plan Name",
              value: planData?.cluster_plan_name || clusterData?.name || "-",
            });
          }
        } else {
          data.push({
            label: "Channel",
            value: channel,
          });
        }
        if (subChannel) {
          data.push({
            label: "Sub Channel",
            value: subChannel,
          });
        }
      }
      setDetails(data);
    }
  };
  const getBopTagPlanCode = async (code) => {
    let response = await props.getPlanDetails(
      parseInt(code),
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    if (response?.data?.data?.name) {
      return response.data.data.name;
    }
  };

  useEffect(() => {
    if (props.planDetails?.data && props.planLevels?.data) {
      updatePlanFilterDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.planDetails,
    props.planLevels,
    props.clusterPlanDetails,
    props.currentBopPlan,
  ]);
  const classes = useStyles();
  return (
    <>
      <Grid
        className={!location.includes("omni") ? classes.cardGrid : ""}
        container
        direction="row"
        alignItems="flex-start"
        justifyContent={"space-evenly"}
      >
        {details.map((item, detailIndex) => {
          let itemArraySplit;
          if (item?.sellingPeriod?.length) {
            let reference_period = "";
            item?.sellingPeriod.forEach((period, index) => {
              reference_period =
                reference_period +
                `${period["start_date"]} to
            ${period["end_date"]}${
                  index + 1 !== item?.sellingPeriod?.length
                    ? ` (${period["weightage"]}%),`
                    : ` (${period["weightage"]}%)`
                }`;
            });
            itemArraySplit =
              reference_period &&
              reference_period
                .toString()
                .split(",")
                .map((e) => <li>{e}</li>);
          } else {
            itemArraySplit =
              item.value &&
              item.value
                .toString()
                .split(",")
                .map((e) => <li>{e}</li>);
          }
          return (
            item.value && (
              <>
                <Grid item>
                  <label className="bold-label">{item.label}</label>
                  <LightTooltip
                    placement="top"
                    title={<React.Fragment>{itemArraySplit}</React.Fragment>}
                  >
                    <p
                      className={
                        item.label === "Selling Period"
                          ? "selling-period-text"
                          : "truncate-text"
                      }
                    >
                      {item.value}
                    </p>
                  </LightTooltip>
                </Grid>
                {details.length - 1 !== detailIndex && (
                  <Divider orientation="vertical" flexItem />
                )}
              </>
            )
          );
        })}
      </Grid>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    planDetails: store.assortsmartReducer.planDashboardReducer.planDetails,
    planLevels: store.assortsmartReducer.planDashboardReducer.planLevels,
    levelsJson: store.assortsmartReducer.planDashboardReducer.levelsJson,
    clusterPlanDetails:
      store.clustersmartReducer.ClusteringReducer.clusterPlanDetails,
    screenConfiguration:
      store.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getPlanDetails: (payload, endpoint, objID) =>
    dispatch(getPlanDetails(payload, endpoint, objID)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(PlanDataComponent));
