import React, { useState } from "react";

import "./CheckBox.scss";

function CheckBox(props) {
  const [checked, setChecked] = useState(true);

  return (
    <div>
      <label>
        <input
          type="checkbox"
          defaultChecked={checked}
          onChange={() => setChecked(!checked)}
        />
        Check Me!
      </label>
    </div>
  );
}

export default CheckBox;
