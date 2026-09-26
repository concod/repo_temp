import React, { useEffect, useState, useRef } from "react";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { Select } from "impact-ui-v3";
import Charts from "core/Utils/charts";
import { connect } from "react-redux";
import { cloneDeep, isEmpty } from "lodash";
import { GRAPH_MENU_LIST } from "core/Utils/charts/constants";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

GRAPH_MENU_LIST.buttons.contextButton.y = -10;

const colors = ["#BABCA4", "#BFAFD9", "#86A6D0", "#6BBEC2", "#F19579"];

const graphCardTitleStyle = {
  fontFamily: "Manrope",
  fontWeight: 600,
  fontSize: "14px",
  lineHeight: "21px",
  color: "#31416E",
  margin: 0,
  whiteSpace: "nowrap",
};

const cardHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  width: "100%",
  gap: "8px",
};

const legendWrapStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "flex-end",
  rowGap: "4px",
  columnGap: "10px",
};

const legendItemStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
};

const legendSwatchStyle = {
  width: "10px",
  height: "10px",
  borderRadius: "2px",
  flexShrink: 0,
};

const legendLabelStyle = {
  fontFamily: "Manrope",
  fontWeight: 500,
  fontSize: "12px",
  lineHeight: "16px",
  color: "#718EBF",
  whiteSpace: "nowrap",
};

const renderChartLegend = (data, hidden = {}, onToggle) => (
  <div style={legendWrapStyle}>
    {data.map((item, index) => (
      <span
        key={`${item.name}-${index}`}
        style={{
          ...legendItemStyle,
          cursor: onToggle ? "pointer" : "default",
          opacity: hidden[index] ? 0.4 : 1,
        }}
        onClick={onToggle ? () => onToggle(index) : undefined}
        role={onToggle ? "button" : undefined}
      >
        <span style={{ ...legendSwatchStyle, backgroundColor: item.color }} />
        <span style={legendLabelStyle}>{item.name}</span>
      </span>
    ))}
  </div>
);

