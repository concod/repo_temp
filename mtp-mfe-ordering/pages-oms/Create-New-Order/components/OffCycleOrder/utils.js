import React from "react";
import { Typography } from "@mui/material";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";

export const createTableHeader = (label, value) => {
    return (
      <div style={{ display: "flex", alignItems: "center" }}>
        <Typography
          style={{ fontSize: "12px", fontWeight: "500", lineHeight: "14px" }}
        >
          {label}: &nbsp;{" "}
        </Typography>
        <Typography
          style={{ fontSize: "14px", fontWeight: "700", lineHeight: "14px" }}
        >
          {replaceSpecialCharacter(value)}
        </Typography>
      </div>
    );
  };