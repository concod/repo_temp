import { useState } from "react";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import { Button as IAButton, Panel } from "impact-ui-v3";

import DriverRankTable from "../../driver-rank-table";
import DriverChannelDetailTable from "../../driver-channel-detail-table";

const useStyles = makeStyles((theme) => ({
  driverPanel: {
    width: "50vw",
    minWidth: "500px",
    maxWidth: "900px",
  },
}));

const ChannelDriverSignificance = ({ activeKey }) => {
  const [isActive, setisActive] = useState(false);
  const [weekTableActive, setWeekTableActive] = useState(false);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState([]);
  const classes = useStyles();
  const globalClasses = globalStyles();

  return (
    <>
      <div className={globalClasses.marginHorizontal}>
        <IAButton
          variant="primary"
          id="channel_driver_contribution"
          onClick={() => setisActive(true)}
        >
          See Channel & Driver Contribution
        </IAButton>
      </div>

      <Panel
        size="large"
        anchor="right"
        title="See Channel & Driver contribution"
        open={isActive}
        className={classes.driverPanel}
        onClose={() => {
          setisActive(false);
        }}
      >
        <DriverRankTable setChannels={setChannels} activeKey={activeKey} />
        <div
          className={globalClasses.marginHorizontal}
          style={{ marginLeft: "32px" }}
        >
          <IAButton
            variant="primary"
            id="channel_driver_contribution"
            onClick={() => setWeekTableActive(true)}
          >
            See Driver's week wise Contribution
          </IAButton>
        </div>
        {weekTableActive && (
          <DriverChannelDetailTable
            channels={channels}
            activeKey={activeKey}
            selectedChannel={selectedChannel}
            setSelectedChannel={setSelectedChannel}
          />
        )}
      </Panel>
    </>
  );
};

export default ChannelDriverSignificance;
