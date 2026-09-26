import React, { useState } from "react";
import { connect } from "react-redux";
import { Popover } from "@mui/material";

import { IconButton } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";

import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";

const PlanInfo = (props) => {
  const classes = useStyles();
  const [isPopoverOpen, setIsPopoverOpen] = useState(null);
  const [planInfoData, setPlanInfoData] = useState({});

  const closePopover = () => {
    setIsPopoverOpen(null);
  };
  const onInfoClick = async (event, planDetails) => {
    if (planDetails) {
      let planInfoData = {};
      let stores_count = planDetails?.stores_count || {};
      let style_color_count = planDetails?.style_color_count || {};
      planInfoData.drops_count = planDetails?.drops_count;
      planInfoData.used_store = stores_count?.actual;
      planInfoData.total_store = stores_count?.Total;
      planInfoData.used_choice = style_color_count?.actual;
      planInfoData.total_choice_count = style_color_count?.Total;
      setPlanInfoData(planInfoData);
      setIsPopoverOpen(event.target);
    }
  };

  return (
    <IconButton
      variant="text"
      color="primary"
      className={classes.actionIcon}
      title="info"
      size="large"
      aria-describedby={`assortDashboardInfoBtn${props?.value || ""}`}
    >
      <InfoIcon
        fontSize="small"
        id={`assortDashboardInfoBtn${props?.value || ""}`}
        onClick={(event) => {
          onInfoClick(event, props.data);
        }}
      />
      <Popover
        id={`assortDashboardInfoBtn${props?.value || ""}`}
        anchorEl={isPopoverOpen}
        open={Boolean(isPopoverOpen)}
        onClose={closePopover}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <div className={classes.divMargin}>
          <p>No of drops planned: {planInfoData?.drops_count}</p>
          <p>
            No of stores planned: {planInfoData?.used_store || 0}/
            {planInfoData?.total_store || 0}
          </p>
          <p>
            No of actualized style colors: {planInfoData?.used_choice || 0}/
            {planInfoData?.total_choice_count || 0}{" "}
          </p>
        </div>
      </Popover>
    </IconButton>
  );
};
const mapStateToProps = (state) => {
  return {
    planInfoData: planDashboardServiceActions.planInfoSelector(state),
  };
};

const mapActionsToProps = {};
export default connect(mapStateToProps, mapActionsToProps)(PlanInfo);
