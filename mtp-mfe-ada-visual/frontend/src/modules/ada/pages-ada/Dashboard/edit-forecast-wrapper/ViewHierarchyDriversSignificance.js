import { BottomSheet } from "impact-ui-v3";
import { useState, useEffect, forwardRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import DriverChannelDetailTable from "../../Dashboard/driver-channel-detail-table";
import { chartDataPayload } from "modules/ada/utils-ada/utilityFunctions";
import {
  getDriverRankData,
  getDriverRankDataNew,
  setEditHierarchyDriverSignificanceData,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles((theme) => ({
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

const ViewHierarchyDriversSignificance = ({ activeKey }, ref) => {
  const classes = useStyles();
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const showDriversChart =
    adaReducer?.clientConfig?.attribute_value?.show_features?.showDriversChart;

  const showDriverSignificance =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.showDriverSignificance;

  const { channelsRef } = ref;

  const editHierarchyDriverSignificanceData =
    adaReducer?.editHierarchyDriverSignificanceData;

  const [selectedChannel, setSelectedChannel] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);

  const dispatch = useDispatch();

  const getPayload = () => {
    let payload = chartDataPayload(adaReducer);

    payload.filters = {
      ...payload.filters,
      ...editHierarchyDriverSignificanceData,
    };
    delete payload.filters.headerName;
    const isDriverSignificanceAggregationWeek =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.driver_sig_agg_week;

    if (isDriverSignificanceAggregationWeek) {
      payload.filters.aggregation_level = "W";
    }
    return payload;
  };

  const getRankPayload = () => {
    const payload = chartDataPayload(adaReducer);
    const isDriverSignificanceAggregationWeek =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.driver_sig_agg_week;

    if (isDriverSignificanceAggregationWeek) {
      payload.filters.aggregation_level = "W";
    }
    return payload;
  };

  useEffect(() => {
    if (!channelsRef.current.length) {
      const getDriverRankDataFn = showDriverSignificance
        ? getDriverRankDataNew
        : getDriverRankData;

      getDriverRankDataFn(getRankPayload())
        .then((response) => {
          let formattedResponse = response?.data?.data || {};

          let allChannels = Object.keys(formattedResponse);
          channelsRef.current = allChannels;
        })
        .catch((err) => {
          console.error("Error fetching driver rank data:", err);
        });
    }
  }, []);

  const showHierarchyDropdown = () => {
    const aggHierarchyLevel =
      editHierarchyDriverSignificanceData.agg_hierarchy?.[
        editHierarchyDriverSignificanceData.agg_level
      ];
    return (
      <div style={{ paddingLeft: "8px" }}>
        {editHierarchyDriverSignificanceData.headerName} -{" "}
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#0d152c",
          }}
        >
          {aggHierarchyLevel}
        </span>
      </div>
    );
  };

  return (
    <BottomSheet
      className={classes.overrideWrap}
      open={editHierarchyDriverSignificanceData.agg_level}
      onClose={() => dispatch(setEditHierarchyDriverSignificanceData({}))}
      title="View Driver Significance"
      isExpanded={isExpanded}
      onExpand={() => setIsExpanded(!isExpanded)}
    >
      {showHierarchyDropdown()}
      <DriverChannelDetailTable
        title="Driver Significance"
        channels={channelsRef.current}
        activeKey={activeKey}
        selectedChannel={selectedChannel}
        setSelectedChannel={setSelectedChannel}
        getPayload={getPayload}
        adaReducer={adaReducer}
        showDriversChart={showDriversChart}
        viewHierarchyDriversSignificance={true}
      />
    </BottomSheet>
  );
};

export default forwardRef(ViewHierarchyDriversSignificance);
