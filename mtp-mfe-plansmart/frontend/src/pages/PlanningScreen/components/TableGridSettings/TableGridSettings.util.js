import { get, isEmpty, noop, omitBy } from "lodash";
import {
  GRID_SETTINGS_ACCESSOR_TYPE,
  GRID_SETTINGS_CATEGORY,
  GRID_SETTINGS_VIEW_TYPE
} from "./constants";

export const handleGridSettingsChange = ({
  option,
  setting,
  setSettings,
  updatedSettings,
  changeCb = noop
}) => {
  const settingViewIndex = updatedSettings.findIndex(
    ({ key }) => key === setting.key
  );

  if (setting.viewType === GRID_SETTINGS_VIEW_TYPE.CHECKBOX_LIST) {
    const optionIndex = updatedSettings[settingViewIndex].options.findIndex(
      ({ category }) => category === option.category
    );
    updatedSettings[settingViewIndex].options[
      optionIndex
    ].checked = !updatedSettings[settingViewIndex].options[optionIndex].checked;
  } else if (setting.viewType === GRID_SETTINGS_VIEW_TYPE.TOGGLE) {
    updatedSettings[settingViewIndex].selected = !updatedSettings[
      settingViewIndex
    ].selected;
  }

  setSettings(updatedSettings);
  changeCb(updatedSettings);
};

export const hideProductHierarchyRow = ({ setGridSettings, settings }) => {
  const prodHierarchyStatus = settings
    ?.filter((item) => item.key === GRID_SETTINGS_CATEGORY.PRODUCT_KEY)[0]
    ?.options?.filter((item) => !item.checked) // Keep only items where checked is false
    .map((item) => ({
      label: item.label,
      hierarchyKey: item.category, // Replaces category with hierarchyKey
      display: item.checked // Replaces checked with display
    }));

  setGridSettings(prodHierarchyStatus);
};

const hideVersionVarianceRow = ({
  settings,
  setShowHideMetricsData,
  showHideMetricsData,
  currentVersion,
  versionVarianceMap
}) => {
  const updatedVersionVarianceMap = omitBy(
    versionVarianceMap,
    (value) => value === currentVersion
  );
  const toggleOptions = settings?.filter(
    (setting) => setting.viewType === GRID_SETTINGS_VIEW_TYPE.TOGGLE
  );

  const versionList = Object.values(updatedVersionVarianceMap);
  const varianceList = Object.keys(updatedVersionVarianceMap);

  const versionCheckedState = toggleOptions?.filter(
    (option) => option.key === GRID_SETTINGS_CATEGORY.VERSION_KEY
  )[0]?.selected;
  const varianceCheckedState = toggleOptions?.filter(
    (option) => option.key === GRID_SETTINGS_CATEGORY.VARIANCE_KEY
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
  setShowHideMetricsData([[...showHideMetricsData[0]], updatedMetricsData]);
};

export const isMetricValueSelected = (metricData, metricOption) => {
  let isMetricChecked = false;

  metricData?.forEach((item) => {
    if (metricOption.includes(item.label) && item.isChecked) {
      isMetricChecked = true;
    }
  });

  return isMetricChecked;
};

export const applyGridSettings = ({
  showHideMetricsData,
  settings,
  setGridSettings,
  tableRef,
  currentVersion,
  versionVarianceMap,
  setShowHideMetricsData,
  applyCallBack = noop
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
      (setting) => setting.accessorType === GRID_SETTINGS_ACCESSOR_TYPE.COLUMN
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
    setShowHideMetricsData,
    showHideMetricsData,
    currentVersion,
    versionVarianceMap
  });

  tableRef?.current?.columnApi?.setColumnsVisible(filteredColumns, true);
  applyCallBack(settings);
};

export const applyShowHideMetricsChange = ({
  setShowHideMetricsData,
  tableRef,
  updatedMetricData
}) => {
  if (isEmpty(updatedMetricData)) return;
  setShowHideMetricsData(updatedMetricData);
  tableRef?.current?.api?.onFilterChanged();
};
