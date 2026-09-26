import proj4 from "proj4";
import { MAP_MENU_LIST } from "./constants";

export const mapviewOptionsData = (props) => {
  return {
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
    tooltip: props.tooltip,
    series: [
      {
        name: "Countries",
        nullColor: "#fff",
        showInLegend: false,
        mapData: props.mapData
      },
      ...props?.series,
    ],
  };
};
