import { useEffect, useState } from "react";
import TableConfigSideBar from "./tableConfigSideBar";
import { isEmpty } from "lodash";

const TableActions = (props) => {
  let [tableActionProps, setTableActionProps] = useState({});
  useEffect(() => {
    if(!isEmpty(props)) {
      setTableActionProps(props);
    }
  }, [props]);
  return (
    <>
      <TableConfigSideBar {...tableActionProps} />
    </>
  );
};

export default TableActions;
