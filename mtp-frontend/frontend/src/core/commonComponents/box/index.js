import React from "react";
import "./style.scss";

const Box = ({ header, children, className = "" }) => {
  return (
    <div className={`box-container ${className}`}>
      <span>{header}</span>
      <div className="box-wrapper">{children}</div>
    </div>
  );
};

export default Box;
