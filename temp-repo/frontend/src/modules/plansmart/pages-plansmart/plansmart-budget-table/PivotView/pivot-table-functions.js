import groupBy from "lodash/groupBy";
import {
  getPivotColDefAPI,
  getPivotDataAPI,
} from "modules/plansmart/services-plansmart/BudgetPlanTable/budget-plan-table-service";
import {
  pivotColDef,
  pivotData,
} from "modules/plansmart/utils-plansmart/pivotViewPayload";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";

export const getFilterOptions = ({ viewType, tableData }) => {
  const { value: viewTypeValue } = viewType;
  let groupedObj = null;
  if (viewTypeValue === "kpi_view" || viewTypeValue === "ver_view") {
    groupedObj = groupBy(tableData, (data) => data.metric);
  } else if (
    viewTypeValue === "tmln_view" ||
    viewTypeValue === "prd_hier_view"
  ) {
    groupedObj = groupBy(tableData, (data) => data.season);
  }
  if (groupedObj) {
    const list = Object.keys(groupedObj).map((groupKey) => ({
      label: groupKey,
      value: groupedObj[groupKey],
    }));
    return list;
  }
  return [];
};

export const fetchPivotColumnDef = async ({ viewType, reqBody }) => {
  // const response = pivotColDef;
  try {
    const response = await getPivotColDefAPI(reqBody)();
    const responseData = response.data.data;
    const formattedResponse =
      viewType.value === "kpi_view"
        ? agGridColumnFormatter(responseData.kpi_view)
        : viewType.value === "tmln_view"
        ? agGridColumnFormatter(responseData.tmln_view)
        : viewType.value === "prd_hier_view"
        ? agGridColumnFormatter(responseData.prd_hier_view)
        : viewType.value === "ver_view" &&
          agGridColumnFormatter(responseData.ver_view);
    return {
      columns: formattedResponse.map((resp) => ({
        ...resp,
        hide: resp.is_hidden,
      })),
      hierarchyKeys: responseData.hierarchyKeys,
      columnResponse: response.columns,
    };
  } catch (error) {
    return {
      columns: [],
      hierarchyKeys: [],
      columnResponse: {},
    };
  }
};

export const fetchPivotData = async ({ hierarchyKeys, viewType, reqBody }) => {
  try {
    // const response = pivotData;
    const response = await getPivotDataAPI(reqBody)();
    const responseData = response?.data?.data;
    const parsedData =
      viewType.value === "kpi_view"
        ? pivotKpiViewDataParser(responseData, hierarchyKeys)
        : viewType.value === "tmln_view"
        ? pivotTimelineViewDataParser(responseData)
        : viewType.value === "prd_hier_view"
        ? pivotTimelineViewDataParser(responseData)
        : viewType.value === "ver_view"
        ? pivotVersionDataParser(responseData)
        : [];
    return {
      parsedData: parsedData,
      responseData: response,
    };
  } catch (error) {
    return {
      parsedData: [],
      responseData: {},
    };
  }
};

const pivotVersionDataParser = (pivotObj) => {
  const result = [];
  const metricObj = pivotObj.metrics;
  const refColMapping = pivotObj.ref_col_mapping;
  Object.keys(metricObj).forEach((metricKey, metricInx) => {
    const metricData = metricObj[metricKey];
    Object.keys(metricData).forEach((referenceKey, referenceInx) => {
      const referenceData = metricData[referenceKey];
      result.push({
        metricKey: metricKey,
        referenceKey: referenceKey,
        metric: refColMapping[metricKey],
        reference: refColMapping[referenceKey] || "WP",
        ...referenceData,
        uniqueId: metricKey + referenceKey + metricInx + referenceInx,
      });
    });
  });
  return result;
};

const pivotProductHierarchyDataParser = (pivotObj) => {
  const result = [];
  const metricObj = pivotObj.prd_hier_view.metrics;
  const refColMapping = pivotObj.prd_hier_view.ref_col_mapping;
  Object.keys(metricObj).forEach((seasonKey) => {
    const seasonData = metricObj[seasonKey];
    Object.keys(seasonData).forEach((monthKey) => {
      const monthData = seasonData[monthKey];
      Object.keys(monthData).forEach((weekKey) => {
        const weekData = monthData[weekKey];
        result.push({
          seasonKey: seasonKey,
          season: refColMapping[seasonKey],
          monthKey: monthKey,
          month: refColMapping[monthKey],
          weekKey: weekKey,
          week: refColMapping[weekKey],
          ...weekData,
          uniqueId: seasonKey + monthKey + weekKey,
        });
      });
    });
  });
  return result;
};

