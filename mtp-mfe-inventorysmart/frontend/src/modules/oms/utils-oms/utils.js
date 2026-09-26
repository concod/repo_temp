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

//Filters the table Config to show only selected columns only
export function filterDisplayColumnsByLabel(columns, columnsToBeRemoved) {
  return columns
    ?.filter((col) => col?.label && !columnsToBeRemoved.includes(col.label))
    .map((col) => {
      const updatedCol = { ...col };

      // NOTE: After agGridColumnFormatter runs, a group column's `children`
      // array holds the SAME object references as its `sub_headers`. Each
      // branch is filtered independently (no shared visited set) so that
      // removing a hidden column does not wipe the entire `children` group.
      if (Array.isArray(col.sub_headers)) {
        const filteredSub = filterDisplayColumnsByLabel(
          col.sub_headers,
          columnsToBeRemoved
        );
        updatedCol.sub_headers = filteredSub.length ? filteredSub : undefined;
      }

      if (Array.isArray(col.children)) {
        const filteredChildren = filterDisplayColumnsByLabel(
          col.children,
          columnsToBeRemoved
        );
        updatedCol.children = filteredChildren.length
          ? filteredChildren
          : undefined;
      }

      return updatedCol;
    })
    .filter(Boolean);
}
