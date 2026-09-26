import React from "react";
import Paper from "@mui/material/Paper";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import ArticlesTable from "./ArticlesTable";

const CreateAllocationTable = function (props) {
  const classes = useStyles();
  const globalClasses = globalStyles();

  return (
    <Paper elevation={6} className={globalClasses.paperWrapper}>
      <div className={classes.autoOverflowWrapper}>
        <ArticlesTable />
      </div>
    </Paper>
  );
};

export default CreateAllocationTable;
