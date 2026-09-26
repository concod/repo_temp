import { useEffect, useState } from "react";
import { connect, useSelector } from "react-redux";
import { cloneDeep, isEmpty } from "lodash";

import GridSettingsContent from "../../TableGridSettings/GridSettingsContent";

import {
  selectedTableViewNameSelector,
  setSelectedViewSettingsPayload,
  tableViewConfigurationSelector
} from "../../../../../core/Utils/agGrid/TableViewManagement/table-view/table-view-panel-service";

import { viewSettingsSelector } from "../../../slice/planningScreen.slice";
import { handleGridSettingsChange } from "../../TableGridSettings/TableGridSettings.util";

const ViewSettingPreferences = ({ setSelectedViewSettingsPayloadAction }) => {
  const [settings, setSettings] = useState([]);
  const defaultViewSettings = useSelector(viewSettingsSelector);
  const tableViewConfigurationData = useSelector(
    tableViewConfigurationSelector
  );
  const selectedTableView = useSelector(selectedTableViewNameSelector);
  const selectedViewConfig = tableViewConfigurationData?.filter(
    (item) => item.id === selectedTableView
  )[0];

  useEffect(() => {
    const currentSettings = !isEmpty(
      selectedViewConfig?.custom_tab_preferences?.view_setting
    )
      ? selectedViewConfig?.custom_tab_preferences?.view_setting
      : defaultViewSettings;
    setSelectedViewSettingsPayloadAction(currentSettings);
    setSettings(currentSettings);
  }, [selectedTableView]);

  const preferencesViewSettingsChangeCb = (updatedSettings) => {
    setSelectedViewSettingsPayloadAction(updatedSettings);
  };

  const onChange = (setting, option) => {
    const updatedSettings = cloneDeep(settings);
    handleGridSettingsChange({
      option,
      setting,
      setSettings,
      updatedSettings,
      changeCb: preferencesViewSettingsChangeCb
    });
  };

  return <GridSettingsContent onChange={onChange} settings={settings} />;
};

const mapDispatchToProps = (dispatch) => {
  return {
    setSelectedViewSettingsPayloadAction: (payload) =>
      dispatch(setSelectedViewSettingsPayload(payload))
  };
};

export default connect(null, mapDispatchToProps)(ViewSettingPreferences);
