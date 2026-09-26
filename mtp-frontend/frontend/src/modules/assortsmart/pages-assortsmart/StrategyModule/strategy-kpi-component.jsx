import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { withRouter } from "react-router-dom";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { Card, Grid, Typography } from "@mui/material";
import ReactSimplyCarousel from "react-simply-carousel";
import { getStrategyKPIView } from "modules/assortsmart/services-assortsmart/Strategy-Module/strategy-module-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";

let StrategyKPISettings = {
  Sales: {
    order_of_display: 1,
    key: "sales",
    data: [
      { label: "AS Bottoms Up", key: "sales_as" },
      { label: "PS Tops Down", key: "sales_ps" },
      { label: "LY", key: "sales_ly" },
    ],
  },
  "Sales Units": {
    order_of_display: 2,
    key: "sales_units",
    data: [
      { label: "AS Bottoms Up", key: "sales_units_as" },
      { label: "PS Tops Down", key: "sales_units_ps" },
      { label: "LY", key: "sales_units_ly" },
    ],
  },
  "GM $": {
    order_of_display: 3,
    key: "gross_margin",
    data: [
      { label: "AS Bottoms Up", key: "gross_margin_as" },
      { label: "PS Tops Down", key: "gross_margin_ps" },
      { label: "LY", key: "gross_margin_ly" },
    ],
  },
  "Receipt $": {
    order_of_display: 4,
    key: "receipts_price",
    data: [
      { label: "AS Bottoms Up", key: "receipts_price_as" },
      { label: "PS Tops Down", key: "receipts_price_ps" },
      { label: "LY", key: "receipts_price_ly" },
    ],
  },
  "AUR $": {
    order_of_display: 5,
    key: "aur",
    data: [
      { label: "AS Bottoms Up", key: "aur_as" },
      { label: "PS Tops Down", key: "aur_ps" },
      { label: "LY", key: "aur_ly" },
    ],
  },
  "AUC $": {
    order_of_display: 6,
    key: "auc",
    data: [
      { label: "AS Bottoms Up", key: "auc_as" },
      { label: "PS Tops Down", key: "auc_ps" },
      { label: "LY", key: "auc_ly" },
    ],
  },
  "Choice Count": {
    order_of_display: 7,
    key: "choice_count",
    data: [
      { label: "AS Bottoms Up", key: "choice_count_as" },
      { label: "PS Tops Down", key: "choice_count_ps" },
      { label: "LY", key: "choice_count_ly" },
    ],
  },
  "Productivity $": {
    order_of_display: 8,
    key: "sales_productivity",
    data: [
      { label: "AS Bottoms Up", key: "sales_productivity_as" },
      { label: "PS Tops Down", key: "sales_productivity_ps" },
      { label: "LY", key: "sales_productivity_ly" },
    ],
  },
};

const StrategyKPIComponent = (props) => {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [cardData, setCardData] = useState({})
  const classes = useStyles();

  useEffect(() => {
    const fetchData = async () => {
      let planData = props.planDetails?.data;
      let payload = {
        filters: [
          {
            attribute_name: "plan_code",
            value: [planData.plan_code],
            operator: "in",
          },
          {
            attribute_name: "l0_name",
            value: planData.l0_name,
            prefix: "levels",
            operator: "in",
          },
        ],
      };
      let response = await props.getStrategyKPIView(payload, "assort-smart");
      if(response?.data?.status){
        setCardData(response.data.data?.[0]);
        props.setCallKPI(false);
      }
    };
    if(props.planDetails?.data?.plan_code && props.callKpi){
      fetchData();
    }
  }, [props.planDetails, props.callKpi]);

  return (
    <React.Fragment>
      <Grid marginTop={2} container spacing={2}>
        {props.expanded ? (
          Object.keys(StrategyKPISettings).map((setting) => {
            return (
              <KPICard
                classes={classes}
                StrategyKPISettings={StrategyKPISettings}
                cardData={cardData}
                setting={setting}
              />
            );
          })
        ) : (
          <ReactSimplyCarousel
            activeSlideIndex={activeSlideIndex}
            onRequestChange={setActiveSlideIndex}
            itemsToShow={6}
            itemsToScroll={1}
            forwardBtnProps={{
              //here you can also pass className, or any other button element attributes
              style: {
                alignSelf: "center",
                border: "none",
                borderRadius: "50%",
                color: "#D4D4D4",
                cursor: "pointer",
                fontSize: "20px",
                height: 30,
                lineHeight: 1,
                textAlign: "center",
                width: 30,
              },
              children: <span>{`>`}</span>,
            }}
            backwardBtnProps={{
              //here you can also pass className, or any other button element attributes
              style: {
                alignSelf: "center",
                border: "none",
                borderRadius: "50%",
                color: "#D4D4D4",
                cursor: "pointer",
                fontSize: "20px",
                height: 30,
                lineHeight: 1,
                textAlign: "center",
                width: 30,
              },
              children: <span>{`<`}</span>,
            }}
            speed={400}
          >
            {Object.keys(StrategyKPISettings).map((setting) => {
              return (
                <KPICard
                  classes={classes}
                  StrategyKPISettings={StrategyKPISettings}
                  cardData={cardData}
                  setting={setting}
                />
              );
            })}
          </ReactSimplyCarousel>
        )}
      </Grid>
      <div>
    </div>
    </React.Fragment>
  );
};

const KPICard = (props) => {
  let { classes, StrategyKPISettings, cardData, setting } = props;
  return (
    <Grid className={classes.strategyGrid} item>
      <Card className={classes.strategyCard}>
        <Typography
          fontWeight={500}
          fontSize={"16px"}
          lineHeight={"24px"}
          marginBottom={"5px"}
        >
          {setting}
        </Typography>
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          padding={"2px 0px"}
        >
          <div className={` ${classes.strategyKPILabel}`}>Label</div>
          <div className={classes.strategyKPILabel} style={{ width: "8%" }}>
            Value
          </div>
          <div className={classes.strategyKPILabel}>% Diff</div>
        </Grid>
        {StrategyKPISettings[setting]?.["data"].map((obj) => {
          let formattedData = Intl.NumberFormat("en-US", {
            notation: "compact",
            compactDisplay: "short",
          }).format(cardData[obj.key]);
          let diff_perc =
            ((cardData[StrategyKPISettings[setting]?.key + "_as"] -
              cardData[obj.key]) *
              100) /
            cardData[StrategyKPISettings[setting]?.key + "_as"];
          return (
            <Grid container direction="row" justifyContent="space-between">
              <div className={classes.strategyKPILabelValue}>{obj.label}</div>
              <div
                className={`${classes.strategyKPIValue}`}
                style={{ color: "#1D1D1D" }}
              >
                {formattedData}
              </div>
              <div
                className={`${classes.strategyKPIValue}`}
                style={{
                  color: diff_perc <= 0 ? "#DA1E28" : "#24A148",
                }}
              >
                {obj.key.includes("_ps") || obj.key.includes("_ly")
                  ? diff_perc + "%"
                  : "-"}
              </div>
            </Grid>
          );
        })}
      </Card>
    </Grid>
  );
};

const mapStateToProps = (state) => {
  return {
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      state
    ),
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      getStrategyKPIView,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(StrategyKPIComponent));
