import React, { useState, useEffect } from "react";
import { connect } from "react-redux";

import { Box, Tabs, Tab, Typography } from "@mui/material";

import { cloneDeep } from "lodash";
import { Panel } from "impact-ui";

import Loader from "core/Utils/Loader/loader";
import TableViewColumnAction from "./tableViewColumnAction";
import TableViewType from "./tableViewType";

import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";

import makeStyles from "@mui/styles/makeStyles";
import { setSelectedTableViewName } from "./table-view-panel-service";

const useStyles = makeStyles((theme) => ({
  panelWrapper: {
    "& .panel-heading": {
      fontSize: theme.typography.pxToRem(18),
      lineHeight: theme.typography.pxToRem(27)
    },
    "& .panel-header": {
      padding: "0 1.5rem",
      height: "4rem"
    },
    "& .panel-body-container": {
      marginTop: "1.5rem",
      padding: "0.75rem 0"
    }
  },
  divider: {
    borderBottom: `1px solid ${theme.palette.text.disabled}`
  },
  parentContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100%"
  },
  viewTypeContainer: {
    padding: `0 1.5rem 0 ${theme.typography.pxToRem(6)}`
  }
}));

const TableViewPanel = (props) => {
  const {
    agGrid,
    isPanelOpen,
    setIsTableViewPanelOpen,
    onApplyTableView,
    tableName,
    additionalTabConfig = [],
    planSmartPlanCode,
    viewSelected,
    setSelectedTableViewName,
    tableViewConfigData,
  } = props;

  const classes = useStyles();
  const globalClasses = globalStyles();
  const [value, setValue] = useState(0);
  const [forceRerender, setForceRerender] = useState(false);
  const [showPanelLoader, setShowPanelLoader] = useState(true);

  const VIEW_TYPE_GLOBAL = "global";
  const VIEW_TYPE_PERSONAL = "personal";

  // function filterTargetPlanViews() {
  //   return tableViewConfigData.filter((view) => {
  //     const productSetting = view.custom_tab_preferences.view_setting.find(
  //       (setting) => setting.key === "product"
  //     );
  //     return (
  //       productSetting &&
  //       productSetting.options.map((option) => option.category).includes("l0_name")
  //     );
  //   });
  // }

  // function filterSeasonViews() {
  //   return tableViewConfigData.filter((view) => {
  //     const productSetting = view.custom_tab_preferences.view_setting.find(
  //       (setting) => setting.key === "product"
  //     );
  //     return (
  //       productSetting &&
  //       !productSetting.options.map((option) => option.category).includes("l0_name")
  //     );
  //   });
  // }

  // const viewConfigs = isTargetPlan
  //   ? filterTargetPlanViews()
  //   : filterSeasonViews();

  const globalViews = tableViewConfigData.filter(
    (view) => view.view_type === VIEW_TYPE_GLOBAL
  );
  const personalViews = tableViewConfigData.filter(
    (view) => view.view_type === VIEW_TYPE_PERSONAL
  );

  const handleChange = (_event, newValue) => {
    setSelectedTableViewName(0);
    setValue(newValue);
  };

  useEffect(() => {
    setForceRerender(!forceRerender);
  }, [tableViewConfigData]);

  return (
    <div className={`${classes.panelWrapper} ${globalClasses.panelWrapper}`}>
      <Panel
        size="large"
        isOpen={isPanelOpen}
        onClose={() => setIsTableViewPanelOpen(false)}
        title="View Management"
        disabled={true}
        primaryButtonProps={{
          children: "Cancel",
          onClick: () => {
            setIsTableViewPanelOpen(false);
          }
        }}
      >
        {showPanelLoader && (
          <div className={globalClasses.overlayLoader}>
            <Loader loader={showPanelLoader} spinner isCustomLoader />
          </div>
        )}
        <div
          data-test-id="table-view-panel-wrapper"
          className={classes.parentContainer}
        >
          <div
            className={classes.viewTypeContainer}
            data-test-id="table-view-type-container"
          >
            <Tabs value={value} onChange={handleChange}>
              <Tab label={"Global views"} />
              <Tab label={"Personal views"} />
            </Tabs>
            <div>
              <TabPanel value={value} index={0}>
                <TableViewType
                  key="global" // Unique key to ensure re-render if needed
                  tableViewData={globalViews}
                  viewSelected={viewSelected}
                  tableName={tableName}
                  setShowPanelLoader={setShowPanelLoader}
                />
              </TabPanel>
              <TabPanel value={value} index={1}>
                <TableViewType
                  key="personal" // Unique key to ensure re-render if needed
                  tableViewData={personalViews}
                  viewSelected={viewSelected}
                  tableName={tableName}
                  setShowPanelLoader={setShowPanelLoader}
                />
              </TabPanel>
            </div>
          </div>
          <div className={classes.divider} />
          <div>
            <TableViewColumnAction
              tableViewData={tableViewConfigData}
              viewSelected={viewSelected}
              agGrid={agGrid}
              onApplyTableView={onApplyTableView}
              tableName={tableName}
              setShowPanelLoader={setShowPanelLoader}
              additionalTabConfig={additionalTabConfig}
              planSmartPlanCode={planSmartPlanCode}
            />
          </div>
        </div>
      </Panel>
    </div>
  );
};

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack,
    setSelectedTableViewName: (payload) =>
      dispatch(setSelectedTableViewName(payload))
  };
};
const mapStateToProps = (state) => {
  return {
    tableViewConfigData:
      state?.plansmartReducer?.tableViewConfigurationData?.tableViewConfigData,
    viewSelected:
      state?.plansmartReducer?.tableViewConfigurationData?.selectedViewName
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(TableViewPanel);
