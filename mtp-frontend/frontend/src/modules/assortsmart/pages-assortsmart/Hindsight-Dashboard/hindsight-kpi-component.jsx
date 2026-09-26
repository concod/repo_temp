import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { useHistory } from "react-router";
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
import { generateFiltersPayload, getFiltersData } from "./hindsight-functions";

const KPIComponent = (props) => {
  const [cardData, setCardData] = useState(null);
  const [KPISetting, setKPISetting] = useState(null);
  const [loader, setLoader] = useState(false);
  const classes = useStyles();
  const globalClasses = globalStyles();
  const history = useHistory();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoader(true);
        let filterKey = ["l0_name", "l1_name", "l2_name", "l3_name", "channel"];
        let filters_applied = getFiltersAppliedData(
          props.hindsightFilterSelection
        );
        filters_applied["receipts_flag"] = props.hindsightFilterSelection?.buy?.[0] === "Style With Buy" ? true : false;
        const filters = generateFiltersPayload(
          props.hindsightFilterSelection,
          history,
          props
        );
        let payload = {
          filters: filters.filters,
          filters_applied: filters_applied,
        };
        Object.keys(props.hindsightFilterSelection).map((key) => {
          if (key === "range-picker") {
            payload["selling_period_sdate"] =
              props.hindsightFilterSelection?.[key]?.[0];
            payload["selling_period_edate"] =
              props.hindsightFilterSelection?.[key]?.[1];
          }
        });
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
    if (
      props.hindsightFilterSelection?.["l0_name"] &&
      !isEmpty(props.filterDashboardConfiguration?.[`assort${history.location.pathname}FilterConfiguration`]?.filterConfig?.[0]?.filterDashboardData)
    ) {
      props.setHindsightLoader(true);
      fetchData();
    }
  }, [props.hindsightFilterSelection, props.filterDashboardConfiguration?.[`assort${history.location.pathname}FilterConfiguration`]?.filterConfig?.[0]?.filterDashboardData]);

  useEffect(() => {
    let dataObject = props.screenConfiguration?.["hindsight"]?.KPI_setting;
    if (!isEmpty(dataObject)) {
      const arrayOfObjects = Object.entries(dataObject).map(([key, value]) => ({
        key,
        ...value,
      }));

      // Sorting the array based on the 'order_of_display' property of each object
      const sortedArray = arrayOfObjects.sort(
        (a, b) => a.order_of_display - b.order_of_display
      );

      // Converting the sorted array back to an object
      const sortedDataObject = Object.fromEntries(
        sortedArray.map(({ key, ...rest }) => [key, rest])
      );
      setKPISetting(sortedDataObject);
    }
  }, [props.screenConfiguration?.["hindsight"]?.KPI_setting]);

  return (
    <React.Fragment>
      <div className={classes.kpiHeader}>Key Performance Indicators</div>
      <LoadingOverlay loader={loader} spinner>
        <div className={`${globalClasses.flexRow} ${classes.kpiDivMargin}`}>
          {!isEmpty(cardData) && !isEmpty(KPISetting) ? (
            Object.keys(KPISetting).map((type, currIndex) => {
              return (
                <Card
                  className={`${classes.kpiCardContainer}
                  ${
                    Object.keys(KPISetting)?.length === currIndex + 1
                      ? classes.kpiBox
                      : ""
                  }
                `}
                  id="kpi"
                >
                  <Grid
                    container
                    direction="row"
                    justifyContent="space-between"
                    alignItems="stretch"
                    style={{ position: "relative" }}
                  >
                    <Grid
                      item
                      xs={12}
                      justifyContent={"flex-start"}
                      alignItems={"center"}
                    >
                      <div
                        className={classes.kpiHeading}
                        style={{ color: KPISetting[type].color }}
                      >
                        {type}
                      </div>
                    </Grid>
                    {KPISetting[type]?.data.map((data, index) => {
                      let count = parseInt(12 / KPISetting[type]?.data.length);
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
                            KPISetting[type]?.data.length === index + 1
                              ? ""
                              : classes.kpiBorder
                          }`}
                        >
                          <div className={classes.kpiLabel}>{data.label}</div>
                          <div className={classes.kpiSubValue}>
                            {data.type === "dollar"
                              ? "$" + formattedData
                              : formattedData || 0}
                          </div>
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
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration,
    levelsJson: state.assortsmartReducer.planDashboardReducer.levelsJson,
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
