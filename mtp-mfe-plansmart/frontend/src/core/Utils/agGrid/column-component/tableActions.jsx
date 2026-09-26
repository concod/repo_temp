import React from "react";
import TableConfigSideBar from "./tableConfigSideBar";
import AgGridSearch from "../agGridSearch";

const TableActions = (props) => {
  const { showSaveTableConfig, showSearchModalBtn } = props;
  return (
    <>
      {showSaveTableConfig && <TableConfigSideBar {...props} />}
      {showSearchModalBtn && <AgGridSearch {...props} />}
    </>
  );
};

export default TableActions;
