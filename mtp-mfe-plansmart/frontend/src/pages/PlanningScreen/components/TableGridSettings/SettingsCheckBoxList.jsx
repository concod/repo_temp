import PropTypes from "prop-types";
import { Checkbox } from "impact-ui";
import { get } from "lodash";

import styles from "./tableGridSettings.module.scss";

const SettingsCheckboxList = ({ setting, onChange }) => (
  <div className={styles.checkboxListWrapper}>
    <div className={styles.checkboxList_colLeft}>
      <h4 className={styles.checkboxList_title}>{setting.title} :</h4>
    </div>
    <div className={styles.checkboxList_colRight}>
      {get(setting, "options", []).map((option) => (
        <Checkbox
          className={styles.checkboxList_checkbox}
          onChange={() => onChange(setting, option)}
          name={option.category}
          key={option.category}
          id={option.category}
          label={option.label}
          checked={option.checked}
        />
      ))}
    </div>
  </div>
);

SettingsCheckboxList.propTypes = {
  setting: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired
};

export default SettingsCheckboxList;
