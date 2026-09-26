import { Select, useTranslation } from "impact-ui-v3";
import { useEffect, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { getGraphData } from "./utils";
import {
  chartData,
} from "modules/ticketing-system/utils";
import colours from "core/Styles/colours";
import { cloneDeep } from "lodash";
import globalStyles from "core/Styles/globalStyles";
import { useStyles as sharedStyles } from "../../../../styles-ticketing";
import { Typography } from "@mui/material";
import TicketInfoCard from "../../../TicketInfoCard";

/**
 * Dropdown values for viewBy dropdown
 */
const getViewByDropdownOptions = (t) => [
  {
    label: t("ticketing.graphs.viewBy.week"),
    value: "Week",
  },
  {
    label: t("ticketing.graphs.viewBy.month"),
    value: "Month",
  },
  {
    label: t("ticketing.graphs.viewBy.quarter"),
    value: "Quarter",
  },
];

/**
 *
 * ByPriority is a component which will give the detailed
 * information on the basis of the ticket's priority
 * in a form of cards and graph
 * @param {object} props
 * @returns
 */
const ByPriority = (props) => {
  const { reportData } = props;
  const { t } = useTranslation();

  const [ticketVolumeInfo, setTicketVolumeInfo] = useState([]);
  const [isOpenViewBy, setIsOpenViewBy] = useState(false);
  const [currentViewByOptions, setCurrentViewByOptions] = useState(
    getViewByDropdownOptions(t)
  );
  const [selectedViewByOptions, setSelectedViewByOptions] = useState(
    getViewByDropdownOptions(t)[0]
  );

  const [graphData, setGraphData] = useState(cloneDeep(chartData));
  const [totalVolume, setTotalVolume] = useState(0);
  const globalClasses = globalStyles();
  const sharedClasses = sharedStyles();

  /**
   * getTicketVolumeDetails is the function which prepare the
   * data for ticket volume card and set it to the
   * ticketVolumeInfo state to display it
   */
  const getTicketVolumeDetails = () => {
    try {
      let emergency = 0;
      let urgent = 0;
      let normal = 0;
      let low = 0;
      let total = 0;

      reportData?.tickets?.forEach((ticket) => {
        switch (ticket.priority) {
          case "emergency":
            emergency += 1;
            break;
          case "urgent":
            urgent += 1;
            break;
          case "normal":
            normal += 1;
            break;
          case "low":
            low += 1;
            break;
          case "default":
            low += 1;
            break;
        }
      });
      total = emergency + urgent + normal + low;
      setTotalVolume(total);
      const ticketVolumeData = [
        {
          labelKey: "ticketing.emergencyTickets",
          configKey: "Emergency Tickets",
          value: emergency,
          color: colours.apricot,
        },
        {
          labelKey: "ticketing.urgentTickets",
          configKey: "Urgent Tickets",
          value: urgent,
          color: colours.creamCan,
        },
        {
          labelKey: "ticketing.normalTickets",
          configKey: "Normal Tickets",
          value: normal,
          color: colours.jordyBlue,
        },
        {
          labelKey: "ticketing.lowTickets",
          configKey: "Low Tickets",
          value: low,
          color: colours.fuchsiaPink,
        },
      ];

      setTicketVolumeInfo(ticketVolumeData);
    } catch (error) {
      console.error("getTicketVolumeDetails error", error);
    }
  };

  /**
   * It will call the getGraphData and getTicketVolumeDetails
   * function at first,
   * and whenever the reporting data or the view by option changes
   * these function will be called again to get the updated info
   */
  useEffect(() => {
    if (Object.keys(reportData).length > 0) {
      getTicketVolumeDetails();
      let graphInfo = getGraphData(
        reportData.tickets,
        reportData["date-range"],
        "",
        selectedViewByOptions.value
      );
      setGraphData(graphInfo);
    }
  }, [reportData, selectedViewByOptions]);

  return (
    <div>
      <div className={`${sharedClasses.ticketVolumeContainer}`}>
        <div
          className={`${sharedClasses.ticketVolumeContainerInfo} ${globalClasses.centerAlign}`}
        >
          {ticketVolumeInfo.map((ticket) => (
            <TicketInfoCard {...ticket} label={t(ticket.labelKey)} />
          ))}
        </div>
      </div>
      <div className={sharedClasses.graphContainer}>
        <div className={`${globalClasses.layoutAlignSpaceBetween}`}>
          <Typography className={sharedClasses.graphContainerHeader}>
            {t("ticketing.trendAnalysis")}
          </Typography>
          <Select
            label={t("ticketing.select.viewBy")}
            labelOrientation="left"
            placeholder={t("ticketing.select.viewByPlaceholder")}
            initialOptions={getViewByDropdownOptions}
            isOpen={isOpenViewBy}
            setIsOpen={setIsOpenViewBy}
            currentOptions={currentViewByOptions}
            setCurrentOptions={setCurrentViewByOptions}
            selectedOptions={selectedViewByOptions}
            setSelectedOptions={setSelectedViewByOptions}
          />
        </div>
        <Typography
          component="p"
          className={`${sharedClasses.chartHeading} ${sharedClasses.marginVertical_24}`}
        >
          {t("ticketing.ticketVolume")}
        </Typography>
        <div className={sharedClasses.graphContainerGraph}>
          <HighchartsReact
            highcharts={Highcharts}
            options={graphData}
            key={JSON.stringify(graphData)}
          />
        </div>
      </div>
    </div>
  );
};

export default ByPriority;
