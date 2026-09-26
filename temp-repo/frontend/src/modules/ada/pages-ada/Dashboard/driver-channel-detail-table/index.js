import { makeStyles } from "@mui/styles";
import LoadingOverlay from "core/Utils/Loader/loader";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import React from "react";
import { useState } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { useEffect } from "react";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  chartDataPayload,
  weekEndDateLabel,
} from "modules/ada/utils-ada/utilityFunctions";
import { useSelector } from "react-redux";
import {
  getDriverChannelTableData,
  getDriverRankData,
  getDriverSignificancetData,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import { cloneDeep } from "lodash";
import SelectContainer from "core/commonComponents/filters/SelectContainer";
import { SPECIAL_CHARACTER_MAPPING } from "config/constants";

const DriverChannelDetailTable = ({
  channels,
  selectedChannel,
  setSelectedChannel,
}) => {
  const classes = useStyles();

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const [driverForecastLoader, setDriverForecastLoader] = useState(false);
  const [columnData, setColumnData] = useState([]);
  const [rowdata, setRowdata] = useState([]);

  useEffect(() => {
    if (!selectedChannel.length) {
      setColumnData([]);
      setRowdata([]);
      return;
    }
    const payload = chartDataPayload(adaReducer);
    const getRowData = async () => {
      try {
        setDriverForecastLoader(true);

        let response = await getDriverChannelTableData(
          payload,
          selectedChannel?.[0]?.value
        );
        let formattedResponse = response?.data?.data || {};

        // let allChannels = Object.keys(formattedResponse?.[0] || {})?.filter(
        //   (channel) => channel !== "driver"
        // );
        let updatedColumnConfig = cloneDeep(columnConfig);
        let weeks = adaReducer?.xAxisStaticDates?.fiscal_ids;

        const isWeekEndDateLabelEnabled =
          adaReducer?.clientConfig?.attribute_value?.show_features
            ?.is_week_end_date_label_enabled;

        let showWeekEndDateLabelEnabled =
          isWeekEndDateLabelEnabled &&
          adaReducer?.switchTimeLine?.[0]?.value === "W";
        if (weeks.length) {
          weeks.forEach((week) => {
            let channelColumn = cloneDeep(channelColumnConfig);
            channelColumn.column_name = week + "";
            // channelColumn.label = week + "";
            // channelColumn.label = `F${adaReducer?.switchTimeLine?.[0]?.value}-${week}`;

            channelColumn.label = showWeekEndDateLabelEnabled
              ? weekEndDateLabel(week, adaReducer)
              : `F${adaReducer?.switchTimeLine?.[0]?.value}-${week}`;

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
  }, [selectedChannel?.length, selectedChannel?.[0]?.value]);

  useEffect(() => {
    if (!channels?.length) return;
    let updatedChannels = channels?.map(
      (channel) =>
        ({
          label: channel,
          value: channel,
          id: channel,
        } || [])
    );

    setSelectedChannel([updatedChannels?.[0]]);
  }, [channels?.length]);

  function replaceSpecialChars(str) {
    let replacedStr = str;
    for (const code in SPECIAL_CHARACTER_MAPPING) {
      const regex = new RegExp(code, "g");
      replacedStr = replacedStr.replace(regex, SPECIAL_CHARACTER_MAPPING[code]);
    }
    return replacedStr;
  }

  return (
    <>
      <div
        className={classes.channelFilterContainer}
        style={{ marginRight: "64px" }}
      >
        <SelectContainer
          label="Select Channel"
          initialData={channels?.map((channel) => {
            return (
              {
                label: replaceSpecialChars(channel),
                value: channel,
                id: channel,
              } || []
            );
          })}
          updateDependency={(_, value) => {
            setSelectedChannel(value);
          }}
          selectedOptions={selectedChannel}
          // customPlaceholder="Select Channel"
        />
      </div>
      <LoadingOverlay
        loader={driverForecastLoader}
        isCustomLoader={true}
        minHeight="unset"
      >
        <AgGridComponent
          hideTableFormat={true}
          uniqueRowId="drivers"
          pagination={false}
          sizeColumnsToFitFlag
          minWidth={200}
          rowdata={rowdata}
          columns={columnData}
          showSaveTableConfig={false}
          showSearchModalBtn={false}
        />
      </LoadingOverlay>
    </>
  );
};

export default DriverChannelDetailTable;

const useStyles = makeStyles((theme) => ({
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
  channelFilterContainer: {
    width: "200px",
    marginLeft: "auto",
    "& .ia-select-label-v3": {
      display: "none",
    },
  },
}));

let channelColumnConfig = {
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

let columnConfig = [
  {
    column_name: "drivers",
    label: "Drivers",
    is_frozen: true,
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
