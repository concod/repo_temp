import React from "react";
import TableConfigSideBar from "./tableConfigSideBar";
import AgGridSearch from "../agGridSearch";

const TableActions = (props) => {
  const { showSaveTableConfig, showSearchModalBtn,disablesaveConfig} = props;
  return (
    <>
    {showSaveTableConfig && <TableConfigSideBar disablesaveConfig={disablesaveConfig} {...props} />}
      {showSearchModalBtn && <AgGridSearch {...props} />}
    </>
  );
};

export default TableActions;
