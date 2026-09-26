import React, { useEffect, useState } from "react";
import { getCurrencySymbol } from "core/commonComponents/coreComponentScreen/utils";
import { Typography } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import Charts from "core/Utils/charts";
import { isEmpty, isNull } from "lodash";
import { Switch } from "impact-ui-v3";
import { connect } from "react-redux";
import { displayFormattedDate, getKPIIconComponent } from "../../../utils-inventorysmart/utilityFunctions";
import LostUnits from "assets/Lost_Unit.png";
import LostRevenue from "assets/Lost_Cost.png";
import makeStyles from "@mui/styles/makeStyles";
import { LOST_SALES_MODULE } from "../CustomHooks/moduleConstants";

const LostSalesOpportunityComponent = (props) => {
  const [lostSalesBarGraph, setLostSalesBarGraph] = useState({});
  const [toRenderGraph, setToRenderGraph] = useState(false);
  const [lostSalesSwitch, setLostSalesSwitch] = useState(true);
  const globalClasses = globalStyles();

  const render3DIcons = props?.moduleConfig?.[LOST_SALES_MODULE]?.render3DIcons ?? false;
  const hideDollarSymbol = props?.moduleConfig?.[LOST_SALES_MODULE]?.hideDollarSymbol ?? false;
  const useStyles = makeStyles((theme) => ({
    containerCards: {
      border: '1px solid #ebebf0',
      borderRadius: '12px',
      backgroundColor: '#fff',
      padding: '15px'
    },
    metricCardsContainer: {
      display: 'flex', gap: 15, fontFamily:"Manrope"
    },
    metricCardContainerWrapper:{
      flexBasis: '165px', flexShrink: 0 
    },
    metricColumnLayout:{
      display: 'flex', flexDirection: 'column', height: '100%', gap: 15 
    },
    metricCard:{
      flexBasis: '50%', 
      padding: '10px', 
      border: '1px solid #ebebf0',
      borderRadius: '12px',
      backgroundColor: '#fff'
    },
    graphContainer:{
      flexGrow: 1, border: '1px solid #ebebf0',
      borderRadius: '12px',
      backgroundColor: '#fff',
      padding: '0px 15px',
      width:'75%'
    },
    marginBottom15:{
      marginBottom:'15px'
    },
    marginBottom5:{
      marginBottom:'5px'
    },
    switchContainer:{
      display:'flex',
      justifyContent:'center',
      marginBottom:'5px'
    },
    fontSize20:{
      fontSize:'20px'
    },
    flexColumn:{
      display:'flex',
      flexDirection:'column'
    },
    icon3DWrapper: {
      width: '48px',
      height: '48px',
      minWidth: '48px',
      minHeight: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginBottom: '10px',
      '& svg': {
        width: '48px',
        height: '48px',
        maxWidth: '48px',
        maxHeight: '48px',
        objectFit: 'contain',
      },
    },
  }));
  const classes = useStyles();

  useEffect(() => {
    if (!isEmpty(props.lostSalesGraph)) {
      setLostSalesBarGraph(props.lostSalesGraph);
      setToRenderGraph(true);
    } else {
      setLostSalesBarGraph({});
      setToRenderGraph(false);
    }
  }, [props.lostSalesGraph]);

  useEffect(() => {
    if (toRenderGraph) buildLostSalesGraphComponent();
  }, [toRenderGraph, lostSalesSwitch]);

  const buildLostSalesGraphComponent = () => {
    let xAxisLabel =
      props?.moduleConfig?.[LOST_SALES_MODULE]?.xAxisLabel;
    return {
      type: "column",
      chartType: "barChart",
      chartHeight: 250,
      legend: {
        "enabled": false
      },
      title: {
        style: {
          fontSize: '13px',
          fontWeight: 'bold'
        },
        text: 'Lost Sales',
        align: 'left',
        x: -11,
        y: 20,
        margin: 20
      },

      xAxis: {
        categories: lostSalesBarGraph.map((item) =>
          xAxisLabel === "weekend" ? displayFormattedDate(
            item.date,
            localStorage.getItem("tenantDateFormat")
          ) : item.fiscal_week
        ),
        tickPosition: 'outside',
        lineWidth: 1,
        gridLineWidth: 0,
        title: {
          text: xAxisLabel === "weekend" ? "Week Ending Date" : "Week",
          style: {
            fontSize: "12px",
            y: -10
          },
        },
      },
      yAxis: {
        lineWidth: 1,
        gridLineWidth: 0,
        title: {
          text: lostSalesSwitch ? "Lost Sales Units" : `Lost Sales ${getCurrencySymbol() || "$"}`,
          style: {
            fontSize: "12px",
          },
        },
      },
      series: [
        {
          name: lostSalesSwitch ? "Lost Sales Units" : `Lost Sales ${getCurrencySymbol() || "$"}`,
          data: lostSalesBarGraph.map((item) =>
            lostSalesSwitch
              ? Math.round(item?.lost_units)
              : item?.lost_sales
          ),
          color: '#bbbca4'
        },
      ],
      plotOptions: {
        series: {
          pointWidth: 10,
          borderRadius: 5,
          dataLabels: {
            enabled: false,
          },
        },
      },
      tooltip: {
        shared: true,
        useHTML: true,
        formatter: function () {
          const point = this?.points?.[0];
          if (!point) return '';
          
          const weekNumber = this?.x.toString().replace('Week ', '');
          const value = lostSalesSwitch
                    ? point?.y.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})
                    : point?.y.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1});
          
          return `<div style="padding: 8px;">
            <div style="display: inline-block; background: #E8EEFF; color: #4B69FF; padding: 4px 12px; border-radius: 16px; margin-bottom: 8px;">
              Week ${weekNumber}
            </div>
            <div style="font-size: 12px;">
            ${lostSalesSwitch ? 'Lost sales units' : 'Lost sales'}  <b> ${value} </b>
            </div>
          </div>`;
        },
        backgroundColor: 'white',
        borderColor: '#E8EEFF',
        borderRadius: 8,
        borderWidth: 1,
        shadow: false
      },
      isPercentLabel: false,
    };
  };

  return (
    <div className={`${globalClasses.marginBottom24} ${classes.containerCards}`} >
      {toRenderGraph ? (
        <>
        <div className={classes.switchContainer}>
        <Switch
            value={lostSalesSwitch}
            id="lost-sales-graph"
            onChange={(event) => {
              setLostSalesSwitch(event.target.checked);
            }}
            rightLabel="Sales Units"
            leftLabel={`Sales ${getCurrencySymbol() || "$"}`}
          />
        </div>
          <div className={classes.metricCardsContainer}>
            <div className={classes.metricCardContainerWrapper}>
              <div className={classes.metricColumnLayout}>
                <div className={classes.metricCard}>
                  <div className={classes.flexColumn}>
                    {render3DIcons ? (
                      <div className={classes.icon3DWrapper}>
                        {getKPIIconComponent("lost_revenue", 0)}
                      </div>
                    ) : (
                      <img
                        width="35px"
                        height="35px"
                        style={{ marginBottom: "10px" }}
                        src={LostRevenue}
                        alt="Lost Revenue"
                      />
                    )}
                    <div className={classes.marginBottom15}>
                      Lost Sales Revenue
                    </div>
                    <div className={classes.fontSize20}>
                      <strong>
                      {!isNull(props?.aggregates) ? `${hideDollarSymbol ? "" : getCurrencySymbol() || "$"}${props?.aggregates?.lost_sales_revenue.toLocaleString()}` : 'N/A'}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className={classes.metricCard}>
                  <div className={classes.flexColumn}>
                    {render3DIcons ? (
                      <div className={classes.icon3DWrapper}>
                        {getKPIIconComponent("lost_units", 1)}
                      </div>
                    ) : (
                      <img
                        width="35px"
                        height="35px"
                        style={{ marginBottom: "10px" }}
                        src={LostUnits}
                        alt="Lost Units"
                      />
                    )}
                    <div className={classes.marginBottom15}>
                      Lost Sales Unit
                    </div>
                    <div className={classes.fontSize20}>
                      <strong>
                        {!isNull(props?.aggregates) ? `${props?.aggregates?.lost_sales_units?.toLocaleString()}` : 'N/A'}
                      </strong>
                    </div>
                  </div>
                </div>

              </div>
            </div>
            <div className={classes.graphContainer}>
              <Charts options={buildLostSalesGraphComponent()} hideButton={true} />
            </div>
          </div>

        </>
      ) : (
        <Typography variant="h5" className={globalClasses.paddingVertical}>
          No Graph data is present for the selected filters
        </Typography>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    moduleConfig: store.inventorysmartReducer?.allocationReportsCommonService?.moduleConfig,
    allocationReportsConfiguration:
      store.inventorysmartReducer?.allocationReportsCommonService
        ?.allocationReportsConfiguration,
    aggregates:
      store.inventorysmartReducer?.allocationReportsCommonService
        ?.aggregates,
  };
};

export default connect(mapStateToProps, null)(LostSalesOpportunityComponent);
