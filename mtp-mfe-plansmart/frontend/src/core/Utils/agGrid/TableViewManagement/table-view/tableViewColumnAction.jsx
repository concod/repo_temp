import React, { useState, useMemo, useEffect } from "react";
import { connect, useDispatch } from "react-redux";

import { Tabs, Tab } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";

import { addSnack } from "core/actions/snackbarActions";

import { setTableViewConfigData } from "./table-view-panel-service";

import TableViewActionFooter from "./TableViewActionFooter";
import ConfigTabsContainer from "./ConfigTabsContainer";

const useStyles = makeStyles((theme) => ({
  customMargin: {
    margin: `1rem 1.5rem 1rem ${theme.typography.pxToRem(14)}`
  }
}));

const TableViewColumnAction = (props) => {
  const {
    agGrid,
    additionalTabConfig,
    addSnack,
    onApplyTableView,
    planSmartPlanCode,
    setShowPanelLoader,
    tableName,
    tableViewData,
    tableViewConfigData,
    viewSelected
  } = props;
  const classes = useStyles();
  const dispatch = useDispatch();

  const [columnActionSelected, setColumnActionSelected] = useState(0);

  useEffect(() => {
    setShowPanelLoader(false);
  }, [viewSelected]);

  const handleChange = (_event, newValue) => {
    setColumnActionSelected(newValue);
  };

  const selectedViewData = useMemo(() => {
    const selectedViewData = tableViewData?.filter((item) => {
      return item.id === viewSelected;
    });

    return selectedViewData;
  }, [tableViewData, viewSelected]);

  const displaySnackMessages = (message, variance) => {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variance
        }
      })
    );
  };

  return (
    <div className={classes.customMargin}>
      <Tabs value={columnActionSelected} onChange={handleChange}>
        {/* <Tab label={"Column Settings"} /> */}
        {additionalTabConfig?.map((tab, index) => (
          <Tab key={index} label={tab.label} />
        ))}
      </Tabs>
      <div>
        <ConfigTabsContainer
          additionalTabConfig={additionalTabConfig}
          columnActionSelected={columnActionSelected}
          viewSelected={viewSelected}
          selectedViewData={selectedViewData}
        />
      </div>
      <TableViewActionFooter
        additionalTabConfig={additionalTabConfig}
        displaySnackMessages={displaySnackMessages}
        onApplyTableView={onApplyTableView}
        planSmartPlanCode={planSmartPlanCode}
        setShowPanelLoader={setShowPanelLoader}
        setTableViewConfigData={setTableViewConfigData}
        tableName={tableName}
        tableViewConfigData={tableViewConfigData}
        tableViewData={tableViewData}
        viewSelected={viewSelected}
      />
    </div>
  );
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack,
    setTableViewConfigData: (payload) =>
      dispatch(setTableViewConfigData(payload))
  };
};

const mapStateToProps = (state) => {
  return {
    tableViewConfigData:
      state?.plansmartReducer?.tableViewConfigurationData?.tableViewConfigData
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TableViewColumnAction);
