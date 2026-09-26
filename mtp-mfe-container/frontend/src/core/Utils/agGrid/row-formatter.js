import { isEmpty } from "lodash";

const getLowerCase = (p_string = "") => {
  return p_string.toLocaleLowerCase();
};

const applyFiltersForDataSet = (
  p_searchTermReq,
  p_checkedArticles,
  p_finalData
) => {
  for (let i in p_searchTermReq) {
    let l_updatedRows = !isEmpty(p_checkedArticles)
      ? p_checkedArticles
      : p_finalData;
    if (p_searchTermReq[i].filter?.includes(",")) {
      let l_searchTerms = getLowerCase(p_searchTermReq[i].filter)?.split(",");
      p_checkedArticles = l_updatedRows.filter((val) =>
        l_searchTerms.includes(getLowerCase(val[i]))
      );
    } else if (p_searchTermReq[i].type === "contains") {
      p_checkedArticles = l_updatedRows.filter((val) =>
        getLowerCase(val[i]).includes(getLowerCase(p_searchTermReq[i].filter))
      );
    }
    if (p_searchTermReq[i].type === "range") {
      p_checkedArticles = l_updatedRows.filter(
        (val) =>
          val[i] >= (p_searchTermReq[i].filter?.min || 0) &&
          val[i] <= (p_searchTermReq[i].filter?.max || Math.min())
      );
    }
    if (p_searchTermReq[i].type === "array") {
      p_checkedArticles = l_updatedRows.filter((val) =>
        p_searchTermReq[i].values.includes(val[i])
      );
    }
  }
  return p_checkedArticles;
};

export const agGridRowFormatter = (p_data, p_config, p_uniqueRowId) => {
  if (!isEmpty(p_config)) {
    let l_finalCheckedRows = [],
      l_uniqueRowData = p_data.map((val) => val?.[p_uniqueRowId]);
    p_config.forEach((config) => {
      if (config.checkedRows?.length) {
        let checked = config.checkedRows;
        let l_checkedArticles = l_uniqueRowData.filter((cellData) =>
          checked.includes(cellData)
        );
        l_finalCheckedRows = [...l_finalCheckedRows, ...l_checkedArticles];
      }
      if (config.unCheckedRows?.length) {
        let unchecked = config.unCheckedRows;
        l_finalCheckedRows = l_finalCheckedRows.filter(
          (val) => !unchecked.includes(val)
        );
      }
      if (config.checkAll) {
        let l_searchTermReq = config.searchColumns,
          l_checkedArticles = [];
        if (!isEmpty(l_searchTermReq)) {
          l_checkedArticles = applyFiltersForDataSet(
            l_searchTermReq,
            l_checkedArticles,
            p_data
          );
        } else {
          l_checkedArticles = p_data;
        }
        let l_updatedArticlesWithFilters = l_checkedArticles?.map(
          (val) => val?.[p_uniqueRowId]
        );
        l_finalCheckedRows = [
          ...l_finalCheckedRows,
          ...l_updatedArticlesWithFilters,
        ];
      }
      if (config.unCheckAll) {
        let l_searchTermReq = config.searchColumns,
          l_checkedArticles = [];
        if (!isEmpty(l_searchTermReq)) {
          l_checkedArticles = applyFiltersForDataSet(
            l_searchTermReq,
            l_checkedArticles,
            p_data
          );
        } else {
          l_checkedArticles = p_data;
        }
        let l_updatedArticlesWithFilters = l_checkedArticles?.map(
          (val) => val?.[p_uniqueRowId]
        );
        l_finalCheckedRows = l_finalCheckedRows.filter(
          (val) => !l_updatedArticlesWithFilters.includes(val)
        );
      }
    });
    return p_data.map((val) => {
      return {
        ...val,
        is_selected: l_finalCheckedRows?.includes(val?.[p_uniqueRowId]) || val?.is_selected || false,
      };
    });
  } else {
    return p_data.map((val) => {
      return {
        ...val,
        is_selected: val?.is_selected || false,
      };
    });
  }
};
