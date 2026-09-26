import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  setSelectedIds,
  setCalculatedFieldsSelection,
} from "../../../../../../pages-oms/OrderManagement/slices/pivot.slice";
import { enrichSelectedDimensionsFromCatalog } from "../../../pivotPanel.util";

export const useDimensionAxisState = ({
  axis,
  rowDimensions,
  setRowDimensions,
  columnDimensions,
  setColumnDimensions,
  draggableDimensions,
  setDraggableDimensions,
  groupedKpiList,
  setGroupedKpiList,
}) => {
  const dispatch = useDispatch();
  const [alternateHierarchy, setAlternateHierarchy] = useState({});

  const getDimensions = (axisArg) =>
    axisArg === "rows" ? rowDimensions : columnDimensions;

  const setDimensions = (axisArg) =>
    axisArg === "rows" ? setRowDimensions : setColumnDimensions;

  const addDimension = (axisArg, params) => {
    const dims = getDimensions(axisArg);
    setDimensions(axisArg)([
      ...dims,
      { ...params, selectedDimension: params.selectedDimension || [] }
    ]);
  };

  const selectDimensionValues = (axisArg, dimension, params, dimensionValues = {}) => {

    const sortedParams = enrichSelectedDimensionsFromCatalog(
      params,
      dimension,
      dimensionValues
    );

    const dims = getDimensions(axisArg);
    const updatedDimensions = dims.map((dim) =>
      dim.value === dimension
        ? { ...dim, selectedDimension: [...sortedParams] }
        : dim
    );

    setDimensions(axisArg)([...updatedDimensions]);
  };

  const removeSelectedDimension = (axisArg, dimension, dimensionValue) => {
    const dims = getDimensions(axisArg);
    const updatedDimensions = dims.map((dim) =>
      dim.value === dimension.value
        ? {
          ...dim,
          selectedDimension: dim.selectedDimension.filter(
            (v) => v.value !== dimensionValue.value
          )
        }
        : dim
    );
    setDimensions(axisArg)(updatedDimensions);
  };

  const removeDimension = (axisArg, dimension, shouldClearKpi) => {
    const dims = getDimensions(axisArg);
    const updatedDimensions = dims.filter((dim) => dim.value !== dimension);
    if (dimension === "measures" && shouldClearKpi) {
      dispatch(setSelectedIds([]));
      setGroupedKpiList([]);
      dispatch(setCalculatedFieldsSelection({ variance: [], contribution: [] }));
    }
    setDimensions(axisArg)(updatedDimensions);
    setDraggableDimensions(draggableDimensions.filter((item) => item !== dimension));
  };

  const updateDimension = (axisArg, updatedDims, dim) => {
    setDimensions(axisArg)(updatedDims);
    setDraggableDimensions(draggableDimensions.filter((item) => item !== dim));
  };

  const onDragOver = (evt) => evt.preventDefault();

  const onDrop = (evt, axisArg) => {
    evt.preventDefault();
    const dimensionParam = JSON.parse(evt.dataTransfer.getData("text/plain"));
    const droppedDimensions = getDimensions(axisArg);
    if (droppedDimensions.some((d) => d.value === dimensionParam.value)) return;

    if (columnDimensions.length || rowDimensions.length) {
      const updatedAxis = axisArg === "rows" ? "columns" : "rows";
      removeDimension(updatedAxis, dimensionParam.value, false);
    }
    addDimension(axisArg, dimensionParam);
    setDraggableDimensions([...draggableDimensions, dimensionParam.value]);
  };

  const handleDimensionDrag = (ev, dim) => {
    ev.dataTransfer.setData("text/plain", JSON.stringify(dim));
  };

  const handleDimensionDrop = (ev, axisArg, dim) => {
    const dimensionParam = JSON.parse(ev.dataTransfer.getData("text/plain"));
    const droppedDimensions =
      axisArg === "rows" ? [...rowDimensions] : [...columnDimensions];
    const dragIdx = droppedDimensions.findIndex((i) => i.value === dimensionParam.value);
    const dropIdx = droppedDimensions.findIndex((i) => i.value === dim.value);

    if (dragIdx < 0 || dragIdx === dropIdx) return;
    else if (dragIdx > dropIdx) {
      droppedDimensions.splice(dropIdx, 0, dimensionParam);
      droppedDimensions.splice(dragIdx + 1, 1);
    } else {
      droppedDimensions.splice(dropIdx + 1, 0, dimensionParam);
      droppedDimensions.splice(dragIdx, 1);
    }
    updateDimension(axisArg, droppedDimensions, dim);
  };

  const handleProductDimensionDrop = (axisArg, dimension, dim) => {
    const dims = getDimensions(axisArg);
    const selectedDimensionParams = [...dim.selectedDimension];
    const dragIdx = selectedDimensionParams.findIndex(
      (v) => v.label === alternateHierarchy.label
    );
    const dropIdx = selectedDimensionParams.findIndex(
      (v) => v.value === dimension.value
    );
    if (dragIdx < 0) return;
    else if (dragIdx > dropIdx) {
      selectedDimensionParams.splice(dropIdx, 0, alternateHierarchy);
      selectedDimensionParams.splice(dragIdx + 1, 1);
    } else {
      selectedDimensionParams.splice(dropIdx + 1, 0, alternateHierarchy);
      selectedDimensionParams.splice(dragIdx, 1);
    }
    const updatedDimensions = dims.map((d) =>
      d.value === dim.value
        ? { ...d, selectedDimension: selectedDimensionParams }
        : d
    );
    setDimensions(axisArg)(updatedDimensions);
  };

  return {
    alternateHierarchy,
    setAlternateHierarchy,
    addDimension,
    selectDimensionValues,
    removeSelectedDimension,
    removeDimension,
    updateDimension,
    onDragOver,
    onDrop,
    handleDimensionDrag,
    handleDimensionDrop,
    handleProductDimensionDrop,
  };
};
