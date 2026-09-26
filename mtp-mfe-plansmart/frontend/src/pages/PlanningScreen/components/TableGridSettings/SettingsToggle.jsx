import PropTypes from "prop-types";
import { Switch } from "impact-ui";

import styles from "./tableGridSettings.module.scss";

const SettingsToggle = ({ setting, onChange }) => (
  <div className={styles.checkboxListWrapper}>
    <div className={styles.checkboxList_colLeft}>
      <h4 className={styles.checkboxList_title}>{setting.title} :</h4>
    </div>
    <div className={styles.checkboxList_colRight}>
      <Switch
        onChange={() => onChange(setting)}
        className={styles.checkboxList_toggleSwitch}
        checked={setting.selected}
        id={setting.category}
      />
    </div>
  </div>
);

SettingsToggle.propTypes = {
  setting: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired
};

export default SettingsToggle;
