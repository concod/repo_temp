import React from "react";
import SelectedMetric from "../SelectedMetric";
import GroupIcon from "assets/group.svg";

const MetricsPanelSelectedColumn = ({
  selectedIds,
  hasPlanKpiConfig,
  calculatedFieldsButtonClass,
  setIsCalculatedFieldsPanelOpen,
  handleMeasureCloseAction,
  flattenedGrouped,
  handleKpiDrag,
  handleKpiDrop,
  removeSelectedMetricsVersion,
  getVarianceFieldsForMeasure,
  getContributionFieldsForMeasure,
  calculatedFieldsSelection,
  axis,
  dim,
}) => {
  const displayedCount =
    flattenedGrouped?.length ?? selectedIds?.length ?? 0;

  return (
    <div className="selectedContainer">
      <h3 className="SelectedMetricsHeading">
        Selected metrics ({String(displayedCount).padStart(2, "0")})
      </h3>
      <div className="SelectedMetricsSubHeading">
        {"(Drag the metrics to change the order)"}
        {/* {!hasPlanKpiConfig && "Apply a view to add calculated fields"} */}
      </div>
      {/* <div
        className={calculatedFieldsButtonClass}
        onClick={() => {
          if (!hasPlanKpiConfig) return;
          setIsCalculatedFieldsPanelOpen(true);
          handleMeasureCloseAction();
        }}
      >
        <label>Add calculated fields</label>
        <span className="calculatedFieldsIcon">
          <GroupIcon />
        </span>
      </div> */}
      <div className="selectedKpiContainer">
        {selectedIds.length ? (
          flattenedGrouped.map((dimension) => (
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
          ))
        ) : (
          <div className="emptyMetrics">
            (Choose metrics to add to the table)
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricsPanelSelectedColumn;
