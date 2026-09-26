/**
 *
 * @param {object} metricObj specific metric object
 * @param {string} key metric name
 * @param {int} inx specific metric index
 * @param {bool} editable to know about that metric is editable or not
 * @returns an formatted object for Ag grid table
 */
export const getGenericMetricObj = (metricObj, key, inx, editable) => {
  const metricLabel = metricObj.label;
  const metricData = metricObj;
  const obj = {
    metric: metricLabel,
    ...metricData,
    uniqueId: metricLabel + inx,
    editable: editable,
    metricKey: key,
  };
  obj.lock = metricObj.lock || "";
  return obj;
};

/**
 *
 * @param {array} dependentKpi it is an list of dependent kpi
 * @returns it returns only the label of dependent kpi string to show in the Ag grid table
 */

const getDependencyAsStr = (dependentKpi) =>
  dependentKpi.map((data) => data.label).join(", ");

/**
 *
 * @param {object} metricObj it is editable and non editable metric data from the API response
 * @returns it returns an list of object for the Ag grid table
 */

export const metricDataParser = (metricObj) => {
  const { editable, non_editable } = metricObj;
  const result = [];

  Object.keys(editable).forEach((key, inx) => {
    const metricData = editable[key];
    const obj = getGenericMetricObj(metricData, key, inx, true);
    obj.lockDropdownValues = metricData.lock_dropdown_values || [];
    if (metricData.dependent_kpi[metricData.lock]) {
      obj.dependency = getDependencyAsStr(
        metricData.dependent_kpi[metricData.lock]
      );
      obj.dependent_kpi = metricData.dependent_kpi;
    }
    result.push(obj);
  });

  Object.keys(non_editable).forEach((key, inx) => {
    const obj = getGenericMetricObj(non_editable[key], key, inx, false);
    result.push(obj);
  });
  return result;
};

/**
 *
 * @param {list} tableData data from Ag grid table
 * @param {object} metrics it is editable and non editable metric data from API response
 * @returns an object for update API created by conversion of tableData into metrics object
 */

export const getOriginalFormatMetricData = (tableData, metrics) => {
  const editableMetrics = tableData.filter((data) => data.editable);
  const nonEditableMetrics = tableData.filter((data) => !data.editable);

  const createOriginalMetricFormat = (list, specificMetricObj) => {
    return list.reduce((metricObj, data) => {
      const newMetricObj = {};
      Object.keys(specificMetricObj[data.metricKey]).forEach(
        (metricValueKey) => {
          newMetricObj[metricValueKey] = data[metricValueKey];
        }
      );
      return {
        ...metricObj,
        [data.metricKey]: newMetricObj,
      };
    }, {});
  };
  const editableMetricObj = createOriginalMetricFormat(
    editableMetrics,
    metrics.editable
  );

  const nonEditableMetricObj = createOriginalMetricFormat(
    nonEditableMetrics,
    metrics.non_editable
  );

  return {
    metrics: {
      editable: editableMetricObj,
      non_editable: nonEditableMetricObj,
    },
  };
};
