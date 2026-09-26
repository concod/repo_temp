import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { Typography, Card, Grid, Button, Popover } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import Download from "@mui/icons-material/Download";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import GraphFilters from "core/commonComponents/graphFilters";
import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";

const HindsightGraphHeader = (props) => {
  const classes = useStyles();
  const [isSettingsPopoverOpen, setisSettingsPopoverOpen] = useState(null);

  const closePopover = () => {
    setisSettingsPopoverOpen(null);
  };

  const handlePopover = (event) => {
    setisSettingsPopoverOpen(event.currentTarget);
  };

  return (
    <div className={classes.resultContainer}>
      <Typography variant="h5" gutterBottom>
        {props.heading}
      </Typography>
      <div>
        <>
          <Button
            variant="outlined"
            color="primary"
            className={classes.button}
            onClick={handlePopover}
            id="hindsightDashboardSettingBtn"
          >
            <SettingsIcon />
          </Button>
          <Popover
            id="hindsightDashboardSettingBtn"
            anchorEl={isSettingsPopoverOpen}
            open={Boolean(isSettingsPopoverOpen)}
            onClose={closePopover}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
            className={classes.graphFiltersPopup}
          >
            <GraphFilters
              closePopover={closePopover}
              screenConfiguration={props.screenConfiguration}
              tabValues={props.tabValues}
              filtersConfig={props.filtersConfig}
              generateGraphData={(payload) =>
                props.generateGraphData(payload)
              }
              hindsightFilterSelection={props.hindsightFilterSelection}
              graphFilters={props.graphFilters}
              setGraphFilters={props.setGraphFilters}
              graphType={props.graphType}
              hindsightPlanDetails={props.hindsightPlanDetails}
              levels={props.levels}
              levelsJson={props.levelsJson}
              treemapFiltersData={props.treemapFiltersData}
            />
          </Popover>
        </>
        <Button
          variant="outlined"
          color="primary"
          className={classes.button}
          id="download"
          onClick={() => {}}
        >
          <Download />
        </Button>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    levels: state.assortsmartReducer.planDashboardReducer.planLevels,
    levelsJson: state.assortsmartReducer.planDashboardReducer.levelsJson,
    treemapFiltersData: HindsightServiceActions.setHindsightTreemapFiltersSelector(
      state
    ),
    hindsightPlanDetails: HindsightServiceActions.getHindsightPlanDetailsSelector(
      state
    ),
  };
};

const mapActionsToProps = {};

export default connect(mapStateToProps, mapActionsToProps)(HindsightGraphHeader);
