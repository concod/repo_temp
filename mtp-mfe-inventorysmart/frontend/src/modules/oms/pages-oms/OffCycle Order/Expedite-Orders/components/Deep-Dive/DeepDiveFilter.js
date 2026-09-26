import React, { useEffect, useRef } from "react";
import { connect } from "react-redux";
import { Select } from "core/commonComponents/filters";
import { cloneDeep } from "lodash";
import globalStyles from "core/Styles/globalStyles";
import { setDeepDiveFiltersPayload } from "modules/oms/services-oms/Decision-Dashboard/expedite-order-service";
import { EXPEDITE_COMPACT_FILTER_DROPDOWN_WIDTH } from "../../constants";

const ExpediteOrdersChartFilter = ({
  currentSelectOptions,
  setCurrentSelectOptions,
  selectedOptions,
  setSelectedOptions,
  ...props
}) => {
  const globalClasses = globalStyles();
  const filterApplyTimeoutRef = useRef(null);

  const handleFilterChange = (columnName, options, params) => {
    if (props?.customFilterChangeFunc) {
      props?.customFilterChangeFunc(columnName, options, params);
      return;
    }
    let selectedOptions = options.map((option) => option.value);
    let payloadObjectFound = false;
    let appliedFilters = cloneDeep(
      props?.deepDiveFiltersPayload?.filters || []
    );
    appliedFilters.map((item) => {
      if (item?.attribute_name === columnName) {
        item.values = [...selectedOptions];
        payloadObjectFound = true;
      }
    });
    if (!payloadObjectFound) {
      appliedFilters.push({
        filter_type: params?.filter_type,
        attribute_name: params?.filter_id,
        operator: "in",
        dimension: params?.dimension,
        values: [...selectedOptions],
      });
    }
    props?.setDeepDiveFiltersPayload({
      filters: appliedFilters,
    });

    // Trigger refetch after filter change with debounce
    if (props?.autoApplyOnBlur && props?.onFilterApply) {
      if (filterApplyTimeoutRef.current) {
        clearTimeout(filterApplyTimeoutRef.current);
      }
      filterApplyTimeoutRef.current = setTimeout(() => {
        props.onFilterApply();
      }, 500);
    }
  };

  useEffect(() => {
    if (props?.setResetFilters && props?.reset) {
      props?.setResetFilters(false);
    }
  }, [props?.reset]);

  const handleDropdownCloseComplete = ({ didUpdate }) => {
    // Refetch is handled by debounced call in handleFilterChange
    // This prevents duplicate API calls
  };

  return currentSelectOptions?.length === 0 ? null : (
    <div>
      <Select
        label={props?.label}
        labelOrientation={props?.labelOrientation || "top"}
        name={props?.label}
        selectAllLabel={props?.label}
        customPlaceholder={
          props?.compactLayout ? "Select" : `Select ${props?.label}`
        }
        minWidth={
          props?.compactLayout
            ? EXPEDITE_COMPACT_FILTER_DROPDOWN_WIDTH
            : undefined
        }
        width={
          props?.compactLayout
            ? EXPEDITE_COMPACT_FILTER_DROPDOWN_WIDTH
            : undefined
        }
        id={props?.columnName}
        filter_keyword={props?.columnName}
        data-testid={`select${props?.columnName}`}
        is_multiple_selection
        isClearable
        doNotUpdateDefaultValue
        initialData={currentSelectOptions}
        selectedOptions={
          props?.isDefaultSelectionNeeded && selectedOptions.length === 1
            ? selectedOptions
            : []
        }
        updateDependency={(params, options) =>
          handleFilterChange(props?.columnName, options, params)
        }
        reset={props?.reset}
        onDropdownCloseComplete={handleDropdownCloseComplete}
        {...props?.filterProps}
        withPortal={
          props?.compactLayout
            ? false
            : props?.withPortal ?? props?.filterProps?.withPortal
        }
      />
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    deepDiveFiltersPayload:
      store.omsReducer.expediteOrdersService.deepDiveFiltersPayload,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setDeepDiveFiltersPayload: (payload) =>
    dispatch(setDeepDiveFiltersPayload(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ExpediteOrdersChartFilter);
