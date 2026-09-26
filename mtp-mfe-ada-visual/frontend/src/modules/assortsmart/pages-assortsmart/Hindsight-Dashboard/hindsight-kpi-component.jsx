import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { Typography, Card, Grid } from "@mui/material";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import LoadingOverlay from "core/Utils/Loader/loader";
import {
  getHindsightKPIView,
  setHindsightLoader,
} from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import { getFiltersAppliedData } from "core/Utils/functions/utils";
import classNames from "classnames";
import { isEmpty } from "lodash";

const KPIComponent = (props) => {
  const [cardData, setCardData] = useState(null);
  const [loader, setLoader] = useState(false);
  const classes = useStyles();
  const globalClasses = globalStyles();
  let KPI_setting = props.screenConfiguration?.["hindsight"]?.KPI_setting;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoader(true);
        let filterKey = ["l0_name", "l1_name", "l2_name", "l3_name", "channel"];
        let filters_applied = getFiltersAppliedData(props.hindsightFilterSelection);
        let payload = {
          filters: [],
          filters_applied: props.hindsightPlanDetails?.tree_graph_filter
            ?.filters_applied
            ? props.hindsightPlanDetails?.tree_graph_filter?.filters_applied
            : filters_applied,
        };
        Object.keys(props.hindsightFilterSelection).map((key) => {
          if (filterKey.includes(key)) {
            payload.filters.push({
              attribute_name: key,
              value: props.hindsightFilterSelection[key],
              operator: "in",
            });
          }
          if (key === "range-picker") {
            payload["selling_period_sdate"] =
              props.hindsightFilterSelection?.[key]?.[0];
            payload["selling_period_edate"] =
              props.hindsightFilterSelection?.[key]?.[1];
          }
        });
        if(payload?.filters_applied?.clearance){
          payload.filters_applied["clearance_flag"] = payload?.filters_applied?.clearance;
          delete  payload.filters_applied.clearance
        }
        let response = await props.getHindsightKPIView(
          payload,
          // props.screenConfiguration?.common?.endpoint_project_name || "assort"
          "assort-smart"
        );
        if (response?.data?.status) {
          setCardData(response?.data?.data?.[0]);
        }
        setLoader(false);
      } catch (error) {
        setLoader(false);
        props.addSnack({
          message: "Fetching KPI details failed",
          options: {
            variant: "error",
          },
        });
      }
    };
    if (props.hindsightFilterSelection?.["l0_name"]) {
      props.setHindsightLoader(true);
      fetchData();
    }
  }, [props.hindsightFilterSelection, props.hindsightPlanDetails]);

  return (
    <React.Fragment>
      <Typography variant="h5">Key Performance Indicators</Typography>
      <LoadingOverlay loader={loader} spinner>
        <div className={`${globalClasses.flexRow} ${classes.kpiDivMargin}`}>
          {!isEmpty(cardData) && !isEmpty(KPI_setting) ? (
            Object.keys(KPI_setting).map((type) => {
              return (
                <Card className={classes.kpiCardContainer} id="kpi">
                  <Grid
                    container
                    direction="row"
                    justifyContent="space-between"
                    alignItems="stretch"
                    style={{ position: "relative" }}
                    className={globalClasses.marginBottom}
                  >
                    <Grid
                      item
                      xs={12}
                      justifyContent={"flex-start"}
                      alignItems={"center"}
                    >
                      <Typography
                        color={KPI_setting[type].color}
                        className={classes.kpiHeading}
                      >
                        {type}
                      </Typography>
                    </Grid>
                    {KPI_setting[type]?.data.map((data, index) => {
                      let count = parseInt(12 / KPI_setting[type]?.data.length);
                      let formattedData = Intl.NumberFormat("en-US", {
                        notation: "compact",
                        compactDisplay: "short",
                      }).format(cardData[data.key]);
                      return (
                        <Grid
                          item
                          xs={count}
                          justifyContent={"center"}
                          alignItems={"center"}
                          className={`${classes.kpiGridItem} ${
                            KPI_setting[type]?.data.length === index + 1
                              ? ""
                              : classes.kpiBorder
                          }`}
                        >
                          <Typography className={classes.kpiLabel}>
                            {data.label}
                          </Typography>
                          <Typography
                            variant="body"
                            className={classes.kpiSubValue}
                          >
                            {data.type === "dollar"
                              ? "$" + formattedData
                              : formattedData || 0}
                          </Typography>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Card>
              );
            })
          ) : (
            <Card
              className={classNames(
                classes.kpiCardContainer,
                classes.kpiSubValue,
                classes.heading
              )}
            >
              <p>No Data Found!</p>
            </Card>
          )}
        </div>
      </LoadingOverlay>
    </React.Fragment>
  );
};

const mapStateToProps = (state) => {
  return {
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      getHindsightKPIView,
      setHindsightLoader,
      addSnack,
    },
    dispatch
  );
};

export default connect(mapStateToProps, mapDispatchToProps)(KPIComponent);
