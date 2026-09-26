// PORTED FROM: pages/PlanningScreen/components/PivotPanel/components/SelectMetrics/SelectedMetric.jsx
// Changed: import path for setCalculatedFieldsSelection → V2 pivot.slice

import React, { useState, useEffect } from "react";
import DimensionIcon from "assets/dimensionIcon.svg";
import CloseOutlinedIcon from "assets/closeOutlined.svg";
import { useDispatch } from "react-redux";
import { setCalculatedFieldsSelection } from "../../../../../pages-oms/OrderManagement/slices/pivot.slice";

const SelectedMetric = (props) => {
  const {
    handleKpiDrag,
    handleKpiDrop,
    removeSelectedMetricsVersion,
    varianceFields,
    contributionFields,
    dimension,
    axis,
    dim,
    calculatedFieldsSelection
  } = props;

  const isFieldsListValid = (fieldsList) =>
    fieldsList.some((item) => item.trim() !== "");

  const dispatch = useDispatch();

  const [selectedContribution, setSelectedContribution] = useState(
    calculatedFieldsSelection?.contribution
  );
  const [selectedVariance, setSelectedVariance] = useState(
    calculatedFieldsSelection?.variance
  );

  useEffect(() => {
    setSelectedContribution(calculatedFieldsSelection?.contribution);
    setSelectedVariance(calculatedFieldsSelection?.variance);
  }, [calculatedFieldsSelection]);

  const removeSelectedContribution = (item, index, dimension) => {
    const selectedContributionList = selectedContribution.map((item) => {
      if (item.value === dimension.version) {
        return {
          ...item,
          contributionList: item.contributionList.filter((_, i) => i !== index)
        };
      }
      return item;
    });
    dispatch(
      setCalculatedFieldsSelection({
        ...calculatedFieldsSelection,
        contribution: selectedContributionList
      })
    );
  };

  const removeSelectedVariance = (item, index, dimension) => {
    const selectedVarianceList = selectedVariance.map((item) => {
      if (item.value === dimension.name) {
        return {
          ...item,
          varianceList: item.varianceList.filter((_, i) => i !== index)
        };
      }
      return item;
    });
    dispatch(
      setCalculatedFieldsSelection({
        ...calculatedFieldsSelection,
        variance: selectedVarianceList
      })
    );
  };

  return (
    <div className="selectedKpiList">
      <div
        className="selectedMetrics"
        draggable
        onDragStart={(e) => handleKpiDrag(e, dimension)}
        onDragOver={(ev) => ev.preventDefault()}
        onDrop={(ev) => handleKpiDrop(ev, axis, dim, dimension)}
      >
        <DimensionIcon className="selectedMetricsIcon" />
        <span className="selectedMetricsLabel">{dimension.label}</span>

        <CloseOutlinedIcon
          className="removeKpiIcon"
          onClick={() => removeSelectedMetricsVersion(axis, dim, dimension)}
        />
      </div>
      {isFieldsListValid(varianceFields) && (
        <div className="selectedCalculatedFieldsMainContainer variance">
          <div className="selectedCalculatedFieldsContainer variance">
            {varianceFields.map((item, index) => {
              return (
                <div key={index} className="varianceFields">
                  <span className="selectedCalculatedFieldText">{item}</span>
                  <CloseOutlinedIcon
                    className="removeKpiIcon"
                    onClick={() =>
                      removeSelectedVariance(item, index, dimension)
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
      {isFieldsListValid(contributionFields) && (
        <div className="selectedCalculatedFieldsMainContainer contribution">
          <div className="selectedCalculatedFieldsContainer contribution">
            {contributionFields.map((item, index) => {
              return (
                <div key={index} className="contributionFields">
                  <span className="selectedCalculatedFieldText">{item}</span>
                  <CloseOutlinedIcon
                    className="removeKpiIcon"
                    onClick={() =>
                      removeSelectedContribution(item, index, dimension)
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectedMetric;
