import proj4 from "proj4";
import { MAP_MENU_LIST } from "./constants";

export const mapviewOptionsData = (props) => {
  return props.chartType === "mapViewWithColorAxis"
    ? {
        title: {
          text: "",
        },
        colorAxis: {
          min: 0,
          stops: [
            [0, "#EFEFFF", "value"],
            [0.67, "#4444FF", "value"],
            [1, "#000022", "value"],
          ],
        },
        tooltip: {
          formatter: function () {
            let tooltip = "";
            let thisYearLabel = parseInt(props.graphDetails?.compare_year)
              ? props.filters?.year[0]
              : props.filters?.season_name;
            let lastyearLabel = parseInt(props.graphDetails?.compare_year)
              ? props.filters?.year[0] - 1
              : props.graphDetails?.last_season;
            const currentData = props.stateDataMapping?.filter((state) => {
              return state.attribute === this.point?.options?.["hc-key"] && state["ty_" + props.settingsData?.review_metric] === this.point?.value;
            })?.[0];
            let tyValue =
              currentData?.["ty_" + props.settingsData?.review_metric] > 1000000
                ? (
                    currentData?.["ty_" + props.settingsData?.review_metric] /
                    1000000
                  ).toFixed(2) + "M"
                : currentData?.["ty_" + props.settingsData?.review_metric] >
                  1000
                ? (currentData?.["ty_" + props.settingsData?.review_metric] /
                    1000)?.toFixed(2) +
                  "K"
                : currentData?.[
                    "ty_" + props.settingsData?.review_metric
                  ]?.toFixed(2);
            let lyValue =
              currentData?.["ly_" + props.settingsData?.review_metric] > 1000000
                ? (
                    currentData?.["ly_" + props.settingsData?.review_metric] /
                    1000000
                  ).toFixed(2) + "M"
                : currentData?.["ly_" + props.settingsData?.review_metric] >
                  1000
                ? (currentData?.["ly_" + props.settingsData?.review_metric] /
                    1000)?.toFixed(2) +
                  "K"
                : currentData?.[
                    "ly_" + props.settingsData?.review_metric
                  ]?.toFixed(2);

                  let name =
                    props.name === "District" || props.name === "Region"
                      ? currentData?.region
                      : this.point?.name;
            tooltip = 
            name + 
            "<br/>" +
              thisYearLabel +
              " " +
              props.dataLabel +
              ": " +
              tyValue +
              "<br/>" +
              lastyearLabel +
              " " +
              props.dataLabel +
              ": " +
              lyValue;
            return tooltip;
          },
        },
        series: [
          {
            mapData: props.mapData,
            name: props.name + " Data",
            dataLabels: {
              formatter: function () {
                return this.point.properties["woe-label"].split(",")[0];
              },
            },
            data: props.series,
          },
        ],
      }
    : {
        chart: {
          map: props.map,
          proj4,
        },
        title: {
          text: "",
        },
        mapNavigation: {
          enabled: true,
          buttonOptions: {
            verticalAlign: "bottom",
          },
        },
        credits: {
          enabled: false,
        },
        exporting: MAP_MENU_LIST,
        tooltip: props.tooltip ? props.tooltip : "",
        series: [
          {
            name: "Countries",
            nullColor: "#fff",
            showInLegend: false,
            mapData: props.mapData,
          },
          ...props?.series,
        ],
      };
};
