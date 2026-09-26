import React from "react";
import "./style.scss";

const Ticker = ({ children }) => {
  return (
    <div className="ticker-wrap">
      <div className="ticker">
        <div className="ticker__item">{children}</div>
      </div>
    </div>
  );
};

export default Ticker;
