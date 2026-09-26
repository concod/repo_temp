import { capitalize, get } from "lodash";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { groupedByKpiLabel } from "../../../pivotPanel.util";
import {
  dedupeMeasureSelections,
  resolveMeasureVersionLabel,
  resolveMeasureVersionName,
} from "../../../../../../pages-oms/OrderManagement/utils/groupOmsMeasuresForPivotPanel.util.js";
import {
  selectSelectedIds,
  selectKpiMeasures,
  selectCalculatedFieldsSelection,
  setSelectedIds,
  setCalculatedFieldsSelection,
} from "../../../../../../pages-oms/OrderManagement/slices/pivot.slice";

export const useDimensionMeasureState = ({
  axis,
  groupedKpiList,
  setGroupedKpiList,
  draggedKpi,
  setDraggedKpi,
  setMeasuresOpen,
  kpiMeasures: kpiMeasuresProp,
  selectDimensionValues,
}) => {
  const dispatch = useDispatch();
  const selectedIds = useSelector(selectSelectedIds);
  const kpiMeasures = useSelector(selectKpiMeasures);
  const calculatedFieldsSelection = useSelector(selectCalculatedFieldsSelection);

  const [measureVersionList, setMeasureVersionList] = useState(kpiMeasures);

  useEffect(() => {
    setMeasureVersionList(kpiMeasures);
  }, [kpiMeasures]);

  const buildSelectedMetricEntry = (familyKpi, version) => {
    const childName = resolveMeasureVersionName(version);
    const childLabel = resolveMeasureVersionLabel(familyKpi, version);
    return {
      label: childLabel,
      version: childName,
      name: childName,
      kpiLabel: familyKpi.label,
      family: familyKpi.name,
    };
  };

  const commitSelectedIds = (axisArg, dimArg, nextSelectedIds) => {
    const deduped = dedupeMeasureSelections(nextSelectedIds);
    selectDimensionValues(axisArg, dimArg.value, deduped);
    dispatch(setSelectedIds(deduped));
  };

  const selectKpiValues = (familyKpi, axisArg, dimArg, version) => {
    const selectedKpi = buildSelectedMetricEntry(familyKpi, version);
    const isSelected = selectedIds.some((item) => item.name === selectedKpi.name);
    const updatedKpiList = isSelected
      ? selectedIds.filter((kpi) => kpi.name !== selectedKpi.name)
      : [
          ...selectedIds.filter((kpi) => kpi.name !== selectedKpi.name),
          selectedKpi,
        ];
    commitSelectedIds(axisArg, dimArg, updatedKpiList);
  };

  const handleCheckboxChange = (event, axisArg, dimArg, familyKpi) => {
    const selectedKpiList = familyKpi.versions.map((version) =>
      buildSelectedMetricEntry(familyKpi, version)
    );
    const childNames = new Set(
      familyKpi.versions.map((version) => resolveMeasureVersionName(version))
    );

    const updatedSelectedKpi = event.target.checked
      ? [
          ...selectedIds.filter((entry) => !childNames.has(entry.name)),
          ...selectedKpiList,
        ]
      : selectedIds.filter((addedKpi) => !childNames.has(addedKpi.name));

    setGroupedKpiList(
      event.target.checked
        ? [...groupedKpiList, familyKpi.name]
        : groupedKpiList.filter((item) => item !== familyKpi.name)
    );

    if (!event.target.checked) {
      const updatedVariance = calculatedFieldsSelection.variance.filter(
        (variance) =>
          !selectedKpiList.some((entry) => entry.name === variance.value)
      );

      const updatedContribution = calculatedFieldsSelection.contribution.filter(
        (item) => !childNames.has(item.value) && !childNames.has(item.name)
      );

      dispatch(
        setCalculatedFieldsSelection({
          variance: updatedVariance,
          contribution: updatedContribution,
        })
      );
    }

    commitSelectedIds(axisArg, dimArg, updatedSelectedKpi);
  };

  const removeSelectedMetricsVersion = (axisArg, dimArg, dimension) => {
    const kpi = dimension.name;
    const rawVersion = dimension.version ?? "";
    const version = rawVersion.startsWith(`${kpi}_`)
      ? rawVersion.slice(kpi.length + 1)
      : rawVersion;

    const updatedVariance = calculatedFieldsSelection.variance.map((variance) => {
      if (variance.value === kpi) {
        return {
          ...variance,
          varianceList: variance.varianceList.filter(
            (item) => item.comparedVersion !== version
          ),
        };
      }
      return variance;
    });

    const updatedContribution = calculatedFieldsSelection.contribution.filter(
      (item) =>
        item.value !== dimension.version && item.value !== dimension.name
    );

    dispatch(
      setCalculatedFieldsSelection({
        variance: updatedVariance,
        contribution: updatedContribution,
      })
    );

    const updatedKpiList = selectedIds.filter((item) => item.name !== kpi);
    commitSelectedIds(axisArg, dimArg, updatedKpiList);
  };

  const handleKpiSearch = (event) => {
    const searchValue = event.target.value.toLowerCase();
    const filteredMeasures = searchValue
      ? kpiMeasures
          .map((family) => {
            const familyMatches = family.label
              .toLowerCase()
              .includes(searchValue);
            const matchingVersions = (family.versions || []).filter((version) =>
              resolveMeasureVersionLabel(family, version)
                .toLowerCase()
                .includes(searchValue)
            );
            if (!familyMatches && matchingVersions.length === 0) {
              return null;
            }
            return {
              ...family,
              versions: familyMatches ? family.versions : matchingVersions,
            };
          })
          .filter(Boolean)
      : kpiMeasures;
    setMeasureVersionList(filteredMeasures);
  };

  const handleKpiDrag = (e, dimension) => {
    setDraggedKpi(dimension);
  };

  const handleKpiDrop = (e, axisArg, dimArg, dimension) => {
    e.stopPropagation();
    const droppedDimensions = [...selectedIds];
    const dragIdx = droppedDimensions.indexOf(draggedKpi);
    const dropIdx = droppedDimensions.indexOf(dimension);
    if (dragIdx < 0) return;
    else if (dragIdx > dropIdx) {
      droppedDimensions.splice(dropIdx, 0, draggedKpi);
      droppedDimensions.splice(dragIdx + 1, 1);
    } else {
      droppedDimensions.splice(dropIdx + 1, 0, draggedKpi);
      droppedDimensions.splice(dragIdx, 1);
    }
    commitSelectedIds(axisArg, dimArg, droppedDimensions);
  };

  const getVarianceFieldsForMeasure = (measure) => {
    const kpiKey = measure.name;
    const rawVersion = measure.version ?? "";
    const version = rawVersion.startsWith(`${kpiKey}_`)
      ? rawVersion.slice(kpiKey.length + 1)
      : rawVersion;
    const varianceItems =
      get(calculatedFieldsSelection, "variance", []).find(
        (item) => item.value === kpiKey
      )?.varianceList || [];
    return varianceItems
      .filter((item) => item.comparedVersion === version)
      .map(
        (item) =>
          `${String(get(item, "referenceVersion", "")).toUpperCase()} ${capitalize(get(item, "calculation", ""))}`
      )
      .filter(Boolean);
  };

  const getContributionFieldsForMeasure = (measure) => {
    const contributionItems =
      get(calculatedFieldsSelection, "contribution", []).find(
        (item) => item.value === measure.version
      )?.contributionList || [];
    return contributionItems
      .map((item) => `${get(item, "baseDimension.label", "")} %`)
      .filter(Boolean);
  };

  const handleMeasureCloseAction = () => {
    setMeasureVersionList(kpiMeasures);
    setMeasuresOpen(false);
  };

  const buildAllEntriesFromKpiList = (list) =>
    list.flatMap((familyKpi) =>
      (familyKpi.versions || []).map((version) =>
        buildSelectedMetricEntry(familyKpi, version)
      )
    );

  const getBulkSelectStateForList = (list) => {
    const visible = buildAllEntriesFromKpiList(list);
    if (!visible.length) return { checked: false, variant: "default" };
    const selectedCount = visible.filter((v) =>
      selectedIds.some((s) => s.name === v.name)
    ).length;
    if (selectedCount === 0) return { checked: false, variant: "default" };
    if (selectedCount === visible.length) return { checked: true, variant: "default" };
    return { checked: true, variant: "dashed" };
  };

  const handleBulkSelectAllForList = (axisArg, dimArg, list) => {
    const toAdd = buildAllEntriesFromKpiList(list);
    const byName = new Map(selectedIds.map((x) => [x.name, x]));
    toAdd.forEach((x) => byName.set(x.name, x));
    const merged = Array.from(byName.values());
    commitSelectedIds(axisArg, dimArg, merged);
    const nameSet = new Set(groupedKpiList);
    list.forEach((k) => nameSet.add(k.name));
    setGroupedKpiList(Array.from(nameSet));
  };

  const handleBulkClearVisibleForList = (axisArg, dimArg, list) => {
    const visibleKpiNames = new Set(
      list.flatMap((family) =>
        (family.versions || []).map((version) => resolveMeasureVersionName(version))
      )
    );
    const next = selectedIds.filter((s) => !visibleKpiNames.has(s.name));
    commitSelectedIds(axisArg, dimArg, next);
    setGroupedKpiList((prev) =>
      prev.filter((familyName) =>
        next.some((entry) => entry.family === familyName)
      )
    );
  };

  const handleClearEveryMetric = (axisArg, dimArg) => {
    commitSelectedIds(axisArg, dimArg, []);
    setGroupedKpiList([]);
  };

  const getDropdownButtons = () => [
    {
      label: "Clear All",
      onClick: () => {
        dispatch(setSelectedIds([]));
        setGroupedKpiList([]);
      },
    },
  ];

  const flattenedGrouped = Object.values(groupedByKpiLabel(selectedIds)).flat();

  return {
    measureVersionList,
    flattenedGrouped,
    selectedIds,
    calculatedFieldsSelection,
    selectKpiValues,
    handleCheckboxChange,
    removeSelectedMetricsVersion,
    handleKpiSearch,
    handleKpiDrag,
    handleKpiDrop,
    getVarianceFieldsForMeasure,
    getContributionFieldsForMeasure,
    handleMeasureCloseAction,
    getDropdownButtons,
    getBulkSelectStateForList,
    handleBulkSelectAllForList,
    handleBulkClearVisibleForList,
    handleClearEveryMetric,
  };
};
