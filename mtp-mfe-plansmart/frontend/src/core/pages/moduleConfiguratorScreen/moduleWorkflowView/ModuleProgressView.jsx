import { useState, useEffect } from "react";
import { Typography } from "@mui/material";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";

const ModuleProgressView = (props) => {
  const globalClasses = globalStyles();

  return (
    <div>
      <Typography variant="h5" style={{ padding: "20px" }} gutterBottom>
        Please select module to continue
      </Typography>
    </div>
  );
};

const mapStateToProps = (state) => {};
const mapActionsToProps = {};

export default connect(mapStateToProps, mapActionsToProps)(ModuleProgressView);
