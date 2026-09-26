import React, { useState, useEffect } from "react";
import { BottomSheet, Button, Switch, Tooltip } from "impact-ui-v3";
import { FormControl } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { connect } from "react-redux";
import BarChartIcon from "@mui/icons-material/BarChart";
import TableViewIcon from "@mui/icons-material/TableView";
import InfoIcon from "@mui/icons-material/Info";
import { isEmpty } from "lodash";
import {
  OMS_CREATE_SCENARIO_TOOLTIP_MESSAGE,
  OMS_CREATE_SCENARIO_CONDITION_MESSAGE,
  OMS_DEEP_DIVE_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import DeepDivePanel from "./DeepDivePanel";
import DeepDiveDownload from "../../../Order-Deep-Dive/DeepDiveDownload";

const customStyles = makeStyles((theme) => ({
  topPanel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  controlPanel: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  infoIcon: {
    color: theme?.palette?.textColours?.greyHelperText,
  },
  buttonInfoGroup: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  leftContainer: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    margin: "1rem 0",
    gap: "0.5rem",
  },
}));

function DeepDiveBottomSheet(props) {
  const customClasses = customStyles();

  //To Handle Switch Button between Month and Week
  const RIGHT_LABEL_SWITCH = "Week";
  const LEFT_LABEL_SWITCH = "Month";
  const [isViewedByWeek, setIsViewedByWeek] = useState(true);

  const [isChartDisplayed, setIsChartDisplayed] = useState(true);

  // Access control state for download button
  const [isUserHasDownloadAccess, setIsUserHasDownloadAccess] = useState(true);

  const SHOW_CREATE_SCENARIO_BUTTON =
    props?.vendorToStoreScreenConfig?.show_create_scenario_button || false;
  const SHOW_RECEIPTS_ADJUSTMENT_BUTTON =
    props?.vendorToStoreScreenConfig?.show_receipts_adjustment_button || false;

  // Access control for Deep Dive Download button
  useEffect(() => {
    // Find the deep dive access configuration from userAccess
    const deepDiveAccess = props.userAccess?.find(
      (item) => item.screen === OMS_DEEP_DIVE_SCREENNAME_KEY
    );

    const canDownload = deepDiveAccess?.isDownloadButton || false;

    if (!isEmpty(props.userAccess)) {
      // If userAccess exists, use the new access control
      setIsUserHasDownloadAccess(canDownload);
    } else {
      setIsUserHasDownloadAccess(true);
    }
  }, [props.userAccess]);

  const onViewSelectChange = (event) => {
    let userSelection = event.target.checked;
    if (userSelection) setIsViewedByWeek(true);
    else setIsViewedByWeek(false);
  };

  const navigateToNextReceiptsAdjustment = () => {
    console.log("navigate To NextReceiptsAdjustment");
  };

  const navigateToCreateScenario = () => {
    console.log("navigate To Create Scenario");
  };

  const isCreateScenarioRestricted = () => {
    try {
      if (props?.selectedRows.length === 1) return false;
    } catch (error) {
      console.log("Error in isCreateScenarioRestricted", error);
    }
  };

  const changeToChartView = () => {
    setIsChartDisplayed(true);
  };

  const changeToTableView = () => {
    setIsChartDisplayed(false);
  };

  return (
    <BottomSheet
      title="Deep Dive"
      label="Default"
      open={true}
      isExpanded={true}
      footerOptions={
        <Button
          onClick={() => {
            props?.onClose();
          }}
          variant="url"
        >
          Close
        </Button>
      }
      onClose={() => {
        props?.onClose();
      }}
    >
      <div style={{ padding: "0 0.5rem" }}>
        <div className={customClasses.topPanel}>
          <div className={customClasses.controlPanel}>
            {SHOW_CREATE_SCENARIO_BUTTON && (
              <div className={customClasses.buttonInfoGroup}>
                <Tooltip title={OMS_CREATE_SCENARIO_TOOLTIP_MESSAGE?.message}>
                  <Button
                    variant="tertiary"
                    color="primary"
                    id="viewOrderCreateScenario"
                    onClick={navigateToCreateScenario}
                    disabled={isCreateScenarioRestricted()}
                  >
                    Create Scenario
                  </Button>
                </Tooltip>
                <Tooltip title={OMS_CREATE_SCENARIO_CONDITION_MESSAGE}>
                  <InfoIcon
                    className={customClasses.infoIcon}
                    fontSize="small"
                  />
                </Tooltip>
              </div>
            )}
            {SHOW_RECEIPTS_ADJUSTMENT_BUTTON && (
              <div className={customClasses.buttonInfoGroup}>
                <Button
                  variant="tertiary"
                  color="primary"
                  id="nextReceiptsAdjustment"
                  onClick={navigateToNextReceiptsAdjustment}
                >
                  Next Receipts Adjustment
                </Button>
                <Tooltip title={OMS_CREATE_SCENARIO_CONDITION_MESSAGE}>
                  <InfoIcon
                    className={customClasses.infoIcon}
                    fontSize="small"
                  />
                </Tooltip>
              </div>
            )}
          </div>

          <div className={customClasses.controlPanel}>
            {isUserHasDownloadAccess && (
              <DeepDiveDownload
                weekRange={props?.deepDiveWeekRange}
                isCalledFromVendorToStore={true}
              />
            )}
            <div className={customClasses.leftContainer}>
              {isChartDisplayed && (
                <Tooltip title="Table View" variant="tertiary">
                  <Button
                    variant="tertiary"
                    color="primary"
                    id="tableViewButton"
                    onClick={changeToTableView}
                  >
                    <TableViewIcon fontSize="small"></TableViewIcon>
                  </Button>
                </Tooltip>
              )}

              {!isChartDisplayed && (
                <Tooltip title="Chart View" variant="tertiary">
                  <Button
                    variant="tertiary"
                    color="primary"
                    id="chartViewButton"
                    onClick={changeToChartView}
                  >
                    <BarChartIcon fontSize="small"></BarChartIcon>
                  </Button>
                </Tooltip>
              )}
            </div>
            <FormControl style={{ margin: "0 0.5rem" }}>
              <Switch
                checked={isViewedByWeek}
                onChange={(e) => onViewSelectChange(e)}
                color="primary"
                rightLabel={RIGHT_LABEL_SWITCH}
                leftLabel={LEFT_LABEL_SWITCH}
                id="monthWeekView"
              />
            </FormControl>
          </div>
        </div>
        <DeepDivePanel
          isViewedByWeek={isViewedByWeek}
          isChartDisplayed={isChartDisplayed}
        />
      </div>
    </BottomSheet>
  );
}

const mapStateToProps = (store) => {
  return {
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_store,
    vendorToStoreScreenConfig:
      store.omsReducer.orderingCommonService.orderingVendorToStoreConfig
        ?.oms_dashboard?.deep_dive,
    deepDiveWeekRange:
      store.omsReducer.orderManagementVendorToStoreService.deepDiveWeekRange,
  };
};

export default connect(mapStateToProps, null)(DeepDiveBottomSheet);
