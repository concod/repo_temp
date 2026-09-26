import { useState } from "react";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import {
  Button as IAButton,
  BottomSheet,
  ButtonGroup,
  useTranslation,
} from "impact-ui-v3";

import DriverSummaryTable from "../../driver-summary-table";
import DriverChannelDetailTable from "../../driver-channel-detail-table";
import { useSelector } from "react-redux";
import { chartDataPayload } from "modules/ada/utils-ada/utilityFunctions";

const useStyles = makeStyles((theme) => ({
  buttonGroupContainer: {
    position: "relative",
    left: "50%",
    transform: "translateX(-50%)",
    top: "10px",
    bottom: "10px",
    width: "fit-content",
  },
  overrideWrap: {
    "&.ia_modalPopover.is-bottom-sheet.expanded": {
      height: "640px !important",
      top: "auto",
    },
    "& .ia_modalBody": {
      height: "92%",
    },
  },
}));

const ChannelDriverSignificance = ({ activeKey, label }) => {
  const { t } = useTranslation();
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const showDriversChart =
    adaReducer?.clientConfig?.attribute_value?.show_features?.showDriversChart;
  const [isActive, setisActive] = useState(false);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState([]);
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [selectedView, setSelectedView] = useState("summary");
  const [isExpanded, setIsExpanded] = useState(true);

  const getPayload = () => {
    let payload = chartDataPayload(adaReducer);
    const isDriverSignificanceAggregationWeek =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.driver_sig_agg_week;
    if (isDriverSignificanceAggregationWeek) {
      payload.filters.aggregation_level = "W";
    }

    return payload;
  };

  return (
    <>
      <div className={globalClasses.marginHorizontal}>
        <IAButton
          variant="primary"
          id="channel_driver_contribution"
          onClick={() => setisActive(true)}
        >
          {label ? label : t("ada.dashboard.seeChannelDriverContribution")}
        </IAButton>
      </div>
      <BottomSheet
        className={classes.overrideWrap}
        open={isActive}
        onClose={() => {
          setisActive(false);
          setSelectedChannel([]);
          setChannels([]);
          setSelectedView("summary");
        }}
        title={t("ada.dashboard.driversContribution")}
        isExpanded={isExpanded}
        onExpand={() => setIsExpanded(!isExpanded)}
      >
        <div className={classes.buttonGroupContainer}>
          <ButtonGroup
            onChange={(_, value) => {
              setSelectedView(value);
            }}
            options={[
              {
                value: "summary",
                label: "Summary",
              },
              {
                value: "week",
                label: "Week",
              },
            ]}
            selectedOption={selectedView}
          />
        </div>
        {selectedView === "summary" && (
          <div style={{ marginTop: "30px" }}>
            <DriverSummaryTable
              channels={channels}
              setChannels={setChannels}
              activeKey={activeKey}
              showDriversChart={showDriversChart}
            />
          </div>
        )}
        {selectedView === "week" && (
          <DriverChannelDetailTable
            channels={channels}
            activeKey={activeKey}
            selectedChannel={selectedChannel}
            setSelectedChannel={setSelectedChannel}
            getPayload={getPayload}
            adaReducer={adaReducer}
            showChannelDropdown={true}
            showDriversChart={showDriversChart}
          />
        )}
      </BottomSheet>
      {/* </div> */}
    </>
  );
};

export default ChannelDriverSignificance;
