import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "impact-ui-v3";
import CloseOutlinedIcon from "assets/closeOutlined.svg";
import LeftArrowIcon from "assets/leftArrow.svg";
import "./MetricsPanel.scss";
import CalculatedFields from "../CalculatedFields";
import {
  selectSelectedIds,
  selectVariance,
  selectCalculatedFieldsSelection,
} from "../../../../../../pages-oms/OrderManagement/slices/pivot.slice";
import { selectPlanKpiConfigV2 } from "../../../../../../pages-oms/OrderManagement/slices/kpi.slice";
import { useDispatch, useSelector } from "react-redux";
import { groupedByKpiLabel } from "../../../pivotPanel.util";
import {
  resolveMeasureVersionName,
} from "../../../../../../pages-oms/OrderManagement/utils/groupOmsMeasuresForPivotPanel.util.js";
import { addSnack } from "actions/snackbarActions";
import { EMPTY_VARIANCE_ERROR } from "../../../../../../pages-oms/OrderManagement/constants/selectMetrics.constants";
import MetricsPanelSelectOverlay from "./MetricsPanelSelectOverlay";

const MetricsPanel = (props) => {
  const {
    handleKpiSearch,
    measuresOpen,
    setMeasuresOpen,
    handleCheckboxChange,
    selectKpiValues,
    removeSelectedMetricsVersion,
    handleKpiDrag,
    handleKpiDrop,
    axis,
    dim,
    getContributionFieldsForMeasure,
    getVarianceFieldsForMeasure,
    handleMeasureCloseAction,
    measureVersionList,
    getBulkSelectStateForList,
    handleBulkSelectAllForList,
    handleBulkClearVisibleForList,
    handleClearEveryMetric,
  } = props;

  const dispatch = useDispatch();
  const selectedIds = useSelector(selectSelectedIds);
  const varience = useSelector(selectVariance);
  const planKpiConfig = useSelector(selectPlanKpiConfigV2);
  const calculatedFieldsSelection = useSelector(
    selectCalculatedFieldsSelection
  );

  const [toggleGroupedMetrics, setToggleGroupedMetrics] = useState("");
  const [atBottom, setAtBottom] = useState(false);
  const [
    isCalculatedFieldsPanelOpen,
    setIsCalculatedFieldsPanelOpen,
  ] = useState(false);
  const [metricsViewBy, setMetricsViewBy] = useState("metrics");

  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (measuresOpen && scrollContainerRef.current) {
      handleScroll();
    }
  }, [measuresOpen]);

  useEffect(() => {
    if (measuresOpen && measureVersionList?.length === 1) {
      setToggleGroupedMetrics(measureVersionList[0].value);
    }
  }, [measuresOpen, measureVersionList]);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    setAtBottom(scrollTop + clientHeight >= scrollHeight - 10);
  };

  const getParentCheckboxState = (familyKpi) => {
    const childNames = (familyKpi.versions || []).map((version) =>
      resolveMeasureVersionName(version)
    );
    const selectedCount = selectedIds.filter((item) =>
      childNames.includes(item.name)
    ).length;
    if (selectedCount === 0) return { checked: false, variant: "default" };
    if (selectedCount === childNames.length)
      return { checked: true, variant: "default" };
    return { checked: true, variant: "dashed" };
  };

  const onCloseCalculatedFieldsPanel = () => {
    setIsCalculatedFieldsPanelOpen(false);
    const isAnyFieldEmpty = varience.some((item) =>
      item.varianceList?.some(
        (vItem) =>
          vItem &&
          Object.keys(vItem).length === 0 &&
          vItem.constructor === Object
      )
    );

    if (isAnyFieldEmpty) {
      dispatch(
        addSnack({
          message: EMPTY_VARIANCE_ERROR,
          options: { variant: "error" },
        })
      );
    }
  };

  const flattenedGrouped = Object.values(groupedByKpiLabel(selectedIds)).flat();
  const hasPlanKpiConfig = Object.keys(planKpiConfig).length > 0;
  const calculatedFieldsButtonClass = hasPlanKpiConfig
    ? "calculatedFieldsButton"
    : "calculatedFieldsButton disabled";

  return (
    <>
      <div className="metricsPanel">
        <MetricsPanelSelectOverlay
          measuresOpen={measuresOpen}
          handleMeasureCloseAction={handleMeasureCloseAction}
          handleKpiSearch={handleKpiSearch}
          measureVersionList={measureVersionList}
          toggleGroupedMetrics={toggleGroupedMetrics}
          setToggleGroupedMetrics={setToggleGroupedMetrics}
          handleCheckboxChange={handleCheckboxChange}
          axis={axis}
          dim={dim}
          selectKpiValues={selectKpiValues}
          selectedIds={selectedIds}
          getParentCheckboxState={getParentCheckboxState}
          atBottom={atBottom}
          scrollContainerRef={scrollContainerRef}
          handleScroll={handleScroll}
          setIsCalculatedFieldsPanelOpen={setIsCalculatedFieldsPanelOpen}
          hasPlanKpiConfig={hasPlanKpiConfig}
          calculatedFieldsButtonClass={calculatedFieldsButtonClass}
          flattenedGrouped={flattenedGrouped}
          handleKpiDrag={handleKpiDrag}
          handleKpiDrop={handleKpiDrop}
          removeSelectedMetricsVersion={removeSelectedMetricsVersion}
          getVarianceFieldsForMeasure={getVarianceFieldsForMeasure}
          getContributionFieldsForMeasure={getContributionFieldsForMeasure}
          calculatedFieldsSelection={calculatedFieldsSelection}
          metricsViewBy={metricsViewBy}
          setMetricsViewBy={setMetricsViewBy}
          getBulkSelectStateForList={getBulkSelectStateForList}
          handleBulkSelectAllForList={handleBulkSelectAllForList}
          handleBulkClearVisibleForList={handleBulkClearVisibleForList}
          handleClearEveryMetric={handleClearEveryMetric}
        />
      </div>

      {/* {isCalculatedFieldsPanelOpen &&
        createPortal(
          <>
            <div
              className="calculated-fields-backdrop"
              onClick={onCloseCalculatedFieldsPanel}
            />
            <div className="calculated-fields-panel">
              <div className="calculated-fields-header">
                <div className="calculated-fields-header-left">
                  <span className="backHeaderButton">
                    <Button
                      className=".ia-styles.ia-btn.ia-btn-outlined"
                      size="small"
                      variant="secondary"
                      icon={<LeftArrowIcon />}
                      onClick={() => {
                        setIsCalculatedFieldsPanelOpen(false);
                        setMeasuresOpen(true);
                      }}
                    />
                  </span>
                  <h3 className="calculated-fields-title">
                    Add calculated fields
                  </h3>
                </div>
                <Button
                  icon={<CloseOutlinedIcon />}
                  onClick={onCloseCalculatedFieldsPanel}
                  variant="text"
                />
              </div>
              <div className="calculated-fields-content">
                <CalculatedFields />
              </div>
              <div className="calculated-fields-footer">
                <Button
                  size="large"
                  variant="tertiary"
                  onClick={() => {
                    setIsCalculatedFieldsPanelOpen(false);
                    setMeasuresOpen(true);
                  }}
                  children="Back"
                />
                <Button
                  size="large"
                  variant="primary"
                  onClick={() => {
                    setIsCalculatedFieldsPanelOpen(false);
                    setMeasuresOpen(true);
                  }}
                  children="Add fields"
                />
              </div>
            </div>
          </>,
          document.body
        )} */}
    </>
  );
};

export default MetricsPanel;
