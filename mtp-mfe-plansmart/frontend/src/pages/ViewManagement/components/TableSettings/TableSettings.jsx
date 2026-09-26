import PropTypes from "prop-types"
import { connect, useDispatch } from "react-redux";
import { get, cloneDeep } from "lodash";
import { bindActionCreators } from "redux";

import { Checkbox, Switch } from "impact-ui-v3";

import { handleTableSettingsChange } from "./tableSettings.util";
import * as actions from "../../viewManagement.slice";
import * as planningScreenActions from "../../../PlanningScreen/slice/planningScreen.slice";

import { TABLE_SETTINGS_VIEW_TYPE } from "../../viewManagement.constant";
import "./TableSettings.scss";

const TableSettings = ({
  currentVersion,
  showHideMetricsData,
  setActiveViewMetricsData,
  setActiveViewSettingsData,
  setGridSettings,
  setShowHideMetricsDataAction,
  tableRef,
  tableSettingsData,
  versionVarianceMap
}) => {
  const dispatch = useDispatch();

  const dispatchSetActiveViewMetricsData = (data) =>
    dispatch(setActiveViewMetricsData(data));
  const dispatchSetActiveViewSettingsData = (data) =>
    dispatch(setActiveViewSettingsData(data));
  const dispatchSetTableShowHideMetricsData = (data) =>
    dispatch(setShowHideMetricsDataAction(data));

  const onChange = (setting, option) => {
    const updatedSettings = cloneDeep(tableSettingsData);
    handleTableSettingsChange({
      option,
      setting,
      setActiveViewMetricsData: dispatchSetActiveViewMetricsData,
      setActiveViewSettingsData: dispatchSetActiveViewSettingsData,
      setGridSettings,
      setTableShowHideMetricsData: dispatchSetTableShowHideMetricsData,
      updatedSettings,
      tableRef,
      showHideMetricsData,
      currentVersion,
      versionVarianceMap
    });
  };

  const SettingsCheckboxList = ({ setting, onChange }) => (
    <div className="checkbox-listWrapper">
      <div className="setting-tab-subheading">{setting.title} </div>
      <div className="checkboxes-container">
        {get(setting, "options", []).map((option) => (
          <div key={option.category} onClick={(e) => e.stopPropagation()}>
            <Checkbox
              onChange={(e) => {
                e.stopPropagation();
                onChange(setting, option);
              }}
              id={option.category}
              label={option.label}
              checked={option.checked}
            />
          </div>
        ))}
      </div>
    </div>
  );

  const SettingsToggle = ({ setting, onChange }) => (
    <div className="toggle-wrapper">
      <div className={"toggle-list"}>
        <h4 className={"setting-tab-subheading"}>{setting.title} </h4>
      </div>
      <div className={"checkboxes-container"}>
        <Switch
          onChange={() => onChange(setting)}
          checked={setting.selected}
          id={setting.category}
        />
      </div>
    </div>
  );

  return (
    <>
      {tableSettingsData?.length > 0 &&
        tableSettingsData?.map((setting) => {
          if (setting.viewType === TABLE_SETTINGS_VIEW_TYPE.CHECKBOX_LIST) {
            return (
              <SettingsCheckboxList
                key={setting.key}
                setting={setting}
                onChange={onChange}
              />
            );
          }
          if (setting.viewType === TABLE_SETTINGS_VIEW_TYPE.TOGGLE) {
            return (
              <SettingsToggle
                key={setting.key}
                setting={setting}
                onChange={onChange}
              />
            );
          }
          return <></>;
        })}
    </>
  );
};

TableSettings.propTypes = {
  currentVersion: PropTypes.string,
  setActiveViewMetricsData: PropTypes.func,
  setActiveViewSettingsData: PropTypes.func,
  setGridSettings: PropTypes.func,
  setShowHideMetricsDataAction: PropTypes.func,
  showHideMetricsData: PropTypes.array,
  tableRef: PropTypes.object,
  tableSettingsData: PropTypes.shape({
    length: PropTypes.number,
    map: PropTypes.func
  }),
  versionVarianceMap: PropTypes.object
}

const mapStateToProps = (state) => ({
  tableSettingsData: actions.activeViewSettingsSelector(state),
  showHideMetricsData: actions.activeViewShowOrHideMetricsDataSelector(state),
  currentVersion: planningScreenActions.currentVersionSelector(state),
  versionVarianceMap: planningScreenActions.varianceVersionMappingSelector(
    state
  )
});

const mapDispatch = (dispatch) => {
  return {
    ...bindActionCreators(
      {
        ...actions,
        ...planningScreenActions
      },
      dispatch
    )
  };
};

export default connect(mapStateToProps, mapDispatch)(TableSettings);
