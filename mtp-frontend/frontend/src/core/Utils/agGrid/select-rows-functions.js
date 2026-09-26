import { getLastIndex } from "core/Utils/utils";
import { cloneDeep } from "lodash";

const checkConfigurationHandler = (
  p_prevAction,
  p_uniqueRowId,
  p_isChecked,
  setPrevAction,
  setCheckConfiguration
) => {
  let l_currentAction;
  if (p_isChecked) {
    l_currentAction = "checkedRows";
    setPrevAction(l_currentAction);
  } else {
    l_currentAction = "unCheckedRows";
    setPrevAction(l_currentAction);
  }
  let l_newAction = {};
  l_newAction[l_currentAction] = [p_uniqueRowId];
  setCheckConfiguration((p_oldConfigs) => {
    if (p_prevAction === l_currentAction) {
      let l_newConfigs = cloneDeep(p_oldConfigs);
      let l_lastValueIndex = getLastIndex(l_newConfigs);
      let l_checekdRows = l_newConfigs[l_lastValueIndex];
      l_checekdRows?.[l_currentAction]?.push(p_uniqueRowId);
      l_newConfigs.pop();
      return [...l_newConfigs, l_checekdRows];
    } else {
      return [...p_oldConfigs, l_newAction];
    }
  });
};

export const checkAllHandler = ({
  p_instance,
  p_checkAll,
  setPrevAction,
  setCheckConfiguration,
  setIsSelectAllRecords,
}) => {
  let l_newAction = {
    searchColumns: getFilterModelForFilteredCols(p_instance),
  };
  if (p_checkAll) {
    setIsSelectAllRecords(true);
    setPrevAction("checkAll");
    l_newAction["checkAll"] = true;
  } else {
    setIsSelectAllRecords(false);
    setPrevAction("unCheckAll");
    l_newAction["unCheckAll"] = true;
  }
  setCheckConfiguration((old) => [...old, l_newAction]);
};

export const checkRowHandler = ({
  p_instance,
  props,
  setPrevAction,
  setCheckConfiguration,
}) => {
  let { rowModelType, onRowSelected, uniqueRowId } = props;
  if (rowModelType === "serverSide" || rowModelType === "infinite") {
    let l_prevAction = p_instance?.api?.prevAction || "";
    let l_uniqueRowId = p_instance?.data?.[uniqueRowId];
    checkConfigurationHandler(
      l_prevAction,
      l_uniqueRowId,
      p_instance?.node?.selected,
      setPrevAction,
      setCheckConfiguration
    );
  } else {
    onRowSelected(p_instance);
  }
};

export const getFilterModelForFilteredCols = (p_instance) => {
  try {
    let updatedFilterModel = p_instance?.api?.getFilterModel();
    const colDefs = p_instance?.api?.getColumnDefs();
    for (const property in updatedFilterModel) {
      colDefs.forEach((col) => {
        if(col.column_name === property && col.type === "list") {
          updatedFilterModel[property].filterType = col.type;
        }
      })
    }
    return updatedFilterModel;
  }
  catch(error) {
    console.error("getFilterModelForFilteredCols error", error)
    return {};
  }
}
