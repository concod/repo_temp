import { makeStyles } from "@mui/styles";
import LoadingOverlay from "core/Utils/Loader/loader";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import React from "react";
import { useState } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { useEffect } from "react";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { chartDataPayload } from "modules/ada/utils-ada/utilityFunctions";
import { useSelector } from "react-redux";
import {
  getDriverRankData,
  getDriverSignificancetData,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import { cloneDeep } from "lodash";

const DriverRankTable = ({ setChannels, activeKey }) => {
  const classes = useStyles();

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const [driverForecastLoader, setDriverForecastLoader] = useState(true);
  const [columnData, setColumnData] = useState([]);
  const [rowdata, setRowdata] = useState([]);

  useEffect(() => {
    const payload = chartDataPayload(adaReducer);
    const getRowData = async () => {
      try {
        setDriverForecastLoader(true);

        let response = await getDriverRankData(payload);
        let formattedResponse = response?.data?.data || {};

        let allChannels = Object.keys(formattedResponse?.[0] || {})?.filter(
          (channel) => channel !== "driver"
        );
        setChannels(allChannels);
        let updatedColumnConfig = cloneDeep(columnConfig);
        if (allChannels.length) {
          allChannels.forEach((channel) => {
            let channelColumn = cloneDeep(channelColumnConfig);
            channelColumn.column_name = channel;
            channelColumn.label = channel;
            updatedColumnConfig.push(channelColumn);
          });
        }

        const formattedColumnResponse = agGridColumnFormatter(
          updatedColumnConfig
        );

        setColumnData(formattedColumnResponse);
        setRowdata(formattedResponse);
      } catch (error) {
      } finally {
        setDriverForecastLoader(false);
      }
    };
    getRowData();
  }, [activeKey]);

  return (
    <>
      <LoadingOverlay
        loader={driverForecastLoader}
        isCustomLoader={true}
        minHeight="unset"
      >
        <div className={classes.driverForecastContainer}>
          <AgGridComponent
            hideTableFormat={true}
            tableHeader="Rank"
            uniqueRowId="driver"
            pagination={false}
            sizeColumnsToFitFlag
            minWidth={200}
            rowdata={rowdata}
            columns={columnData}
            showSaveTableConfig={false}
            showSearchModalBtn={false}
          />
        </div>
      </LoadingOverlay>
    </>
  );
};

export default DriverRankTable;

const useStyles = makeStyles((theme) => ({
  driverForecastContainer: {
    display: "flex",
    flexDirection: "column",
    marginBottom: "12px",
  },
  customheader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    margin: "0.25rem 0 0.75rem",
  },
  panelContainer: {
    "& .panel-container": {
      top: `calc(${theme.customVariables.headerHeight} + 2rem)`,
    },
  },
}));

const channelColumnConfig = {
  column_name: "",
  label: "",
  is_frozen: false,
  is_hidden: false,
  is_editable: false,
  is_aggregated: false,

  type: "float",
  // order_of_display: 3,
  footer: "",
  is_row_span: false,
  formatter: "",
  is_searchable: false,
  sub_headers: [],
  is_lockable: false,
  formatter: "roundOfftoTwoDecimals",
  extra: { fullWidth: true, roundOffTo: 2 },
};

const columnConfig = [
  {
    column_name: "driver",
    label: "Driver",
    is_frozen: false,
    is_hidden: false,
    is_editable: false,
    is_aggregated: false,
    type: "str",
    // order_of_display: 3,
    footer: "",
    is_row_span: false,
    formatter: "",
    is_searchable: false,
    sub_headers: [],
    is_lockable: false,
  },
];
