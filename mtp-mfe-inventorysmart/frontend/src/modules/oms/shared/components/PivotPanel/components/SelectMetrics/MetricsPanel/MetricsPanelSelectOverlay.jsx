import React from "react";
import { createPortal } from "react-dom";
import { Input, Checkbox } from "impact-ui-v3";
import ArrowIcon from "assets/accordian.svg";
import SearchIcon from "assets/searchIcon.svg";
import CloseOutlinedIcon from "assets/closeOutlined.svg";
import FilterListIcon from "@mui/icons-material/FilterList";
import KeyboardDoubleArrowDownIcon from "@mui/icons-material/KeyboardDoubleArrowDown";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import IconButton from "@mui/material/IconButton";
import MetricsPanelSelectedColumn from "./MetricsPanelSelectedColumn";
import classNames from "classnames";
import {
  isMeasureVersionSelected,
  resolveMeasureVersionLabel,
  resolveMeasureVersionName,
} from "../../../../../../pages-oms/OrderManagement/utils/groupOmsMeasuresForPivotPanel.util.js";

const MetricsPanelSelectOverlay = ({
  measuresOpen,
  handleMeasureCloseAction,
  handleKpiSearch,
  measureVersionList,
  toggleGroupedMetrics,
  setToggleGroupedMetrics,
  handleCheckboxChange,
  axis,
  dim,
  selectKpiValues,
  selectedIds,
  getParentCheckboxState,
  atBottom,
  scrollContainerRef,
  handleScroll,
  setIsCalculatedFieldsPanelOpen,
  hasPlanKpiConfig,
  calculatedFieldsButtonClass,
  flattenedGrouped,
  handleKpiDrag,
  handleKpiDrop,
  removeSelectedMetricsVersion,
  getVarianceFieldsForMeasure,
  getContributionFieldsForMeasure,
  calculatedFieldsSelection,
  metricsViewBy,
  setMetricsViewBy,
  getBulkSelectStateForList,
  handleBulkSelectAllForList,
  handleBulkClearVisibleForList,
  handleClearEveryMetric
}) => {
  if (!measuresOpen) return null;

  const bulkState = getBulkSelectStateForList(measureVersionList);

  const onBulkCheckboxChange = (event) => {
    if (event.target.checked) {
      handleBulkSelectAllForList(axis, dim, measureVersionList);
    } else {
      handleBulkClearVisibleForList(axis, dim, measureVersionList);
    }
  };

  const metricsCheckboxSx = { "& .MuiSvgIcon-root": { fontSize: 16 } };
  const metricsRadioSx = {
    padding: "4px",
    color: "#c3c8d4",
    "&.Mui-checked": { color: "#4259ee" },
    "& .MuiSvgIcon-root": { fontSize: 16 }
  };

  return createPortal(
    <div className="metrics-overlay" onClick={handleMeasureCloseAction}>
      <div
        className="metrics-panel-custom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="metrics-header">
          <h3 className="metrics-title">Select metrics</h3>
          <IconButton
            size="small"
            aria-label="Close"
            onClick={handleMeasureCloseAction}
            className="metrics-header__closeBtn"
          >
            <CloseOutlinedIcon style={{ width: 12, height: 12 }} />
          </IconButton>
        </div>
        <div className="metrics-body">
          <div className="kpiListContainer">
            <div className="kpiGroup">
              <div className="metricsPanelLeftStack">
                <div className="searchInputContainer">
                  <Input
                    className="metrics-search-input"
                    rightIcon={<SearchIcon className="searchIcon" />}
                    onChange={handleKpiSearch}
                    placeholder="Search"
                    type="text"
                  />
                </div>

                <div className="metricsLeftColumnMain">
                  {/* View-by Metrics/Versions radios disabled until OMS measure tree
                      uses KPI → version hierarchy (not Plansmart plan versions). */}
                  {/*
                  <div className="metricsViewByRow">
                    <span className="metricsViewByRow__label">View by</span>
                    <RadioGroup
                      className="metricsViewByRow__radios"
                      row
                      value={metricsViewBy}
                      onChange={(e) => setMetricsViewBy(e.target.value)}
                    >
                      <FormControlLabel
                        value="metrics"
                        control={
                          <Radio
                            size="small"
                            disableRipple
                            sx={metricsRadioSx}
                          />
                        }
                        label="Metrics"
                      />
                      <FormControlLabel
                        value="versions"
                        control={
                          <Radio
                            size="small"
                            disableRipple
                            sx={metricsRadioSx}
                          />
                        }
                        label="Versions"
                      />
                    </RadioGroup>
                  </div>
                  */}

                  <div className="metricsLeftListBlock">
                    <div className="metricsBulkBlock">
                      <div className="metricsBulkActionsRow">
                        <FormControlLabel
                          className="metricsBulkActionsRow__selectAll"
                          label="Select all"
                          control={
                            <Checkbox
                              checked={bulkState.checked}
                              variant={bulkState.variant}
                              onChange={onBulkCheckboxChange}
                              sx={metricsCheckboxSx}
                            />
                          }
                        />
                        <div className="metricsBulkActionsRow__right">
                          <button
                            type="button"
                            className="metricsClearAllBtn"
                            onClick={() => handleClearEveryMetric(axis, dim)}
                          >
                            Clear all
                          </button>
                          {/* commenting the below as this is not functional yet */}
                          {/* <IconButton
                            size="small"
                            aria-label="Filter metrics"
                            className="metricsBulkActionsRow__filter"
                            disabled
                          >
                            <FilterListIcon sx={{ fontSize: 24 }} />
                          </IconButton> */}
                        </div>
                      </div>
                      <div className="metricsBulkDivider" />
                    </div>

                    <div className="kpiGroupListWrapper">
                      <div className="metricsKpiSectionLabel">KPIs</div>
                      <div
                        className="kpiGroupListContainer"
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                      >
                        {measureVersionList.map((familyKpi) => {
                          const parentState = getParentCheckboxState(familyKpi);

                          return (
                            <ul className="kpiGroupList" key={familyKpi.value}>
                              <div className="kpiToggleGroup">
                                <div
                                  role="button"
                                  onClick={() =>
                                    familyKpi.value === toggleGroupedMetrics
                                      ? setToggleGroupedMetrics("")
                                      : setToggleGroupedMetrics(familyKpi.value)
                                  }
                                  id="toggleContainer"
                                  className={classNames(
                                    "toggleContainer",
                                    toggleGroupedMetrics === familyKpi.value &&
                                      "active"
                                  )}
                                >
                                  <ArrowIcon />
                                </div>
                                <FormControlLabel
                                  className="kpiGroupContainer"
                                  label={familyKpi.label}
                                  control={
                                    <Checkbox
                                      checked={parentState.checked}
                                      variant={parentState.variant}
                                      onChange={(event) =>
                                        handleCheckboxChange(
                                          event,
                                          axis,
                                          dim,
                                          familyKpi
                                        )
                                      }
                                      sx={metricsCheckboxSx}
                                    />
                                  }
                                />
                              </div>
                              {toggleGroupedMetrics === familyKpi.value &&
                                familyKpi.versions.map((version) => {
                                  const versionName =
                                    resolveMeasureVersionName(version);
                                  const versionLabel = resolveMeasureVersionLabel(
                                    familyKpi,
                                    version
                                  );
                                  return (
                                    <li
                                      className="kpiVersionList"
                                      key={versionName}
                                    >
                                      <FormControlLabel
                                        label={versionLabel}
                                        control={
                                          <Checkbox
                                            checked={isMeasureVersionSelected(
                                              selectedIds,
                                              familyKpi,
                                              version
                                            )}
                                            onChange={() =>
                                              selectKpiValues(
                                                familyKpi,
                                                axis,
                                                dim,
                                                version
                                              )
                                            }
                                            variant="default"
                                            sx={metricsCheckboxSx}
                                          />
                                        }
                                      />
                                    </li>
                                  );
                                })}
                            </ul>
                          );
                        })}
                      </div>
                      {!atBottom && (
                        <div className="scrollHint">
                          <KeyboardDoubleArrowDownIcon
                            style={{ fontSize: 16 }}
                          />
                          Scroll to view more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="metricDivider" aria-hidden="true" />
            <MetricsPanelSelectedColumn
              selectedIds={selectedIds}
              hasPlanKpiConfig={hasPlanKpiConfig}
              calculatedFieldsButtonClass={calculatedFieldsButtonClass}
              setIsCalculatedFieldsPanelOpen={setIsCalculatedFieldsPanelOpen}
              handleMeasureCloseAction={handleMeasureCloseAction}
              flattenedGrouped={flattenedGrouped}
              handleKpiDrag={handleKpiDrag}
              handleKpiDrop={handleKpiDrop}
              removeSelectedMetricsVersion={removeSelectedMetricsVersion}
              getVarianceFieldsForMeasure={getVarianceFieldsForMeasure}
              getContributionFieldsForMeasure={getContributionFieldsForMeasure}
              calculatedFieldsSelection={calculatedFieldsSelection}
              axis={axis}
              dim={dim}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MetricsPanelSelectOverlay;
