import { isUndefined } from "lodash";
/**
 * This function converts filter dependency into format needed for the filter payload
 * attribute_name = filter attribute name
 * operator = query operation type
 * column_name is same as attribute name
 * dimension = product or store or others
 * values = selected values in the dropdown
 * filter_type = cascased or non cascaded
 */
export const getDependency = (selectedFilters) => {
  return selectedFilters
    ? selectedFilters.map((item) => {
      return {
        attribute_name: item.filter_id,
        operator: "in",
        column_name: item.filter_id,
        dimension: item.dimension || "product",
        values: Array.isArray(item.values)
          ? item.values.map((opt) => {
            if (isUndefined(opt?.value)) {
              return opt;
            }
            return opt.value;
          })
          : item.values,
        filter_type: item.filter_type,
      };
    })
    : [];
};

/**
 *
 * @param {object} body
 * @param {array} selectedFilters
 * @param {string} type
 * @param {string} selectedGroupType
 * @param {array or object} manualDefinitionFilter
 * @param {string} selectedManualFilterType
 * @param {object} selectedCluster
 * @returns dependency
 *
 * This function is used to get api payload for product and style level tables
 */
export const getTableAPIFiltersForCreateGroup = (
  body,
  selectedFilters,
  type,
  selectedGroupType,
  manualDefinitionFilter,
  selectedManualFilterType,
  selectedCluster = {}
) => {
  let manualbody = {};
  if (type === "product" && selectedGroupType !== "manual") {
    let dependency = getDependency(selectedFilters);
    manualbody = {
      filters: dependency,
      meta: { ...body },
      definitions: [],
      metrics: [],
      request_id: selectedCluster.id,
    };
  } else {
    if (selectedManualFilterType === "grouping_definitions") {
      manualbody = {
        filters: [],
        meta: { ...body },
        definitions: Array.isArray(manualDefinitionFilter)
          ? manualDefinitionFilter.map((defn) => defn.pgd_code)
          : [manualDefinitionFilter.pgd_code],
        metrics: [],
      };
    } else {
      let dependency = getDependency(selectedFilters);
      manualbody = {
        filters: dependency,
        meta: { ...body },
        definitions: [],
        metrics: [],
      };
    }
  }
  return manualbody;
};

/**
 *
 * @param {object} manualbody
 * @param {number} pageIndex
 * @param {number} _pageSize
 * @param {object} APIFunction
 * @param {boolean} isEdit
 * @param {string} type
 * @param {string} pathname
 * This function is used to fetch the data for the product and style level tables in both
 * create and edit group scenarios
 * API function has fetch function and set function
 * pathname has product code appended in the url, so splitting it to get the product code
 */
export const fetchDataForTable = async (
  manualbody,
  pageIndex,
  pageSize,
  APIFunction,
  isEdit,
  type,
  pathname = "",
  level
) => {
  if (isEdit) {
    const grpId = pathname.split("/")[3];
    const res = await APIFunction[type][0](manualbody, grpId, pageIndex, pageSize, level);
    APIFunction[type][1]({ data: res.data.data, count: res.data.total });
    return {
      data: res.data.data,
      totalCount: res.data.total,
    };
  } else {
    const res = await APIFunction[type][0](manualbody, "", pageIndex, pageSize, level);
    APIFunction[type][1]({ data: res.data.data, count: res.data.total });
    return {
      data: res.data.data,
      totalCount: res.data.total,
    };
  }
};

export const addMinMaxToRangeFilter = (cols) => {
  return cols.map((col) => {
    if (col.showRangeFilter) {
      return {
        ...col,
        min_max_range: {
          min: 0,
          max: 100,
        },
      };
    }
    return col;
  });
};

export const filterProductsOrGroupsArray = (
  rows,
  filteredProductsOrGroups,
  colKey
) => {
  return filteredProductsOrGroups.filter((row) => {
    return !rows.some((selection) => {
      return selection[colKey] === row[colKey];
    });
  });
};

export const filterSelectionArray = (
  deletedRows,
  selectedProductsOrGroups,
  colKey,
  isIncluded = false
) => {
  return selectedProductsOrGroups.filter((prodOrGrp) => {
    const deleteRowsCondn = deletedRows.some((selection) => {
      return selection[colKey] === prodOrGrp[colKey];
    });
    return isIncluded ? deleteRowsCondn : !deleteRowsCondn;
  });
};

