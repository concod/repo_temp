import { get, isEmpty } from "lodash";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  selectActiveViewDetail,
  selectActiveView,
  setActiveViewDetails,
  setIsValidView,
} from "../../../ViewManagement/slices/viewManagement.slice";
import {
  selectPivotDescriptionData,
  selectPivotDescriptionDataLoader,
  selectAddedVersionDetails,
  selectSelectedIds,
  selectCalculatedFieldsSelection,
  selectPivotPayload,
  setPivotPayload,
  setSelectedIds,
  setCalculatedFieldsSelection,
} from "../../../../pages-oms/OrderManagement/slices/pivot.slice";
import {
  getPivotPayload,
  getValidatedView,
  isPivotPayloadDirty,
  validateDimensions,
  enrichViewAxisDimensionsFromCatalog,
} from "../pivotPanel.util";
import { normalizeSavedMeasureSelection, dedupeMeasureSelections } from "../../../../pages-oms/OrderManagement/utils/groupOmsMeasuresForPivotPanel.util.js";
import { usePivotHost } from "../../../pivot/PivotHostContext";

export const usePivotPanelViewSync = ({
  handleApplyPivot,
  pivotPayload,
  selectedPivotAttributes
}) => {
  const { syncPivotPayloadOnViewLoad, orderManagementFilters } = usePivotHost();

  const dispatch = useDispatch();

  const pivotDescriptionData = useSelector(selectPivotDescriptionData);
  const pivotDescriptionDataLoader = useSelector(selectPivotDescriptionDataLoader);
  const addedVersionDetails = useSelector(selectAddedVersionDetails);
  const calculatedFieldsSelection = useSelector(selectCalculatedFieldsSelection);
  const activeViewDetail = useSelector(selectActiveViewDetail);
  const activeViewDetails = useSelector(selectActiveView);
  const lastAppliedPivotPayload = useSelector(selectPivotPayload);

  const [rowDimensions, setRowDimensions] = useState([]);
  const [columnDimensions, setColumnDimensions] = useState([]);
  const [draggableDimensions, setDraggableDimensions] = useState([]);
  const [activeViewId, setActiveViewId] = useState(null);
  const savedViewSnapshotRef = useRef(null);

  const viewDetails = get(activeViewDetail, "view_details", {});

  const shouldUpdateView = ({ activeViewDetail, activeViewId }) => {
    return (
      Number.isFinite(activeViewDetail?.view_id) &&
      activeViewDetail.view_id !== activeViewId
    );
  };

  useEffect(() => {
    if (!isEmpty(columnDimensions) && !isEmpty(rowDimensions)) {
      dispatch(
        setActiveViewDetails({
          ...activeViewDetail,
          view_details: {
            columnDimensions,
            rowDimensions,
            kpiWiseRows: rowDimensions.some((d) => d.value === "measures"),
            calculatedFieldsSelection,
            isGrandtotalEnabled: activeViewDetail?.view_details?.isGrandtotalEnabled || false,
          }
        })
      );
    }
  }, [rowDimensions, columnDimensions, calculatedFieldsSelection]);

  useEffect(() => {
    if (pivotDescriptionDataLoader) return;

    // When the active view is cleared (e.g. after resetActiveView() is dispatched by
    // ViewListItemActions.applySelectedView or by the PivotPanel Apply button), reset
    // the local activeViewId tracker so that the next getViewDetails response
    // re-triggers handleApplyPivot even when the same view_id is re-selected.
    if (!activeViewDetail?.view_id) {
      setActiveViewId(null);
      return;
    }

    if (shouldUpdateView({ activeViewDetail, activeViewId })) {
      const dimensionValues = pivotDescriptionData?.dimension_values || {};
      const newColumnDimensions = enrichViewAxisDimensionsFromCatalog(
        get(viewDetails, "columnDimensions", []),
        dimensionValues
      );
      const newRowDimensions = enrichViewAxisDimensionsFromCatalog(
        get(viewDetails, "rowDimensions", []),
        dimensionValues
      );
      const newCalculatedFieldsSelection = get(viewDetails, "calculatedFieldsSelection", {
        variance: [],
        contribution: []
      });

      setColumnDimensions(newColumnDimensions);
      setRowDimensions(newRowDimensions);

      dispatch(setCalculatedFieldsSelection(newCalculatedFieldsSelection));

      const measureDetails = viewDetails.kpiWiseRows
        ? newRowDimensions.find((d) => d.value === "measures")
        : newColumnDimensions.find((d) => d.value === "measures");

      // Normalise template KPI items to the { name, label, kpiLabel, version } shape
      // that selectedIds expects. Templates may store KPIs in three formats:
      //   1. Already flattened: { version, name, label, kpiLabel }
      //   2. Multi-version raw: { name, label, versions: ["actual", "ly"] }
      //   3. Dimension-style (from DB template): { value, label } — look up in pivot description
      const rawSelectedValues = get(measureDetails, "selectedDimension", []);
      const kpiDefinitions = get(pivotDescriptionData, "dimension_values.measures", []);

      const selectedValues = dedupeMeasureSelections(
        rawSelectedValues
          .map((item) => normalizeSavedMeasureSelection(item, kpiDefinitions))
          .filter(Boolean)
      );
      dispatch(setSelectedIds(selectedValues));
      const previousViewId = activeViewId;
      setActiveViewId(activeViewDetail.view_id);

      savedViewSnapshotRef.current = {
        columnDimensions: newColumnDimensions,
        rowDimensions: newRowDimensions,
        kpiWiseRows: newRowDimensions.some((d) => d.value === "measures"),
        calculatedFieldsSelection: newCalculatedFieldsSelection,
        isGrandtotalEnabled: activeViewDetail?.view_details?.isGrandtotalEnabled || false
      };

      const draggableDimensionFromSelectedView = [...newRowDimensions, ...newColumnDimensions]
        .flat()
        .map((d) => d.value);
      setDraggableDimensions(draggableDimensionFromSelectedView);

      const isValid = validateDimensions({ pivotDescriptionData, viewDetails });
      dispatch(setIsValidView(isValid));

      if (isValid) {
        const nextCalculatedFieldsSelection = viewDetails.calculatedFieldsSelection;
        const nextIsGrandtotalEnabled =
          activeViewDetail?.view_details?.isGrandtotalEnabled || false;
        const nextBuiltPayload = getPivotPayload(
          newRowDimensions,
          newColumnDimensions,
          addedVersionDetails,
          nextCalculatedFieldsSelection,
          selectedValues,
          nextIsGrandtotalEnabled
        );
        const shouldRefetchData = isPivotPayloadDirty(
          nextBuiltPayload,
          lastAppliedPivotPayload
        );

        const isDifferentView = activeViewDetail.view_id !== previousViewId;

        if (shouldRefetchData) {
          if (syncPivotPayloadOnViewLoad && isDifferentView) {
            dispatch(
              setPivotPayload({
                ...nextBuiltPayload,
                filters: orderManagementFilters ?? [],
              })
            );
          } else {
            handleApplyPivot({
              columnDimensions: newColumnDimensions,
              rowDimensions: newRowDimensions,
              addedVersionDetails,
              calculatedFieldsSelection: nextCalculatedFieldsSelection,
              selectedIds: selectedValues,
              isGrandtotalEnabled: nextIsGrandtotalEnabled,
            });
          }
        }
      }
    }
  }, [
    activeViewDetail,
    pivotDescriptionData,
    pivotDescriptionDataLoader,
  ]);

  useEffect(() => {
    const isValidView = getValidatedView({
      pivotDescriptionData,
      activeViewDetails,
      selectedPivotAttributes
    });

    // Do not wipe in-progress pivot state while view details are still loading.
    if (!isValidView && !activeViewDetail?.view_details?.rowDimensions?.length) {
      setColumnDimensions([]);
      setRowDimensions([]);
      dispatch(setPivotPayload({}));
      dispatch(setSelectedIds([]));
      setDraggableDimensions([]);
    }

    dispatch(setIsValidView(isValidView));
  }, [pivotDescriptionData, activeViewDetail, dispatch]);

  return {
    rowDimensions,
    setRowDimensions,
    columnDimensions,
    setColumnDimensions,
    draggableDimensions,
    setDraggableDimensions,
    activeViewId,
    setActiveViewId,
    viewDetails,
    activeViewDetail,
    savedViewSnapshot: savedViewSnapshotRef.current,
  };
};
