import SettingsCheckboxList from "./SettingsCheckBoxList";
import SettingsToggle from "./SettingsToggle";

import { GRID_SETTINGS_VIEW_TYPE } from "./constants";

import styles from "./tableGridSettings.module.scss";

const GridSettingsContent = ({ onChange, settings }) => {
  return (
    <div className={styles.content}>
      {settings?.length > 0 &&
        settings?.map((setting) => {
          if (setting.viewType === GRID_SETTINGS_VIEW_TYPE.CHECKBOX_LIST) {
            return (
              <SettingsCheckboxList
                key={setting.key}
                setting={setting}
                onChange={onChange}
              />
            );
          }
          if (setting.viewType === GRID_SETTINGS_VIEW_TYPE.TOGGLE) {
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
    </div>
  );
};

export default GridSettingsContent;
