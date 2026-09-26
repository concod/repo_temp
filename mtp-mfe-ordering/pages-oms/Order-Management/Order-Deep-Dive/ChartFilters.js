import React, { useEffect } from "react";
import { connect } from "react-redux";
import { setOrderManagementDeepDiveFiltersPayload } from "modules/oms/services-oms/Order-Management/order-management-service";
import { Select } from "core/commonComponents/filters";
import { cloneDeep } from "lodash";
import classNames from "classnames";
import globalStyles from "core/Styles/globalStyles";
import { Grid } from "@mui/material";

const ChartFilters = ({
  currentSelectOptions,
  setCurrentSelectOptions,
  selectedOptions,
  setSelectedOptions,
  ...props
}) => {
  const globalClasses = globalStyles();

  const handleFilterChange = (columnName, options, params) => {
    if (props?.customFilterChangeFunc) {
      props?.customFilterChangeFunc(columnName, options, params);
      return;
    }
    let selectedOptions = options.map((option) => option.value);
    let payloadObjectFound = false;
    let appliedFilters = cloneDeep(
      props?.orderManagementDeepDiveFiltersPayload?.filters || []
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
    props?.setOrderManagementDeepDiveFiltersPayload({
      filters: appliedFilters,
    });
  };

  useEffect(() => {
    if (props?.setResetFilters && props?.reset) {
      props?.setResetFilters(false);
    }
  }, [props?.reset]);

  return currentSelectOptions?.length === 0 ? null : (
    <div>
      <Select
        label={props?.label}
        labelOrientation={props?.labelOrientation}
        name={props?.label}
        selectAllLabel={props?.label}
        customPlaceholder={`Select ${props?.label}`}
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
        {...props?.filterProps}
      />
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderManagementFilterConfiguration"
      ]?.appliedFilterData,
    orderManagementDeepDiveFilters:
      store.omsReducer.orderManagementService.orderManagementDeepDiveFilters,
    orderManagementDeepDiveFiltersPayload:
      store.omsReducer.orderManagementService
        .orderManagementDeepDiveFiltersPayload,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setOrderManagementDeepDiveFiltersPayload: (payload) =>
    dispatch(setOrderManagementDeepDiveFiltersPayload(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ChartFilters);
