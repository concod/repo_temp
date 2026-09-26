import React from "react";
import { Typography } from "@mui/material";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

export const getValidCheckConfiguration = (checkConfiguration) => {
  let validCheckConfiguration = [];
  if (Array.isArray(checkConfiguration)) {
    validCheckConfiguration = checkConfiguration.filter(
      (item) => item !== null && item !== undefined
    );
  }
  if (validCheckConfiguration.length === 0) return [];
  else return validCheckConfiguration;
};

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
