import React, { useState } from "react";
import CloseOutlined from "assets/closeOutlined.svg";
import DimensionIcon from "assets/dimensionIcon.svg";
import PieChart from "assets/pieChart.svg";
import VerticalDivider from "assets/verticalDivider.svg";
import { Button as DimensionCard } from "impact-ui-v3";
import { useSelector } from "react-redux";
import Select from "../../../ImpactSelect/Select";
import MetricsPanel from "../SelectMetrics/MetricsPanel/MetricsPanel";
import SelectedMetric from "../SelectMetrics/SelectedMetric";
import { Button, TagGroup, Tag, Card } from "impact-ui-v3";
import "./RenderDimension.scss";

import {
  selectPivotDescriptionData,
} from "../../../../../pages-oms/OrderManagement/slices/pivot.slice";
import { useDimensionAxisState } from "./hooks/useDimensionAxisState";
import { useDimensionMeasureState } from "./hooks/useDimensionMeasureState";
import { isAlternateHierarchyOption } from "../../pivotPanel.util";

const RenderDimension = (props) => {
  const {
    axis,
    dimensions,
    measuresOpen,
    setMeasuresOpen,
    draggedKpi,
    setDraggedKpi,
    groupedKpiList,
    setGroupedKpiList,
    draggableDimensions,
    setDraggableDimensions,
    rowDimensions,
    setRowDimensions,
    columnDimensions,
    setColumnDimensions,
  } = props;

  const pivotDescriptionData = useSelector(selectPivotDescriptionData);
  const dimension_values = pivotDescriptionData?.dimension_values || {};

  const {
    alternateHierarchy,
    setAlternateHierarchy,
    selectDimensionValues,
    removeSelectedDimension,
    removeDimension,
    onDragOver,
    onDrop,
    handleDimensionDrag,
    handleDimensionDrop,
    handleProductDimensionDrop,
  } = useDimensionAxisState({
    axis,
    rowDimensions,
    setRowDimensions,
    columnDimensions,
    setColumnDimensions,
    draggableDimensions,
    setDraggableDimensions,
    groupedKpiList,
    setGroupedKpiList,
  });

  const {
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
    getBulkSelectStateForList,
    handleBulkSelectAllForList,
    handleBulkClearVisibleForList,
    handleClearEveryMetric,
  } = useDimensionMeasureState({
    axis,
    groupedKpiList,
    setGroupedKpiList,
    draggedKpi,
    setDraggedKpi,
    setMeasuresOpen,
    selectDimensionValues: (axisArg, dimension, params) =>
      selectDimensionValues(axisArg, dimension, params, dimension_values),
  });

  const AlternateHierarchyHeader = (
    <div className="alternate-hierarchy-header">
      <span>Alternate Hierarchy</span>
      <span className="alternate-hierarchy-badge">Draggable</span>
    </div>
  );

  const getGroupedDimensionOptions = (dimensionKey) => {
    const options = dimension_values[dimensionKey] || [];
    const hierarchies = options.filter((o) => !isAlternateHierarchyOption(o));
    const alternateHierarchies = options.filter((o) =>
      isAlternateHierarchyOption(o)
    );
    const groups = [];
    if (hierarchies.length > 0) groups.push({ label: "Hierarchies", options: hierarchies });
    if (alternateHierarchies.length > 0) groups.push({ label: AlternateHierarchyHeader, options: alternateHierarchies });
    return groups;
  };

  const hasGroupedOptions = (dimensionKey) => {
    const options = dimension_values[dimensionKey] || [];
    return options.some((o) => isAlternateHierarchyOption(o));
  };

  const wrapSelectDimensionValues = (axisArg, dimension, params) =>
    selectDimensionValues(axisArg, dimension, params, dimension_values);

  return (
    <div
      className="dropZone"
      onDragOver={(e) => onDragOver(e)}
      onDrop={(e) => onDrop(e, axis)}
    >
      <div className="dimensionAxis">
        <span className="dimensionAxisLabel">
          {axis === "rows" ? "Rows" : "Columns"}
        </span>
      </div>
      <div className="selectedDimensionContainer">
        {dimensions.map((dim) => (
          <div
            key={dim.value}
            draggable
            onDragStart={(e) => handleDimensionDrag(e, dim)}
            onDragOver={(ev) => ev.preventDefault()}
            onDrop={(ev) => handleDimensionDrop(ev, axis, dim)}
            id={dim.label}
          >
            <Card className="dimensionKey" key={dim.value}>
              <span className="removeDimensionButton">
                <Button
                  variant="url"
                  onClick={() => removeDimension(axis, dim.value, true)}
                  icon={<CloseOutlined />}
                  size="small"
                />
              </span>
              <div className="dimensionKeyRow">
                <div className="dropZoneHeader">
                {dim.value !== "measures" ? (
                  <div className="render-dimension-select">
                    <Select
                      label={dim.label}
                      options={
                        hasGroupedOptions(dim.value)
                          ? getGroupedDimensionOptions(dim.value)
                          : dimension_values[dim.value]
                      }
                      onChange={(params) => wrapSelectDimensionValues(axis, dim.value, params)}
                      isMulti={true}
                      placeholder="Select"
                      labelOrientation="left"
                      value={dim.selectedDimension}
                      toggleSelectAll={true}
                      isClearable={true}
                      isGrouped={hasGroupedOptions(dim.value)}
                      className="ia-select-label-v3"
                      width="200px"
                      minWidth="200px"
                    />
                  </div>
                ) : (
                  <>
                    <div className="measurePanelContainer">
                      <span className="measuresLabel">{dim.label}</span>
                      <span className="vertical-divider-container">
                        <VerticalDivider />
                      </span>
                      <div className="measurePannelButton">
                        <DimensionCard
                          size="small"
                          variant="url"
                          onClick={() => setMeasuresOpen(true)}
                          icon={<PieChart />}
                        >
                          Select Measures
                        </DimensionCard>
                      </div>
                    </div>
                    <div className="measuresPanel">
                      <MetricsPanel
                        groupedKpiList={groupedKpiList}
                        measuresOpen={measuresOpen}
                        setMeasuresOpen={setMeasuresOpen}
                        axis={axis}
                        dim={dim}
                        getBulkSelectStateForList={getBulkSelectStateForList}
                        handleBulkSelectAllForList={handleBulkSelectAllForList}
                        handleBulkClearVisibleForList={handleBulkClearVisibleForList}
                        handleClearEveryMetric={handleClearEveryMetric}
                        handleKpiSearch={handleKpiSearch}
                        handleCheckboxChange={handleCheckboxChange}
                        selectKpiValues={selectKpiValues}
                        handleKpiDrag={handleKpiDrag}
                        measureVersionList={measureVersionList}
                        handleMeasureCloseAction={handleMeasureCloseAction}
                        handleKpiDrop={handleKpiDrop}
                        removeSelectedMetricsVersion={removeSelectedMetricsVersion}
                        getVarianceFieldsForMeasure={getVarianceFieldsForMeasure}
                        getContributionFieldsForMeasure={getContributionFieldsForMeasure}
                      />
                    </div>
                  </>
                )}
              </div>
              </div>
              {dim.value !== "measures" && (
                <TagGroup className="tag-group-container">
                  {dim.selectedDimension.map((dimension) => (
                    <div
                      key={dimension.value}
                      draggable={dimension?.is_alternate_hierarchy}
                      onDragStart={() => {
                        if (dimension?.is_alternate_hierarchy) {
                          setAlternateHierarchy(dimension);
                        }
                      }}
                      onDragOver={(ev) => ev.preventDefault()}
                      onDrop={() => {
                        handleProductDimensionDrop(axis, dimension, dim);
                        setAlternateHierarchy({});
                      }}
                    >
                      <Tag
                        id={dimension.value}
                        key={dimension.value}
                        color="default"
                        label={
                          dimension?.is_alternate_hierarchy ? (
                            <div className="draggedDimensionContainer">
                              <span className="draggedDimensionIcon">
                                <DimensionIcon />
                              </span>
                              <span className="draggedDimensionLabel">
                                {dimension.label}
                              </span>
                            </div>
                          ) : (
                            dimension.label
                          )
                        }
                        onClick={() => {}}
                        size="small"
                        variant="subtle"
                        isRemovable={true}
                        onDelete={() => removeSelectedDimension(axis, dim, dimension)}
                      />
                    </div>
                  ))}
                </TagGroup>
              )}
              {dim.selectedDimension.length && dim.value === "measures" ? (
                <div className="selectedMetricsParentContainer">
                  <div className="selectedMetricsContainer">
                    {flattenedGrouped.map((dimension) => (
                      <SelectedMetric
                        key={dimension.name + dimension.version}
                        handleKpiDrag={handleKpiDrag}
                        handleKpiDrop={handleKpiDrop}
                        removeSelectedMetricsVersion={removeSelectedMetricsVersion}
                        varianceFields={getVarianceFieldsForMeasure(dimension)}
                        contributionFields={getContributionFieldsForMeasure(dimension)}
                        calculatedFieldsSelection={calculatedFieldsSelection}
                        dimension={dimension}
                        axis={axis}
                        dim={dim}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {/* {dim.value === "measures" ? (
                <div className="measureFieldLegend" aria-label="Calculated field types">
                  <span className="measureFieldLegend__item">
                    <span className="measureFieldLegend__dot measureFieldLegend__dot--variance" />
                    Variance
                  </span>
                  <span className="measureFieldLegend__item">
                    <span className="measureFieldLegend__dot measureFieldLegend__dot--contribution" />
                    % Contribution
                  </span>
                </div>
              ) : null} */}
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RenderDimension;
