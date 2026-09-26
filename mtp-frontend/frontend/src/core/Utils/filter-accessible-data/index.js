import { getHierarchyAccessDetails } from "core/actions/userAccessActions";

export const getAccessHierarchy = async () => {
  const currentAppName = sessionStorage.getItem("currentApp")
    ? sessionStorage.getItem("currentApp")
    : window.location.pathname.split('/')[1].split('-').join(''); 
  const accessData = await getHierarchyAccessDetails(
    currentAppName?.toLowerCase(),
    "all"
  );
  return accessData.data.data;
};

const checkAccess = (row, access, accessData) => {
  let accessList = [];

  if (accessData[access]) {
    accessList = accessData[access].filter((accessRow) => {
      let accessFlag = false;
      for (let level in accessRow) {
        if (level !== "id" && row[level]) {
          if (Array.isArray(row[level])) {
            accessFlag = row[level].every((l1) => accessRow[level].includes(l1))
              ? true
              : false;
          } else {
            accessFlag = accessRow[level] === row[level] ? true : false;
          }
          if (!accessFlag) return false;
        }
      }
      return accessFlag;
    });
  }

  return accessList;
};

export const filterAccessibleTableData = (rows, userAccessList) => {
  let filteredRows = [];
  let isSuperUser = hasSuperUserAccess(userAccessList);

  if (isSuperUser) {
    return rows;
  }

  filteredRows = rows.map((row) => {
    try {
      let shouldApprove = checkAccess(row, "approve", userAccessList);
      let shouldEdit = checkAccess(row, "edit", userAccessList);
      let shouldCreate = checkAccess(row, "create", userAccessList);
      let shouldDelete = checkAccess(row, "delete", userAccessList);

      if (!shouldApprove.length) {
        row.disableApproveSelection = true;
      }

      if (!shouldEdit.length) {
        row.disableEditSelection = true;
      }

      if (!shouldCreate.length) {
        row.disableCreateSelection = true;
      }

      if (!shouldDelete.length) {
        row.disableDeleteSelection = true;
      }

      return row;
    } catch (error) {
      console.log(error);
    }
  });

  return filteredRows;
};

export const filterHierarchyOptions = (
  options,
  hierarchy,
  accessData,
  access = "edit",
  isReadAllowed = false
) => {
  let filteredOptions = [];
  //commenting this code because of access issue options not populating on create new plan assort
  // if (!isReadAllowed) {
  //   if (accessData && Object.keys(accessData).length) {
  //     if (accessData.hasOwnProperty("*")) {
  //       return options;
  //     }
  //     if (accessData[access][hierarchy]) {
  //       return accessData[access][hierarchy].map((option) => {
  //         return {
  //           attribute: option,
  //         };
  //       });
  //     } else {
  //       return options;
  //     }
  //   } else {
  //     return [];
  //   }
  // }
  if (options) {
    return options;
  }
  return filteredOptions;
};

// groups all access filters together
export const getAllAccessTypeData = (accessData, accessType) => {
  let accessTypeData = {};

  if (Array.isArray(accessData[accessType])) {
    accessData[accessType].forEach((ele) => {
      Object.keys(ele).forEach((key) => {
        if (key != "id") {
          if (!accessTypeData[key]) {
            accessTypeData[key] = [];
            accessTypeData[key].push(ele[key]);
          } else {
            if (!accessTypeData[key].includes(ele[key])) {
              accessTypeData[key].push(ele[key]);
            }
          }
        }
      });
    });
  }
  return accessTypeData;
};

// returns modified filter data based on user access
export const getFilterAccessibleValues = (filterConfigData, accessTypeData) => {
  return filterConfigData.map((field) => {
    // commetting this out due so some issue in access data
    // if (Object.keys(accessTypeData).includes(field.accessor)) {
    //   field.options = field.options.filter((fieldOption) => {
    //     return accessTypeData[field.accessor].includes(fieldOption.value);
    //   });
    // }
    return field;
  });
};

// table row selection based on user access
export const customAccessRowSelection = (instance, event) => {
  instance.rows.forEach((row) => {
    !row.original.disableDeleteSelection &&
      instance.toggleRowSelected(row.id, event.currentTarget.checked);
  });
};

export const hasSuperUserAccess = (accessData) => {
  let accessTypes = Object.keys(accessData);
  let isSuperUser = false;
  if (accessData && accessTypes.length) {
    accessTypes.forEach((type) => {
      isSuperUser = Object.keys(accessData[type]).length ? false : true;
    });
  }
  return isSuperUser;
};

/**
 * adds the missing filter keys in reqBody
 * @param {Array} requiredKeys - array of keys required in response [l0, l1...]
 * @param {Array} reqBody - request body of filter
 * @returns Array - updated reqBody with all required hierarchy keys
 */
export const addRequiredFilterKeys = (requiredKeys, reqBody) => {
  const reqBodyKeys = reqBody.map((level) => {
    return level.attribute_name;
  });

  requiredKeys.forEach((key) => {
    if (!reqBodyKeys.includes(key)) {
      reqBody.push({ attribute_name: key, operator: "in", values: [] });
    }
  });

  return reqBody;
};
