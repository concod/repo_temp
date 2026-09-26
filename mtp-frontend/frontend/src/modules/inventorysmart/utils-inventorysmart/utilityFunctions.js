import { saveAs } from "file-saver";
export const getDisplayableValueBasedOnTenant = (
  p_data,
  p_defaultKey,
  p_mapping
) => {
  let l_mappingKey = p_mapping?.[p_defaultKey];
  if (l_mappingKey) {
    return p_data[l_mappingKey];
  }
  return p_data[p_defaultKey];
};

export const saveFile = (data, fileName) => {
  const EXCEL_TYPE =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
  const blob = new Blob([data], { type: EXCEL_TYPE });
  saveAs(blob, fileName);
};

export const removeDuplicatesByProperty = (p_inputArray, p_property) => {
  const l_seenValues = new Set();
  return p_inputArray?.filter((item) => {
    if (!l_seenValues?.has(item?.[p_property])) {
      l_seenValues?.add(item?.[p_property]);
      return true;
    }
    return false;
  });
};

export const filterByProperties = (input1, input2) => {
  const { allocation_code = [], user_id = [] } = input2;
  return input1?.filter(
    (item) =>
      (allocation_code.length === 0 ||
        allocation_code.includes(item.allocation_code)) &&
      (user_id.length === 0 || user_id.includes(item.user_id))
  );
};

export const getExtraParamsFromColumns = (data) => {
  return data
    .filter((item) => item.extra && item.extra.isLevelPresent)
    .map((item) => item.extra);
};
export const getExtrakeyParamsFromColumns = (data) => {
  return data
    .filter((item) => item.extra && item.extra.NoDownloadEstimationMessage)
    .map((item) => item.extra);
};

export const getModuleVisibility = (permissions) => permissions.length;

export const getTabItemVisibility = (modulePermissions, tabPermissions) => {
  let displayFlag = false;
  if (tabPermissions) {
    for (const subModule of tabPermissions) {
      const userSubModulePermissions = modulePermissions?.[subModule] || [];

      if (getModuleVisibility(userSubModulePermissions)) {
        displayFlag = true;

        break;
      }
    }
  }
  return displayFlag;
};
