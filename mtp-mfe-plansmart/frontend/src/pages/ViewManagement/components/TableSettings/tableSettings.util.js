import { get, isEmpty, omitBy } from "lodash";
import {
  TABLE_SETTINGS_VIEW_TYPE,
  TABLE_SETTINGS_ACCESSOR_TYPE,
  TABLE_SETTINGS_CATEGORY
} from "../../viewManagement.constant";

export const handleTableSettingsChange = ({
  currentVersion,
  option,
  setting,
  setActiveViewMetricsData,
  setActiveViewSettingsData,
  setGridSettings,
  setTableShowHideMetricsData,
  showHideMetricsData,
  tableRef,
  updatedSettings,
  versionVarianceMap
}) => {
  const settingViewIndex = updatedSettings.findIndex(
    ({ key }) => key === setting.key
  );

  if (setting.viewType === TABLE_SETTINGS_VIEW_TYPE.CHECKBOX_LIST) {
    const optionIndex = updatedSettings[settingViewIndex].options.findIndex(
      ({ category }) => category === option.category
    );
    updatedSettings[settingViewIndex].options[
      optionIndex
    ].checked = !updatedSettings[settingViewIndex].options[optionIndex].checked;
  } else if (setting.viewType === TABLE_SETTINGS_VIEW_TYPE.TOGGLE) {
    updatedSettings[settingViewIndex].selected = !updatedSettings[
      settingViewIndex
    ].selected;
  }

  applyTableSettings({
    currentVersion,
    showHideMetricsData,
    settings: updatedSettings,
    setActiveViewMetricsData,
    setTableShowHideMetricsData,
    setGridSettings,
    tableRef,
    versionVarianceMap
  });
  setActiveViewSettingsData(updatedSettings);
};

const isMetricValueSelected = (metricData, metricOption) => {
  let isMetricChecked = false;

  metricData?.forEach((item) => {
    if (metricOption.includes(item.label) && item.isChecked) {
      isMetricChecked = true;
    }
  });

  return isMetricChecked;
};

const hideProductHierarchyRow = ({ setGridSettings, settings }) => {
  const prodHierarchyStatus = settings
    ?.filter((item) => item.key === TABLE_SETTINGS_CATEGORY.PRODUCT_KEY)[0]
    ?.options?.filter((item) => !item.checked)
    .map((item) => ({
      label: item.label,
      hierarchyKey: item.category,
      display: item.checked
    }));

  setGridSettings(prodHierarchyStatus);
};

const hideVersionVarianceRow = ({
  settings,
  setActiveViewMetricsData,
  setTableShowHideMetricsData,
  showHideMetricsData,
  currentVersion,
  versionVarianceMap
}) => {
  const updatedVersionVarianceMap = omitBy(
    versionVarianceMap,
    (value) => value === currentVersion
  );
  const toggleOptions = settings?.filter(
    (setting) => setting.viewType === TABLE_SETTINGS_VIEW_TYPE.TOGGLE
  );

  const versionList = Object.values(updatedVersionVarianceMap);
  const varianceList = Object.keys(updatedVersionVarianceMap);

  const versionCheckedState = toggleOptions?.filter(
    (option) => option.key === TABLE_SETTINGS_CATEGORY.VERSION_KEY
  )[0]?.selected;
  const varianceCheckedState = toggleOptions?.filter(
    (option) => option.key === TABLE_SETTINGS_CATEGORY.VARIANCE_KEY
  )[0]?.selected;

  const isVersionMetricSelected = isMetricValueSelected(
    showHideMetricsData[1],
    Object.values(updatedVersionVarianceMap)
  );
  const isVarianceMetricSelected = isMetricValueSelected(
    showHideMetricsData[1],
    Object.keys(updatedVersionVarianceMap)
  );

  const updatedMetricsData = showHideMetricsData[1]?.map((metricData) => {
    let isChecked = metricData.isChecked;

    if (versionList.includes(metricData?.label)) {
      isChecked = versionCheckedState
        ? isVersionMetricSelected
          ? metricData.isChecked
          : true
        : false;
    } else if (varianceList.includes(metricData?.label)) {
      isChecked = varianceCheckedState
        ? isVarianceMetricSelected
          ? metricData.isChecked
          : true
        : false;
    }

    return {
      ...metricData,
      isChecked: isChecked
    };
  });
  setActiveViewMetricsData([[...showHideMetricsData[0]], updatedMetricsData]);
  setTableShowHideMetricsData([
    [...showHideMetricsData[0]],
    updatedMetricsData
  ]);
};

export const applyTableSettings = ({
  currentVersion,
  showHideMetricsData,
  settings,
  setActiveViewMetricsData,
  setGridSettings,
  setTableShowHideMetricsData,
  tableRef,
  versionVarianceMap
}) => {
  if (isEmpty(settings)) return;

  const allColumns = tableRef?.current?.columnApi?.getAllColumns();
  tableRef?.current?.columnApi?.setColumnsVisible(allColumns, false);

  const allSettingsCategories = settings.flatMap((item) => {
    if (item.options) {
      return item.options?.map((option) => option.category);
    }
    return [];
  });

  const selectedViewCategories = settings
    ?.filter(
      (setting) => setting.accessorType === TABLE_SETTINGS_ACCESSOR_TYPE.COLUMN
    )
    .reduce((acc, setting) => {
      const views = setting.options
        ?.filter((option) => option.checked)
        ?.map((option) => option.category);
      return acc.concat(...views);
    }, []);

  const filteredColumns = allColumns?.filter((column) => {
    const categoryArr = get(column, "colDef.extra.category", []);
    const isHidden = get(column, "colDef.is_hidden", false);

    if (
      (categoryArr.length === 0 && !isHidden) ||
      !categoryArr.every((element) => allSettingsCategories.includes(element))
    ) {
      return true;
    }
    return categoryArr?.every(
      (category) => selectedViewCategories.includes(category) && !isHidden
    );
  });

  hideProductHierarchyRow({ setGridSettings, settings });
  hideVersionVarianceRow({
    settings,
    setActiveViewMetricsData,
    setTableShowHideMetricsData,
    showHideMetricsData,
    currentVersion,
    versionVarianceMap
  });

  tableRef?.current?.columnApi?.setColumnsVisible(filteredColumns, true);
};
