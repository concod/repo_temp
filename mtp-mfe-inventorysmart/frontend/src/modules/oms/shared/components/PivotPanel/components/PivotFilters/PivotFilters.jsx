import React from "react";
import { Alert, Panel } from "impact-ui-v3";
import { isEmpty } from "lodash";
import { useDispatch, useSelector } from "react-redux";
import { get } from "lodash";

import {
  setIsPivotFilterOpen,
  selectPivotPayload,
} from "../../../../../pages-oms/OrderManagement/slices/pivot.slice";
import "./PivotFilters.scss";
import Select from "../../../ImpactSelect/Select";
import { PIVOT_FILTER_ALERT_MESSAGE } from "../../../../../pages-oms/OrderManagement/constants/pivotFilters.constants";
import { usePersistentPivotFilters } from "./hooks/usePersistentPivotFilters";
import { usePivotFilterHandlers } from "./hooks/usePivotFilterHandlers";

const PivotFilters = ({ tableRef }) => {
  const dispatch = useDispatch();
  const pivotPayload = useSelector(selectPivotPayload);

  const pivotRows = get(pivotPayload, "pivot_rows", []);
  const pivotColumns = get(pivotPayload, "pivot_columns", []);
  const selectedPivotAttributes = [...pivotRows, ...pivotColumns].flat();

  const filterState = usePersistentPivotFilters();
  const {
    dimension_values,
    dimension_options,
    attributeValues,
    hideAndShowFilterData,
    hideAndShowAttributeValue,
    dropdownOptions,
    dropDownOptionsRef,
    hasUnsavedChanges,
    isPivotFilterOpen,
    isPersistentFilterApplied,
  } = filterState;

  const {
    onHideAndShowFilterChange,
    applyHideAndShowFilterChange,
    handlePivotFilterReset,
    getAttributeSelectedOptions,
    getSelectOptionsFromPlanDetails,
  } = usePivotFilterHandlers({
    tableRef,
    dimension_values: filterState.dimension_values,
    attribute_values: filterState.attribute_values,
    attributeValues: filterState.attributeValues,
    hideAndShowFilterData: filterState.hideAndShowFilterData,
    setHideAndShowFilterData: filterState.setHideAndShowFilterData,
    hideAndShowAttributeValue: filterState.hideAndShowAttributeValue,
    setHideAndShowAttributeValue: filterState.setHideAndShowAttributeValue,
    dropdownOptions: filterState.dropdownOptions,
    setDropdownOptions: filterState.setDropdownOptions,
    dropDownOptionsRef: filterState.dropDownOptionsRef,
    defaultDropdownOptions: filterState.defaultDropdownOptions,
  });

  return (
    <div
      className="pivotFiltersRoot"
      onClick={(e) => e.stopPropagation()}
    >
      <Panel
        size="large"
        open={isPivotFilterOpen}
        width={640}
        anchor="right"
        title="Filter values"
        onClose={() => dispatch(setIsPivotFilterOpen(false))}
        primaryButtonLabel="Apply"
        secondaryButtonLabel="Reset"
        onPrimaryButtonClick={() => applyHideAndShowFilterChange()}
        onSecondaryButtonClick={() => handlePivotFilterReset()}
        primaryButtonProps={{ disabled: !hasUnsavedChanges }}
        secondaryButtonProps={{
          disabled: isEmpty(hideAndShowFilterData) || !hasUnsavedChanges,
        }}
        className="impact_drawer_container"
      >
        <>
          <div className="view-alert-container">
            <Alert
              severity="info"
              title={PIVOT_FILTER_ALERT_MESSAGE}
              subtleBackground={true}
            />
          </div>
          <div className="showAndHideFields">
            {dimension_values &&
              Object.keys(hideAndShowAttributeValue).length > 0 &&
              dimension_options
                .map((opt) => opt.value)
                .filter((key) => key !== "measures" && dimension_values[key])
                .map((key) => {
                  return (
                    <React.Fragment key={key}>
                      <label className="dimensionLabel">{key}</label>
                      <div className="dimensionContainer">
                        {dimension_values[key].map((attribute) => (
                          <React.Fragment key={`${key}-${attribute.value}`}>
                            <div className="dimensionValue">
                              <label className="attributeLabel">{attribute.label}</label>
                              <Select
                                key={`${key}-${attribute.value}`}
                                placeholder="Select filter"
                                isMulti={true}
                                options={getSelectOptionsFromPlanDetails(
                                  key,
                                  attribute,
                                  dropDownOptionsRef.current,
                                  dropdownOptions
                                )}
                                onChange={(value) =>
                                  onHideAndShowFilterChange({
                                    selectedValue: value,
                                    attribute,
                                    dimension: key,
                                  })
                                }
                                isDisabled={
                                  !selectedPivotAttributes.includes(attribute.value) ||
                                  (dropdownOptions[key] &&
                                    dropdownOptions[key][attribute.value] &&
                                    dropdownOptions[key][attribute.value].length === 0)
                                }
                                value={getAttributeSelectedOptions(key, attribute.value)}
                                isClearable={true}
                                toggleSelectAll={true}
                                isWithSearch={true}
                                width="292px"
                              />
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                      {key !== "time" && <hr className="horizontalDivider" />}
                    </React.Fragment>
                  );
                })}
          </div>
        </>
      </Panel>
    </div>
  );
};

export default PivotFilters;
