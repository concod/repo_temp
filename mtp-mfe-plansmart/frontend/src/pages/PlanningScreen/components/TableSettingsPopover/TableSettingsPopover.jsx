import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Popover } from "@mui/material";
import { Button } from "impact-ui";
import { bindActionCreators } from "redux";
import { connect, useDispatch } from "react-redux";
import { cloneDeep, isEmpty, omitBy } from "lodash";

import GridSettingsContent from "../TableGridSettings/GridSettingsContent";

import * as actions from "./../../slice/planningScreen.slice";

import {
  applyGridSettings,
  handleGridSettingsChange,
  isMetricValueSelected
} from "../TableGridSettings/TableGridSettings.util";

import styles from "./tableSettingsPopover.module.scss";
import { TABLE_SETTINGS_CATEGORY } from "./constants";

const TableSettingsPopover = (props) => {
  const {
    viewSettings,
    tableSettingButtonRef,
    show,
    setShowTableSettings,
    tableRef,
    setGridSettings,
    currentVersion,
    versionVarianceMap,
    showHideMetricsData
  } = props;
  const dispatch = useDispatch();
  const [settings, setSettings] = useState([]);

  useEffect(() => {
    setSettings(viewSettings || []);
  }, [viewSettings]);

  useEffect(() => {
    if (!isEmpty(showHideMetricsData)) {
      const updatedVersionVarianceMap = omitBy(
        versionVarianceMap,
        (value) => value === currentVersion
      );

      const isVersionMetricSelected = isMetricValueSelected(
        showHideMetricsData[1],
        Object.values(updatedVersionVarianceMap)
      );
      const isVarianceMetricSelected = isMetricValueSelected(
        showHideMetricsData[1],
        Object.keys(updatedVersionVarianceMap)
      );

      const updatedViewSettings = (viewSettings || []).map((item) => {
        switch (item.key) {
          case TABLE_SETTINGS_CATEGORY.VERSION_KEY:
            return {
              ...item,
              selected: isVersionMetricSelected
            };
          case TABLE_SETTINGS_CATEGORY.VARIANCE_KEY:
            return {
              ...item,
              selected: isVarianceMetricSelected
            };
          default:
            return item;
        }
      });

      if (!isEmpty(updatedViewSettings)) setSettings(updatedViewSettings);
    }
  }, [viewSettings, showHideMetricsData]);

  const onChange = (setting, option) => {
    const updatedSettings = cloneDeep(settings);
    handleGridSettingsChange({ option, setting, setSettings, updatedSettings });
  };

  const updateView = () => {
    applyGridSettings({
      applyCallBack: () => {
        dispatch(actions.setTableViewSetting(settings));
        dispatch(actions.setUserPrefViewSettingsPayload(settings));
        setShowTableSettings(false);
      },
      showHideMetricsData,
      setGridSettings,
      settings: settings,
      tableRef: tableRef,
      currentVersion,
      versionVarianceMap,
      setShowHideMetricsData: (showHideMetricsData) =>
        dispatch(actions.setBudgetShowHideMetricsData(showHideMetricsData))
    });
  };

  return (
    <Popover
      classes={{
        root: styles.popover
      }}
      open={show}
      anchorEl={tableSettingButtonRef.current}
      onClose={() => setShowTableSettings(false)}
      anchorOrigin={{
        vertical: "top",
        horizontal: "left"
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "right"
      }}
    >
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h3 className={styles.title}>Set parameters</h3>
        </div>

        <GridSettingsContent onChange={onChange} settings={settings} />

        <div className={styles.actions}>
          <Button
            className="customActionButton"
            variant="secondary"
            onClick={() => setShowTableSettings(false)}
          >
            Cancel
          </Button>
          <Button
            className={`${styles.actions_primaryButton} customActionButton`}
            variant="primary"
            onClick={updateView}
          >
            Apply
          </Button>
        </div>
      </div>
    </Popover>
  );
};

TableSettingsPopover.propTypes = {
  viewSettings: PropTypes.array,
  tableSettingButtonRef: PropTypes.object,
  show: PropTypes.bool,
  setShowTableSettings: PropTypes.func,
  tableRef: PropTypes.object
};

const mapState = (state) => ({
  currentVersion: actions.currentVersionSelector(state),
  versionVarianceMap: actions.varianceVersionMappingSelector(state),
  viewSettings: actions.viewSettingsSelector(state),
  showHideMetricsData: actions.showHideMetricsDataSelector(state)
});

const mapDispatch = (dispatch) => ({
  ...bindActionCreators(
    {
      ...actions
    },
    dispatch
  )
});

export default connect(mapState, mapDispatch)(TableSettingsPopover);