/**
 *
 * @param {array} iterableProductsOrProductGrpsArray
 * @param {array} deletedEditProductsOrProductGroups
 * @param {array} newEditProductsOrProductGroups
 * @param {object} editOrDeleteUpdateObject
 * @param {string} colKey
 * @param {boolean} isNegation
 * @returns object
 *
 * This function, updates editOrDeleteUpdateObject with included, excluded in both edit and delete
 */
export const modifyEditOrDeleteUpdateObject = (
  iterableProductsOrProductGrpsArray,
  deletedEditProductsOrProductGroups,
  newEditProductsOrProductGroups,
  editOrDeleteUpdateObject,
  colKey,
  isNegation = false
) => {
  iterableProductsOrProductGrpsArray.forEach((productOrGroup, _idx) => {
    const deleteEditProductsOrGroupsCondn =
      deletedEditProductsOrProductGroups.some((del) => {
        return del[colKey] === productOrGroup[colKey];
      });
    const newEditProductOrGroupsCondn = newEditProductsOrProductGroups.some(
      (newone) => {
        return newone[colKey] === productOrGroup[colKey];
      }
    );

    if (productOrGroup.is_mapped) {
      if (!isNegation && deleteEditProductsOrGroupsCondn) {
        editOrDeleteUpdateObject.should_exclude_in_delete.push(productOrGroup);
      }
      if (isNegation && !deleteEditProductsOrGroupsCondn) {
        editOrDeleteUpdateObject.should_include_in_delete.push(productOrGroup);
      }
    } else {
      if (!isNegation && !newEditProductOrGroupsCondn) {
        editOrDeleteUpdateObject.should_include_in_new.push(productOrGroup);
      }
      if (isNegation && newEditProductOrGroupsCondn) {
        editOrDeleteUpdateObject.should_exclude_in_new.push(productOrGroup);
      }
    }
  });
  return editOrDeleteUpdateObject;
};

/**
 *
 * @param {array} deletedEditProductsOrProductGroups
 * @param {array} newEditProductsOrProductGroups
 * @param {object} editOrDeleteUpdateObject
 * @param {string} colKey
 * @returns list of updated edit and updated delete
 */
export const updateEditLevelData = (
  deletedEditProductsOrProductGroups,
  newEditProductsOrProductGroups,
  editOrDeleteUpdateObject,
  colKey
) => {
  let updatedDelete = deletedEditProductsOrProductGroups.filter((del) => {
    return !editOrDeleteUpdateObject.should_exclude_in_delete.some(
      (exclude) => {
        return exclude[colKey] === del[colKey];
      }
    );
  });
  updatedDelete = [
    ...updatedDelete,
    ...editOrDeleteUpdateObject.should_include_in_delete,
  ];
  let updatedNew = newEditProductsOrProductGroups.filter((newone) => {
    return !editOrDeleteUpdateObject.should_exclude_in_new.some((exclude) => {
      return newone[colKey] === exclude[colKey];
    });
  });
  updatedNew = [
    ...updatedNew,
    ...editOrDeleteUpdateObject.should_include_in_new,
  ];
  return [updatedDelete, updatedNew];
};

/**
 *
 * @param {Materail UI link component} Link
 * @param {useNavigate hook reference} navigate
 * @returns cellRenderer call back function
 *
 * This functions takes in Link component and navigate hook as parameters
 * It returns cell Renderer function for aggrid cell.
 * Cell Renderer consists of Link component if a group is created by using definition else
 * it returns "-"
 * Rendering of links will be in form of comma seperated form. All the definitions that are part of the group will be
 * seperated by comma and each definition would be in the form of link
 */
export const renderDefinitionLink = (Link, navigate) => {
  return (params, extraProps) => {
    return params.data.special_classification !== "manual" ||
      !params.data.product_group_definitions ||
      params.data.product_group_definitions === 0
      ? "-"
      : params.data.product_group_definitions
        .map((definitionInfo) => (
          <Link
            component="button"
            variant="body2"
            onClick={() => {
              navigate(
                `/product-grouping/group-definition-mapping/${params.data.pg_code}`,
                {
                  state: { groupObj: params.data },
                }
              );
            }}
          >
            {definitionInfo.name}
          </Link>
        ))
        .reduce((prev, curr) => [prev, ", ", curr]);
  };
};
