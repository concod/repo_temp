import { isEmpty } from "lodash";
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getOrderManagementPivotDescription as getPivotDescriptionData } from "../../../../pages-oms/api/planningScreen.api";
import {
  dedupeMeasureSelections,
  groupOmsMeasuresForPivotPanel,
  normalizeSavedMeasureSelection,
} from "../../../../pages-oms/OrderManagement/utils/groupOmsMeasuresForPivotPanel.util.js";
import {
  selectPivotDescriptionData,
  selectSelectedIds,
  setKpiMeasures,
  setSelectedIds,
} from "../../../../pages-oms/OrderManagement/slices/pivot.slice";
import { usePivotHost } from "../../../pivot/PivotHostContext";

export const usePivotDescriptionData = () => {
  const { screenId } = usePivotHost();
  const dispatch = useDispatch();

  const pivotDescriptionData = useSelector(selectPivotDescriptionData);
  const selectedIds = useSelector(selectSelectedIds);
  const selectedIdsRef = useRef(selectedIds);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    if (isEmpty(pivotDescriptionData) && screenId) {
      dispatch(getPivotDescriptionData({ screenId }));
    }
  // Re-fire when screenId becomes available (loaded after screens-mapping API).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenId]);

  useEffect(() => {
    if (isEmpty(pivotDescriptionData)) return;

    const rawMeasures = pivotDescriptionData?.dimension_values?.measures || [];
    const measures = rawMeasures.map((m) => ({
      ...m,
      name: m.name || m.value,
      value: m.value ?? m.name,
      label: m.label || m.name || m.value,
    }));

    dispatch(setKpiMeasures(groupOmsMeasuresForPivotPanel(measures)));

    const currentSelectedIds = selectedIdsRef.current;
    if (!currentSelectedIds.length) return;

    const normalizedSelectedIds = dedupeMeasureSelections(
      currentSelectedIds
        .map((item) => normalizeSavedMeasureSelection(item, measures))
        .filter(Boolean)
    );

    const changed =
      normalizedSelectedIds.length !== currentSelectedIds.length ||
      normalizedSelectedIds.some((item, index) => {
        const prev = currentSelectedIds[index];
        return (
          item.name !== prev?.name ||
          item.version !== prev?.version ||
          item.label !== prev?.label
        );
      });

    if (changed) {
      dispatch(setSelectedIds(normalizedSelectedIds));
    }
  }, [dispatch, pivotDescriptionData]);
};