const InventoryDistributionSection = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [viewByOptions, setViewByOptions] = useState([]);
  const [selectedView, setSelectedView] = useState(null);
  const [donutChartData, setDonutChartData] = useState([]);
  const [barChartData, setBarChartData] = useState([]);
  const [donutHidden, setDonutHidden] = useState({});
  const [barHidden, setBarHidden] = useState({});
  const barChartRef = useRef(null);
  const donutChartRef = useRef(null);

  useEffect(() => {
    if (!isEmpty(props.inventoryDistributionViewOptions)) {
      setViewByOptions(cloneDeep(props.inventoryDistributionViewOptions));
      setSelectedView(props.inventoryDistributionViewOptions[0]);
    }
  }, [props.inventoryDistributionViewOptions]);

  useEffect(() => {
    if (!isEmpty(selectedView) && !isEmpty(props.articleDetails)) {
      setDonutHidden({});
      setBarHidden({});
      let donutData = {};
      let barData = {};
      props.articleDetails.map((item) => {
        let key = item[selectedView.value];
        if (donutData.hasOwnProperty(key)) {
          donutData[key] = donutData[key] + item.total_store_oh || 0;
        } else if (item.store_grade) {
          donutData[key] = item.total_store_oh;
        }
        if (barData.hasOwnProperty(key)) {
          barData[key] = barData[key] + item.wtd || 0;
        } else if (item.store_grade) {
          barData[key] = item.wtd;
        }
      });
      let donutSeriesData = [];
      Object.entries(donutData).forEach(([key, value], index) => {
        donutSeriesData.push({
          name: replaceSpecialCharacter(key),
          y: value,
          color: colors[index % colors.length],
        });
      });
      donutSeriesData = donutSeriesData.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setDonutChartData(donutSeriesData);
      let barChartSeriesData = [];
      const keys = Object.keys(barData);
      keys.forEach((key, index) => {
        barChartSeriesData.push({
          name: replaceSpecialCharacter(key),
          color: colors[index % colors.length],
          y: barData[key],
        });
      });
      barChartSeriesData = barChartSeriesData.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setBarChartData(barChartSeriesData);
    }
  }, [selectedView, props.articleDetails]);

  const buildDonutChartOptions = () => {
    return {
      type: "pie",
      chartType: "donutChart",
      chart: {
        type: "pie",
        backgroundColor: "transparent",
        style: {
          fontFamily: "Manrope, sans-serif",
        },
        height: 250,
      },
      title: {
        text: "",
        align: "left",
        verticalAlign: "top",
        x: 0,
        y: 0,
        style: {
          fontSize: "14px",
          fontWeight: "600",
          lineHeight: "21px",
          fontFamily: "Manrope",
          color: "#31416E",
        },
      },
      exporting: "false",
      series: [
        {
          name: "",
          colorByPoint: true,
          innerSize: "75%",
          size: "100%",
          data: donutChartData,
          showInLegend: true,
          dataLabels: {
            enabled: true,
            useHTML: true,
            softConnector: true,
            connectorPadding: 0,
            distance: 10,
            style: {
              textOutline: "none",
              fontFamily: "Manrope",
              fontWeight: "500",
              fontSize: "10px",
            },
            formatter: function () {
              const hex = (this.point && this.point.color
                ? this.point.color
                : this.color || "#718EBF"
              ).toString();
              const r = parseInt(hex.slice(1, 3), 16);
              const g = parseInt(hex.slice(3, 5), 16);
              const b = parseInt(hex.slice(5, 7), 16);
              const bg = `rgba(${r}, ${g}, ${b}, 0.12)`;
              const fg = `rgb(${r}, ${g}, ${b})`;
              return `<span style="background:${bg}; color:${fg}; padding:1px 6px; border-radius:8px; display:inline-block;">${this.y}</span>`;
            },
          },
        },
      ],
      // Bring the outer labels closer to the ring
      dataLabelsDistance: 8,
      dataLabelsConnectorPadding: 2,
      dataLabelsPadding: 2,
      tooltip: {
        formatter: function () {
          return `<div style="padding: 8px;">
                    <div style="font-weight: 600; color: #1F2B4D; margin-bottom: 4px;">
                      ${this.point.name}
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="color: ${this.color}; font-size: 12px;">●</span>
                      <span style="color: #60697D;">Value: <b style="color: #1F2B4D;">${this.y}</b></span>
                    </div>
                  </div>`;
        },
        backgroundColor: "#FFFFFF",
        borderColor: "#E5E5E5",
        borderRadius: 8,
        style: {
          color: "#1F2B4D",
          fontSize: "12px",
        },
        useHTML: true,
      },
      legend: {
        enabled: false,
      },
    };
  };

  const getBarGraphOptions = () => {
    return {
      chartType: "barChart",
      chartHeight: 250,
      type: "column",
      title: {
        text: "",
        align: "left",
        verticalAlign: "top",
        x: 0,
        y: 5,
        style: {
          fontSize: "14px",
          fontWeight: "600",
          lineHeight: "21px",
          fontFamily: "Manrope",
          color: "#31416E",
        },
      },
      xAxis: {
        categories: barChartData?.map((item) => item.name),
        labels: {
          style: {
            fontSize: "12px",
            fontFamily: "Manrope",
            fontWeight: "500",
            lineHeight: "16px",
            color: "#718EBF",
          },
        },
      },
      yAxis: {
        title: {
          text: "",
        },
        labels: {
          style: {
            fontSize: "12px",
            fontFamily: "Manrope",
            fontWeight: "500",
            lineHeight: "16px",
            color: "#718EBF",
          },
        },
      },
      tooltip: {
        formatter: function () {
          return `<div style="padding: 8px;">
                    <div style="font-weight: 600; color: #1F2B4D; margin-bottom: 4px;">
                      ${this.point.name}
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="color: ${this.color}; font-size: 12px;">●</span>
                      <span style="color: #60697D;">Value: <b style="color: #1F2B4D;">${this.y}</b></span>
                    </div>
                  </div>`;
        },
        backgroundColor: "#FFFFFF",
        borderColor: "#E5E5E5",
        borderRadius: 8,
        style: {
          color: "#1F2B4D",
          fontSize: "12px",
        },
        useHTML: true,
      },
      legend: {
        enabled: false,
      },
      plotOptions: {
        series: {
          pointWidth: 10,
          borderRadius: 2,
        },
      },
      isPercentLabel: false,
      exporting: "false",
      customSeries: [
        {
          name: "",
          colorByPoint: true,
          data: barChartData,
          showInLegend: false,
        },
      ],
    };
  };

  const handleBarChartRef = (ref) => {
    barChartRef.current = ref.current;
  };

  const handleDonutChartRef = (ref) => {
    donutChartRef.current = ref.current;
  };

  const togglePointVisibility = (chartRef, index, setHidden) => {
    const chart = chartRef.current?.chart;
    const point = chart?.series?.[0]?.points?.[index];
    if (!point) return;
    const willHide = point.visible;
    point.setVisible(!point.visible);
    setHidden((prev) => ({ ...prev, [index]: willHide }));
  };

  return (
    <div className={`${classes?.productDetailsContainer} ${globalClasses.gap}`}>
      <div
        className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.fullWidth}`}
      >
        <p className="header">Inventory distribution</p>
        <Select
          label="View by"
          setIsOpen={setIsDropdownOpen}
          isOpen={isDropdownOpen}
          isSearchable={true}
          isClearable={false}
          isCloseWhenClickOutside={true}
          isMulti={false}
          initialOptions={viewByOptions}
          currentOptions={viewByOptions}
          selectedOptions={selectedView}
          setSelectedOptions={setSelectedView}
          labelOrientation="right"
        />
      </div>
      <div
        className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.fullWidth}`}
      >
        <div className={classes?.donutGraphContainer} style={{ width: "60%" }}>
          <div style={cardHeaderStyle}>
            <p style={graphCardTitleStyle}>Units(OH)</p>
            {renderChartLegend(donutChartData, donutHidden, (index) =>
              togglePointVisibility(donutChartRef, index, setDonutHidden)
            )}
          </div>
          <Charts
            options={buildDonutChartOptions()}
            hideButton={true}
            handleChartRef={handleDonutChartRef}
          />
        </div>
        <div className={classes?.barGraphContainer} style={{ width: "38%" }}>
          <div style={cardHeaderStyle}>
            <p style={graphCardTitleStyle}>Sales(WTD)</p>
            {renderChartLegend(barChartData, barHidden, (index) =>
              togglePointVisibility(barChartRef, index, setBarHidden)
            )}
          </div>
          <Charts
            options={getBarGraphOptions()}
            hideButton={true}
            handleChartRef={handleBarChartRef}
          />
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    inventoryDistributionViewOptions:
      store.inventorysmartReducer.inventorySmartDashboardService
        ?.ddScreenConfigs?.dashboard?.drillDown
        ?.inventoryDistributionViewOptions,
  };
};

const mapActionToProps = (dispatch) => ({});

export default connect(
  mapStateToProps,
  mapActionToProps
)(InventoryDistributionSection);
