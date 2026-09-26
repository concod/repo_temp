import React, { useEffect, useMemo } from "react";
import { connect } from "react-redux";
import { setOrderManagementDeepDiveFiltersPayload } from "modules/oms/services-oms/Order-Management/order-management-service";
import { Select } from "core/commonComponents/filters";
import { cloneDeep } from "lodash";
import classNames from "classnames";
import globalStyles from "core/Styles/globalStyles";
import { Grid } from "@mui/material";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import SelectFilterV3 from "../components/SelectFilterV3";

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

  const selectedOptionsFromPayload = useMemo(() => {
    if (props?.isDefaultSelectionNeeded || props?.customFilterChangeFunc) {
      return [];
    }
    const filters = props?.orderManagementDeepDiveFiltersPayload?.filters || [];
    const match = filters.find((f) => f.attribute_name === props?.columnName);
    if (!match?.values?.length) return [];
    return match.values.map((value) => ({
      label: replaceSpecialCharacter(String(value)),
      value,
    }));
  }, [
    props?.isDefaultSelectionNeeded,
    props?.customFilterChangeFunc,
    props?.orderManagementDeepDiveFiltersPayload,
    props?.columnName,
  ]);

  const resolvedSelectedOptions =
    props?.isDefaultSelectionNeeded && selectedOptions.length === 1
      ? selectedOptions
      : selectedOptionsFromPayload;

  const useImpactSelectForDeepDive =
    !props?.isDefaultSelectionNeeded && !props?.customFilterChangeFunc;

  const deepDiveSelectionKey = useMemo(() => {
    if (!useImpactSelectForDeepDive) return "";
    return (selectedOptionsFromPayload || [])
      .map((o) => o?.value)
      .join(",");
  }, [useImpactSelectForDeepDive, selectedOptionsFromPayload]);

  if (currentSelectOptions?.length === 0) {
    return null;
  }

  if (useImpactSelectForDeepDive) {
    const filterParams = {
      filter_type: props?.filterProps?.type,
      filter_id: props?.columnName,
      dimension: props?.filterProps?.dimension,
    };
    return (
      <div>
        <SelectFilterV3
          key={`${props?.columnName}-${deepDiveSelectionKey}`}
          index={props?.columnName}
          label={props?.label}
          placeholder={`Select ${props?.label}`}
          columnName={props?.columnName}
          isClearable={true}
          isCloseWhenClickOutside={true}
          isMulti={true}
          currentSelectOptions={currentSelectOptions}
          currentOptions={currentSelectOptions}
          initialOptions={currentSelectOptions}
          selectedOptions={resolvedSelectedOptions}
          handleChartFilterChange={() => {}}
          labelOrientation={props?.labelOrientation}
          isWithSearch={true}
          toggleSelectAll={true}
          handleChange={(selected) => {
            const options = Array.isArray(selected)
              ? selected
              : selected
              ? [selected]
              : [];
            handleFilterChange(props?.columnName, options, filterParams);
          }}
          onClearAll={() =>
            handleFilterChange(props?.columnName, [], filterParams)
          }
        />
      </div>
    );
  }

  return (
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
        selectedOptions={resolvedSelectedOptions}
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