const pivotTimelineViewDataParser = (pivotObj) => {
  const result = [];
  const metricObj = pivotObj.metrics;
  const refColMapping = pivotObj.ref_col_mapping;
  Object.keys(metricObj).forEach((seasonKey, seasonInx) => {
    const seasonCategories = metricObj[seasonKey].subcategory;
    const seasonValue = metricObj[seasonKey].value;
    Object.keys(seasonCategories).forEach((monthKey, monthInx) => {
      const monthCategories = seasonCategories[monthKey].subcategory;
      const monthValue = seasonCategories[monthKey].value;
      Object.keys(monthCategories).forEach((weekKey, weekInx) => {
        const weekValue = monthCategories[weekKey].value;
        result.push({
          seasonKey: seasonKey,
          [seasonKey]: seasonValue,
          [refColMapping[monthKey]]: monthValue,
          season: seasonKey,
          monthKey: monthKey,
          month: refColMapping[monthKey],
          weekKey: weekKey,
          week: refColMapping[weekKey],
          ...weekValue,
          uniqueId:
            seasonKey + monthKey + weekKey + seasonInx + monthInx + weekInx,
        });
      });
    });
  });
  return result;
};

const pivotKpiViewDataParser = (pivotObj, hierarchyKeys) => {
  const result = [];
  const metricObj = pivotObj.metrics;
  const refColMapping = pivotObj.ref_col_mapping;
  const kpiRecursion = (
    objWithHierarchyValue = {},
    productHierarchyObj,
    hierarchyKey,
    inx = 0
  ) => {
    if (productHierarchyObj[hierarchyKey].subcategory) {
      const nestedHeirarchy = Object.keys(
        productHierarchyObj[hierarchyKey].subcategory
      )[0];
      kpiRecursion(
        {
          ...objWithHierarchyValue,
          [`${hierarchyKeys[inx]}_value`]: productHierarchyObj[hierarchyKey]
            .value,
          [hierarchyKeys[inx]]: hierarchyKey,
          [`${hierarchyKey}_inx`]: inx,
          uniqueId:
            objWithHierarchyValue.uniqueId ||
            "" + inx + hierarchyKey + hierarchyKeys[inx],
        },
        productHierarchyObj[hierarchyKey].subcategory,
        nestedHeirarchy,
        inx + 1
      );
    } else {
      result.push({
        [hierarchyKeys[inx]]: hierarchyKey,
        ...objWithHierarchyValue,
        ...productHierarchyObj[hierarchyKey].value,
        uniqueId: objWithHierarchyValue.uniqueId + inx + hierarchyKey,
      });
    }
    Object.keys(productHierarchyObj);
  };
  Object.keys(metricObj).forEach((metricKey) => {
    if (metricObj[metricKey].subcategory) {
      kpiRecursion(
        {
          [refColMapping[metricKey]]: metricObj[metricKey].value,
          metric: refColMapping[metricKey],
          uniqueId: metricKey,
        },
        metricObj[metricKey].subcategory,
        Object.keys(metricObj[metricKey].subcategory)[0],
        0
      );
    }
  });
  return result;
};

export const handleShowHideData = ({
  selectedOptions,
  pivotTableRef,
  tableData,
  viewType,
}) => {
  const { value: viewTypeValue } = viewType;
  const { parsedData } = tableData;
  const selectedOptionLabelList = selectedOptions.map((option) => option.label);
  let result = parsedData;
  if (viewTypeValue === "kpi_view" || viewTypeValue === "ver_view") {
    result = parsedData.map((data) => ({
      ...data,
      hide: selectedOptionLabelList.indexOf(data.metric) === -1,
    }));
    pivotTableRef.current.api.setRowData(result);
  } else if (
    viewTypeValue === "tmln_view" ||
    viewTypeValue === "prd_hier_view"
  ) {
    result = parsedData.map((data) => ({
      ...data,
      hide: selectedOptionLabelList.indexOf(data.season) === -1,
    }));
    pivotTableRef.current.api.refreshCells({
      force: true,
      update: result,
    });
  }
  return {
    ...tableData,
    parsedData: result,
  };
};

export const getVersionList = (tableData = []) => {
  const result = [];
  tableData.slice(0, 10).forEach((data) => {
    const isPresent = result.some(
      (initialData) => initialData.value === data.version
    );
    if (!isPresent) {
      result.push({
        label: data.version,
        value: data.version,
      });
    }
  });
  return result;
};
