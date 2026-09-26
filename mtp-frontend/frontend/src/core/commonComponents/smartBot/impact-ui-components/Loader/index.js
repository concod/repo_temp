import React from "react";

import "./Loader.styles.scss";

export const Loader = ({ size = "large", progress = "" }) => {
  return (
    <div className="ia-styles ia-loader-container">
      <div className={`ia-styles ia-loader-outer ia-loader-${size}`}>
        <div className={`ia-loader ia-loader-inner`}>
          {size !== "small" && progress}
        </div>
      </div>

      {progress && <div className="ia-loaderText">Loading...</div>}
    </div>
  );
};
