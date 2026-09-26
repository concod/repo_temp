import { useState } from "react";
import { useTranslation } from "impact-ui-v3";

import "./CheckBox.scss";

function CheckBox(props) {
  const { t } = useTranslation();
  const [checked, setChecked] = useState(true);

  return (
    <div>
      <label>
        <input
          type="checkbox"
          defaultChecked={checked}
          onChange={() => setChecked(!checked)}
        />
        {t("checkbox.checkMe")}
      </label>
    </div>
  );
}

export default CheckBox;
